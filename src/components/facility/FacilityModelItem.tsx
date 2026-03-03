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

    const isHovered = hoveredModelId === model.id;
    const isEditing = editMode && editingModelId === model.id;
    const hasChildScene = model.childSceneId !== null;

    // useGLTF 載入模型
    const { scene: gltfScene } = useGLTF(model.modelUrl);

    // Clone scene 以避免多個 instance 共用同一 scene（memo 確保 bbox 不重算）
    const clonedScene = useMemo(() => gltfScene.clone(true), [gltfScene]);

    // 計算 bbox 在 group local space 的頂部中心（cx, maxY, cz）
    // 只算一次，useFrame 每幀用 localToWorld 轉換成 world space
    const bboxInfo = useMemo(() => {
        clonedScene.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(clonedScene);
        if (bbox.isEmpty() || !Number.isFinite(bbox.max.y)) {
            return { cx: 0, maxY: 0, cz: 0 };
        }
        return {
            cx: (bbox.min.x + bbox.max.x) / 2,
            maxY: bbox.max.y,
            cz: (bbox.min.z + bbox.max.z) / 2,
        };
    }, [clonedScene]);

    // 每幀：用 localToWorld 把 bbox 頂點轉成 world space → 設定 labelGroup 位置
    // 標籤 group 在 model group 外面，不受 model scale 影響
    useFrame(({ camera }) => {
        if (!labelGroupRef.current || !groupRef.current) return;

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

    // Hover 高亮：遍歷 scene，對 MeshStandardMaterial 設定 emissive
    useEffect(() => {
        clonedScene.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map(mat => {
                        if (mat instanceof THREE.MeshStandardMaterial) {
                            const clonedMat = mat.clone();
                            clonedMat.emissive.set(isHovered ? '#ffaa00' : '#000000');
                            clonedMat.emissiveIntensity = isHovered ? 0.3 : 0;
                            return clonedMat;
                        }
                        return mat;
                    });
                } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
                    const clonedMat = (mesh.material as THREE.MeshStandardMaterial).clone();
                    clonedMat.emissive.set(isHovered ? '#ffaa00' : '#000000');
                    clonedMat.emissiveIntensity = isHovered ? 0.3 : 0;
                    mesh.material = clonedMat;
                }
            }
        });
    }, [isHovered, clonedScene]);

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
            // 編輯模式：選取模型進行 transform 編輯，不進入子場景
            selectModel(model.id);
            setEditingModel(model.id);
        } else {
            selectModel(model.id);
            if (hasChildScene && model.childSceneId) {
                enterScene(model.childSceneId);
            }
        }
    }, [editMode, model.id, model.childSceneId, hasChildScene, selectModel, setEditingModel, enterScene]);

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredModel(model.id);
        if (hasChildScene) {
            document.body.style.cursor = 'pointer';
        }
    }, [model.id, hasChildScene, setHoveredModel]);

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
                onClick={handleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <primitive object={clonedScene} />
            </group>

            {/* 標籤 group：在模型 group 外，位置由 useFrame + localToWorld 設定
                不受模型 scale 影響，固定 world-space 高度 */}
            {showLabels && (
                <group ref={labelGroupRef}>
                    <Html center zIndexRange={[100, 0]}>
                        <div
                            ref={labelRef}
                            style={{
                                background: isHovered ? 'rgba(37,99,235,0.92)' : 'rgba(0,0,0,0.72)',
                                color: 'white',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 13,
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                                border: isHovered ? '1px solid rgba(147,197,253,0.7)' : '1px solid rgba(255,255,255,0.25)',
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
