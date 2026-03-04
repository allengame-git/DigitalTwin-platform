import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { FacilityEnvironment } from './FacilityEnvironment';
import { FacilityModels } from './FacilityModels';
import { FacilityTerrain } from './FacilityTerrain';
import { FacilityCameraController } from './FacilityCameraController';
import { FacilityCaptureHandler } from './FacilityCaptureHandler';
import { useFacilityStore } from '../../stores/facilityStore';
import { ScaleBarCalculator, ScaleBarOverlay, useScaleBar } from '../overlay/ScaleBar';

export function FacilityCanvas() {
    const isLoading = useFacilityStore(state => state.isLoading);
    const { pixelsPerMeter, handleScaleChange } = useScaleBar();

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
                shadows
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
                <ScaleBarCalculator onScaleChange={handleScaleChange} />
            </Canvas>

            <ScaleBarOverlay pixelsPerMeter={pixelsPerMeter} />

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
    );
}

export default FacilityCanvas;
