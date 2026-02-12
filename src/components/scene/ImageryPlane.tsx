/**
 * ImageryPlane Component
 * @module components/scene/ImageryPlane
 * 
 * 航照底圖平面
 * Task: T043b
 */

import React, { useMemo, Suspense } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUploadStore } from '../../stores/uploadStore';

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

    const tileSize = 32;
    for (let y = 0; y < canvas.height; y += tileSize) {
        for (let x = 0; x < canvas.width; x += tileSize) {
            const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
            ctx.fillStyle = isEven ? '#e5e7eb' : '#d1d5db';
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }

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

// 載入紋理的內部組件
function ImageryMesh({
    imageUrl,
    width,
    height,
    position,
    opacity
}: {
    imageUrl: string;
    width: number;
    height: number;
    position: [number, number, number];
    opacity: number;
}) {
    const texture = useTexture(imageUrl);

    // 改善 Texture 設定
    React.useLayoutEffect(() => {
        texture.anisotropy = 16;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
    }, [texture]);

    return (
        <mesh
            position={position}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            raycast={() => null}
        >
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial
                map={texture}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
                depthWrite={false} // 關鍵修正：解決 Z-fighting
                polygonOffset={true}
                polygonOffsetFactor={-4} // 調整 Offset 確保在地形上方
            />
        </mesh>
    );
}

// Placeholder 平面
function PlaceholderMesh({
    width,
    height,
    position,
    opacity
}: {
    width: number;
    height: number;
    position: [number, number, number];
    opacity: number;
}) {
    const texture = useMemo(() => createPlaceholderTexture(), []);

    return (
        <mesh
            position={position}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            raycast={() => null}
        >
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial
                map={texture}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
                depthWrite={false}
                polygonOffset={true}
                polygonOffsetFactor={-4}
            />
        </mesh>
    );
}

export function ImageryPlane({
    imageUrl: propImageUrl,
    width: defaultWidth = 2000,
    height: defaultHeight = 2000,
    position: defaultPosition = [0, -1, 0],
}: ImageryPlaneProps) {
    const { layers } = useLayerStore();
    const imageryLayer = layers.imagery;
    const activeImagery = useUploadStore(state => state.getActiveImagery());

    // 優先使用 Store 中的 URL，其次使用 prop
    const imageUrl = activeImagery?.url || propImageUrl;

    // 計算地理位置 (如果有的話)
    const activeProject = useProjectStore(state => state.getActiveProject());

    // 計算地理位置 (如果有的話)
    const { finalWidth, finalHeight, finalPosition } = useMemo(() => {
        if (activeImagery?.minX !== null && activeImagery?.minX !== undefined &&
            activeImagery?.maxX !== null && activeImagery?.maxX !== undefined &&
            activeImagery?.minY !== null && activeImagery?.minY !== undefined &&
            activeImagery?.maxY !== null && activeImagery?.maxY !== undefined &&
            activeProject) {

            // Apply project origin offset
            const minX = activeImagery.minX - activeProject.originX;
            const maxX = activeImagery.maxX - activeProject.originX;
            const minY = activeImagery.minY - activeProject.originY; // Note: Y in 3D is usually up, but here we map TWD97 Y to -Z or similar. 
            // Wait, TWD97 Y is North. In 3D (x, y, z), usually x=East, z=-North (or South).
            // Let's stick to the existing logic: TWD97 X -> 3D X, TWD97 Y -> 3D -Z.
            const maxY = activeImagery.maxY - activeProject.originY;

            const w = Math.abs(maxX - minX);
            const h = Math.abs(maxY - minY);
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            return {
                finalWidth: w,
                finalHeight: h,
                // Y設為 zOffset: 確保在地形上方，可由使用者調整
                finalPosition: [centerX, (imageryLayer.zOffset ?? 5), -centerY] as [number, number, number]
            };
        }

        return {
            finalWidth: defaultWidth,
            finalHeight: defaultHeight,
            // 預設高度也稍微抬高
            finalPosition: [defaultPosition[0], 0.5, defaultPosition[2]] as [number, number, number]
        };
    }, [activeImagery, activeProject, defaultWidth, defaultHeight, defaultPosition, imageryLayer]);


    if (!imageryLayer.visible) return null;

    if (imageUrl) {
        return (
            <Suspense fallback={
                <PlaceholderMesh
                    width={finalWidth}
                    height={finalHeight}
                    position={finalPosition}
                    opacity={imageryLayer.opacity}
                />
            }>
                <ImageryMesh
                    imageUrl={imageUrl}
                    width={finalWidth}
                    height={finalHeight}
                    position={finalPosition}
                    opacity={imageryLayer.opacity}
                />
            </Suspense>
        );
    }

    return (
        <PlaceholderMesh
            width={finalWidth}
            height={finalHeight}
            position={finalPosition}
            opacity={imageryLayer.opacity}
        />
    );
}

export default ImageryPlane;
