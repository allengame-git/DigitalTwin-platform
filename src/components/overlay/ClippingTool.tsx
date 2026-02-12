/**
 * ClippingTool Component
 * @module components/overlay/ClippingTool
 * 
 * 剖面切片控制 UI
 * Task: T038
 */

import React, { useState, useEffect } from 'react';
import { useViewerStore } from '../../stores/viewerStore';

import { useBoreholeStore } from '../../stores/boreholeStore';
import { useTerrainStore } from '../../stores/terrainStore';
import { useUploadStore } from '../../stores/uploadStore';
import { getOrigin } from '../../utils/coordinates';

type ClippingAxis = 'x' | 'y' | 'z';

interface ClippingToolProps {
    mode?: 'floating' | 'embedded';
}

export const ClippingTool: React.FC<ClippingToolProps> = ({ mode = 'floating' }) => {
    const [enabled, setEnabled] = useState(false);
    const [axis, setAxis] = useState<ClippingAxis>('y');
    const [position, setPosition] = useState(0);
    const [invert, setInvert] = useState(false);
    const { setClippingPlane } = useViewerStore();
    const { boreholes } = useBoreholeStore();
    const { getActiveTerrain } = useTerrainStore();
    const activeTerrain = getActiveTerrain();
    const { geologyModels, activeGeologyModelId } = useUploadStore();
    const activeGeologyModel = geologyModels.find(m => m.id === activeGeologyModelId);

    // 範圍狀態
    const [range, setRange] = useState({ min: -500, max: 500 });

    // 計算邊界並更新範圍 (TWD97 Coordinates)
    useEffect(() => {
        if (!enabled) return;

        // Init with inverted logic for min/max to find bounds
        let minX = Infinity, maxX = -Infinity; // East-West
        let minY = Infinity, maxY = -Infinity; // North-South
        let minZ = Infinity, maxZ = -Infinity; // Elevation

        let hasData = false;

        // 1. Terrain Bounds (Already TWD97)
        if (activeTerrain) {
            hasData = true;
            minX = Math.min(minX, activeTerrain.minX);
            maxX = Math.max(maxX, activeTerrain.maxX);

            minY = Math.min(minY, activeTerrain.minY);
            maxY = Math.max(maxY, activeTerrain.maxY);

            minZ = Math.min(minZ, activeTerrain.minZ);
            maxZ = Math.max(maxZ, activeTerrain.maxZ);
        }

        if (boreholes.length > 0) {
            hasData = true;
            boreholes.forEach(b => {
                minX = Math.min(minX, b.x);
                maxX = Math.max(maxX, b.x);

                minY = Math.min(minY, b.y);
                maxY = Math.max(maxY, b.y);

                const topZ = b.elevation;
                const bottomZ = b.elevation - b.totalDepth;

                minZ = Math.min(minZ, bottomZ);
                maxZ = Math.max(maxZ, topZ);
            });
        }

        // 3. Geology Model Bounds (Already TWD97)
        if (activeGeologyModel) {
            hasData = true;
            console.log('[ClippingTool] Active Geology Model Bounds:', {
                minX: activeGeologyModel.minX, maxX: activeGeologyModel.maxX,
                minY: activeGeologyModel.minY, maxY: activeGeologyModel.maxY,
                minZ: activeGeologyModel.minZ, maxZ: activeGeologyModel.maxZ
            });

            // Ensure values exist and are not just 0 (which breaks TWD97 range)
            if (activeGeologyModel.minX && activeGeologyModel.maxX) {
                minX = Math.min(minX, activeGeologyModel.minX);
                maxX = Math.max(maxX, activeGeologyModel.maxX);
            }
            if (activeGeologyModel.minY && activeGeologyModel.maxY) {
                minY = Math.min(minY, activeGeologyModel.minY);
                maxY = Math.max(maxY, activeGeologyModel.maxY);
            }
            // Z can be negative or 0, so we check strictly unequal to undefined
            if (activeGeologyModel.minZ !== undefined && activeGeologyModel.maxZ !== undefined) {
                minZ = Math.min(minZ, activeGeologyModel.minZ);
                maxZ = Math.max(maxZ, activeGeologyModel.maxZ);
            }
        }

        console.log('[ClippingTool] Calculated Bounds:', {
            minX, maxX, minY, maxY, minZ, maxZ
        });

        if (hasData) {
            const BUFFER = 50;
            let newMin = -500;
            let newMax = 500;

            if (axis === 'x') {
                newMin = minX - BUFFER;
                newMax = maxX + BUFFER;
            } else if (axis === 'y') {
                newMin = minY - BUFFER;
                newMax = maxY + BUFFER;
            } else if (axis === 'z') {
                newMin = minZ - BUFFER;
                newMax = maxZ + BUFFER;
            }

            // Only update if range changed significantly to avoid jitter
            setRange(prev => {
                const nMin = Math.floor(newMin);
                const nMax = Math.ceil(newMax);
                if (prev.min !== nMin || prev.max !== nMax) {
                    return { min: nMin, max: nMax };
                }
                return prev;
            });

            // Update position to center if it's out of range (or on init)
            setPosition(prev => {
                if (prev < newMin || prev > newMax) {
                    const center = Math.round((newMin + newMax) / 2);
                    // Need to trigger update with new position
                    handleUpdate(enabled, axis, center, invert);
                    return center;
                }
                return prev;
            });
        }
    }, [enabled, axis, activeTerrain, boreholes, activeGeologyModel]);
    // Added 'invert' to deps if handleUpdate is needed inside, but usually position change triggers handleUpdate via state effect or callback.
    // Actually handleUpdate is stable but it uses current state? No, it accepts params.
    // The setPosition above calls handleUpdate immediately.


    // 更新 clipping plane
    const handleUpdate = (newEnabled: boolean, newAxis: ClippingAxis, newPosition: number, newInvert: boolean) => {
        if (newEnabled) {
            const origin = getOrigin();
            const normal: [number, number, number] = [0, 0, 0];
            // Swap Y and Z: User 'y' (North) -> Three 'z' (index 2), User 'z' (Elev) -> Three 'y' (index 1)
            const axisIndex = newAxis === 'x' ? 0 : newAxis === 'y' ? 2 : 1;

            // Apply inversion to normal
            normal[axisIndex] = newInvert ? -1 : 1;

            // Calculate Constant (d)
            // Plane: normal . p + d = 0
            // We want plane at 'newPosition' in TWD97.
            // Convert 'newPosition' to World Coordinate first.

            let worldPosVal = 0;
            if (newAxis === 'x') {
                // World X = TWD97 X - Origin X
                worldPosVal = newPosition - origin.x;
            } else if (newAxis === 'y') {
                // User Y (North). World Z = -(TWD97 Y - Origin Y)
                worldPosVal = -(newPosition - origin.y);
            } else if (newAxis === 'z') {
                // User Z (Elev). World Y = TWD97 Z
                worldPosVal = newPosition;
            }

            // Plane Eq: n * x = -d  =>  x = -d/n
            // If n=1: x = -d => d = -x
            // If n=-1: -x = -d => d = x
            let constant = 0;
            if (normal[axisIndex] === 1) {
                constant = -worldPosVal;
            } else {
                constant = worldPosVal;
            }

            setClippingPlane({
                enabled: true,
                normal,
                constant,
            });
        } else {
            setClippingPlane({
                enabled: false,
                normal: [0, 1, 0],
                constant: 0,
            });
        }
    };

    const handleToggle = () => {
        const newEnabled = !enabled;
        setEnabled(newEnabled);
        handleUpdate(newEnabled, axis, position, invert);
    };

    const handleAxisChange = (newAxis: ClippingAxis) => {
        setAxis(newAxis);
        handleUpdate(enabled, newAxis, position, invert);
    };

    const handlePositionChange = (value: number) => {
        setPosition(value);
        handleUpdate(enabled, axis, value, invert);
    };

    const handleInvertToggle = () => {
        const newInvert = !invert;
        setInvert(newInvert);
        handleUpdate(enabled, axis, position, newInvert);
    };

    const containerStyle: React.CSSProperties = mode === 'floating'
        ? {
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            padding: '12px 16px',
            minWidth: '200px',
            zIndex: 100,
            pointerEvents: 'auto',
            fontFamily: 'system-ui, sans-serif',
        }
        : {
            position: 'relative',
            background: 'transparent',
            borderRadius: 0,
            boxShadow: 'none',
            padding: '12px',
            width: '100%',
            zIndex: 'auto',
            pointerEvents: 'auto',
            fontFamily: 'system-ui, sans-serif',
            borderBottom: '1px solid #e5e7eb',
        };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                }}
            >
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>
                    ✂️ 剖面切片
                </span>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={handleToggle}
                        style={{ marginRight: '6px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {enabled ? '啟用' : '停用'}
                    </span>
                </label>
            </div>

            {enabled && (
                <>
                    {/* Axis Selection */}
                    <div style={{ marginBottom: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', display: 'block' }}>
                            切片軸向
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {(['x', 'y', 'z'] as ClippingAxis[]).map((a) => (
                                <button
                                    key={a}
                                    onClick={() => handleAxisChange(a)}
                                    style={{
                                        flex: 1,
                                        padding: '6px 12px',
                                        border: axis === a ? '2px solid #2563eb' : '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        background: axis === a ? '#eff6ff' : 'white',
                                        color: axis === a ? '#2563eb' : '#374151',
                                        fontWeight: axis === a ? 600 : 400,
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                    }}
                                >
                                    {a.toUpperCase()} 軸
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Position Slider */}
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '6px',
                            }}
                        >
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>位置</span>
                            <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>
                                {position} m
                            </span>
                        </div>
                        <input
                            type="range"
                            min={range.min}
                            max={range.max}
                            step="10"
                            value={position}
                            onChange={(e) => handlePositionChange(parseInt(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>

                    {/* Invert Direction Toggle */}
                    <div style={{ marginTop: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={invert}
                                onChange={handleInvertToggle}
                                style={{ marginRight: '6px' }}
                            />
                            <span style={{ fontSize: '12px', color: '#374151' }}>
                                反轉切片方向
                            </span>
                        </label>
                    </div>
                </>
            )}
        </div >
    );
};

export default ClippingTool;
