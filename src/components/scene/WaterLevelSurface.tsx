/**
 * WaterLevelSurface Component
 * @module components/scene/WaterLevelSurface
 *
 * 地下水位面 3D 半透明曲面渲染
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';
import { useWaterLevelStore } from '../../stores/waterLevelStore';
import { useProjectStore } from '../../stores/projectStore';
import { useViewerStore } from '../../stores/viewerStore';
import { useLoader } from '@react-three/fiber';

/**
 * 外層 guard：在沒有 active water level 時直接 return null，
 * 避免 useLoader 嘗試載入空 URL
 */
export function WaterLevelSurface() {
    const { layers } = useLayerStore();
    const waterLevelLayer = layers.waterLevel;
    const { waterLevels, activeWaterLevelId } = useWaterLevelStore();

    const activeWaterLevel = useMemo(() =>
        waterLevels.find(w => w.id === activeWaterLevelId),
        [waterLevels, activeWaterLevelId]
    );

    if (!activeWaterLevel || !waterLevelLayer.visible || !activeWaterLevel.heightmap) {
        return null;
    }

    return (
        <WaterLevelMesh
            waterLevel={activeWaterLevel}
            opacity={waterLevelLayer.opacity}
        />
    );
}

/**
 * 內層 mesh：只在確定有 heightmap URL 時才渲染，
 * 此時 useLoader 可安全呼叫
 */
function WaterLevelMesh({ waterLevel, opacity }: {
    waterLevel: { heightmap: string; minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    opacity: number;
}) {
    const { getActiveProject } = useProjectStore();
    const project = getActiveProject();
    const clippingConfig = useViewerStore(state => state.clippingPlane);
    const meshRef = useRef<THREE.Mesh>(null);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const heightmapUrl = `${API_BASE}${waterLevel.heightmap}`;

    const heightMap = useLoader(THREE.TextureLoader, heightmapUrl);

    const xSize = waterLevel.maxX - waterLevel.minX;
    const ySize = waterLevel.maxY - waterLevel.minY;

    const originX = project?.originX || 0;
    const originY = project?.originY || 0;
    const centerX = waterLevel.minX + xSize / 2;
    const centerY = waterLevel.minY + ySize / 2;

    const segs = 256;

    const clippingPlanes = clippingConfig.enabled
        ? [new THREE.Plane(new THREE.Vector3(...clippingConfig.normal), clippingConfig.constant)]
        : [];

    return (
        <mesh
            ref={meshRef}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[centerX - originX, 0, -(centerY - originY)]}
            receiveShadow
            userData={{ layerType: 'waterLevel' }}
        >
            <planeGeometry args={[xSize, ySize, segs, segs]} />
            <meshStandardMaterial
                color={0x2196F3}
                displacementMap={heightMap}
                displacementScale={waterLevel.maxZ - waterLevel.minZ}
                displacementBias={waterLevel.minZ}
                roughness={0.3}
                metalness={0.1}
                side={THREE.DoubleSide}
                transparent={true}
                opacity={opacity}
                clippingPlanes={clippingPlanes}
                clipShadows={true}
            />
        </mesh>
    );
}

export default WaterLevelSurface;
