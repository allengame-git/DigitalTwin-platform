import React from 'react';
import { Environment } from '@react-three/drei';

export function FacilityEnvironment() {
    return (
        <>
            <color attach="background" args={['#e8ecf1']} />
            <fog attach="fog" args={['#e8ecf1', 2000, 10000]} />

            {/* IBL 環境光 — 讓 PBR 材質顯色正確 */}
            <Environment preset="city" environmentIntensity={0.8} />

            <ambientLight intensity={0.8} />
            {/* 主太陽光：偏西南方向，模擬下午陽光 */}
            <directionalLight
                position={[300, 500, -200]}
                intensity={3.0}
                castShadow
                shadow-mapSize-width={4096}
                shadow-mapSize-height={4096}
                shadow-camera-far={1500}
                shadow-camera-left={-300}
                shadow-camera-right={300}
                shadow-camera-top={300}
                shadow-camera-bottom={-300}
                shadow-bias={-0.0005}
            />
            <hemisphereLight
                args={['#cce8ff', '#c8a96e', 0.5]}
            />

            <gridHelper
                args={[2000, 100, '#cccccc', '#e0e0e0']}
                position={[0, -0.01, 0]}
            />
        </>
    );
}

export default FacilityEnvironment;
