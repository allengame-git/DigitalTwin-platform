/**
 * Geology 3D Canvas 主容器
 * @module components/scene/GeologyCanvas
 */

import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls, Stats } from '@react-three/drei';
import { RENDERER_CONFIG, DEFAULT_CAMERA_CONFIG } from '../../config/three';
import { useBoreholeStore } from '../../stores/boreholeStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUploadStore } from '../../stores/uploadStore';
import { BoreholeInstances } from './BoreholeInstances';
import { SceneEnvironment } from './SceneEnvironment';
import { LoadingProgress } from '../overlay/LoadingProgress';
// Phase 7-10 新增元件
import { GeologyTiles } from './GeologyTiles';
import { ClippingPlane } from './ClippingPlane';
import { StructureLines } from './StructureLines';
import { StrikeDipSymbol } from './StrikeDipSymbol';
import { ImageryPlane } from './ImageryPlane';
import { TerrainMesh } from './TerrainMesh';
import { PerformanceMonitor } from './PerformanceMonitor';
import { GeophysicsPlane } from './GeophysicsPlane';
import { CameraController } from './CameraController';
import { useAttitudeStore } from '../../stores/attitudeStore';

interface GeologyCanvasProps {
    /** 是否顯示 FPS 統計 */
    showStats?: boolean;
    /** Canvas 樣式 */
    style?: React.CSSProperties;
}

export function GeologyCanvas({ showStats = false, style }: GeologyCanvasProps) {
    const { fetchBoreholes, status } = useBoreholeStore();
    const { activeProjectId } = useProjectStore();
    const { attitudes, fetchAttitudes } = useAttitudeStore();
    const { fetchGeologyModels } = useUploadStore();

    useEffect(() => {
        if (activeProjectId) {
            fetchBoreholes(activeProjectId);
            fetchAttitudes(activeProjectId);
            fetchGeologyModels();
        }
    }, [fetchBoreholes, fetchAttitudes, fetchGeologyModels, activeProjectId]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
            <Canvas
                camera={{
                    fov: DEFAULT_CAMERA_CONFIG.fov,
                    near: DEFAULT_CAMERA_CONFIG.near,
                    far: DEFAULT_CAMERA_CONFIG.far,
                    position: DEFAULT_CAMERA_CONFIG.position as [number, number, number],
                }}
                gl={{
                    antialias: RENDERER_CONFIG.antialias,
                    alpha: RENDERER_CONFIG.alpha,
                    stencil: true, // For Stencil Cap Rendering
                    powerPreference: RENDERER_CONFIG.powerPreference,
                    logarithmicDepthBuffer: RENDERER_CONFIG.logarithmicDepthBuffer,
                }}
            >
                <Suspense fallback={null}>
                    {/* 環境設定 */}
                    <SceneEnvironment />

                    {/* Phase 8.5: Terrain & Imagery (底層) */}
                    <TerrainMesh />
                    <ImageryPlane />
                    <GeophysicsPlane />

                    {/* Phase 7: 3D 地質模型 (使用上傳的模型) */}
                    <GeologyTiles />

                    {/* Phase 3-5: 鑽孔點位 */}
                    <BoreholeInstances />

                    {/* Phase 8: 地質構造 */}
                    <StructureLines />
                    <StrikeDipSymbol attitudes={attitudes} />

                    {/* Phase 7: Clipping Plane */}
                    <ClippingPlane />
                </Suspense>

                {/* 相機控制 */}
                <MapControls
                    enableRotate={true}
                    enablePan={true}
                    enableZoom={true}
                    enableDamping={false} // 取消慣性
                    maxPolarAngle={Math.PI / 2.1}
                    minDistance={50}
                    maxDistance={10000}
                />

                <PerformanceMonitor />
                <CameraController />
            </Canvas>

            {/* 載入進度 */}
            {status === 'loading' && <LoadingProgress />}
        </div>
    );
}

export default GeologyCanvas;

