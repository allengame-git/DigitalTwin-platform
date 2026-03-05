import React from 'react';
import { Environment } from '@react-three/drei';

export function FacilityEnvironment() {
    return (
        <>
            <color attach="background" args={['#e8ecf1']} />
            <fog attach="fog" args={['#e8ecf1', 2000, 10000]} />

            {/* IBL 環境光 — 讓 PBR 材質顯色正確 */}
            <Environment preset="city" environmentIntensity={0.8} />

            <ambientLight intensity={1.2} />
            <directionalLight
                position={[200, 400, 200]}
                intensity={2.0}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={2000}
                shadow-camera-left={-500}
                shadow-camera-right={500}
                shadow-camera-top={500}
                shadow-camera-bottom={-500}
            />
            <hemisphereLight
                args={['#d4eeff', '#b97a20', 0.6]}
            />

            <gridHelper
                args={[2000, 100, '#cccccc', '#e0e0e0']}
                position={[0, -0.01, 0]}
            />
        </>
    );
}

export default FacilityEnvironment;
