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
import { twd97ToWorld } from '../../utils/coordinates';

// Mock 位態資料 (待 API 整合)
const MOCK_ATTITUDES = [
    { id: 'att-1', x: 250200, y: 2600100, z: 10, strike: 45, dip: 30 },
    { id: 'att-2', x: 250400, y: 2600300, z: 15, strike: 120, dip: 45 },
    { id: 'att-3', x: 250600, y: 2600500, z: 5, strike: 270, dip: 75 },
    { id: 'att-4', x: 249800, y: 2600200, z: 8, strike: 180, dip: 25 },
];

interface AttitudeData {
    id: string;
    x: number;
    y: number;
    z: number;
    strike: number; // 走向 (度)
    dip: number;    // 傾角 (度)
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
    attitudes = MOCK_ATTITUDES,
    discRadius = 25
}: StrikeDipSymbolProps) {
    const { layers } = useLayerStore();
    const attitudesLayer = layers.attitudes;

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

    if (!attitudesLayer.visible) return null;

    return (
        <group>
            {convertedAttitudes.map((att) => (
                <group key={att.id} position={att.position}>
                    {/* 圓盤主體 (顏色根據 Dip 變化) */}
                    <mesh rotation={att.rotation} geometry={discGeometry}>
                        <meshBasicMaterial
                            color={att.color}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    {/* 圓盤邊緣 (深色邊線) */}
                    <mesh rotation={att.rotation} geometry={edgeGeometry}>
                        <meshBasicMaterial
                            color="#1e3a8a"
                            transparent
                            opacity={attitudesLayer.opacity}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    {/* Dip 方向指示線 (小箭頭朝向傾斜方向) */}
                    <mesh rotation={att.rotation}>
                        <boxGeometry args={[0.5, discRadius * 0.8, 0.3]} />
                        <meshStandardMaterial
                            color="#dc2626"
                            transparent={attitudesLayer.opacity < 1}
                            opacity={attitudesLayer.opacity}
                        />
                    </mesh>

                    {/* 標籤 (位於圓盤上方，選開不遮擋圓盤) */}
                    <Html
                        position={[discRadius + 0, 50, 0]}
                        center
                        style={{
                            opacity: attitudesLayer.opacity,
                            pointerEvents: 'none',
                        }}
                    >
                        <div
                            style={{
                                background: 'rgba(0,0,0,0.75)',
                                color: 'white',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                whiteSpace: 'nowrap',
                                fontWeight: 500,
                            }}
                        >
                            N{att.strike}°E / {att.dip}°
                        </div>
                    </Html>
                </group>
            ))}
        </group>
    );
}

export default StrikeDipSymbol;

