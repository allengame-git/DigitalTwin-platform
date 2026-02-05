/**
 * ClippingTool Component
 * @module components/overlay/ClippingTool
 * 
 * 剖面切片控制 UI
 * Task: T038
 */

import React, { useState } from 'react';
import { useViewerStore } from '../../stores/viewerStore';

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

    // 更新 clipping plane
    const handleUpdate = (newEnabled: boolean, newAxis: ClippingAxis, newPosition: number, newInvert: boolean) => {
        if (newEnabled) {
            const normal: [number, number, number] = [0, 0, 0];
            // Swap Y and Z: User 'y' -> Three 'z' (index 2), User 'z' -> Three 'y' (index 1)
            const axisIndex = newAxis === 'x' ? 0 : newAxis === 'y' ? 2 : 1;

            // Apply inversion
            normal[axisIndex] = newInvert ? -1 : 1;

            setClippingPlane({
                enabled: true,
                normal,
                constant: newInvert ? -newPosition : newPosition,
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
                            min="-500"
                            max="500"
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
