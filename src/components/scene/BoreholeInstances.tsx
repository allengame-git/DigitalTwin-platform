/**
 * 鑽孔 InstancedMesh 元件
 * @module components/scene/BoreholeInstances
 */

import React, { useRef, useMemo, useCallback, useState } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useBoreholeStore } from '../../stores/boreholeStore';
import { useViewerStore } from '../../stores/viewerStore';
import { useLayerStore } from '../../stores/layerStore';
import { useLithologyStore } from '../../stores/lithologyStore';
import { twd97ToWorld } from '../../utils/coordinates';
import { calculateLODLevel } from '../../utils/lod';
import { INSTANCED_MESH_CONFIG, GEOLOGY_COLORS } from '../../config/three';

// 臨時物件 (避免每幀建立)
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export function BoreholeInstances() {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { boreholes, selectedBorehole, selectBorehole } = useBoreholeStore();
    const { setLODLevel, config } = useViewerStore();
    const { layers: layerSettings } = useLayerStore();
    const { lithologies } = useLithologyStore();
    const { camera } = useThree();

    // 懸停狀態
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    // T036: 圖層可見性與透明度
    const boreholeLayer = layerSettings.boreholes;

    // 判斷顯示模式
    const isIconMode = config.lodLevel === 'icon';

    // 準備渲染數據
    const instanceData = useMemo(() => {
        if (boreholes.length === 0) return { positions: [], colors: [], ids: [] };

        const tempPositions: { x: number, y: number, z: number, scaleY: number }[] = [];
        const tempColors: THREE.Color[] = [];
        const tempIds: string[] = []; // 用於識別點擊是哪個鑽孔

        if (isIconMode) {
            // Icon 模式：每個鑽孔一個球體
            boreholes.forEach((borehole) => {
                const worldPos = twd97ToWorld({
                    x: borehole.x,
                    y: borehole.y,
                    z: borehole.elevation,
                });
                tempPositions.push({ ...worldPos, scaleY: 1 });
                tempColors.push(selectedBorehole?.id === borehole.id ? GEOLOGY_COLORS.SELECTED : new THREE.Color(0x4a90d9));
                tempIds.push(borehole.id);
            });
        } else {
            // Detailed 模式：每個層位一個圓柱段
            boreholes.forEach((borehole) => {
                const isSelected = selectedBorehole?.id === borehole.id;



                if (borehole.layers && borehole.layers.length > 0) {
                    borehole.layers.forEach((layer) => {
                        const thickness = layer.bottomDepth - layer.topDepth;
                        // 計算層位中心點的世界座標 (Z 軸向下為深，所以是 elevation 減去中點深度)
                        const centerDepth = (layer.topDepth + layer.bottomDepth) / 2;
                        const worldPos = twd97ToWorld({
                            x: borehole.x,
                            y: borehole.y,
                            z: borehole.elevation - centerDepth,
                        });

                        tempPositions.push({ ...worldPos, scaleY: thickness });

                        // 顏色處理
                        if (isSelected) {
                            tempColors.push(GEOLOGY_COLORS.SELECTED);
                        } else {
                            // 優先使用 LithologyStore 的動態顏色
                            const lithology = lithologies.find(l => l.code === layer.lithologyCode);
                            if (lithology) {
                                tempColors.push(new THREE.Color(lithology.color));
                            } else {
                                tempColors.push(new THREE.Color(layer.color));
                            }
                        }

                        tempIds.push(borehole.id);
                    });
                } else {
                    // 若無層位資料，顯示預設單一圓柱
                    const height = borehole.totalDepth;
                    const worldPos = twd97ToWorld({
                        x: borehole.x,
                        y: borehole.y,
                        z: borehole.elevation - height / 2,
                    });
                    tempPositions.push({ ...worldPos, scaleY: height });
                    tempColors.push(isSelected ? GEOLOGY_COLORS.SELECTED : new THREE.Color(0x4a90d9));
                    tempIds.push(borehole.id);
                }
            });
        }

        return { positions: tempPositions, colors: tempColors, ids: tempIds };
    }, [boreholes, selectedBorehole, isIconMode, lithologies]);

    // 建立幾何體
    const geometry = useMemo(() => {
        if (isIconMode) {
            return new THREE.SphereGeometry(15, 16, 16);
        }
        return new THREE.CylinderGeometry(
            INSTANCED_MESH_CONFIG.DEFAULT_RADIUS,
            INSTANCED_MESH_CONFIG.DEFAULT_RADIUS,
            1, // 高度設為 1，透過 scaleY 調整
            8 // 降低分段數提升效能
        );
    }, [isIconMode]);

    // 建立材質
    const material = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: 0xffffff, // 使用 instance color
            metalness: 0.1,
            roughness: 0.7,
            transparent: boreholeLayer.opacity < 1,
            opacity: boreholeLayer.opacity,
            side: THREE.DoubleSide, // 確保雙面渲染，避免被剔除
        });
    }, [boreholeLayer.opacity]);

    // 更新 InstancedMesh
    React.useLayoutEffect(() => {
        if (!meshRef.current || instanceData.positions.length === 0) return;

        instanceData.positions.forEach((pos, i) => {
            tempObject.position.set(pos.x, pos.y, pos.z);

            if (isIconMode) {
                tempObject.scale.set(1, 1, 1);
            } else {
                // 圓柱體高度為 1，Y 軸縮放即為厚度
                tempObject.scale.set(1, pos.scaleY, 1);
            }

            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);

            // 處理 Hover 高亮
            if (hoveredId === i) {
                tempColor.setHex(0xffcc00);
            } else {
                tempColor.copy(instanceData.colors[i]);
            }
            meshRef.current!.setColorAt(i, tempColor);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }

        // 強制更新邊界體積，確保 raycast 準確
        if (meshRef.current.geometry) {
            meshRef.current.geometry.computeBoundingSphere();
            meshRef.current.geometry.computeBoundingBox();
        }
    }, [instanceData, hoveredId, isIconMode]);

    // 每幀更新 LOD
    useFrame(() => {
        if (!config.autoLOD || !meshRef.current) return;
        const distance = camera.position.length();
        const newLOD = calculateLODLevel(distance);
        if (newLOD !== config.lodLevel) {
            setLODLevel(newLOD);
        }
    });

    const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
        console.log('[BoreholeInstances] Click Event:', event);
        event.stopPropagation();
        const instanceId = event.instanceId;

        if (instanceId !== undefined && instanceId < instanceData.ids.length) {
            const boreholeId = instanceData.ids[instanceId];
            console.log('[BoreholeInstances] Clicked Borehole:', boreholeId);
            selectBorehole(boreholeId);
        } else {
            console.warn('[BoreholeInstances] Clicked but instanceId is undefined or out of range', instanceId);
        }
    }, [instanceData.ids, selectBorehole]);

    // 加回 onPointerDown 測試
    const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
        // console.log('[BoreholeInstances] PointerDown:', event.instanceId);
    }, []);

    const handlePointerOver = useCallback((event: ThreeEvent<PointerEvent>) => {
        console.log('[BoreholeInstances] PointerOver:', event.instanceId);
        event.stopPropagation(); // 阻止穿透
        if (event.instanceId !== undefined) {
            setHoveredId(event.instanceId);
            document.body.style.cursor = 'pointer';
        }
    }, []);

    const handlePointerOut = useCallback((event: ThreeEvent<PointerEvent>) => {
        // console.log('[BoreholeInstances] PointerOut');
        setHoveredId(null);
        document.body.style.cursor = 'auto';
    }, []);

    if (!boreholeLayer.visible || instanceData.positions.length === 0) return null;

    return (
        <instancedMesh
            key={isIconMode ? 'icon' : 'detail'}
            ref={meshRef}
            args={[geometry, material, instanceData.positions.length]}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            frustumCulled={false}
        />
    );
}

export default BoreholeInstances;
