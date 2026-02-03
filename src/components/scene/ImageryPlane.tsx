/**
 * ImageryPlane Component
 * @module components/scene/ImageryPlane
 * 
 * 航照底圖平面
 * Task: T043b
 */

import React, { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';

interface ImageryPlaneProps {
    imageUrl?: string;
    width?: number;
    height?: number;
    position?: [number, number, number];
}

// Placeholder 紋理 (棋盤格)
function createPlaceholderTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // 繪製棋盤格
    const tileSize = 32;
    for (let y = 0; y < canvas.height; y += tileSize) {
        for (let x = 0; x < canvas.width; x += tileSize) {
            const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
            ctx.fillStyle = isEven ? '#e5e7eb' : '#d1d5db';
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }

    // 加上標註
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('航照圖 (待載入)', 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
}

export function ImageryPlane({
    imageUrl,
    width = 2000,
    height = 2000,
    position = [0, -1, 0],
}: ImageryPlaneProps) {
    const { layers } = useLayerStore();
    const imageryLayer = layers.imagery;

    // 使用實際圖片或 Placeholder
    const texture = useMemo(() => {
        if (!imageUrl) {
            return createPlaceholderTexture();
        }
        // 實際圖片會由 useTexture 載入
        return null;
    }, [imageUrl]);

    // 如果有 imageUrl，使用 drei 的 useTexture
    const loadedTexture = imageUrl ? useTexture(imageUrl) : null;
    const finalTexture = loadedTexture || texture;

    if (!imageryLayer.visible) return null;

    return (
        <mesh
            position={position}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            raycast={() => null}
        >
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial
                map={finalTexture}
                transparent
                opacity={imageryLayer.opacity}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

export default ImageryPlane;
