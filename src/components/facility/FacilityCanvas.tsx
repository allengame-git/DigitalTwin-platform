import React, { Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { FacilityEnvironment } from './FacilityEnvironment';
import { FacilityModels } from './FacilityModels';
import { FacilityTerrain } from './FacilityTerrain';
import { FacilityCameraController } from './FacilityCameraController';
import { FacilityCaptureHandler } from './FacilityCaptureHandler';
import { useFacilityStore } from '../../stores/facilityStore';
import { ScaleBarCalculator, ScaleBarOverlay, useScaleBar } from '../overlay/ScaleBar';
import { FacilityNorthArrowCalculator, FacilityNorthArrowOverlay, useFacilityNorthArrow } from './FacilityNorthArrow';
import { useMarqueeSelect, _setMarqueeRefs } from '../../hooks/useMarqueeSelect';
import { MarqueeOverlay } from './MarqueeOverlay';
import { ErrorBoundary } from '../common/ErrorBoundary';

/** Canvas 內的同步元件，將 camera/controls 寫入 module-level refs 供 useMarqueeSelect 使用 */
function MarqueeCameraSync() {
    const { camera, controls } = useThree();
    React.useEffect(() => {
        _setMarqueeRefs(camera, controls);
    }, [camera, controls]);
    return null;
}

interface FacilityCanvasProps {
    /** Canvas 內部額外 children（如 ReviewMarkerPin） */
    children?: React.ReactNode;
}

export function FacilityCanvas({ children }: FacilityCanvasProps = {}) {
    const isLoading = useFacilityStore(state => state.isLoading);
    const selectModel = useFacilityStore(state => state.selectModel);
    const { pixelsPerMeter, handleScaleChange } = useScaleBar();
    const { cameraRotation, handleRotationChange } = useFacilityNorthArrow();
    const { containerRef, rect, isDragging } = useMarqueeSelect();

    return (
        <ErrorBoundary fallback={
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: '#111', color: '#ccc', gap: '12px',
            }}>
                <p style={{ fontSize: '16px', fontWeight: 500 }}>3D 場景載入失敗</p>
                <p style={{ fontSize: '13px', color: '#888' }}>可能是模型檔案損壞或 WebGL 不支援</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '8px 20px', fontSize: '13px',
                        background: '#2563eb', color: '#fff',
                        border: 'none', borderRadius: '6px', cursor: 'pointer',
                    }}
                >
                    重新載入
                </button>
            </div>
        }>
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Canvas
                camera={{
                    fov: 45,
                    near: 0.1,
                    far: 50000,
                    position: [0, 200, 400] as [number, number, number],
                }}
                gl={{
                    antialias: true,
                    alpha: false,
                    logarithmicDepthBuffer: true,
                    powerPreference: 'high-performance',
                    preserveDrawingBuffer: true,   // 截圖必要
                }}
                linear={false}  // 確保 sRGB 輸出，GLB 材質顏色正確
                shadows
                onPointerMissed={() => {
                    if (!isDragging.current) selectModel(null);
                }}
            >
                <Suspense fallback={null}>
                    <FacilityEnvironment />
                    <FacilityTerrain />
                    <FacilityModels />
                </Suspense>

                <MapControls
                    makeDefault
                    enableRotate={true}
                    enablePan={true}
                    enableZoom={true}
                    enableDamping={true}
                    dampingFactor={0.1}
                    maxPolarAngle={Math.PI / 2.1}
                    minDistance={1}
                    maxDistance={5000}
                />

                <FacilityCameraController />
                <FacilityCaptureHandler />
                <MarqueeCameraSync />
                <ScaleBarCalculator onScaleChange={handleScaleChange} />
                <FacilityNorthArrowCalculator onRotationChange={handleRotationChange} />

                {/* Review marker pins (from parent) */}
                {children}
            </Canvas>

            {rect && <MarqueeOverlay rect={rect} />}

            <ScaleBarOverlay pixelsPerMeter={pixelsPerMeter} />
            <FacilityNorthArrowOverlay cameraRotation={cameraRotation} />

            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    pointerEvents: 'none',
                }}>
                    載入中...
                </div>
            )}
        </div>
        </ErrorBoundary>
    );
}

export default FacilityCanvas;
