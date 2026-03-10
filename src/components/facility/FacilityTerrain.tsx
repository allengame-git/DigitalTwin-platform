/**
 * FacilityTerrain — 設施導覽地形元件
 * 從 useFacilityStore 取得 currentScene 的地形資料，
 * 在 3D 場景中渲染帶有 heightmap 位移的地形 mesh。
 *
 * 支援三種紋理模式：衛星影像、山影圖、色階（colorRamp）。
 * 色階模式透過 onBeforeCompile 注入 shader，與地質模組 TerrainMesh 對齊。
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useFacilityStore } from '@/stores/facilityStore';
import { generateColorRampTexture } from '@/utils/colorRamps';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function resolveUrl(url: string) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
}

/** 從 heightmapUrl 推導 hillshade texture URL */
function deriveHillshadeUrl(heightmapUrl: string): string {
    // heightmapUrl 形如 /uploads/facility/terrain/{id}/heightmap.png
    // hillshade 固定為同目錄下 texture.png
    return heightmapUrl.replace(/heightmap\.png$/, 'texture.png');
}

export function FacilityTerrain() {
    const scenes = useFacilityStore(state => state.scenes);
    const currentSceneId = useFacilityStore(state => state.currentSceneId);
    const terrainSettings = useFacilityStore(state => state.terrainSettings);
    const currentScene = useMemo(
        () => scenes.find(s => s.id === currentSceneId),
        [scenes, currentSceneId]
    );

    const [heightMap, setHeightMap] = useState<THREE.Texture | null>(null);
    const [textureMap, setTextureMap] = useState<THREE.Texture | null>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const shaderRef = useRef<any>(null);

    const bounds = currentScene?.terrainBounds as {
        minX: number; maxX: number;
        minY: number; maxY: number;
        minZ: number; maxZ: number;
    } | null;

    const hasSatellite = currentScene?.terrainTextureMode === 'satellite';
    const textureMode = terrainSettings.textureMode;

    // 衛星影像 URL（DB 存的 terrainTextureUrl，只在有 satellite 時有效）
    const satelliteUrl = hasSatellite ? currentScene?.terrainTextureUrl : null;
    // 山影圖 URL（從 heightmap 路徑推導）
    const hillshadeUrl = currentScene?.terrainHeightmapUrl
        ? deriveHillshadeUrl(currentScene.terrainHeightmapUrl)
        : null;

    // 色階紋理
    const rampTexture = useMemo(() => {
        return generateColorRampTexture(terrainSettings.colorRamp, terrainSettings.reverse);
    }, [terrainSettings.colorRamp, terrainSettings.reverse]);

    // ── 載入 heightmap ──
    useEffect(() => {
        if (!currentScene?.terrainHeightmapUrl) { setHeightMap(null); return; }
        const loader = new THREE.TextureLoader();
        let tex: THREE.Texture | null = null;
        loader.load(
            resolveUrl(currentScene.terrainHeightmapUrl),
            (t) => { tex = t; setHeightMap(t); },
            undefined,
            () => { console.warn('[FacilityTerrain] heightmap load failed'); setHeightMap(null); },
        );
        return () => { tex?.dispose(); };
    }, [currentScene?.terrainHeightmapUrl]);

    // ── 載入 texture（根據 textureMode 切換）──
    useEffect(() => {
        let url: string | null = null;

        if (textureMode === 'satellite' && satelliteUrl) {
            url = satelliteUrl;
        } else if (textureMode === 'hillshade' && hillshadeUrl) {
            url = hillshadeUrl;
        } else if (textureMode === 'colorRamp') {
            // colorRamp 不需要 texture map，用白色 + shader 上色
            setTextureMap(null);
            return;
        } else if (hillshadeUrl) {
            // fallback to hillshade
            url = hillshadeUrl;
        }

        if (!url) { setTextureMap(null); return; }

        const loader = new THREE.TextureLoader();
        let tex: THREE.Texture | null = null;
        loader.load(
            resolveUrl(url),
            (t) => { tex = t; setTextureMap(t); },
            undefined,
            () => { console.warn('[FacilityTerrain] texture load failed:', url); setTextureMap(null); },
        );
        return () => { tex?.dispose(); };
    }, [textureMode, satelliteUrl, hillshadeUrl]);

    // ── 卸載時 dispose 材質（清除 shader program 快取，確保 onBeforeCompile 下次重新觸發）──
    useEffect(() => {
        return () => {
            materialRef.current?.dispose();
        };
    }, []);

    // ── 每幀更新 shader uniforms ──
    useFrame(() => {
        if (shaderRef.current) {
            shaderRef.current.uniforms.uMinZ.value = terrainSettings.minZ;
            shaderRef.current.uniforms.uMaxZ.value = terrainSettings.maxZ;
            shaderRef.current.uniforms.uRamp.value = rampTexture;
            shaderRef.current.uniforms.uUseColorRamp.value = textureMode === 'colorRamp' ? 1.0 : 0.0;
        }
    });

    // 不顯示或無資料時不渲染
    if (!terrainSettings.visible) return null;
    if (!currentScene?.terrainHeightmapUrl || !bounds || !heightMap) return null;

    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxY - bounds.minY;

    const centerX = bounds.minX + width / 2;
    const centerY = bounds.minY + depth / 2;

    const coordShiftX = currentScene.coordShiftX ?? 0;
    const coordShiftY = currentScene.coordShiftY ?? 0;
    const coordShiftZ = currentScene.coordShiftZ ?? 0;
    const coordRotation = currentScene.coordRotation ?? 0;

    const posX = centerX + coordShiftX;
    const posZ = -(centerY + coordShiftY);

    const onBeforeCompile = (shader: any) => {
        shaderRef.current = shader;

        shader.uniforms.uRamp = { value: rampTexture };
        shader.uniforms.uMinZ = { value: terrainSettings.minZ };
        shader.uniforms.uMaxZ = { value: terrainSettings.maxZ };
        shader.uniforms.uUseColorRamp = { value: textureMode === 'colorRamp' ? 1.0 : 0.0 };

        // Vertex Shader: Pass height to Fragment Shader
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `
            #include <common>
            varying float vMyHeight;
            `
        );

        shader.vertexShader = shader.vertexShader.replace(
            '#include <displacementmap_vertex>',
            `
            #include <displacementmap_vertex>
            vMyHeight = transformed.z;
            `
        );

        // Fragment Shader: Map height to color (only when colorRamp mode)
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>
            uniform sampler2D uRamp;
            uniform float uMinZ;
            uniform float uMaxZ;
            uniform float uUseColorRamp;
            varying float vMyHeight;
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `
            #include <map_fragment>

            if (uUseColorRamp > 0.5) {
                float normHeight = (vMyHeight - uMinZ) / (uMaxZ - uMinZ);
                normHeight = clamp(normHeight, 0.01, 0.99);

                vec4 rampColor = texture2D(uRamp, vec2(normHeight, 0.5));
                diffuseColor *= rampColor;
            }
            `
        );
    };

    // key 包含 textureMode + 是否有 textureMap，確保 shader program 在模式切換時重新編譯
    const meshKey = `terrain-${textureMode}-${textureMap ? 'tex' : 'notex'}`;

    return (
        <group rotation={[0, coordRotation * Math.PI / 180, 0]}>
            <mesh
                key={meshKey}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[posX, coordShiftZ, posZ]}
                receiveShadow
            >
                <planeGeometry args={[width, depth, 256, 256]} />
                <meshStandardMaterial
                    ref={materialRef}
                    color={0xffffff}
                    map={textureMap ?? undefined}
                    displacementMap={heightMap}
                    displacementScale={bounds.maxZ - bounds.minZ}
                    displacementBias={bounds.minZ}
                    roughness={1.0}
                    metalness={0}
                    side={THREE.DoubleSide}
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>
        </group>
    );
}

export default FacilityTerrain;
