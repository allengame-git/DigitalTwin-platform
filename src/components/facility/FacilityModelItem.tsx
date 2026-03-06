/**
 * FacilityModelItem — 單一 GLB 模型元件
 * 支援 hover 高亮、click 選取、Tooltip、Transform 編輯
 */
import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { Html, TransformControls, Line } from '@react-three/drei';
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

// Per-animation curve cache — keyed by animation content, supports multiple simultaneous animations
const _curveCache = new Map<string, { curve: THREE.CatmullRomCurve3; arcLengths: number[] }>();

function getGlobalCurve(
    posKeyframes: { position: { x: number; y: number; z: number } }[],
): THREE.CatmullRomCurve3 | null {
    if (posKeyframes.length < 2) return null;
    const key = posKeyframes.map(k => `${k.position.x},${k.position.y},${k.position.z}`).join('|');
    const cached = _curveCache.get(key);
    if (cached) return cached.curve;

    const points = posKeyframes.map(k => new THREE.Vector3(k.position.x, k.position.y, k.position.z));
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');

    // 預計算每個控制點在曲線上的 arc-length 比例 (0~1)
    const n = points.length - 1;
    const cumulativeLengths = curve.getLengths(n);
    const totalLength = cumulativeLengths[n];
    const arcLengths = cumulativeLengths.map(l => totalLength > 0 ? l / totalLength : 0);

    _curveCache.set(key, { curve, arcLengths });
    // 限制快取數量，避免記憶體無限增長
    if (_curveCache.size > 50) {
        const firstKey = _curveCache.keys().next().value;
        if (firstKey) _curveCache.delete(firstKey);
    }

    return curve;
}

function getCurveArcLengths(
    posKeyframes: { position: { x: number; y: number; z: number } }[],
): number[] {
    const key = posKeyframes.map(k => `${k.position.x},${k.position.y},${k.position.z}`).join('|');
    return _curveCache.get(key)?.arcLengths ?? [];
}

/**
 * 從曲線上取第 segIdx 段的 alpha 位置與切線。
 * 使用 getPointAt (arc-length parameterization) 確保等速移動。
 * 段落邊界用預計算的 arc-length 映射，保證端點與控制點重合。
 */
function sampleGlobalCurve(
    curve: THREE.CatmullRomCurve3,
    arcLengths: number[],
    segIdx: number,
    alpha: number,
): { point: THREE.Vector3; tangent: THREE.Vector3 } {
    const arcStart = arcLengths[segIdx];
    const arcEnd = arcLengths[segIdx + 1];
    const arcT = arcStart + alpha * (arcEnd - arcStart);
    const clampedT = Math.max(0, Math.min(1, arcT));
    return {
        point: curve.getPointAt(clampedT),
        tangent: curve.getTangentAt(clampedT),
    };
}

