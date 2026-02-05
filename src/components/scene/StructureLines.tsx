/**
 * StructureLines Component (Fault Planes)
 * @module components/scene/StructureLines
 * 
 * 斷層面渲染元件
 * Task: T041
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useLayerStore } from '../../stores/layerStore';
import { twd97ToWorld } from '../../utils/coordinates';

// Mock 斷層面資料 (待 API 整合)
const MOCK_FAULT_PLANES = [
    {
        id: 'fault-1',
        name: '主斷層 A',
        type: 'normal' as const,
        coordinates: [
            { x: 250000, y: 2600000, z: 0 },
            { x: 250500, y: 2600200, z: -50 },
            { x: 251000, y: 2600400, z: -100 },
            { x: 251500, y: 2600600, z: -150 },
        ],
        dipAngle: 70,       // 傾角 (度)
        dipDirection: 90,   // 傾向 (度)
        depth: 200,         // 向下延伸深度 (公尺)
        color: '#ff4444',
    },
    {
        id: 'fault-2',
        name: '次要斷層 B',
        type: 'reverse' as const,
        coordinates: [
            { x: 249500, y: 2600500, z: 0 },
            { x: 250000, y: 2600300, z: -30 },
            { x: 250500, y: 2600100, z: -60 },
        ],
        dipAngle: 45,
        dipDirection: 270,
        depth: 150,
        color: '#4488ff',
    },
];

interface FaultPlaneData {
    id: string;
    name: string;
    type: 'normal' | 'reverse' | 'strike-slip';
    coordinates: { x: number; y: number; z: number }[];
    dipAngle: number;
    dipDirection: number;
    depth: number;
    color: string;
}

interface StructureLinesProps {
    faultPlanes?: FaultPlaneData[];
}

/**
 * 根據斷層線座標建立平面幾何
 */
function createFaultPlaneGeometry(
    coordinates: { x: number; y: number; z: number }[],
    depth: number,
    dipAngle: number,
    dipDirection: number
): THREE.BufferGeometry {
    if (coordinates.length < 2) {
        return new THREE.BufferGeometry();
    }

    const vertices: number[] = [];
    const indices: number[] = [];

    // 計算傾斜方向向量
    const dipRad = THREE.MathUtils.degToRad(dipAngle);
    const dirRad = THREE.MathUtils.degToRad(dipDirection);

    // 向下延伸的偏移量 (根據傾角)
    const depthOffsetX = Math.sin(dirRad) * Math.cos(dipRad) * depth;
    const depthOffsetY = -Math.sin(dipRad) * depth; // 向下
    const depthOffsetZ = -Math.cos(dirRad) * Math.cos(dipRad) * depth;

    // 轉換座標並建立頂點
    for (let i = 0; i < coordinates.length; i++) {
        const coord = coordinates[i];
        const worldPos = twd97ToWorld(coord);

        // 頂部頂點 (地表)
        vertices.push(worldPos.x, worldPos.y, worldPos.z);

        // 底部頂點 (向下延伸)
        vertices.push(
            worldPos.x + depthOffsetX,
            worldPos.y + depthOffsetY,
            worldPos.z + depthOffsetZ
        );
    }

    // 建立面片索引 (每個線段產生一個四邊形 = 2個三角形)
    for (let i = 0; i < coordinates.length - 1; i++) {
        const topLeft = i * 2;
        const bottomLeft = i * 2 + 1;
        const topRight = (i + 1) * 2;
        const bottomRight = (i + 1) * 2 + 1;

        // 三角形 1: topLeft, topRight, bottomRight
        indices.push(topLeft, topRight, bottomRight);

        // 三角形 2: topLeft, bottomRight, bottomLeft
        indices.push(topLeft, bottomRight, bottomLeft);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
}

export function StructureLines({ faultPlanes = MOCK_FAULT_PLANES }: StructureLinesProps) {
    const { layers } = useLayerStore();
    const faultsLayer = layers.faults;
    const [selectedFault, setSelectedFault] = React.useState<FaultPlaneData | null>(null);

    // 建立斷層面幾何
    const faultGeometries = useMemo(() => {
        return faultPlanes.map((fault) => ({
            ...fault,
            geometry: createFaultPlaneGeometry(
                fault.coordinates,
                fault.depth,
                fault.dipAngle,
                fault.dipDirection
            ),
        }));
    }, [faultPlanes]);

    const handleFaultClick = (fault: FaultPlaneData) => {
        setSelectedFault(selectedFault?.id === fault.id ? null : fault);
    };

    if (!faultsLayer.visible) return null;

    return (
        <group>
            {faultGeometries.map((fault) => (
                <mesh
                    key={fault.id}
                    geometry={fault.geometry}
                    frustumCulled={false}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleFaultClick(fault);
                    }}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        document.body.style.cursor = 'pointer';
                    }}
                    onPointerOut={() => {
                        document.body.style.cursor = 'auto';
                    }}
                >
                    <meshBasicMaterial
                        color={selectedFault?.id === fault.id ? '#ffff00' : fault.color}
                        transparent
                        opacity={faultsLayer.opacity * 0.8}
                        side={THREE.DoubleSide}
                        depthWrite={true}
                        polygonOffset={true}
                        polygonOffsetFactor={-1}
                        polygonOffsetUnits={-4}
                    />
                </mesh>
            ))}

            {/* 詳細資訊面板 */}
            {selectedFault && (
                <FaultInfoPanel
                    fault={selectedFault}
                    onClose={() => setSelectedFault(null)}
                />
            )}
        </group>
    );
}

// 斷層資訊面板元件
function FaultInfoPanel({
    fault,
    onClose
}: {
    fault: FaultPlaneData;
    onClose: () => void;
}) {
    // 計算面板位置 (斷層中心點上方)
    const centerCoord = fault.coordinates[Math.floor(fault.coordinates.length / 2)];
    const worldPos = twd97ToWorld(centerCoord);

    const typeLabels: Record<string, string> = {
        'normal': '正斷層',
        'reverse': '逆斷層',
        'strike-slip': '走滑斷層',
    };

    return (
        <group position={[worldPos.x, worldPos.y + 100, worldPos.z]}>
            <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial visible={false} />
            </mesh>
            <Html center style={{ pointerEvents: 'auto' }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.98)',
                    color: '#1e293b',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    minWidth: '220px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                    fontSize: '14px',
                    fontFamily: '"Inter", system-ui, sans-serif',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    animation: 'fault-popup-in 0.2s ease-out',
                }}>
                    <style>{`
                        @keyframes fault-popup-in {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                        borderBottom: `2px solid ${fault.color}`,
                        paddingBottom: '8px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: fault.color }} />
                            <strong style={{ fontSize: '15px', fontWeight: 700 }}>
                                {fault.name}
                            </strong>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(0,0,0,0.05)',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                fontSize: '18px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
                        >
                            ×
                        </button>
                    </div>
                    <div style={{ color: '#444', lineHeight: '1.6' }}>
                        <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>類型</span>
                            <span style={{ fontWeight: 600 }}>{typeLabels[fault.type] || fault.type}</span>
                        </div>
                        <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>傾角</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{fault.dipAngle}°</span>
                        </div>
                        <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>傾向</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{fault.dipDirection}°</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>延伸深度</span>
                            <span style={{ fontWeight: 600, color: '#3b82f6' }}>{fault.depth} m</span>
                        </div>
                    </div>
                </div>
            </Html>
        </group>
    );
}



export default StructureLines;


