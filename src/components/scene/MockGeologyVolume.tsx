/**
 * MockGeologyVolume Component
 * @module components/scene/MockGeologyVolume
 * 
 * 多層分層 3D 地質模型
 * 包含表土層、砂岩層、頁岩層、基岩層
 * 支援剖面切割時顯示不同地層顏色
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLayerStore } from '../../stores/layerStore';
import { useViewerStore } from '../../stores/viewerStore';
import { generateMockElevation } from '../../utils/terrain';

interface MockGeologyVolumeProps {
    width?: number;
    height?: number;
    widthSegments?: number;
    heightSegments?: number;
    maxElevation?: number;
    position?: [number, number, number];
}

// 地層定義
interface GeologicLayer {
    name: string;
    topDepth: number;    // 頂部深度 (相對地表, 負值)
    bottomDepth: number; // 底部深度 (相對地表, 負值)
    color: number;
}

const GEOLOGIC_LAYERS: GeologicLayer[] = [
    { name: '表土層', topDepth: 0, bottomDepth: -49, color: 0x8b7355 },
    { name: '砂岩層', topDepth: -51, bottomDepth: -199, color: 0xc2b280 },
    { name: '頁岩層', topDepth: -201, bottomDepth: -349, color: 0x708090 },
    { name: '基岩層', topDepth: -351, bottomDepth: -500, color: 0x5a3e1b },
];

// 產生單一地層的殼體幾何
function createLayerGeometry(
    elevations: Float32Array,
    gridX: number,
    gridZ: number,
    width: number,
    height: number,
    topDepthOffset: number,
    bottomDepthOffset: number,
    widthSegments: number,
    heightSegments: number,
): THREE.BufferGeometry {
    const gridCount = gridX * gridZ;
    const totalVertices = gridCount * 2;

    const positions = new Float32Array(totalVertices * 3);
    const uvs = new Float32Array(totalVertices * 2);

    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const segmentW = width / widthSegments;
    const segmentH = height / heightSegments;

    for (let iz = 0; iz < gridZ; iz++) {
        const z = iz * segmentH - halfHeight;
        for (let ix = 0; ix < gridX; ix++) {
            const x = ix * segmentW - halfWidth;
            const i = iz * gridX + ix;

            const surfaceElevation = elevations[i];

            // 頂面：地表高程 + topDepthOffset
            const topY = surfaceElevation + topDepthOffset;
            positions[i * 3] = x;
            positions[i * 3 + 1] = topY;
            positions[i * 3 + 2] = z;

            uvs[i * 2] = ix / widthSegments;
            uvs[i * 2 + 1] = 1 - (iz / heightSegments);

            // 底面：地表高程 + bottomDepthOffset
            const bottomY = surfaceElevation + bottomDepthOffset;
            const bi = i + gridCount;
            positions[bi * 3] = x;
            positions[bi * 3 + 1] = bottomY;
            positions[bi * 3 + 2] = z;

            uvs[bi * 2] = ix / widthSegments;
            uvs[bi * 2 + 1] = 1 - (iz / heightSegments);
        }
    }

    const indices: number[] = [];
    const addFace = (a: number, b: number, c: number) => indices.push(a, b, c);

    // 頂面
    for (let iz = 0; iz < heightSegments; iz++) {
        for (let ix = 0; ix < widthSegments; ix++) {
            const a = iz * gridX + ix;
            const b = iz * gridX + (ix + 1);
            const c = (iz + 1) * gridX + (ix + 1);
            const d = (iz + 1) * gridX + ix;
            addFace(a, d, b);
            addFace(b, d, c);
        }
    }

    // 底面 (反向繞行)
    for (let iz = 0; iz < heightSegments; iz++) {
        for (let ix = 0; ix < widthSegments; ix++) {
            const a = gridCount + iz * gridX + ix;
            const b = gridCount + iz * gridX + (ix + 1);
            const c = gridCount + (iz + 1) * gridX + (ix + 1);
            const d = gridCount + (iz + 1) * gridX + ix;
            addFace(a, b, d);
            addFace(b, c, d);
        }
    }

    // 四面側牆
    // North
    for (let ix = 0; ix < widthSegments; ix++) {
        const tA = ix, tB = ix + 1, bA = tA + gridCount, bB = tB + gridCount;
        addFace(tA, tB, bA);
        addFace(tB, bB, bA);
    }
    // South
    const lastRow = heightSegments * gridX;
    for (let ix = 0; ix < widthSegments; ix++) {
        const tA = lastRow + ix, tB = lastRow + ix + 1;
        const bA = tA + gridCount, bB = tB + gridCount;
        addFace(tB, tA, bA);
        addFace(tB, bA, bB);
    }
    // West
    for (let iz = 0; iz < heightSegments; iz++) {
        const tA = iz * gridX, tB = (iz + 1) * gridX;
        const bA = tA + gridCount, bB = tB + gridCount;
        addFace(tA, bA, bB);
        addFace(tA, bB, tB);
    }
    // East
    for (let iz = 0; iz < heightSegments; iz++) {
        const tA = iz * gridX + widthSegments, tB = (iz + 1) * gridX + widthSegments;
        const bA = tA + gridCount, bB = tB + gridCount;
        addFace(tA, tB, bB);
        addFace(tA, bB, bA);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

// 單個地層渲染組件
interface LayerMeshProps {
    geometry: THREE.BufferGeometry;
    color: number;
    opacity: number;
    clippingPlanes: THREE.Plane[];
}

function LayerMesh({ geometry, color, opacity, clippingPlanes }: LayerMeshProps) {
    const innerColor = new THREE.Color(color).multiplyScalar(0.6).getHex();

    const frontMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8,
            metalness: 0.1,
            flatShading: true,
            transparent: opacity < 1,
            opacity: opacity,
            side: THREE.FrontSide,
            clippingPlanes: clippingPlanes,
            clipShadows: true,
        });
    }, [color, opacity, clippingPlanes]);

    const backMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: innerColor,
            roughness: 1.0,
            metalness: 0,
            flatShading: true,
            transparent: opacity < 1,
            opacity: opacity,
            side: THREE.BackSide,
            clippingPlanes: [],
        });
    }, [innerColor, opacity]);

    return (
        <>
            <mesh geometry={geometry} material={frontMaterial} receiveShadow castShadow />
            <mesh geometry={geometry} material={backMaterial} receiveShadow />
        </>
    );
}

export function MockGeologyVolume({
    width = 2000,
    height = 2000,
    widthSegments = 64,
    heightSegments = 64,
    maxElevation = 300,
    position = [0, -2, 0],
}: MockGeologyVolumeProps) {
    const { layers } = useLayerStore();
    const layer = layers.geology3d;
    const clippingConfig = useViewerStore(state => state.clippingPlane);
    const multiSection = useViewerStore(state => state.multiSection);

    // 產生高程數據
    const elevations = useMemo(() => {
        return generateMockElevation(widthSegments, heightSegments, maxElevation);
    }, [widthSegments, heightSegments, maxElevation]);

    // 產生各地層幾何
    const layerGeometries = useMemo(() => {
        const gridX = widthSegments + 1;
        const gridZ = heightSegments + 1;

        return GEOLOGIC_LAYERS.map(layerDef => ({
            ...layerDef,
            geometry: createLayerGeometry(
                elevations,
                gridX,
                gridZ,
                width,
                height,
                layerDef.topDepth,
                layerDef.bottomDepth,
                widthSegments,
                heightSegments
            ),
        }));
    }, [elevations, width, height, widthSegments, heightSegments]);

    // 計算 Clipping Planes
    const clippingPlanes = useMemo(() => {
        // 多剖面模式
        if (multiSection.enabled) {
            const { axis, count, spacing, gapWidth, startPosition } = multiSection;
            const normal = axis === 'x'
                ? new THREE.Vector3(1, 0, 0)
                : new THREE.Vector3(0, 0, 1);
            const negNormal = normal.clone().negate();

            // 返回所有切片的 clipping planes 陣列
            const allSlices: THREE.Plane[][] = [];
            for (let i = 0; i < count; i++) {
                const sliceStart = startPosition + i * spacing;
                const sliceEnd = sliceStart + spacing - gapWidth;
                allSlices.push([
                    new THREE.Plane(normal, -sliceStart),
                    new THREE.Plane(negNormal, sliceEnd),
                ]);
            }
            return allSlices;
        }

        // 單一剖面模式
        if (clippingConfig.enabled) {
            return [[new THREE.Plane(
                new THREE.Vector3(...clippingConfig.normal),
                clippingConfig.constant
            )]];
        }

        return [[]];
    }, [clippingConfig, multiSection]);



    // 多剖面模式：為每個切片渲染所有地層
    if (multiSection.enabled && clippingPlanes.length > 0) {
        return (
            <group position={position} visible={layer.visible}>
                {clippingPlanes.map((planes, sliceIndex) => (
                    <group key={`slice-${sliceIndex}`}>
                        {layerGeometries.map((layerData, layerIndex) => (
                            <LayerMesh
                                key={`${sliceIndex}-${layerIndex}`}
                                geometry={layerData.geometry}
                                color={layerData.color}
                                opacity={layer.opacity * 0.9}
                                clippingPlanes={planes}
                            />
                        ))}
                    </group>
                ))}
            </group>
        );
    }

    // 單一剖面或無剖面
    return (
        <group position={position} visible={layer.visible}>
            {layerGeometries.map((layerData, index) => (
                <LayerMesh
                    key={index}
                    geometry={layerData.geometry}
                    color={layerData.color}
                    opacity={layer.opacity * 1.0}
                    clippingPlanes={clippingPlanes[0] || []}
                />
            ))}
        </group>
    );
}

export default MockGeologyVolume;
