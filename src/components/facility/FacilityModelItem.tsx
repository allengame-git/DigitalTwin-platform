/**
 * FacilityModelItem — 單一 GLB 模型元件
 * 支援 hover 高亮、click 選取、Tooltip、Transform 編輯
 */
import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Html, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useFacilityStore } from '@/stores/facilityStore';
import type { FacilityModel } from '@/types/facility';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

interface FacilityModelItemProps {
    model: FacilityModel;
}

export function FacilityModelItem({ model }: FacilityModelItemProps) {
    const groupRef = useRef<THREE.Group>(null);
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

    // 計算模型 bbox 頂部作為標籤 Y 偏移（local space，group 的 position+scale 由 R3F 處理）
    const labelOffsetY = useMemo(() => {
        clonedScene.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(clonedScene);
        if (bbox.isEmpty() || !Number.isFinite(bbox.max.y)) return 3;
        return bbox.max.y + 1;
    }, [clonedScene]);

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

                {showLabels && (
                    <Html position={[0, labelOffsetY, 0]} center distanceFactor={80}>
                        <div
                            style={{
                                background: isHovered ? 'rgba(37,99,235,0.92)' : 'rgba(0,0,0,0.65)',
                                color: 'white',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 13,
                                fontWeight: isHovered ? 600 : 400,
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                                border: isHovered ? '1px solid rgba(147,197,253,0.6)' : '1px solid rgba(255,255,255,0.15)',
                                userSelect: 'none',
                            }}
                        >
                            {model.name}
                        </div>
                    </Html>
                )}
            </group>

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
