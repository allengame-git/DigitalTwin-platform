/**
 * Camera Controller Component
 * @module components/scene/CameraController
 * 
 * 監聽 cameraStore 的重置觸發，將相機移動到目標中心
 * 綜合計算所有可見資料的邊界 (模型、鑽孔、位態、斷層)
 * 支援框選目標過濾 (all / geology / borehole)
 * 支援預設視角切換 (top / +X / +Y)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCameraStore, type ViewPreset } from '../../stores/cameraStore';
import { useUploadStore } from '../../stores/uploadStore';
import { useBoreholeStore } from '../../stores/boreholeStore';
import { useAttitudeStore } from '../../stores/attitudeStore';
import { useProjectStore } from '../../stores/projectStore';
import { Borehole } from '../../types/geology';
import { twd97ToWorld } from '../../utils/coordinates';

/** 計算指定視角的球座標偏移 (phi=極角, theta=方位角) */
function getViewAngles(preset: ViewPreset, northAngleDeg: number = 0): { phi: number; theta: number } {
    const baseTheta = -northAngleDeg * (Math.PI / 180);

    switch (preset) {
        case 'top':
            // 幾乎正上方俯視，但 theta 設為對準專案的真北偏移
            return { phi: 0.01, theta: baseTheta };
        case 'xPositive':
            // 從 +X 方向看 (略帶俯角)
            return { phi: Math.PI / 2.5, theta: Math.PI / 2 };
        case 'yPositive':
            // 從 +Y 方向看 (從南看北，+Z 到 -Z)
            return { phi: Math.PI / 2.5, theta: 0 };
        case 'default':
        default:
            // 60 度俯視 + 45 度方位角
            return { phi: Math.PI / 3, theta: Math.PI / 4 };
    }
}

