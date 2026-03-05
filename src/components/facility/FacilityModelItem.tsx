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
import { useFacilityStore, registerModelGroupRef, unregisterModelGroupRef } from '@/stores/facilityStore';
import type { FacilityModel, AnimationKeyframe } from '@/types/facility';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ── Easing functions ────────────────────────────────────────────
const easingFns: Record<string, (t: number) => number> = {
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => t * (2 - t),
    easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
};

// ── Keyframe interpolation ──────────────────────────────────────
function interpolateKeyframes(
    keyframes: AnimationKeyframe[],
    time: number,
    duration: number,
    easing: string,
): { position?: THREE.Vector3; rotation?: THREE.Euler; scale?: THREE.Vector3 } | null {
    if (keyframes.length === 0) return null;
    if (keyframes.length === 1) {
        const kf = keyframes[0];
        return {
            position: kf.position ? new THREE.Vector3(kf.position.x, kf.position.y, kf.position.z) : undefined,
            rotation: kf.rotation ? new THREE.Euler(kf.rotation.x * DEG2RAD, kf.rotation.y * DEG2RAD, kf.rotation.z * DEG2RAD) : undefined,
            scale: kf.scale ? new THREE.Vector3(kf.scale.x, kf.scale.y, kf.scale.z) : undefined,
        };
    }

    // Clamp time
    const t = Math.max(0, Math.min(duration, time));

    // Find surrounding keyframes
    let prev = keyframes[0];
    let next = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) {
        if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
            prev = keyframes[i];
            next = keyframes[i + 1];
            break;
        }
    }

    const segment = next.time - prev.time;
    const rawAlpha = segment > 0 ? (t - prev.time) / segment : 0;
    const ease = easingFns[easing] || easingFns.linear;
    const alpha = ease(rawAlpha);

    const result: { position?: THREE.Vector3; rotation?: THREE.Euler; scale?: THREE.Vector3 } = {};

    // Position lerp
    if (prev.position && next.position) {
        result.position = new THREE.Vector3().lerpVectors(
            new THREE.Vector3(prev.position.x, prev.position.y, prev.position.z),
            new THREE.Vector3(next.position.x, next.position.y, next.position.z),
            alpha,
        );
    }

    // Rotation slerp via quaternion
    if (prev.rotation && next.rotation) {
        const q1 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(prev.rotation.x * DEG2RAD, prev.rotation.y * DEG2RAD, prev.rotation.z * DEG2RAD),
        );
        const q2 = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(next.rotation.x * DEG2RAD, next.rotation.y * DEG2RAD, next.rotation.z * DEG2RAD),
        );
        const q = new THREE.Quaternion().slerpQuaternions(q1, q2, alpha);
        result.rotation = new THREE.Euler().setFromQuaternion(q);
    }

    // Scale lerp
    if (prev.scale && next.scale) {
        result.scale = new THREE.Vector3().lerpVectors(
            new THREE.Vector3(prev.scale.x, prev.scale.y, prev.scale.z),
            new THREE.Vector3(next.scale.x, next.scale.y, next.scale.z),
            alpha,
        );
    }

    return result;
}

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
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const animStartTimeRef = useRef<number>(0);
    const manualStartTimeRef = useRef<number>(0);
    const manualNeedReset = useRef(true);
    const manualGltfActionsRef = useRef<THREE.AnimationAction[]>([]);

    const selectedModelIds = useFacilityStore(state => state.selectedModelIds);
    const focusedModelId = useFacilityStore(state => state.focusedModelId);
    const hoveredModelId = useFacilityStore(state => state.hoveredModelId);
    const hiddenModelIds = useFacilityStore(state => state.hiddenModelIds);
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

    // Animation state from store
    const allAnimations = useFacilityStore(state => state.animations);
    const animations = useMemo(() => allAnimations.filter(a => a.modelId === model.id), [allAnimations, model.id]);
    const animationMode = useFacilityStore(state => state.animationMode);
    const playbackState = useFacilityStore(state => state.playbackState);
    const playbackTime = useFacilityStore(state => state.playbackTime);
    const selectedAnimationId = useFacilityStore(state => state.selectedAnimationId);
    const manualPlayingModelIds = useFacilityStore(state => state.manualPlayingModelIds);
    const isManualPlaying = manualPlayingModelIds.includes(model.id);

    const isSelected = selectedModelIds.includes(model.id);
    const isFocused = focusedModelId === model.id;
    const isHovered = hoveredModelId === model.id;
    const isHidden = hiddenModelIds.includes(model.id);
    const isEditing = editMode && editingModelId === model.id;
    const isDecorative = model.modelType === 'decorative';
    const isLobby = currentSceneType === 'lobby';
    const childScenes = useMemo(() => getChildScenes(model.id), [getChildScenes, model.id]);
    const hasChildScene = childScenes.length > 0;
    // useGLTF 載入模型（含 animations）
    const { scene: gltfScene, animations: gltfAnimations } = useGLTF(model.modelUrl);

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

    // ── 註冊 groupRef 供 AnimationTimeline 讀取即時 transform ──
    useEffect(() => {
        if (groupRef.current) {
            registerModelGroupRef(model.id, groupRef.current);
        }
        return () => { unregisterModelGroupRef(model.id); };
    }, [model.id]);

    // 動畫編輯中：焦點模型 + 選取動畫 + 非播放中
    const isAnimEditing = animationMode && isFocused && selectedAnimationId !== null && playbackState !== 'playing';

    // ── 播放狀態切換時標記需要重置起始時間 ──
    const needResetStartTime = useRef(false);
    const prevPlaybackState = useRef(playbackState);
    // paused 時只在 playbackTime 變化那一幀套用 interpolation，之後允許自由拖曳
    const lastAppliedPauseTime = useRef<number>(-1);
    useEffect(() => {
        if (playbackState === 'playing' && prevPlaybackState.current !== 'playing') {
            needResetStartTime.current = true;
        }
        // 進入 paused 或 stopped 時重置，確保下次 snap
        if (playbackState !== 'playing') {
            lastAppliedPauseTime.current = -1;
        }
        prevPlaybackState.current = playbackState;
    }, [playbackState]);

    // ── GLB AnimationMixer 初始化 ──
    useEffect(() => {
        if (gltfAnimations.length === 0) return;
        const mixer = new THREE.AnimationMixer(clonedScene);
        mixerRef.current = mixer;

        // 初始化 gltf 動畫 actions
        const manualActions: THREE.AnimationAction[] = [];
        for (const anim of animations) {
            if (anim.type === 'gltf' && anim.gltfClipName) {
                const clip = gltfAnimations.find(c => c.name === anim.gltfClipName);
                if (clip) {
                    const action = mixer.clipAction(clip);
                    action.setLoop(anim.loop ? THREE.LoopRepeat : THREE.LoopOnce, anim.loop ? Infinity : 1);
                    if (!anim.loop) action.clampWhenFinished = true;
                    if (anim.trigger === 'auto') {
                        action.play();
                    } else {
                        // manual: 建立 action 但不 play，存入 ref
                        manualActions.push(action);
                    }
                }
            }
        }
        manualGltfActionsRef.current = manualActions;

        return () => {
            mixer.stopAllAction();
            mixer.uncacheRoot(clonedScene);
            mixerRef.current = null;
            manualGltfActionsRef.current = [];
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clonedScene, gltfAnimations]);

    // ── Manual 動畫播放控制 ──
    useEffect(() => {
        if (isManualPlaying) {
            // 開始播放：重設 keyframe start time + 播放 GLB actions
            manualNeedReset.current = true;
            for (const action of manualGltfActionsRef.current) {
                action.reset().play();
            }
        } else {
            // 停止：停止 GLB actions
            for (const action of manualGltfActionsRef.current) {
                action.stop();
            }
        }
    }, [isManualPlaying]);

    // 每幀：用 localToWorld 把 bbox 頂點轉成 world space → 設定 labelGroup 位置
    // 標籤 group 在 model group 外面，不受 model scale 影響
    useFrame(({ camera, clock }, delta) => {
        if (!groupRef.current) return;

        // ── GLB mixer update ──
        if (mixerRef.current) {
            mixerRef.current.update(delta);
        }

        // ── Keyframe animation playback ──
        const activeKeyframeAnims = animations.filter(a => a.type === 'keyframe' && a.keyframes.length > 0);
        for (const anim of activeKeyframeAnims) {
            // 動畫編輯模式中：選中的動畫用 playbackTime scrub
            const isEditingThis = animationMode && selectedAnimationId === anim.id;
            let shouldAnimate = false;
            let currentTime = 0;

            if (isEditingThis) {
                // 編輯模式：跟隨 store 的 playbackTime
                if (playbackState === 'playing') {
                    if (needResetStartTime.current) {
                        animStartTimeRef.current = clock.elapsedTime - playbackTime;
                        needResetStartTime.current = false;
                    }
                    const elapsed = clock.elapsedTime - animStartTimeRef.current;
                    currentTime = anim.loop
                        ? elapsed % anim.duration
                        : Math.min(elapsed, anim.duration);
                    useFacilityStore.getState().setPlaybackTime(currentTime);
                    shouldAnimate = true;
                } else if (playbackState === 'paused') {
                    // 只在 playbackTime 實際變化時 snap 一次，之後允許 TransformControls 自由拖曳
                    if (playbackTime !== lastAppliedPauseTime.current) {
                        currentTime = playbackTime;
                        shouldAnimate = true;
                        lastAppliedPauseTime.current = playbackTime;
                    }
                }
            } else if (animationMode) {
                // 動畫編輯模式中但非正在編輯的動畫 → 全部凍結不動
            } else if (anim.trigger === 'auto' && playbackState !== 'paused') {
                // 自動播放模式（暫停時不執行；stopped 代表正常自動播放狀態）
                const elapsed = clock.elapsedTime;
                currentTime = anim.loop
                    ? elapsed % anim.duration
                    : Math.min(elapsed, anim.duration);
                shouldAnimate = true;
            } else if (anim.trigger === 'manual' && isManualPlaying) {
                // 手動觸發播放
                if (manualNeedReset.current) {
                    manualStartTimeRef.current = clock.elapsedTime;
                    manualNeedReset.current = false;
                }
                const elapsed = clock.elapsedTime - manualStartTimeRef.current;
                currentTime = anim.loop
                    ? elapsed % anim.duration
                    : Math.min(elapsed, anim.duration);
                shouldAnimate = true;
                // 非循環且播完 → 自動停止
                if (!anim.loop && elapsed >= anim.duration) {
                    useFacilityStore.getState().toggleManualPlay(model.id);
                }
            }

            if (shouldAnimate) {
                const result = interpolateKeyframes(anim.keyframes, currentTime, anim.duration, anim.easing);
                if (result) {
                    if (result.position) groupRef.current.position.copy(result.position);
                    if (result.rotation) groupRef.current.rotation.copy(result.rotation);
                    if (result.scale) groupRef.current.scale.copy(result.scale);
                }
            }
        }

        // ── Label positioning ──
        if (!labelGroupRef.current) return;

        // 第一幀：把 bbox 視覺中心的 world-space 座標存進 store（供 fly-to 使用）
        if (!bboxCenterReported.current) {
            const centerLocal = new THREE.Vector3(bboxInfo.cx, bboxInfo.cy, bboxInfo.cz);
            groupRef.current.localToWorld(centerLocal);
            setModelBboxCenter(model.id, { x: centerLocal.x, y: centerLocal.y, z: centerLocal.z });
            bboxCenterReported.current = true;
        }

        // local → world（含 model scale / rotation / translation）
        _topLocal.set(bboxInfo.cx, bboxInfo.maxY, bboxInfo.cz);
        groupRef.current.localToWorld(_topLocal);

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
        const multi = e.nativeEvent.metaKey || e.nativeEvent.ctrlKey;
        if (editMode) {
            selectModel(model.id, multi);
            setEditingModel(model.id);
        } else {
            selectModel(model.id, multi);
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

    // 隱藏模型：不渲染但保留 ref 註冊
    if (isHidden) return null;

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
                onClick={isDecorative && !editMode && !animationMode ? undefined : handleClick}
                onPointerOver={isDecorative && !editMode && !animationMode ? undefined : handlePointerOver}
                onPointerOut={isDecorative && !editMode && !animationMode ? undefined : handlePointerOut}
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
                            onClick={(e: React.MouseEvent) => {
                                const multi = e.metaKey || e.ctrlKey;
                                selectModel(model.id, multi);
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


            {(isEditing || isAnimEditing) && groupRef.current && (
                <TransformControls
                    object={groupRef.current}
                    mode={transformMode}
                    onChange={isEditing ? handleTransformChange : undefined}
                />
            )}
        </>
    );
}

export default FacilityModelItem;
