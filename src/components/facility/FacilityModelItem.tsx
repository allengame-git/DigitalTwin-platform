/**
 * FacilityModelItem — 單一 GLB 模型元件
 * 支援 hover 高亮、click 選取、Tooltip、Transform 編輯
 */
import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Html, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useFacilityStore } from '@/stores/facilityStore';
import type { FacilityModel } from '@/types/facility';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

interface FacilityModelItemProps {
    model: FacilityModel;
}

// module-level reusable vectors（同 frame 內循序執行，共用安全）
const _worldPos = new THREE.Vector3();
const _topLocal = new THREE.Vector3();

export function FacilityModelItem({ model }: FacilityModelItemProps) {
    const groupRef = useRef<THREE.Group>(null);
    const labelGroupRef = useRef<THREE.Group>(null);
    const labelRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedModelId = useFacilityStore(state => state.selectedModelId);
    const hoveredModelId = useFacilityStore(state => state.hoveredModelId);
    const editMode = useFacilityStore(state => state.editMode);
    const editingModelId = useFacilityStore(state => state.editingModelId);
    const transformMode = useFacilityStore(state => state.transformMode);
    const selectModel = useFacilityStore(state => state.selectModel);
    const setHoveredModel = useFacilityStore(state => state.setHoveredModel);
    const setEditingModel = useFacilityStore(state => state.setEditingModel);
    const enterScene = useFacilityStore(state => state.enterScene);
    const updateModelTransform = useFacilityStore(state => state.updateModelTransform);
    const showLabels = useFacilityStore(state => state.showLabels);
    const setModelBboxCenter = useFacilityStore(state => state.setModelBboxCenter);
    const getChildScenes = useFacilityStore(state => state.getChildScenes);
    const currentSceneType = useFacilityStore(state => {
        const sid = state.currentSceneId;
        return sid ? state.scenes.find(s => s.id === sid)?.sceneType : undefined;
    });

    const isSelected = selectedModelId === model.id;
    const isHovered = hoveredModelId === model.id;
    const isEditing = editMode && editingModelId === model.id;
    const isDecorative = model.modelType === 'decorative';
    const isLobby = currentSceneType === 'lobby';
    const childScenes = useMemo(() => getChildScenes(model.id), [getChildScenes, model.id]);
    const hasChildScene = childScenes.length > 0;
    // useGLTF 載入模型
    const { scene: gltfScene } = useGLTF(model.modelUrl);

    // Clone scene 以避免多個 instance 共用同一 scene（memo 確保 bbox 不重算）
    const clonedScene = useMemo(() => {
        const clone = gltfScene.clone(true);
        clone.traverse(node => {
            if (!(node as THREE.Mesh).isMesh) return;
            const mesh = node as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // MeshBasicMaterial 不參與光照計算，無法接收陰影
            // 轉換為 MeshStandardMaterial 並保留顏色與貼圖
            const convertMat = (mat: THREE.Material): THREE.Material => {
                if (!(mat instanceof THREE.MeshBasicMaterial)) return mat;
                const std = new THREE.MeshStandardMaterial({
                    color: mat.color,
                    map: mat.map,
                    alphaMap: mat.alphaMap,
                    transparent: mat.transparent,
                    opacity: mat.opacity,
                    side: mat.side,
                    roughness: 0.8,
                    metalness: 0.0,
                });
                mat.dispose();
                return std;
            };

            if (Array.isArray(mesh.material)) {
                mesh.material = mesh.material.map(convertMat);
            } else {
                mesh.material = convertMat(mesh.material);
            }
        });
        return clone;
    }, [gltfScene]);

    // 計算 bbox（clonedScene 隔離空間）
    // cx/cz = 水平中心，maxY = 幾何頂部（均在 clonedScene 自身空間）
    const bboxInfo = useMemo(() => {
        clonedScene.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(clonedScene);
        if (bbox.isEmpty() || !Number.isFinite(bbox.max.y)) {
            return { cx: 0, cy: 0, cz: 0, maxY: 0 };
        }
        return {
            cx: (bbox.min.x + bbox.max.x) / 2,
            cy: (bbox.min.y + bbox.max.y) / 2,
            cz: (bbox.min.z + bbox.max.z) / 2,
            maxY: bbox.max.y,
        };
    }, [clonedScene]);

    const bboxCenterReported = useRef(false);

    // 每幀：用 localToWorld 把 bbox 頂點轉成 world space → 設定 labelGroup 位置
    // 標籤 group 在 model group 外面，不受 model scale 影響
    useFrame(({ camera }) => {
        if (!labelGroupRef.current || !groupRef.current) return;

        // 第一幀：把 bbox 視覺中心的 world-space 座標存進 store（供 fly-to 使用）
        if (!bboxCenterReported.current) {
            const centerLocal = new THREE.Vector3(bboxInfo.cx, bboxInfo.cy, bboxInfo.cz);
            groupRef.current.localToWorld(centerLocal);
            setModelBboxCenter(model.id, { x: centerLocal.x, y: centerLocal.y, z: centerLocal.z });
            bboxCenterReported.current = true;
        }

        // local → world（含 model scale / rotation / translation）
        _topLocal.set(bboxInfo.cx, bboxInfo.maxY, bboxInfo.cz);
        groupRef.current.localToWorld(_topLocal);   // 就地修改

        // 固定 20 world units above model top（Y 方向）
        labelGroupRef.current.position.set(_topLocal.x, _topLocal.y + 20, _topLocal.z);


        // 依相機距離動態調整字體
        if (labelRef.current) {
            groupRef.current.getWorldPosition(_worldPos);
            const dist = camera.position.distanceTo(_worldPos);
            const fontSize = Math.max(11, Math.min(20, Math.round(13 * 200 / Math.max(dist, 1))));
            labelRef.current.style.fontSize = `${fontSize}px`;
        }
    });

    // 高亮：hover=黃色，selected=藍色，兩者同時以 hover 優先
    useEffect(() => {
        const emissiveColor = isHovered ? '#ffaa00' : isSelected ? '#2255ff' : '#000000';
        const emissiveIntensity = isHovered ? 0.3 : isSelected ? 0.25 : 0;

        clonedScene.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map(mat => {
                        if (mat instanceof THREE.MeshStandardMaterial) {
                            const m = mat.clone();
                            m.emissive.set(emissiveColor);
                            m.emissiveIntensity = emissiveIntensity;
                            return m;
                        }
                        return mat;
                    });
                } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
                    const m = (mesh.material as THREE.MeshStandardMaterial).clone();
                    m.emissive.set(emissiveColor);
                    m.emissiveIntensity = emissiveIntensity;
                    mesh.material = m;
                }
            }
        });
    }, [isHovered, isSelected, clonedScene]);

    // TransformControls onChange：debounce 更新後端
    const handleTransformChange = useCallback(() => {
        if (!groupRef.current) return;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            if (!groupRef.current) return;
            const pos = groupRef.current.position;
            const rot = groupRef.current.rotation;
            const scl = groupRef.current.scale;

            updateModelTransform(model.id, {
                position: { x: pos.x, y: pos.y, z: pos.z },
                rotation: {
                    x: rot.x * RAD2DEG,
                    y: rot.y * RAD2DEG,
                    z: rot.z * RAD2DEG,
                },
                scale: { x: scl.x, y: scl.y, z: scl.z },
            });
        }, 500);
    }, [model.id, updateModelTransform]);

    // 清理 debounce
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (editMode) {
            selectModel(model.id);
            setEditingModel(model.id);
        } else {
            // 任何情況下都只選取模型；有子場景時由 sidebar 提供進入入口
            selectModel(model.id);
        }
    }, [editMode, model.id, selectModel, setEditingModel]);

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredModel(model.id);
        document.body.style.cursor = 'pointer';
    }, [model.id, setHoveredModel]);

    const handlePointerOut = useCallback(() => {
        setHoveredModel(null);
        document.body.style.cursor = 'auto';
    }, [setHoveredModel]);

    return (
        <>
            {/* 模型 group：含幾何體、互動事件、transform 編輯 */}
            <group
                ref={groupRef}
                position={[model.position.x, model.position.y, model.position.z]}
                rotation={[
                    model.rotation.x * DEG2RAD,
                    model.rotation.y * DEG2RAD,
                    model.rotation.z * DEG2RAD,
                ]}
                scale={[model.scale.x, model.scale.y, model.scale.z]}
                onClick={isDecorative && !editMode ? undefined : handleClick}
                onPointerOver={isDecorative && !editMode ? undefined : handlePointerOver}
                onPointerOut={isDecorative && !editMode ? undefined : handlePointerOut}
            >
                <primitive object={clonedScene} />
            </group>

            {/* 標籤 group：在模型 group 外，位置由 useFrame + localToWorld 設定
                不受模型 scale 影響，固定 world-space 高度 */}
            {showLabels && !isDecorative && (
                <group ref={labelGroupRef}>
                    <Html center zIndexRange={[100, 0]}>
                        <div
                            ref={labelRef}
                            onClick={() => {
                                selectModel(model.id);
                                if (editMode) setEditingModel(model.id);
                            }}
                            style={{
                                background: isSelected
                                    ? 'rgba(37,99,235,0.92)'
                                    : isHovered
                                        ? 'rgba(37,99,235,0.82)'
                                        : 'rgba(0,0,0,0.72)',
                                color: 'white',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 13,
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                pointerEvents: 'auto',
                                cursor: 'pointer',
                                border: isSelected || isHovered
                                    ? '1px solid rgba(147,197,253,0.7)'
                                    : '1px solid rgba(255,255,255,0.25)',
                                userSelect: 'none',
                                lineHeight: '1.4',
                            }}
                        >
                            {model.name}
                        </div>
                    </Html>
                </group>
            )}


            {isEditing && groupRef.current && (
                <TransformControls
                    object={groupRef.current}
                    mode={transformMode}
                    onChange={handleTransformChange}
                />
            )}
        </>
    );
}

export default FacilityModelItem;
