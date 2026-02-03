/**
 * TerrainMesh Component
 * @module components/scene/TerrainMesh
 * 
 * DEM 地形網格
 * Task: T043c
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';

interface TerrainMeshProps {
    width?: number;
    height?: number;
    widthSegments?: number;
    heightSegments?: number;
    maxElevation?: number;
    position?: [number, number, number];
}

// 生成假的高程資料 (Perlin-like noise)
function generateMockElevation(
    widthSegments: number,
    heightSegments: number,
    maxElevation: number
): Float32Array {
    const count = (widthSegments + 1) * (heightSegments + 1);
    const elevations = new Float32Array(count);

    for (let j = 0; j <= heightSegments; j++) {
        for (let i = 0; i <= widthSegments; i++) {
            const index = j * (widthSegments + 1) + i;
            // 簡單的正弦波組合模擬地形
            const x = i / widthSegments;
            const y = j / heightSegments;
            const elevation =
                Math.sin(x * Math.PI * 2) * Math.cos(y * Math.PI * 3) * maxElevation * 0.5 +
                Math.sin(x * Math.PI * 5 + y * Math.PI * 4) * maxElevation * 0.3 +
                Math.random() * maxElevation * 0.2;
            elevations[index] = Math.max(0, elevation);
        }
    }

    return elevations;
}

export function TerrainMesh({
    width = 2000,
    height = 2000,
    widthSegments = 64,
    heightSegments = 64,
    maxElevation = 300,
    position = [0, -2, 0],
}: TerrainMeshProps) {
    const { layers } = useLayerStore();
    const terrainLayer = layers.terrain;
    const meshRef = useRef<THREE.Mesh>(null);

    // 建立地形幾何
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
        geo.rotateX(-Math.PI / 2);

        // 應用高程
        const elevations = generateMockElevation(widthSegments, heightSegments, maxElevation);
        const positions = geo.attributes.position.array as Float32Array;

        for (let i = 0; i < elevations.length; i++) {
            // Y 軸是高度 (因為已經旋轉過)
            positions[i * 3 + 1] = elevations[i];
        }

        geo.computeVertexNormals();
        return geo;
    }, [width, height, widthSegments, heightSegments, maxElevation]);

    // 材質
    const material = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: 0x7c9a6e,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: false,
            transparent: terrainLayer.opacity < 1,
            opacity: terrainLayer.opacity,
            side: THREE.DoubleSide,
        });
    }, [terrainLayer.opacity]);

    if (!terrainLayer.visible) return null;

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            position={position}
            receiveShadow
            castShadow
            raycast={() => null}
        />
    );
}

export default TerrainMesh;
