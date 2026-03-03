/**
 * FacilityTerrain — 設施導覽地形元件
 * 從 useFacilityStore 取得 currentScene 的地形資料，
 * 在 3D 場景中渲染帶有 heightmap 位移的地形 mesh。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFacilityStore } from '@/stores/facilityStore';

interface TerrainBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
}

interface HeightData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

export function FacilityTerrain() {
    const scenes = useFacilityStore(state => state.scenes);
    const currentSceneId = useFacilityStore(state => state.currentSceneId);
    const currentScene = useMemo(
        () => scenes.find(s => s.id === currentSceneId),
        [scenes, currentSceneId]
    );

    const [heightData, setHeightData] = useState<HeightData | null>(null);
    const [colorTexture, setColorTexture] = useState<THREE.Texture | null>(null);

    const bounds = currentScene?.terrainBounds as TerrainBounds | null;

    // 載入 heightmap（Image + Canvas 方式讀取 16-bit 灰階 PNG）
    useEffect(() => {
        if (!currentScene?.terrainHeightmapUrl) {
            setHeightData(null);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = currentScene.terrainHeightmapUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setHeightData({
                data: imageData.data,
                width: canvas.width,
                height: canvas.height,
            });
        };

        img.onerror = () => {
            console.error('[FacilityTerrain] Failed to load heightmap:', currentScene.terrainHeightmapUrl);
            setHeightData(null);
        };
    }, [currentScene?.terrainHeightmapUrl]);

    // 載入 colorTexture
    useEffect(() => {
        if (!currentScene?.terrainTextureUrl) {
            setColorTexture(null);
            return;
        }

        const loader = new THREE.TextureLoader();
        let tex: THREE.Texture | null = null;

        loader.load(
            currentScene.terrainTextureUrl,
            (loadedTex) => {
                tex = loadedTex;
                setColorTexture(loadedTex);
            },
            undefined,
            (err) => {
                console.error('[FacilityTerrain] Failed to load color texture:', err);
            }
        );

        return () => {
            if (tex) {
                tex.dispose();
            }
        };
    }, [currentScene?.terrainTextureUrl]);

    // 計算地形尺寸（依據 bounds）
    const terrainWidth = bounds ? bounds.maxX - bounds.minX : 0;
    const terrainHeight = bounds ? bounds.maxY - bounds.minY : 0;
    const segments = 256;

    // 建立 PlaneGeometry（useMemo 確保 bounds 改變時重建）
    const geometry = useMemo(() => {
        if (!bounds) return null;
        return new THREE.PlaneGeometry(terrainWidth, terrainHeight, segments, segments);
    }, [terrainWidth, terrainHeight, bounds]);

    // 設定頂點高程（heightmap displacement）
    useEffect(() => {
        if (!geometry || !heightData || !bounds) return;

        const positions = geometry.attributes.position as THREE.BufferAttribute;
        const gridW = segments + 1;
        const gridH = segments + 1;

        for (let i = 0; i < gridH; i++) {
            for (let j = 0; j < gridW; j++) {
                const idx = i * gridW + j;
                // UV 坐標（0~1）
                const u = j / segments;
                const v = i / segments;
                // 對應 heightmap 像素
                const px = Math.floor(u * (heightData.width - 1));
                const py = Math.floor((1 - v) * (heightData.height - 1));
                const pixelIdx = (py * heightData.width + px) * 4;
                const r = heightData.data[pixelIdx];
                const g = heightData.data[pixelIdx + 1];
                // 16-bit 灰階：R channel 為高位元組，G channel 為低位元組
                const normalizedHeight = (r * 256 + g) / 65535;
                const elevation = bounds.minZ + normalizedHeight * (bounds.maxZ - bounds.minZ);
                positions.setY(idx, elevation);
            }
        }

        positions.needsUpdate = true;
        geometry.computeVertexNormals();
    }, [geometry, heightData, bounds]);

    // Cleanup geometry on unmount or when recreated
    const prevGeometryRef = useRef<THREE.PlaneGeometry | null>(null);
    useEffect(() => {
        const prev = prevGeometryRef.current;
        prevGeometryRef.current = geometry;
        if (prev && prev !== geometry) {
            prev.dispose();
        }
    }, [geometry]);

    // Cleanup color texture on unmount
    useEffect(() => {
        return () => {
            colorTexture?.dispose();
        };
    }, [colorTexture]);

    if (!currentScene?.terrainHeightmapUrl || !bounds || !geometry) return null;

    const coordShiftX = currentScene.coordShiftX ?? 0;
    const coordShiftY = currentScene.coordShiftY ?? 0;
    const coordShiftZ = currentScene.coordShiftZ ?? 0;
    const coordRotation = currentScene.coordRotation ?? 0;

    return (
        <group
            position={[coordShiftX, coordShiftZ, -coordShiftY]}
            rotation={[0, coordRotation * Math.PI / 180, 0]}
        >
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <primitive object={geometry} />
                <meshStandardMaterial
                    map={colorTexture ?? undefined}
                    color={colorTexture ? '#ffffff' : '#8B9E7A'}
                    roughness={0.8}
                    metalness={0}
                />
            </mesh>
        </group>
    );
}

export default FacilityTerrain;
