/**
 * StrikeDipSymbol Component
 * @module components/scene/StrikeDipSymbol
 * 
 * 位態符號 (走向傾角) 渲染元件 - 圓盤視覺化
 * Task: T042
 */

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';
import { useViewerStore } from '../../stores/viewerStore';
import { useAttitudeStore } from '../../stores/attitudeStore';
import { twd97ToWorld } from '../../utils/coordinates';


interface AttitudeData {
    id: string;
    x: number;
    y: number;
    z: number;
    strike: number; // 走向 (度)
    dip: number;    // 傾角 (度)
    dipDirection?: string | null;
    description?: string | null;
}

interface StrikeDipSymbolProps {
    attitudes?: AttitudeData[];
    discRadius?: number;
}

/**
 * 計算圓盤的 Euler 旋轉角度
 * Strike: 走向角 (從北順時針量測)
 * Dip: 傾角 (從水平面量測)
 */
function calculateDiscRotation(strike: number, dip: number): THREE.Euler {
    const strikeRad = THREE.MathUtils.degToRad(-strike);
    const dipRad = THREE.MathUtils.degToRad(dip);

    return new THREE.Euler(
        -Math.PI / 2 + dipRad,
        strikeRad,
        0,
        'YXZ'
    );
}

/**
 * 根據 Dip 角度計算顏色 (0°=綠色, 45°=黃色, 90°=紅色)
 */
function dipToColor(dip: number): THREE.Color {
    // 正規化 dip 到 0-1 範圍
    const t = Math.min(dip / 90, 1);

    // 綠色 -> 黃色 -> 紅色 漸變
    if (t < 0.5) {
        // 綠 -> 黃 (0-45°)
        const s = t * 2;
        return new THREE.Color().setRGB(s, 1, 0);
    } else {
        // 黃 -> 紅 (45-90°)
        const s = (t - 0.5) * 2;
        return new THREE.Color().setRGB(1, 1 - s, 0);
    }
}

export function StrikeDipSymbol({
    attitudes = [],
    discRadius = 25
}: StrikeDipSymbolProps) {
    const { layers } = useLayerStore();
    const { config } = useViewerStore();
    const { selectedAttitudeId, selectAttitude } = useAttitudeStore();
    const attitudesLayer = layers.attitudes;
    const showLabels = config.showAttitudeLabels;

    // 轉換座標並計算旋轉
    const convertedAttitudes = useMemo(() => {
        const result = attitudes.map((att) => {
            const worldPos = twd97ToWorld({ x: att.x, y: att.y, z: att.z });
            const rotation = calculateDiscRotation(att.strike, att.dip);
            console.log('[StrikeDipSymbol] Attitude:', att.id, 'WorldPos:', worldPos, 'Dip:', att.dip);
            return {
                ...att,
                position: new THREE.Vector3(worldPos.x, worldPos.y + 50, worldPos.z),
                rotation,
                color: dipToColor(att.dip),
            };
        });
        console.log('[StrikeDipSymbol] Total attitudes:', result.length, 'Layer visible:', attitudesLayer.visible);
        return result;
    }, [attitudes, attitudesLayer.visible]);

    // 建立共用 Geometry
    const discGeometry = useMemo(() => {
        return new THREE.CircleGeometry(discRadius, 32);
    }, [discRadius]);

    // 圓盤邊緣 Geometry
    const edgeGeometry = useMemo(() => {
        return new THREE.RingGeometry(discRadius - 0.2, discRadius, 32);
    }, [discRadius]);

    return (
        <group visible={attitudesLayer.visible}>
            {convertedAttitudes.map((att) => {
                const isSelected = selectedAttitudeId === att.id;

                return (
                    <group
                        key={att.id}
                        position={att.position}
                        onClick={(e) => {
                            e.stopPropagation();
                            selectAttitude(att.id);
                        }}
                        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                    >
                        {/* 圓盤主體 (顏色根據 Dip 變化) */}
                        <mesh rotation={att.rotation} geometry={discGeometry}>
                            <meshBasicMaterial
                                color={isSelected ? '#3b82f6' : att.color}
                                side={THREE.DoubleSide}
                            />
                        </mesh>

                        {/* 圓盤邊緣 (深色邊線) */}
                        <mesh rotation={att.rotation} geometry={edgeGeometry}>
                            <meshBasicMaterial
                                color={isSelected ? '#ffffff' : "#1e3a8a"}
                                transparent
                                opacity={attitudesLayer.opacity}
                                side={THREE.DoubleSide}
                            />
                        </mesh>

                        {/* Dip 方向指示箭頭 (小箭頭朝向傾斜方向) */}
                        <group rotation={att.rotation}>
                            {/* 箭桿 */}
                            <mesh position={[0, -discRadius * 0.4, 0.4]}>
                                <cylinderGeometry args={[0.5, 0.5, discRadius * 0.6]} />
                                <meshStandardMaterial
                                    color="#ef4444"
                                    transparent={attitudesLayer.opacity < 1}
                                    opacity={attitudesLayer.opacity}
                                />
                            </mesh>
                            {/* 箭頭 */}
                            <mesh position={[0, -discRadius * 0.75, 0.4]} rotation={[Math.PI, 0, 0]}>
                                <coneGeometry args={[2, 5, 4]} />
                                <meshStandardMaterial
                                    color="#ef4444"
                                    transparent={attitudesLayer.opacity < 1}
                                    opacity={attitudesLayer.opacity}
                                />
                            </mesh>
                        </group>

                        {/* 標籤 (位於圓盤上方) */}
                        {showLabels && (
                            <Html
                                position={[0, discRadius + 5, 1]}
                                center
                                style={{
                                    opacity: attitudesLayer.opacity,
                                    pointerEvents: 'none',
                                    transition: 'opacity 0.2s',
                                }}
                            >
                                <div
                                    style={{
                                        background: 'rgba(15, 23, 42, 0.85)',
                                        color: 'white',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        whiteSpace: 'nowrap',
                                        fontWeight: 700,
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                        letterSpacing: '0.02em',
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                                    }}
                                >
                                    <span style={{ color: '#94a3b8', marginRight: '4px' }}>N</span>
                                    {att.strike}°
                                    <span style={{ color: '#94a3b8', margin: '0 4px' }}>E /</span>
                                    {att.dip}°
                                </div>
                            </Html>
                        )}
                    </group>
                );
            })}
        </group>
    );
}

export default StrikeDipSymbol;
