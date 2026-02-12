/**
 * GeologyTiles Component
 * @module components/scene/GeologyTiles
 *
 * 使用 3D Volume Texture + GPU Shader 實現即時剖面著色。
 *
 * Pipeline:
 *   1. Display mesh: whole-grid outer surface with vertex colors (by lith_id)
 *   2. Volume texture: 3D lith_id data (volume.bin + volume_meta.json)
 *   3. Cap plane: ShaderMaterial samples volume texture at clip position
 *      → per-pixel lithology coloring on the cross-section
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';
import { useUploadStore } from '../../stores/uploadStore';
import { useViewerStore } from '../../stores/viewerStore';
import { useCameraStore } from '../../stores/cameraStore';
import { useLithologyStore } from '../../stores/lithologyStore';
import { twd97ToWorld } from '../../utils/coordinates';
import { useProjectStore } from '../../stores/projectStore';

interface GeologyTilesProps {
    meshUrl?: string;
}

interface VolumeMeta {
    dims: [number, number, number];
    boundsWorld: {
        minX: number; maxX: number;
        minY: number; maxY: number;
        minZ: number; maxZ: number;
    };
    lithIds: number[];
}

// ============================================================
// Shaders for volume-textured cross-section cap
// ============================================================
const capVertexShader = /* glsl */ `
varying vec3 vWorldPos;
void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const capFragmentShader = /* glsl */ `
precision highp float;
precision highp sampler3D;

out vec4 fragColor;

uniform sampler3D uVolume;
uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;
uniform vec3 uLithColors[32]; // Increase to 32
uniform int uLithIds[32];
uniform int uLithCount;
uniform float uOpacity;

varying vec3 vWorldPos;

