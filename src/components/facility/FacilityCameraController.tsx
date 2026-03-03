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

    const currentScene = useFacilityStore(state => state.getCurrentScene());
    const flyToModelId = useFacilityStore(state => state.flyToModelId);
    const models = useFacilityStore(state => state.models);
    const clearFlyTo = useFacilityStore(state => state.clearFlyTo);
    const modelBboxCenters = useFacilityStore(state => state.modelBboxCenters);

    // 場景切換時飛到場景預設相機位置
    useEffect(() => {
        if (!currentScene?.cameraPosition) return;
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

    // Sidebar 點擊模型時飛向目標
    useEffect(() => {
        if (!flyToModelId || flyToModelId === lastFlyModelId.current) return;
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

        flyRef.current = {
            camFrom: camera.position.clone(),
            camTo,
            targetFrom: ctrl?.target?.clone() ?? new THREE.Vector3(),
            targetTo,
            duration: 1000,
            startTime: performance.now(),
        };

        clearFlyTo();
    }, [flyToModelId, models, controls, camera, clearFlyTo, modelBboxCenters]);

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

        if (t >= 1) flyRef.current = null;
    });

    return null;
}

export default FacilityCameraController;
