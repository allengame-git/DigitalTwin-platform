/**
 * StrikeDipSymbol Component
 * @module components/scene/StrikeDipSymbol
 * 
 * 位態符號 (走向傾角) 渲染元件
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
    { id: 'att-3', x: 250600, y: 2600500, z: 5, strike: 270, dip: 60 },
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
}

export function StrikeDipSymbol({ attitudes = MOCK_ATTITUDES }: StrikeDipSymbolProps) {
    const { layers } = useLayerStore();
    const attitudesLayer = layers.attitudes;

    // 轉換座標
    const convertedAttitudes = useMemo(() => {
        return attitudes.map((att) => {
            const worldPos = twd97ToWorld({ x: att.x, y: att.y, z: att.z });
            return {
                ...att,
                position: new THREE.Vector3(worldPos.x, worldPos.z + 5, worldPos.y), // 稍微抬高
            };
        });
    }, [attitudes]);

    if (!attitudesLayer.visible) return null;

    return (
        <group>
            {convertedAttitudes.map((att) => (
                <group key={att.id} position={att.position}>
                    {/* 走向線 (水平) */}
                    <mesh rotation={[0, THREE.MathUtils.degToRad(-att.strike), 0]}>
                        <boxGeometry args={[20, 1, 1]} />
                        <meshStandardMaterial
                            color="#2563eb"
                            transparent={attitudesLayer.opacity < 1}
                            opacity={attitudesLayer.opacity}
                        />
                    </mesh>

                    {/* 傾向線 (傾斜) */}
                    <mesh
                        rotation={[
                            THREE.MathUtils.degToRad(-att.dip),
                            THREE.MathUtils.degToRad(-att.strike + 90),
                            0,
                        ]}
                        position={[0, 0, 0]}
                    >
                        <boxGeometry args={[10, 1, 1]} />
                        <meshStandardMaterial
                            color="#dc2626"
                            transparent={attitudesLayer.opacity < 1}
                            opacity={attitudesLayer.opacity}
                        />
                    </mesh>

                    {/* 標籤 */}
                    <Html
                        position={[0, 10, 0]}
                        center
                        style={{
                            opacity: attitudesLayer.opacity,
                            pointerEvents: 'none',
                        }}
                    >
                        <div
                            style={{
                                background: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {att.strike}°/{att.dip}°
                        </div>
                    </Html>
                </group>
            ))}
        </group>
    );
}

export default StrikeDipSymbol;
