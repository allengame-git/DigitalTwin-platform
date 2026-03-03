/**
 * TerrainMesh Component
 * @module components/scene/TerrainMesh
 * 
 * DEM 地形網格 (支援衛星影像 / 山影圖 / 色階模式)
 * Task: T043c (Real DEM Integration)
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';
import { useViewerStore } from '../../stores/viewerStore';
import { useTerrainStore } from '../../stores/terrainStore';
import { useProjectStore } from '../../stores/projectStore';
import { useFrame } from '@react-three/fiber';
import { generateColorRampTexture } from '../../utils/colorRamps';

export function TerrainMesh() {
    const { layers, terrainSettings } = useLayerStore();
    const terrainLayer = layers.terrain;
    const { getActiveProject } = useProjectStore();
    const project = getActiveProject();

    // Clipping
    const clippingConfig = useViewerStore(state => state.clippingPlane);

    // Data
    const { terrains, activeTerrainId } = useTerrainStore();
    const activeTerrain = useMemo(() =>
        terrains.find(t => t.id === activeTerrainId),
        [terrains, activeTerrainId]);

    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    const shaderRef = useRef<any>(null);

    // API Base URL (Fallback to localhost if env not set)
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // Generate Color Ramp Texture
    const rampTexture = useMemo(() => {
        return generateColorRampTexture(terrainSettings.colorRamp, terrainSettings.reverse);
    }, [terrainSettings.colorRamp, terrainSettings.reverse]);

    // 決定使用哪個 texture：衛星影像 > 山影圖 > 無
    const textureMode = terrainSettings.textureMode;
    const isSatelliteMode = textureMode === 'satellite' && !!activeTerrain?.satelliteTexture;

    // Load heightmap with error resilience (no crash on 404)
    const [heightMap, setHeightMap] = useState<THREE.Texture | null>(null);
    const [textureMap, setTextureMap] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        if (!activeTerrain?.heightmap) { setHeightMap(null); return; }
        const loader = new THREE.TextureLoader();
        loader.load(
            `${API_BASE}${activeTerrain.heightmap}`,
            (tex) => setHeightMap(tex),
            undefined,
            () => { console.warn('[TerrainMesh] heightmap load failed'); setHeightMap(null); }
        );
    }, [activeTerrain?.heightmap, API_BASE]);

    useEffect(() => {
        const url = isSatelliteMode && activeTerrain?.satelliteTexture
            ? `${API_BASE}${activeTerrain.satelliteTexture}`
            : activeTerrain?.texture
            ? `${API_BASE}${activeTerrain.texture}`
            : null;
        if (!url) { setTextureMap(null); return; }
        const loader = new THREE.TextureLoader();
        loader.load(
            url,
            (tex) => setTextureMap(tex),
            undefined,
            () => { console.warn('[TerrainMesh] texture load failed:', url); setTextureMap(null); }
        );
    }, [activeTerrain?.satelliteTexture, activeTerrain?.texture, API_BASE, isSatelliteMode]);

    // Update Uniforms
    useFrame(() => {
        if (shaderRef.current) {
            shaderRef.current.uniforms.uMinZ.value = terrainSettings.minZ;
            shaderRef.current.uniforms.uMaxZ.value = terrainSettings.maxZ;
            shaderRef.current.uniforms.uRamp.value = rampTexture;
            shaderRef.current.uniforms.uUseColorRamp.value = (textureMode === 'colorRamp') ? 1.0 : 0.0;
        }
    });

    // If no active terrain or visible is false, return null
    if (!activeTerrain) return null;

    // Custom Shader Logic
    const onBeforeCompile = (shader: any) => {
        shaderRef.current = shader;

        shader.uniforms.uRamp = { value: rampTexture };
        shader.uniforms.uMinZ = { value: terrainSettings.minZ };
        shader.uniforms.uMaxZ = { value: terrainSettings.maxZ };
        shader.uniforms.uUseColorRamp = { value: (textureMode === 'colorRamp') ? 1.0 : 0.0 };

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

        // Replace map_fragment logic
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

    // Calculate dimensions
    const width = activeTerrain.maxX - activeTerrain.minX;
    const height = activeTerrain.maxY - activeTerrain.minY; // map visual height (Z in 3D)

    // Calculate relative position (World Coords - Project Origin)
    const originX = project?.originX || 0;
    const originY = project?.originY || 0;

    // Center of terrain in Map Coordinates
    const centerX = activeTerrain.minX + width / 2;
    const centerY = activeTerrain.minY + height / 2;

    const xSize = width;
    const ySize = height; // North-South span

    // Geometry
    const segs = 256;

    const clippingPlanes = clippingConfig.enabled
        ? [new THREE.Plane(new THREE.Vector3(...clippingConfig.normal), clippingConfig.constant)]
        : [];

    return (
        <mesh
            visible={terrainLayer.visible}
            ref={meshRef}
            rotation={[-Math.PI / 2, 0, 0]} // Rotate to ground plane
            position={[centerX - originX, 0, -(centerY - originY)]}
            receiveShadow
            castShadow
            userData={{ layerType: 'terrain' }}
        >
            <planeGeometry args={[xSize, ySize, segs, segs]} />
            <meshStandardMaterial
                ref={materialRef}
                color={0xffffff}
                map={textureMap || null}
                displacementMap={heightMap || null}
                displacementScale={activeTerrain.maxZ - activeTerrain.minZ}
                displacementBias={activeTerrain.minZ}
                roughness={1.0}
                metalness={0.0}
                side={THREE.DoubleSide}
                clippingPlanes={clippingPlanes}
                clipShadows={true}
                transparent={terrainLayer.opacity < 1}
                opacity={terrainLayer.opacity}
                onBeforeCompile={onBeforeCompile}
            />
        </mesh>
    );
}

export default TerrainMesh;