export function CameraController() {
    const { camera, controls, scene, size } = useThree();
    const { getActiveProject } = useProjectStore();
    const activeProject = getActiveProject();
    const northAngle = activeProject?.northAngle || 0;

    const {
        resetTrigger, targetCenter, resetTarget,
        flyToTarget, flyToTrigger,
        viewPreset, viewPresetTrigger,
    } = useCameraStore();
    const { getActiveGeologyModel } = useUploadStore();
    const prevResetTrigger = useRef(resetTrigger);
    const prevViewPresetTrigger = useRef(viewPresetTrigger);

    /** 根據 resetTarget 過濾 scene 中的 mesh，計算邊界 */
    const computeBounds = useCallback(() => {
        const box = new THREE.Box3();
        let hasContent = false;

        // === 策略 1: 直接從 Three.js scene 讀取可見物件邊界 ===
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.visible) {
                if (!child.geometry) return;
                if (child.raycast === null) return;

                const layerType = child.userData?.layerType
                    || child.parent?.userData?.layerType;

                // 根據 resetTarget 過濾
                if (resetTarget === 'geology') {
                    if (layerType !== 'geology') return;
                } else if (resetTarget === 'borehole') {
                    if (layerType !== 'borehole') return;
                } else {
                    // 'all' — 排除大型環境平面 (通常 size > 5000)
                    const childBox = new THREE.Box3().setFromObject(child);
                    const childSize = new THREE.Vector3();
                    childBox.getSize(childSize);
                    if (Math.max(childSize.x, childSize.z) > 5000) return;
                }

                box.expandByObject(child);
                hasContent = true;
            }
        });

        // 也檢查 InstancedMesh (鑽孔)
        scene.traverse((child) => {
            if (child instanceof THREE.InstancedMesh && child.visible) {
                const layerType = child.userData?.layerType;

                if (resetTarget === 'geology') return; // geology 模式不看鑽孔
                if (resetTarget === 'borehole' && layerType !== 'borehole') return;
                if (resetTarget === 'all') {
                    // 'all' 模式下 InstancedMesh 總是加入
                }

                box.expandByObject(child);
                hasContent = true;
            }
        });

        // === 策略 2: 若 scene traverse 沒找到有效內容，Fallback 到 store 資料 ===
        if (!hasContent) {
            const activeModel = getActiveGeologyModel();
            if (activeModel &&
                activeModel.minX != null && activeModel.minX > 10000 &&
                activeModel.maxX != null && activeModel.maxX > 10000) {
                const min = twd97ToWorld({ x: activeModel.minX, y: activeModel.minY!, z: activeModel.minZ! });
                const max = twd97ToWorld({ x: activeModel.maxX, y: activeModel.maxY!, z: activeModel.maxZ! });
                box.expandByPoint(new THREE.Vector3(min.x, min.y, min.z));
                box.expandByPoint(new THREE.Vector3(max.x, max.y, max.z));
                hasContent = true;
            }

            const boreholes = useBoreholeStore.getState().boreholes;
            boreholes.forEach((bh: Borehole) => {
                if (bh.x < 10000 || bh.y < 10000) return;
                const p = twd97ToWorld({ x: bh.x, y: bh.elevation, z: bh.y });
                box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z));
                const bottom = twd97ToWorld({ x: bh.x, y: bh.elevation - bh.totalDepth, z: bh.y });
                box.expandByPoint(new THREE.Vector3(bottom.x, bottom.y, bottom.z));
                hasContent = true;
            });

            const attitudes = useAttitudeStore.getState().attitudes;
            attitudes.forEach((att) => {
                if (att.x < 10000 || att.y < 10000) return;
                const p = twd97ToWorld({ x: att.x, y: att.y, z: att.z });
                box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z));
                hasContent = true;
            });
        }

        // 最終 Fallback
        if (!hasContent || box.isEmpty()) {
            box.expandByPoint(new THREE.Vector3(-100, -50, -100));
            box.expandByPoint(new THREE.Vector3(100, 50, 100));
        }

        return { box, hasContent };
    }, [scene, resetTarget, getActiveGeologyModel]);

    /** 將相機移動到目標位置 */
    const applyCamera = useCallback((
        box: THREE.Box3,
        hasContent: boolean,
        preset: ViewPreset,
    ) => {
        const center = new THREE.Vector3();
        box.getCenter(center);

        const boxSize = new THREE.Vector3();
        box.getSize(boxSize);
        const maxHorizontal = Math.max(boxSize.x, boxSize.z);

        const fov = (camera as THREE.PerspectiveCamera).fov || 45;
        const fovRad = (fov / 2) * (Math.PI / 180);
        const aspect = size.width / size.height;

        let distance;
        if (aspect > 1) {
            distance = (maxHorizontal / 2) / Math.tan(fovRad);
        } else {
            distance = (maxHorizontal / 2) / Math.tan(fovRad) / aspect;
        }

        // 保持適度空間 (讓模型佔畫面 ~70%)
        distance *= 0.7;
        distance = THREE.MathUtils.clamp(distance, 50, 5000);

        const { phi, theta } = getViewAngles(preset, northAngle);

        const offset = new THREE.Vector3(
            distance * Math.sin(phi) * Math.sin(theta),
            distance * Math.cos(phi),
            distance * Math.sin(phi) * Math.cos(theta),
        );

        const newPosition = center.clone().add(offset);
        camera.position.copy(newPosition);

        // TOP 視角時，手動設定 camera.up 朝北 (-Z 方向旋轉 northAngle)
        // 避免 lookAt 在 gimbal lock (幾乎正上方) 時產生錯誤的旋轉
        if (preset === 'top') {
            const northRad = -northAngle * (Math.PI / 180);
            camera.up.set(
                -Math.sin(northRad),
                0,
                -Math.cos(northRad),
            );
        } else {
            camera.up.set(0, 1, 0);
        }

        camera.lookAt(center);

        if (controls && 'target' in controls) {
            (controls.target as THREE.Vector3).copy(center);
            (controls as any).update?.();
        }

        console.log('🎯 Camera Reset:', {
            center: center.toArray(),
            boxSize: boxSize.toArray(),
            maxHorizontal,
            distance,
            hasContent,
            resetTarget,
            preset,
            strategy: hasContent ? 'scene-traverse' : 'store-fallback',
        });
    }, [camera, controls, size, resetTarget, northAngle]);

    // === 重置相機 ===
    useEffect(() => {
        if (prevResetTrigger.current === resetTrigger) return;
        prevResetTrigger.current = resetTrigger;

        const { box, hasContent } = computeBounds();
        applyCamera(box, hasContent, viewPreset);
    }, [resetTrigger, targetCenter, camera, controls, scene, size, getActiveGeologyModel, computeBounds, applyCamera, viewPreset]);

    // === 視角預設切換 ===
    useEffect(() => {
        if (prevViewPresetTrigger.current === viewPresetTrigger) return;
        prevViewPresetTrigger.current = viewPresetTrigger;

        const { box, hasContent } = computeBounds();
        applyCamera(box, hasContent, viewPreset);
    }, [viewPresetTrigger, viewPreset, computeBounds, applyCamera]);

    // === flyTo: 由外部觸發的相機飛行 ===
    const prevFlyTrigger = useRef(flyToTrigger);

    useEffect(() => {
        if (prevFlyTrigger.current === flyToTrigger || !flyToTarget) return;
        prevFlyTrigger.current = flyToTrigger;

        const { position, lookAt } = flyToTarget;
        camera.position.set(...position);
        camera.lookAt(new THREE.Vector3(...lookAt));

        if (controls && 'target' in controls) {
            (controls.target as THREE.Vector3).set(...lookAt);
            (controls as any).update?.();
        }

        console.log('✈️ FlyTo:', { position, lookAt });
    }, [flyToTrigger, flyToTarget, camera, controls]);

    return null;
}

export default CameraController;
