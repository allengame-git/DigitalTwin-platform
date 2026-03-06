import React, { useMemo } from 'react';
import { Environment } from '@react-three/drei';
import { useFacilityStore } from '../../stores/facilityStore';

/** 根據場景範圍計算燈光/影子/環境參數 */
function useSceneLighting() {
    const currentScene = useFacilityStore(state => state.getCurrentScene());
    const models = useFacilityStore(state => state.models);
    const modelBboxCenters = useFacilityStore(state => state.modelBboxCenters);

    return useMemo(() => {
        // 1. 優先使用手動設定的 sceneBounds
        let range: number;
        if (currentScene?.sceneBounds) {
            const b = currentScene.sceneBounds;
            range = Math.max(b.width, b.depth);
        } else {
            // 2. 自動根據模型 bbox 計算
            const centers = Object.values(modelBboxCenters);
            if (centers.length > 0) {
                let minX = Infinity, maxX = -Infinity;
                let minZ = Infinity, maxZ = -Infinity;
                for (const c of centers) {
                    if (c.x < minX) minX = c.x;
                    if (c.x > maxX) maxX = c.x;
                    if (c.z < minZ) minZ = c.z;
                    if (c.z > maxZ) maxZ = c.z;
                }
                // 加上模型 scale 的 buffer
                let maxScale = 0;
                for (const m of models) {
                    const s = Math.max(m.scale.x, m.scale.y, m.scale.z) * 10;
                    if (s > maxScale) maxScale = s;
                }
                range = Math.max(maxX - minX, maxZ - minZ) + maxScale;
            } else {
                range = 500; // 預設 fallback
            }
        }

        // 最小 range 保護
        range = Math.max(range, 20);

        const gridDivisions = Math.min(200, Math.max(20, Math.round(range / 10)));

        return {
            range,
            lightPosition: [range * 0.3, range * 0.5, -range * 0.2] as [number, number, number],
            shadowCameraSize: range * 0.7,
            shadowCameraFar: range * 2,
            shadowNormalBias: Math.max(0.02, range * 0.00005),
            groundSize: range * 2.5,
            gridSize: range * 1.5,
            gridDivisions,
            fogNear: range * 1.5,
            fogFar: range * 6,
        };
    }, [currentScene?.sceneBounds, modelBboxCenters, models]);
}

export function FacilityEnvironment() {
    const lighting = useSceneLighting();

    return (
        <>
            <color attach="background" args={['#e8ecf1']} />
            <fog attach="fog" args={['#e8ecf1', lighting.fogNear, lighting.fogFar]} />

            {/* IBL 環境光 — 讓 PBR 材質顯色正確 */}
            <Environment preset="city" environmentIntensity={0.8} />

            <ambientLight intensity={0.8} />
            {/* 主太陽光：位置與影子範圍隨場景自適應 */}
            <directionalLight
                position={lighting.lightPosition}
                intensity={3.0}
                castShadow
                shadow-mapSize-width={4096}
                shadow-mapSize-height={4096}
                shadow-camera-far={lighting.shadowCameraFar}
                shadow-camera-left={-lighting.shadowCameraSize}
                shadow-camera-right={lighting.shadowCameraSize}
                shadow-camera-top={lighting.shadowCameraSize}
                shadow-camera-bottom={-lighting.shadowCameraSize}
                shadow-bias={-0.0003}
                shadow-normalBias={lighting.shadowNormalBias}
            />
            <hemisphereLight
                args={['#cce8ff', '#c8a96e', 0.5]}
            />

            <gridHelper
                args={[lighting.gridSize, lighting.gridDivisions, '#cccccc', '#e0e0e0']}
                position={[0, -0.01, 0]}
            />

            {/* 透明地面 — 只用來接收模型陰影 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                <planeGeometry args={[lighting.groundSize, lighting.groundSize]} />
                <shadowMaterial transparent opacity={0.35} />
            </mesh>
        </>
    );
}

export default FacilityEnvironment;
