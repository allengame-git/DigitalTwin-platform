/**
 * StructureLines Component (Fault Planes)
 * @module components/scene/StructureLines
 * 
 * 斷層面渲染元件
 * Task: T041
 */

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';
import { twd97ToWorld } from '../../utils/coordinates';
import { useFaultPlaneStore, FaultPlane } from '../../stores/faultPlaneStore';
import { useProjectStore } from '../../stores/projectStore';

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

export function StructureLines() {
    const { layers } = useLayerStore();
    const faultsLayer = layers.faults;
    const { faultPlanes, selectedFaultId, selectFault, fetchFaultPlanes } = useFaultPlaneStore();
    const { activeProjectId } = useProjectStore();

    // 載入斷層面資料
    useEffect(() => {
        if (activeProjectId) {
            fetchFaultPlanes(activeProjectId);
        }
    }, [activeProjectId, fetchFaultPlanes]);

    // 建立斷層面幾何
    const faultGeometries = useMemo(() => {
        return faultPlanes.map((fault: FaultPlaneData) => ({
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
        selectFault(selectedFaultId === fault.id ? null : fault.id);
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
                        color={selectedFaultId === fault.id ? '#ffff00' : fault.color}
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
        </group>
    );
}

export default StructureLines;
