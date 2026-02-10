/**
 * GeologyTiles Component
 * @module components/scene/GeologyTiles
 * 
 * 3D 地質模型載入器
 * 載入後端生成的 GLB Isosurface Mesh
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';
import { useUploadStore } from '../../stores/uploadStore';
import { useViewerStore } from '../../stores/viewerStore';
import { useCameraStore } from '../../stores/cameraStore';
import { twd97ToWorld } from '../../utils/coordinates';

interface GeologyTilesProps {
    meshUrl?: string;
}

/**
 * 內部 GLB Mesh 渲染器
 */
function GeologyMesh({
    url,
    modelBounds
}: {
    url: string;
    modelBounds?: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
}) {
    const { scene } = useGLTF(url);
    const groupRef = useRef<THREE.Group>(null);
    const { gl } = useThree();

    const { layers } = useLayerStore();
    const clippingConfig = useViewerStore(state => state.clippingPlane);

    const geology3dLayer = layers.geology3d;
    const modelOffset = useViewerStore(state => state.config.modelOffset);

    // 計算 Clipping Planes (單一切片模式)
    const clippingPlanes = useMemo(() => {
        if (!clippingConfig.enabled) return [];

        const normal = new THREE.Vector3(
            clippingConfig.normal[0],
            clippingConfig.normal[1],
            clippingConfig.normal[2]
        );
        return [new THREE.Plane(normal, clippingConfig.constant)];
    }, [clippingConfig]);

    // 啟用 renderer clipping
    useEffect(() => {
        gl.localClippingEnabled = true;
    }, [gl]);

    // Debug: 顯示 mesh 資訊
    useEffect(() => {
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        console.log('📦 GLB Mesh loaded:', {
            url,
            childCount: scene.children.length,
            boundingBox: {
                min: box.min.toArray(),
                max: box.max.toArray(),
            },
            size: size.toArray(),
            center: center.toArray(),
        });
    }, [scene, url]);

    // 套用材質屬性
    useEffect(() => {
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshStandardMaterial;
                if (mat) {
                    mat.transparent = geology3dLayer.opacity < 1;
                    mat.opacity = geology3dLayer.opacity;
                    mat.clippingPlanes = clippingPlanes;
                    mat.clipShadows = true;
                    mat.needsUpdate = true;
                }
            }
        });
    }, [scene, geology3dLayer.opacity, clippingPlanes]);

    if (!geology3dLayer.visible) return null;

    return (
        <group ref={groupRef} position={modelOffset}>
            <primitive object={scene} />
        </group>
    );
}

export function GeologyTiles({ meshUrl: propMeshUrl }: GeologyTilesProps) {
    const geologyModels = useUploadStore(state => state.geologyModels);
    const activeGeologyModelId = useUploadStore(state => state.activeGeologyModelId);
    const { setTargetCenter } = useCameraStore();

    // 取得當前使用的模型
    const geologyModel = geologyModels.find(m => m.id === activeGeologyModelId) || null;

    // 決定使用哪個 URL
    const meshUrl = propMeshUrl || geologyModel?.meshUrl;

    // Debug log
    console.log('🌍 GeologyTiles Debug:', {
        geologyModelsCount: geologyModels.length,
        activeGeologyModelId,
        geologyModelId: geologyModel?.id,
        meshUrl,
        meshFormat: geologyModel?.meshFormat,
        conversionStatus: geologyModel?.conversionStatus,
    });

    // 使用 useMemo 避免無限迴圈
    const modelBounds = useMemo(() => {
        if (!geologyModel) return undefined;
        return {
            minX: geologyModel.minX ?? 0,
            maxX: geologyModel.maxX ?? 0,
            minY: geologyModel.minY ?? 0,
            maxY: geologyModel.maxY ?? 0,
            minZ: geologyModel.minZ ?? 0,
            maxZ: geologyModel.maxZ ?? 0,
        };
    }, [geologyModel?.id, geologyModel?.minX, geologyModel?.maxX, geologyModel?.minY, geologyModel?.maxY, geologyModel?.minZ, geologyModel?.maxZ]);

    // 設定相機重置目標 (只在模型變更時執行)
    useEffect(() => {
        if (modelBounds && modelBounds.maxX !== 0) {
            const centerX = (modelBounds.minX + modelBounds.maxX) / 2;
            const centerY = (modelBounds.minY + modelBounds.maxY) / 2;
            const centerZ = (modelBounds.minZ + modelBounds.maxZ) / 2;

            const worldCenter = twd97ToWorld({ x: centerX, y: centerY, z: centerZ });
            setTargetCenter([worldCenter.x, worldCenter.y, worldCenter.z]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geologyModel?.id]);

    // 檢查轉換狀態
    if (geologyModel?.conversionStatus === 'processing') {
        return (
            <Html center>
                <div style={{
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '20px 40px',
                    borderRadius: '8px',
                    textAlign: 'center',
                }}>
                    <div>🔄 生成 3D Mesh 中...</div>
                    <div style={{ marginTop: '8px', fontSize: '24px' }}>
                        {geologyModel.conversionProgress || 0}%
                    </div>
                </div>
            </Html>
        );
    }

    if (geologyModel?.conversionStatus === 'failed') {
        return (
            <Html center>
                <div style={{
                    background: 'rgba(200,0,0,0.8)',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                }}>
                    ❌ 轉換失敗: {geologyModel.conversionError}
                </div>
            </Html>
        );
    }

    if (!meshUrl) {
        return null;
    }

    return (
        <React.Suspense fallback={
            <Html center>
                <div style={{
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                }}>
                    載入 3D 模型中...
                </div>
            </Html>
        }>
            <GeologyMesh url={meshUrl} modelBounds={modelBounds} />
        </React.Suspense>
    );
}