function interpolateKeyframes(
    keyframes: AnimationKeyframe[],
    time: number,
    duration: number,
    easing: string,
    animPathMode: 'linear' | 'catmullrom' = 'linear',
    autoOrient = false,
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
    const ease = easingFns[easing] || easingFns.linear;

    const result: { position?: THREE.Vector3; rotation?: THREE.Euler; scale?: THREE.Vector3 } = {};

    // ── Position interpolation (per-segment pathMode) ──
    const posKeyframes = keyframes.filter(k => k.position) as (AnimationKeyframe & { position: { x: number; y: number; z: number } })[];

    if (posKeyframes.length >= 2) {
        // Find current segment
        let segIdx = 0;
        for (let i = 0; i < posKeyframes.length - 1; i++) {
            if (t >= posKeyframes[i].time && t <= posKeyframes[i + 1].time) {
                segIdx = i;
                break;
            }
            if (i === posKeyframes.length - 2) segIdx = i;
        }
        const prev = posKeyframes[segIdx];
        const next = posKeyframes[segIdx + 1];
        const segTime = next.time - prev.time;
        const rawAlpha = segTime > 0 ? (t - prev.time) / segTime : 0;
        const alpha = ease(rawAlpha);

        // Per-segment pathMode: keyframe-level overrides animation-level
        const segMode = prev.pathMode ?? animPathMode;

        if (segMode === 'catmullrom') {
            // 從曲線取樣 — arc-length 等速 + 端點與控制點重合
            const curve = getGlobalCurve(posKeyframes);
            if (curve) {
                const arcLengths = getCurveArcLengths(posKeyframes);
                const { point, tangent } = sampleGlobalCurve(curve, arcLengths, segIdx, alpha);
                result.position = point;
                if (autoOrient) {
                    result.rotation = new THREE.Euler(0, Math.atan2(tangent.x, tangent.z), 0);
                }
            }
        } else {
            // Linear lerp
            result.position = new THREE.Vector3().lerpVectors(
                new THREE.Vector3(prev.position.x, prev.position.y, prev.position.z),
                new THREE.Vector3(next.position.x, next.position.y, next.position.z),
                alpha,
            );
            if (autoOrient) {
                const dir = new THREE.Vector3(
                    next.position.x - prev.position.x, 0, next.position.z - prev.position.z,
                );
                if (dir.lengthSq() > 0.0001) {
                    result.rotation = new THREE.Euler(0, Math.atan2(dir.x, dir.z), 0);
                }
            }
        }
    }

    // ── Rotation slerp (skip if autoOrient already set rotation) ──
    if (!autoOrient) {
        const rotKeyframes = keyframes.filter(k => k.rotation);
        if (rotKeyframes.length >= 2) {
            let prev = rotKeyframes[0];
            let next = rotKeyframes[rotKeyframes.length - 1];
            for (let i = 0; i < rotKeyframes.length - 1; i++) {
                if (t >= rotKeyframes[i].time && t <= rotKeyframes[i + 1].time) {
                    prev = rotKeyframes[i];
                    next = rotKeyframes[i + 1];
                    break;
                }
            }
            const segment = next.time - prev.time;
            const rawAlpha = segment > 0 ? (t - prev.time) / segment : 0;
            const alpha = ease(rawAlpha);
            const q1 = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(prev.rotation!.x * DEG2RAD, prev.rotation!.y * DEG2RAD, prev.rotation!.z * DEG2RAD),
            );
            const q2 = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(next.rotation!.x * DEG2RAD, next.rotation!.y * DEG2RAD, next.rotation!.z * DEG2RAD),
            );
            const q = new THREE.Quaternion().slerpQuaternions(q1, q2, alpha);
            result.rotation = new THREE.Euler().setFromQuaternion(q);
        } else if (rotKeyframes.length === 1) {
            const r = rotKeyframes[0].rotation!;
            result.rotation = new THREE.Euler(r.x * DEG2RAD, r.y * DEG2RAD, r.z * DEG2RAD);
        }
    }

    // ── Scale lerp ──
    const scaleKeyframes = keyframes.filter(k => k.scale);
    if (scaleKeyframes.length >= 2) {
        let prev = scaleKeyframes[0];
        let next = scaleKeyframes[scaleKeyframes.length - 1];
        for (let i = 0; i < scaleKeyframes.length - 1; i++) {
            if (t >= scaleKeyframes[i].time && t <= scaleKeyframes[i + 1].time) {
                prev = scaleKeyframes[i];
                next = scaleKeyframes[i + 1];
                break;
            }
        }
        const segment = next.time - prev.time;
        const rawAlpha = segment > 0 ? (t - prev.time) / segment : 0;
        const alpha = ease(rawAlpha);
        result.scale = new THREE.Vector3().lerpVectors(
            new THREE.Vector3(prev.scale!.x, prev.scale!.y, prev.scale!.z),
            new THREE.Vector3(next.scale!.x, next.scale!.y, next.scale!.z),
            alpha,
        );
    } else if (scaleKeyframes.length === 1) {
        const s = scaleKeyframes[0].scale!;
        result.scale = new THREE.Vector3(s.x, s.y, s.z);
    }

    return result;
}