void main() {
    // Convert world position to normalized UVW [0,1]
    vec3 uvw = (vWorldPos - uBoundsMin) / (uBoundsMax - uBoundsMin);

    // Discard fragments outside the volume bounds
    if (uvw.x < 0.0 || uvw.x > 1.0 ||
        uvw.y < 0.0 || uvw.y > 1.0 ||
        uvw.z < 0.0 || uvw.z > 1.0) {
        discard;
    }

    // IMPORTANT: texture coord transform (same as backend)
    vec3 texCoord = vec3(uvw.x, 1.0 - uvw.z, uvw.y);

    float lithIdRaw = texture(uVolume, texCoord).r * 255.0;
    int lithId = int(lithIdRaw + 0.5);

    // Skip empty voxels (lith_id = 0)
    if (lithId == 0) discard;

    // Lookup color
    vec3 color = vec3(0.5); // fallback grey
    for (int i = 0; i < 32; i++) {
        if (i >= uLithCount) break;
        if (uLithIds[i] == lithId) {
            color = uLithColors[i];
            break;
        }
    }

    fragColor = vec4(color, uOpacity);
}
`;


// ============================================================
// GeologyMesh — inner component that renders the model + cap
// ============================================================
function GeologyMesh({
    url,
    modelBounds,
    modelId,
    modelName
}: {
    url: string;
    modelBounds?: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    modelId?: string;
    modelName?: string;
}) {
    const { scene: gltfScene } = useGLTF(url);
    const groupRef = useRef<THREE.Group>(null);
    const capRef = useRef<THREE.Mesh>(null);
    const { gl } = useThree();

    const { layers } = useLayerStore();
    const { lithologies } = useLithologyStore();
    const clippingConfig = useViewerStore(state => state.clippingPlane);
    const geology3dLayer = layers.geology3d;
    const modelOffset = useViewerStore(state => state.config.modelOffset);

    // Prepare dynamic color palette for shaders
    const palette = useMemo(() => {
        const colors: THREE.Vector3[] = [];
        const ids: number[] = [];

        // Fill palette based on store
        lithologies.forEach(l => {
            const hex = l.color.replace('#', '');
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            colors.push(new THREE.Vector3(r, g, b));
            ids.push(l.lithId);
        });

        // Pad to match shader array size (32)
        const count = ids.length;
        while (colors.length < 32) {
            colors.push(new THREE.Vector3(0.5, 0.5, 0.5));
            ids.push(0);
        }

        return { colors, ids, count };
    }, [lithologies]);

    // Volume texture state
    const [volumeTexture, setVolumeTexture] = useState<THREE.Data3DTexture | null>(null);
    const [volumeMeta, setVolumeMeta] = useState<VolumeMeta | null>(null);

    // Clipping plane
    const clippingPlane = useMemo(() => {
        if (!clippingConfig.enabled) return null;
        return new THREE.Plane(
            new THREE.Vector3(
                clippingConfig.normal[0],
                clippingConfig.normal[1],
                clippingConfig.normal[2]
            ),
            clippingConfig.constant
        );
    }, [clippingConfig.enabled, clippingConfig.normal[0], clippingConfig.normal[1], clippingConfig.normal[2], clippingConfig.constant]);

    const clippingPlanes = useMemo(() => clippingPlane ? [clippingPlane] : [], [clippingPlane]);

    // Enable local clipping on renderer
    useEffect(() => {
        gl.localClippingEnabled = true;
    }, [gl]);

    // Debug log
    useEffect(() => {
        const box = new THREE.Box3().setFromObject(gltfScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        let meshCount = 0;
        gltfScene.traverse((c) => { if (c instanceof THREE.Mesh) meshCount++; });
        console.log('[GeologyTiles] GLB loaded:', {
            modelId, modelName,
            meshCount,
            size: size.toArray().map(v => Math.round(v)),
        });
    }, [gltfScene, url]);

    // ============================================================
    // Load Volume Texture
    // ============================================================
    useEffect(() => {
        if (!url) return;

        // Derive volume URL from mesh URL
        // meshUrl: /uploads/geology-tiles/{id}/model.glb
        // volumeUrl: /uploads/geology-tiles/{id}/volume.bin
        // metaUrl: /uploads/geology-tiles/{id}/volume_meta.json
        const baseUrl = url.replace(/\/[^/]+$/, '');
        const binUrl = `${baseUrl}/volume.bin`;
        const metaUrl = `${baseUrl}/volume_meta.json`;

        let cancelled = false;

        async function loadVolume() {
            try {
                // Load meta first
                const metaRes = await fetch(metaUrl);
                if (!metaRes.ok) {
                    console.warn('[GeologyTiles] No volume_meta.json found, cap disabled');
                    return;
                }
                const meta: VolumeMeta = await metaRes.json();

                // Load binary volume data
                const binRes = await fetch(binUrl);
                if (!binRes.ok) {
                    console.warn('[GeologyTiles] No volume.bin found, cap disabled');
                    return;
                }
                const buffer = await binRes.arrayBuffer();
                const data = new Uint8Array(buffer);

                if (cancelled) return;

                // Create 3D texture
                const [width, height, depth] = meta.dims;
                const tex = new THREE.Data3DTexture(data, width, height, depth);
                tex.format = THREE.RedFormat;
                tex.type = THREE.UnsignedByteType;
                tex.minFilter = THREE.NearestFilter;
                tex.magFilter = THREE.NearestFilter;
                tex.wrapS = THREE.ClampToEdgeWrapping;
                tex.wrapT = THREE.ClampToEdgeWrapping;
                tex.wrapR = THREE.ClampToEdgeWrapping;
                tex.needsUpdate = true;

                console.log(`[GeologyTiles] Volume texture loaded: ${width}x${height}x${depth}, ${data.length} bytes`);

                setVolumeTexture(tex);
                setVolumeMeta(meta);
            } catch (err) {
                console.error('[GeologyTiles] Failed to load volume texture:', err);
            }
        }

        loadVolume();
        return () => { cancelled = true; };
    }, [url]);

    // ============================================================
    // Cap ShaderMaterial
    // ============================================================
    const capMaterial = useMemo(() => {
        if (!volumeTexture || !volumeMeta) return null;

        const bounds = volumeMeta.boundsWorld;

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uVolume: { value: volumeTexture },
                uBoundsMin: { value: new THREE.Vector3(bounds.minX, bounds.minY, bounds.minZ) },
                uBoundsMax: { value: new THREE.Vector3(bounds.maxX, bounds.maxY, bounds.maxZ) },
                uLithColors: { value: palette.colors },
                uLithIds: { value: palette.ids },
                uLithCount: { value: palette.count },
                uOpacity: { value: geology3dLayer.opacity },
            },
            vertexShader: capVertexShader,
            fragmentShader: capFragmentShader,
            side: THREE.DoubleSide,
            transparent: geology3dLayer.opacity < 1,
            depthWrite: true,
            depthTest: true,
            glslVersion: THREE.GLSL3,
        });


        return mat;
    }, [volumeTexture, volumeMeta, geology3dLayer.opacity]);

    // ============================================================
    // Apply clipping & Dynamic Coloring to display mesh
    // ============================================================
    useEffect(() => {
        gltfScene.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;

            const mat = child.material as THREE.MeshStandardMaterial;
            if (!mat) return;

            // Enable vertex colors (which now holds lith_id in R channel)
            mat.vertexColors = true;
            mat.clippingPlanes = clippingPlanes;
            mat.side = THREE.FrontSide;
            mat.transparent = geology3dLayer.opacity < 1;
            mat.opacity = geology3dLayer.opacity;

            // Dynamic Coloring via onBeforeCompile
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uLithColors = { value: palette.colors };
                shader.uniforms.uLithIds = { value: palette.ids };
                shader.uniforms.uLithCount = { value: palette.count };

                shader.fragmentShader = `
                    uniform vec3 uLithColors[32];
                    uniform int uLithIds[32];
                    uniform int uLithCount;
                    ${shader.fragmentShader}
                `.replace(
                    '#include <color_fragment>',
                    `
                    #include <color_fragment>
                    // vColor.r contains the lith_id from 0-1 (scaled from 0-255 uint8)
                    int lithId = int(vColor.r * 255.0 + 0.5);
                    vec3 dynamicColor = vec3(0.5);
                    for (int i = 0; i < 32; i++) {
                        if (i >= uLithCount) break;
                        if (uLithIds[i] == lithId) {
                            dynamicColor = uLithColors[i];
                            break;
                        }
                    }
                    diffuseColor.rgb = dynamicColor;
                    `
                );
            };

            mat.needsUpdate = true;
        });
    }, [gltfScene, clippingPlanes, geology3dLayer.opacity, palette]);

    // ============================================================
    // Update cap position each frame
    // ============================================================
    useFrame(() => {
        if (!capRef.current || !clippingPlane) {
            if (capRef.current) capRef.current.visible = false;
            return;
        }

        capRef.current.visible = true;

        // Position cap plane on the clipping plane
        clippingPlane.coplanarPoint(capRef.current.position);
        capRef.current.lookAt(
            capRef.current.position.x - clippingPlane.normal.x,
            capRef.current.position.y - clippingPlane.normal.y,
            capRef.current.position.z - clippingPlane.normal.z,
        );
    });

    // Handle visibility
    useEffect(() => {
        if (!groupRef.current) return;
        groupRef.current.visible = geology3dLayer.visible;
    }, [geology3dLayer.visible]);

    const offset = modelOffset || [0, 0, 0];

    return (
        <group ref={groupRef} position={[offset[0], offset[1], offset[2]]}>
            <primitive object={gltfScene} />

            {/* Cap plane — only rendered when clipping is active + volume loaded */}
            {capMaterial && clippingPlane && (
                <mesh
                    ref={capRef}
                    material={capMaterial}
                    renderOrder={999}
                >
                    <planeGeometry args={[40000, 40000]} />
                </mesh>
            )}
        </group>
    );
}

export function GeologyTiles({ meshUrl: propMeshUrl }: GeologyTilesProps) {
    const geologyModels = useUploadStore(state => state.geologyModels);
    const activeGeologyModelId = useUploadStore(state => state.activeGeologyModelId);
    const { setTargetCenter } = useCameraStore();

    const geologyModel = geologyModels.find(m => m.id === activeGeologyModelId) || null;
    const meshUrl = propMeshUrl || geologyModel?.meshUrl;

    const modelBounds = useMemo(() => {
        if (!geologyModel) return undefined;
        return {
            minX: geologyModel.minX ?? 0,
            maxX: geologyModel.maxX ?? 0,
            minY: geologyModel.minY ?? 0,
            maxY: geologyModel.maxY ?? 0,
            minZ: geologyModel.minZ ?? 0,
            maxZ: geologyModel.maxZ ?? 0,
        };
    }, [geologyModel?.id, geologyModel?.minX, geologyModel?.maxX, geologyModel?.minY, geologyModel?.maxY, geologyModel?.minZ, geologyModel?.maxZ]);

    useEffect(() => {
        if (modelBounds && modelBounds.maxX !== 0) {
            const centerX = (modelBounds.minX + modelBounds.maxX) / 2;
            const centerY = (modelBounds.minY + modelBounds.maxY) / 2;
            const centerZ = (modelBounds.minZ + modelBounds.maxZ) / 2;
            const worldCenter = twd97ToWorld({ x: centerX, y: centerY, z: centerZ });
            setTargetCenter([worldCenter.x, worldCenter.y, worldCenter.z]);
        }
    }, [geologyModel?.id]);

    if (geologyModel?.conversionStatus === 'processing') {
        return (
            <Html center>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: 'white', padding: '20px 40px', borderRadius: '8px', textAlign: 'center' }}>
                    <div>轉換 3D Mesh 中...</div>
                    <div style={{ marginTop: '8px', fontSize: '24px' }}>{geologyModel.conversionProgress || 0}%</div>
                </div>
            </Html>
        );
    }

    if (geologyModel?.conversionStatus === 'failed') {
        return (
            <Html center>
                <div style={{ background: 'rgba(200,0,0,0.8)', color: 'white', padding: '16px', borderRadius: '8px' }}>
                    轉換失敗: {geologyModel.conversionError}
                </div>
            </Html>
        );
    }

    if (!meshUrl) return null;

    return (
        <React.Suspense fallback={
            <Html center>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: 'white', padding: '16px', borderRadius: '8px' }}>
                    載入 3D 模型中...
                </div>
            </Html>
        }>
            <GeologyMesh
                url={meshUrl}
                modelBounds={modelBounds}
                modelId={geologyModel?.id}
                modelName={geologyModel?.name}
            />
        </React.Suspense>
    );
}
