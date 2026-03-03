import React from 'react';

export function FacilityEnvironment() {
    return (
        <>
            <color attach="background" args={['#e8ecf1']} />
            <fog attach="fog" args={['#e8ecf1', 2000, 10000]} />

            <ambientLight intensity={0.6} />
            <directionalLight
                position={[200, 400, 200]}
                intensity={1.0}
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
                args={['#b1e1ff', '#b97a20', 0.3]}
            />

            <gridHelper
                args={[2000, 100, '#cccccc', '#e0e0e0']}
                position={[0, -0.01, 0]}
            />
        </>
    );
}

export default FacilityEnvironment;