// ── 可拖曳的路徑控制點 ─────────────────────────────────────────────
function PathControlPoint({ position, kfIndex, isEditing, animationId, keyframe }: {
    position: THREE.Vector3;
    kfIndex: number;
    isEditing: boolean;
    animationId: string;
    keyframe: AnimationKeyframe;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const setEditingKeyframeIndex = useFacilityStore(s => s.setEditingKeyframeIndex);
    const setPlaybackTime = useFacilityStore(s => s.setPlaybackTime);
    const setPlaybackState = useFacilityStore(s => s.setPlaybackState);
    const updateKeyframe = useFacilityStore(s => s.updateKeyframe);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const [hovered, setHovered] = useState(false);

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        setEditingKeyframeIndex(kfIndex);
        setPlaybackTime(keyframe.time);
        setPlaybackState('paused');
    }, [kfIndex, keyframe.time, setEditingKeyframeIndex, setPlaybackTime, setPlaybackState]);

    // TransformControls 拖曳結束 → 更新 keyframe position
    const handleDragChange = useCallback(() => {
        if (!meshRef.current) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (!meshRef.current) return;
            const pos = meshRef.current.position;
            updateKeyframe(animationId, kfIndex, {
                ...keyframe,
                position: { x: pos.x, y: pos.y, z: pos.z },
            });
        }, 300);
    }, [animationId, kfIndex, keyframe, updateKeyframe]);

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    return (
        <>
            <mesh
                ref={meshRef}
                position={position}
                onClick={handleClick}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
            >
                <sphereGeometry args={[isEditing ? 1.2 : hovered ? 1.0 : 0.8, 12, 8]} />
                <meshBasicMaterial color={isEditing ? '#a78bfa' : hovered ? '#c4b5fd' : '#7c3aed'} />
            </mesh>
            {isEditing && meshRef.current && (
                <TransformControls
                    object={meshRef.current}
                    mode="translate"
                    size={0.6}
                    onChange={handleDragChange}
                />
            )}
        </>
    );
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
    const editingKeyframeIndex = useFacilityStore(state => state.editingKeyframeIndex);

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
                const result = interpolateKeyframes(anim.keyframes, currentTime, anim.duration, anim.easing, anim.pathMode ?? 'linear', anim.autoOrient ?? false);
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

    // 高亮 + 路徑節點編輯時半透明
    // 直接修改材質屬性，不 clone，避免 GPU 記憶體洩漏
    const isEditingPathNode = editingKeyframeIndex !== null && animationMode;

    useEffect(() => {
        const emissiveColor = isHovered ? '#ffaa00' : isSelected ? '#2255ff' : '#000000';
        const emissiveIntensity = isHovered ? 0.3 : isSelected ? 0.25 : 0;
        const ghostMode = isEditingPathNode;

        clonedScene.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                // ghostMode: 禁用 raycasting 讓射線穿透模型打到節點球
                if (ghostMode) {
                    if (!(mesh.userData as Record<string, unknown>)._origRaycast) {
                        (mesh.userData as Record<string, unknown>)._origRaycast = mesh.raycast;
                    }
                    mesh.raycast = () => {};
                } else if ((mesh.userData as Record<string, unknown>)._origRaycast) {
                    mesh.raycast = (mesh.userData as Record<string, unknown>)._origRaycast as typeof mesh.raycast;
                    delete (mesh.userData as Record<string, unknown>)._origRaycast;
                }

                const ud = mesh.userData as Record<string, unknown>;
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                for (const mat of mats) {
                    if (mat instanceof THREE.MeshStandardMaterial) {
                        mat.emissive.set(emissiveColor);
                        mat.emissiveIntensity = emissiveIntensity;
                        if (ghostMode) {
                            if (ud._origOpacity === undefined) {
                                ud._origOpacity = mat.opacity;
                                ud._origTransparent = mat.transparent;
                            }
                            mat.transparent = true;
                            mat.opacity = 0.3;
                        } else if (ud._origOpacity !== undefined) {
                            mat.opacity = ud._origOpacity as number;
                            mat.transparent = ud._origTransparent as boolean;
                            delete ud._origOpacity;
                            delete ud._origTransparent;
                        }
                        mat.needsUpdate = true;
                    }
                }
            }
        });
    }, [isHovered, isSelected, isEditingPathNode, clonedScene]);

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

    // ── 動畫路徑可視化資料 ──
    const pathVizData = useMemo(() => {
        if (!animationMode || !selectedAnimationId) return null;
        const anim = animations.find(a => a.id === selectedAnimationId && a.type === 'keyframe');
        if (!anim) return null;
        const posKfs = anim.keyframes.filter(kf => kf.position);
        if (posKfs.length < 2) return null;
        const controlPoints = posKfs.map(kf => new THREE.Vector3(kf.position!.x, kf.position!.y, kf.position!.z));
        const animDefault = anim.pathMode ?? 'linear';

        // 建一條全域曲線（給曲線段取樣用）
        const globalCurve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal');
        const n = controlPoints.length - 1; // segment count

        // Per-segment: 曲線段從全域曲線取樣，直線段直接連接
        // 視覺化只需正確形狀，getPoint 即可（弧長等速在插值引擎處理）
        const linePoints: THREE.Vector3[] = [controlPoints[0].clone()];
        for (let i = 0; i < n; i++) {
            const segMode = posKfs[i].pathMode ?? animDefault;
            if (segMode === 'catmullrom') {
                const samples = 20;
                for (let s = 1; s <= samples; s++) {
                    const curveT = (i + s / samples) / n;
                    linePoints.push(globalCurve.getPoint(Math.max(0, Math.min(1, curveT))));
                }
            } else {
                linePoints.push(controlPoints[i + 1].clone());
            }
        }

        return { linePoints, controlPoints, keyframes: posKfs, animKeyframes: anim.keyframes };
    }, [animationMode, selectedAnimationId, animations]);

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

            {/* 動畫路徑可視化：路徑線 + 可拖曳關鍵幀節點球 */}
            {pathVizData && (
                <>
                    <Line
                        points={pathVizData.linePoints}
                        color="#7c3aed"
                        lineWidth={2}
                    />
                    {pathVizData.controlPoints.map((pt, i) => {
                        const kfIndex = pathVizData.animKeyframes.indexOf(pathVizData.keyframes[i]);
                        const isEditingKf = editingKeyframeIndex === kfIndex;
                        return (
                            <PathControlPoint
                                key={i}
                                position={pt}
                                kfIndex={kfIndex}
                                isEditing={isEditingKf}
                                animationId={selectedAnimationId!}
                                keyframe={pathVizData.keyframes[i]}
                            />
                        );
                    })}
                </>
            )}
        </>
    );
}

export default FacilityModelItem;
