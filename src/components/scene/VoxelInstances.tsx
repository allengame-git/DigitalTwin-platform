/**
 * VoxelInstances Component (Optimized)
 * @module components/scene/VoxelInstances
 * 
 * 使用 InstancedMesh 渲染 Voxel 體積
 * 優化版本：使用 MeshBasicMaterial + 簡化幾何 + LOD
 */

import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';
import { useViewerStore } from '../../stores/viewerStore';

// 臨時物件 (避免每幀建立)
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();
const tempMatrix = new THREE.Matrix4();

export interface VoxelData {
    positions: Float32Array;  // [x, y, z, ...] - World coordinates
    colors: Uint8Array;       // [r, g, b, ...]
    count: number;
}

interface VoxelInstancesProps {
    data: VoxelData;
    cellSize: [number, number, number];
    /** 最大顯示數量 (LOD 降採樣) */
    maxVisibleCount?: number;
}

// 預計算的單位矩陣
const identityMatrix = new THREE.Matrix4();

export function VoxelInstances({
    data,
    cellSize,
    maxVisibleCount = 100000  // 預設最多顯示 10 萬個
}: VoxelInstancesProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { camera } = useThree();
    const { layers } = useLayerStore();
    const clippingConfig = useViewerStore(state => state.clippingPlane);
    const multiSection = useViewerStore(state => state.multiSection);

    const geology3dLayer = layers.geology3d;

    // LOD: 根據資料量決定採樣率
    const sampleRate = useMemo(() => {
        if (data.count <= maxVisibleCount) return 1;
        return Math.ceil(data.count / maxVisibleCount);
    }, [data.count, maxVisibleCount]);

    const sampledCount = Math.ceil(data.count / sampleRate);

    // 建立簡化的 Box 幾何體 (加 5% padding 消除縫隙)
    const geometry = useMemo(() => {
        const padding = 1.05; // 5% 重疊避免縫隙
        const geo = new THREE.BoxGeometry(
            cellSize[0] * sampleRate * padding,
            cellSize[2] * sampleRate * padding, // Z in TWD97 -> Y in Three.js
            cellSize[1] * sampleRate * padding, // Y in TWD97 -> Z in Three.js
            1, 1, 1
        );
        return geo;
    }, [cellSize, sampleRate]);

    // 計算 Clipping Planes
    const clippingPlanes = useMemo(() => {
        if (multiSection.enabled) {
            const { axis, count, spacing, gapWidth, startPosition } = multiSection;
            const normal = axis === 'x'
                ? new THREE.Vector3(1, 0, 0)
                : new THREE.Vector3(0, 0, 1);
            const negNormal = normal.clone().negate();

            const planes: THREE.Plane[] = [];
            for (let i = 0; i < count; i++) {
                const sliceStart = startPosition + i * spacing;
                const sliceEnd = sliceStart + spacing - gapWidth;
                planes.push(
                    new THREE.Plane(normal, -sliceStart),
                    new THREE.Plane(negNormal, sliceEnd)
                );
            }
            return planes;
        }

        if (clippingConfig.enabled) {
            return [new THREE.Plane(
                new THREE.Vector3(...clippingConfig.normal),
                clippingConfig.constant
            )];
        }

        return [];
    }, [clippingConfig, multiSection]);

    // 建立高效材質 (只建立一次，動態更新屬性)
    // InstancedMesh 使用 instance color (setColorAt)，不是 vertex colors
    const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);

    const material = useMemo(() => {
        if (!materialRef.current) {
            materialRef.current = new THREE.MeshBasicMaterial({
                // 不使用 vertexColors，因為 InstancedMesh 用的是 instanceColor
                color: 0xffffff, // 基礎色設為白色，讓 instanceColor 主導
                transparent: geology3dLayer.opacity < 1,
                opacity: geology3dLayer.opacity,
                side: THREE.DoubleSide,
            });
        }
        return materialRef.current;
    }, []);

    // 動態更新 clipping planes (不重建材質)
    useLayoutEffect(() => {
        if (materialRef.current) {
            materialRef.current.clippingPlanes = clippingPlanes;
            materialRef.current.needsUpdate = true;
        }
    }, [clippingPlanes]);

    // 更新 InstancedMesh (降採樣)
    useLayoutEffect(() => {
        if (!meshRef.current || data.count === 0) return;

        const { positions, colors, count } = data;
        let instanceIndex = 0;

        // Debug: 顯示前 5 個顏色
        console.log('🎨 Color debug (first 5):');
        for (let d = 0; d < Math.min(5, count); d++) {
            console.log(`  [${d}] R=${colors[d * 3]}, G=${colors[d * 3 + 1]}, B=${colors[d * 3 + 2]}`);
        }

        for (let i = 0; i < count; i += sampleRate) {
            if (instanceIndex >= sampledCount) break;

            // 位置
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];

            tempObject.position.set(x, y, z);
            tempObject.scale.setScalar(1);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(instanceIndex, tempObject.matrix);

            // 顏色 (使用 SRGBColorSpace 避免色彩空間轉換問題)
            const r = colors[i * 3] / 255;
            const g = colors[i * 3 + 1] / 255;
            const b = colors[i * 3 + 2] / 255;
            tempColor.setRGB(r, g, b, THREE.SRGBColorSpace);
            meshRef.current.setColorAt(instanceIndex, tempColor);

            instanceIndex++;
        }

        // 填充剩餘 instances 為不可見 (scale = 0)
        tempObject.scale.setScalar(0);
        tempObject.updateMatrix();
        for (let i = instanceIndex; i < sampledCount; i++) {
            meshRef.current.setMatrixAt(i, tempObject.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }

        // 計算 bounding sphere 以啟用 frustum culling
        meshRef.current.computeBoundingSphere();

        console.log(`🎯 VoxelInstances: Rendering ${instanceIndex}/${count} voxels (sample rate: ${sampleRate}x)`);
    }, [data, sampleRate, sampledCount]);

    // 更新材質透明度 (不需每幀更新，改為 effect)
    useLayoutEffect(() => {
        if (material) {
            material.transparent = geology3dLayer.opacity < 1;
            material.opacity = geology3dLayer.opacity;
            material.needsUpdate = true;
        }
    }, [geology3dLayer.opacity, material]);

    if (!geology3dLayer.visible || data.count === 0) return null;

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, sampledCount]}
            frustumCulled={true}  // 啟用視錐剔除
        />
    );
}

export default VoxelInstances;
