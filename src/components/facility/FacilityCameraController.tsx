import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFacilityStore } from '../../stores/facilityStore';

interface FlyTarget {
    camFrom: THREE.Vector3;
    camTo: THREE.Vector3;
    targetFrom: THREE.Vector3;
    targetTo: THREE.Vector3;
    duration: number;
    startTime: number;
}

export function FacilityCameraController() {
    const { camera, controls } = useThree();
    const flyRef = useRef<FlyTarget | null>(null);
    const lastFlyModelId = useRef<string | null>(null);
    const flyCompleteCallback = useRef<(() => void) | null>(null);
    const autoFitDoneForScene = useRef<string | null>(null);

    const currentScene = useFacilityStore(state => state.getCurrentScene());
    const flyToModelId = useFacilityStore(state => state.flyToModelId);
    const models = useFacilityStore(state => state.models);
    const clearFlyTo = useFacilityStore(state => state.clearFlyTo);
    const modelBboxCenters = useFacilityStore(state => state.modelBboxCenters);
    const transitionState = useFacilityStore(state => state.transitionState);
    const advanceTransition = useFacilityStore(state => state.advanceTransition);
    const viewPreset = useFacilityStore(state => state.viewPreset);
    const clearViewPreset = useFacilityStore(state => state.clearViewPreset);

    // 場景切換時飛到場景預設相機位置（非 transition 模式才飛行）
    useEffect(() => {
        if (!currentScene?.cameraPosition) return;
        // transition 中場景載入 → 瞬間設定相機（黑幕遮蓋中）
        if (transitionState === 'loading' || transitionState === 'fadeIn') {
            const cp = currentScene.cameraPosition;
            const ct = currentScene.cameraTarget;
            camera.position.set(cp.x, cp.y, cp.z);
            const ctrl = controls as any;
            if (ctrl?.target) {
                ctrl.target.set(ct?.x ?? 0, ct?.y ?? 0, ct?.z ?? 0);
                ctrl.update?.();
            }
            return;
        }
        // 正常場景切換（goBack/goToRoot）：飛行動畫
        const cp = currentScene.cameraPosition;
        const ctrl = controls as any;
        flyRef.current = {
            camFrom: camera.position.clone(),
            camTo: new THREE.Vector3(cp.x, cp.y, cp.z),
            targetFrom: ctrl?.target?.clone() ?? new THREE.Vector3(),
            targetTo: new THREE.Vector3(0, 0, 0),
            duration: 800,
            startTime: performance.now(),
        };
    }, [currentScene?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // 子場景無 cameraPosition 時，等模型 bbox 就緒後自動 fit-all
    useEffect(() => {
        if (!currentScene) return;
        if (currentScene.cameraPosition) return; // 有預設相機位置，不需要 auto-fit
        if (autoFitDoneForScene.current === currentScene.id) return; // 已 fit 過

        const centerKeys = Object.keys(modelBboxCenters);
        if (centerKeys.length === 0) return; // 模型 bbox 還沒就緒

        autoFitDoneForScene.current = currentScene.id;

        // 計算所有模型 bbox 中心的平均作為目標點
        const vals = Object.values(modelBboxCenters);
        const avg = vals.reduce(
            (acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y, z: acc.z + c.z }),
            { x: 0, y: 0, z: 0 }
        );
        const targetTo = new THREE.Vector3(avg.x / vals.length, avg.y / vals.length, avg.z / vals.length);

        // 估算場景範圍
        let maxDist = 50;
        for (const c of vals) {
            const dx = c.x - targetTo.x;
            const dy = c.y - targetTo.y;
            const dz = c.z - targetTo.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist > maxDist) maxDist = dist;
        }
        // 也考慮模型 scale
        for (const m of models) {
            const s = Math.max(m.scale.x, m.scale.y, m.scale.z) * 5;
            if (s > maxDist) maxDist = s;
        }

        const dist = Math.max(400, maxDist * 2.5);
        const camTo = targetTo.clone().add(new THREE.Vector3(0, dist * 0.6, dist));

        const ctrl = controls as any;
        const isTransition = transitionState === 'loading' || transitionState === 'fadeIn';

        if (isTransition) {
            // transition 黑幕遮蓋中 → 瞬間設定
            camera.position.copy(camTo);
            if (ctrl?.target) {
                ctrl.target.copy(targetTo);
                ctrl.update?.();
            }
        } else {
            // 一般場景切換 → 飛行動畫
            flyRef.current = {
                camFrom: camera.position.clone(),
                camTo,
                targetFrom: ctrl?.target?.clone() ?? new THREE.Vector3(),
                targetTo,
                duration: 800,
                startTime: performance.now(),
            };
        }
    }, [currentScene?.id, modelBboxCenters, models, camera, controls, transitionState]);

    // Sidebar 點擊模型時飛向目標（含 transition fly-to）
    useEffect(() => {
        if (!flyToModelId) return;
        // transition fly-to 不跳過重複 ID（可能連續進入同一模型的子場景）
        const isTransition = useFacilityStore.getState().transitionState === 'flyToModel';
        if (!isTransition && flyToModelId === lastFlyModelId.current) return;
        lastFlyModelId.current = flyToModelId;

        const model = models.find(m => m.id === flyToModelId);
        if (!model) return;

        const ctrl = controls as any;
        // 優先使用 FacilityModelItem 回報的 world-space bbox 中心
        const bboxCenter = modelBboxCenters[flyToModelId];
        const targetTo = bboxCenter
            ? new THREE.Vector3(bboxCenter.x, bboxCenter.y, bboxCenter.z)
            : new THREE.Vector3(model.position.x, model.position.y, model.position.z);
        // 固定視角：從模型正上方偏後方觀看，距離依 scale 調整
        const dist = Math.max(200, Math.max(model.scale.x, model.scale.y, model.scale.z) * 50);
        const camTo = targetTo.clone().add(new THREE.Vector3(0, dist * 0.6, dist));

        // transition fly-to 用較短時間（300ms），一般 fly-to 用 1000ms
        const isTransitionFly = transitionState === 'flyToModel';
        flyRef.current = {
            camFrom: camera.position.clone(),
            camTo,
            targetFrom: ctrl?.target?.clone() ?? new THREE.Vector3(),
            targetTo,
            duration: isTransitionFly ? 300 : 1000,
            startTime: performance.now(),
        };
        // fly-to 完成時，若在 transition 模式需 advance
        flyCompleteCallback.current = isTransitionFly ? advanceTransition : null;

        clearFlyTo();
    }, [flyToModelId, models, controls, camera, clearFlyTo, modelBboxCenters, transitionState, advanceTransition]);

    // 視角快速切換
    useEffect(() => {
        if (!viewPreset) return;
        clearViewPreset();

        const ctrl = controls as any;
        const scene = useFacilityStore.getState().getCurrentScene();
        const { models: curModels, modelBboxCenters: centers } = useFacilityStore.getState();

        // 計算場景中心（所有模型 bbox center 的平均；無模型則 fallback 原點）
        const computeSceneCenter = (): THREE.Vector3 => {
            const ct = scene?.cameraTarget;
            if (ct) return new THREE.Vector3(ct.x, ct.y, ct.z);
            const vals = Object.values(centers);
            if (vals.length > 0) {
                const avg = vals.reduce(
                    (acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y, z: acc.z + c.z }),
                    { x: 0, y: 0, z: 0 }
                );
                return new THREE.Vector3(avg.x / vals.length, avg.y / vals.length, avg.z / vals.length);
            }
            if (curModels.length > 0) {
                const avg = curModels.reduce(
                    (acc, m) => ({ x: acc.x + m.position.x, y: acc.y + m.position.y, z: acc.z + m.position.z }),
                    { x: 0, y: 0, z: 0 }
                );
                return new THREE.Vector3(avg.x / curModels.length, avg.y / curModels.length, avg.z / curModels.length);
            }
            return new THREE.Vector3(0, 0, 0);
        };

        // 估算場景範圍（用來決定相機距離）
        const computeSceneRadius = (center: THREE.Vector3): number => {
            let maxDist = 50;
            for (const m of curModels) {
                const dx = m.position.x - center.x;
                const dy = m.position.y - center.y;
                const dz = m.position.z - center.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + Math.max(m.scale.x, m.scale.y, m.scale.z) * 5;
                if (dist > maxDist) maxDist = dist;
            }
            return maxDist;
        };

        let camTo: THREE.Vector3;
        let targetTo: THREE.Vector3;

        if (viewPreset === 'top') {
            // 俯視：從正上方看下去
            targetTo = computeSceneCenter();
            const radius = computeSceneRadius(targetTo);
            const height = Math.max(300, radius * 1.5);
            camTo = new THREE.Vector3(targetTo.x, height, targetTo.z + 0.01); // +0.01 避免正上方 gimbal lock
        } else if (viewPreset === 'default') {
            // 回到場景預設相機位置（有設定時）；無設定則用斜 45° 俯視
            const cp = scene?.cameraPosition;
            if (cp) {
                camTo = new THREE.Vector3(cp.x, cp.y, cp.z);
                const ct = scene?.cameraTarget;
                targetTo = ct ? new THREE.Vector3(ct.x, ct.y, ct.z) : new THREE.Vector3(0, 0, 0);
            } else {
                targetTo = computeSceneCenter();
                const radius = computeSceneRadius(targetTo);
                const dist = Math.max(200, radius * 1.2);
                camTo = targetTo.clone().add(new THREE.Vector3(0, dist * 0.6, dist));
            }
        } else {
            // reset: 根據模型分布計算 fit-all 視角
            targetTo = computeSceneCenter();
            const radius = computeSceneRadius(targetTo);
            const dist = Math.max(200, radius * 1.2);
            camTo = targetTo.clone().add(new THREE.Vector3(0, dist * 0.6, dist));
        }

        flyRef.current = {
            camFrom: camera.position.clone(),
            camTo,
            targetFrom: ctrl?.target?.clone() ?? new THREE.Vector3(),
            targetTo,
            duration: 800,
            startTime: performance.now(),
        };
    }, [viewPreset, camera, controls, clearViewPreset]);

    useFrame(() => {
        const fly = flyRef.current;
        if (!fly) return;

        const elapsed = performance.now() - fly.startTime;
        const t = Math.min(elapsed / fly.duration, 1);
        const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out

        camera.position.lerpVectors(fly.camFrom, fly.camTo, ease);

        const ctrl = controls as any;
        if (ctrl?.target) {
            ctrl.target.lerpVectors(fly.targetFrom, fly.targetTo, ease);
            ctrl.update?.();
        }

        if (t >= 1) {
            flyRef.current = null;
            if (flyCompleteCallback.current) {
                flyCompleteCallback.current();
                flyCompleteCallback.current = null;
            }
        }
    });

    return null;
}

export default FacilityCameraController;
