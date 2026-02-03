/**
 * GeologyTiles Component
 * @module components/scene/GeologyTiles
 * 
 * 3D Tiles 地質模型載入器
 * Task: T037
 */

import React, { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';

// Note: 3d-tiles-renderer 的實際整合需要 tileset URL
// 目前使用 Placeholder 實作

interface GeologyTilesProps {
    tilesetUrl?: string;
}

export function GeologyTiles({ tilesetUrl }: GeologyTilesProps) {
    const { scene } = useThree();
    const { layers } = useLayerStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const groupRef = useRef<THREE.Group>(null);

    const geology3dLayer = layers.geology3d;

    // Placeholder: 模擬載入狀態
    useEffect(() => {
        if (!tilesetUrl) {
            // 無 URL 時顯示 Placeholder
            setLoading(false);
            return;
        }

        // TODO: 實際整合 3d-tiles-renderer
        // const tilesRenderer = new TilesRenderer(tilesetUrl);
        // tilesRenderer.setCamera(camera);
        // tilesRenderer.setResolutionFromRenderer(camera, renderer);
        // scene.add(tilesRenderer.group);

        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);

        return () => {
            clearTimeout(timer);
            // tilesRenderer.dispose();
        };
    }, [tilesetUrl, scene]);

    // 圖層可見性控制
    useEffect(() => {
        if (groupRef.current) {
            groupRef.current.visible = geology3dLayer.visible;
        }
    }, [geology3dLayer.visible]);

    // 透明度控制 (需要遍歷所有 mesh)
    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    if (mesh.material instanceof THREE.MeshStandardMaterial) {
                        mesh.material.transparent = geology3dLayer.opacity < 1;
                        mesh.material.opacity = geology3dLayer.opacity;
                    }
                }
            });
        }
    });

    if (!geology3dLayer.visible) return null;

    // 無 tileset URL 時顯示 Placeholder
    if (!tilesetUrl) {
        return (
            <group ref={groupRef}>
                {/* Placeholder Box */}
                <mesh position={[0, -50, 0]}>
                    <boxGeometry args={[200, 100, 200]} />
                    <meshStandardMaterial
                        color={0x8b7355}
                        transparent
                        opacity={geology3dLayer.opacity * 0.3}
                        wireframe
                    />
                </mesh>

                {/* 提示文字 */}
                <Html position={[0, 0, 0]} center>
                    <div
                        style={{
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        🧊 3D 地質模型 (待載入)
                    </div>
                </Html>
            </group>
        );
    }

    if (loading) {
        return (
            <Html center>
                <div style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '4px' }}>
                    載入 3D Tiles...
                </div>
            </Html>
        );
    }

    if (error) {
        return (
            <Html center>
                <div style={{ color: 'red', background: 'rgba(0,0,0,0.7)', padding: '8px 16px', borderRadius: '4px' }}>
                    載入失敗: {error}
                </div>
            </Html>
        );
    }

    // 實際 3D Tiles 會在這裡渲染
    return <group ref={groupRef} />;
}

export default GeologyTiles;
