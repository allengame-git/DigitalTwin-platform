/**
 * 場景環境設定 (燈光、地面)
 * @module components/scene/SceneEnvironment
 */

import React from 'react';
import { Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useViewerStore } from '../../stores/viewerStore';

interface SceneEnvironmentProps {
    /** 是否顯示網格 */
    showGrid?: boolean;
    /** 地面大小 (公尺) */
    groundSize?: number;
}

export function SceneEnvironment({
    showGrid = true,
    groundSize = 10000
}: SceneEnvironmentProps) {
    const { config } = useViewerStore();

    return (
        <>
            <color attach="background" args={[config.backgroundColor]} />

            {/* 環境光 */}
            <ambientLight intensity={0.4} />

            {/* 主光源 (太陽) */}
            <directionalLight
                position={[1000, 2000, 1000]}
                intensity={1}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={5000}
                shadow-camera-left={-2000}
                shadow-camera-right={2000}
                shadow-camera-top={2000}
                shadow-camera-bottom={-2000}
            />

            {/* 補光 */}
            <directionalLight
                position={[-500, 500, -500]}
                intensity={0.3}
            />

            {/* 天空環境 (如果背景顏色不是預設，可能需要隱藏或調整 Environment) */}
            {config.backgroundColor === '#f0f0f0' && <Environment preset="city" />}

            {/* 地面網格 */}
            {showGrid && (
                <Grid
                    args={[groundSize, groundSize]}
                    cellSize={100}
                    cellThickness={0.5}
                    cellColor="#6e6e6e"
                    sectionSize={500}
                    sectionThickness={1}
                    sectionColor="#9d4b4b"
                    fadeDistance={5000}
                    fadeStrength={1}
                    followCamera={false}
                    infiniteGrid={true}
                />
            )}

            {/* 基礎地面 (僅用於視覺，禁用 raycast 以免攔截點擊) */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -1, 0]}
                receiveShadow
                raycast={() => null}
            >
                <planeGeometry args={[groundSize, groundSize]} />
                <meshStandardMaterial
                    color="#3a5a3a"
                    transparent
                    opacity={0.3}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* 霧氣效果 - 跟隨背景色 */}
            <fog attach="fog" args={[config.backgroundColor, 1000, 8000]} />
        </>
    );
}

export default SceneEnvironment;
