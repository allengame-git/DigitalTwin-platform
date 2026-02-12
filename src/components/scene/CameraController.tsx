/**
 * Camera Controller Component
 * @module components/scene/CameraController
 * 
 * 監聽 cameraStore 的重置觸發，將相機移動到目標中心
 * 綜合計算所有可見資料的邊界 (模型、鑽孔、位態、斷層)
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCameraStore } from '../../stores/cameraStore';
import { useUploadStore } from '../../stores/uploadStore';
import { useBoreholeStore } from '../../stores/boreholeStore';
import { useAttitudeStore } from '../../stores/attitudeStore';
import { Borehole } from '../../types/geology';
import { twd97ToWorld } from '../../utils/coordinates';

export function CameraController() {
    const { camera, controls, scene, size } = useThree();
    const { resetTrigger, targetCenter } = useCameraStore();
    const { getActiveGeologyModel } = useUploadStore();
    const prevResetTrigger = useRef(resetTrigger);

    useEffect(() => {
        if (prevResetTrigger.current === resetTrigger) return;
        prevResetTrigger.current = resetTrigger;

        const box = new THREE.Box3();
        let hasContent = false;

        // === 策略 1: 直接從 Three.js scene 讀取所有可見物件的邊界 ===
        // 這是最準確的方法 — 直接掃描場景中所有已渲染的 mesh
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.visible) {
                // 排除掉 Grid / 環境物件 (它們的 geometry 通常是 PlaneGeometry 或很大的)
                // 排除條件: 沒有 geometry 或是 raycast 被 null 掉的 (地面)
                if (!child.geometry) return;
                if (child.raycast === null) return;

                // 排除大型環境平面 (通常 size > 5000)
                const childBox = new THREE.Box3().setFromObject(child);
                const childSize = new THREE.Vector3();
                childBox.getSize(childSize);
                if (Math.max(childSize.x, childSize.z) > 5000) return;

                box.expandByObject(child);
                hasContent = true;
            }
        });

        // === 策略 2: 若 scene traverse 沒找到有效內容，Fallback 到 store 資料 ===
        if (!hasContent) {
            // 嘗試地質模型邊界
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

            // 嘗試鑽孔
            const boreholes = useBoreholeStore.getState().boreholes;
            boreholes.forEach((bh: Borehole) => {
                if (bh.x < 10000 || bh.y < 10000) return;
                const p = twd97ToWorld({ x: bh.x, y: bh.elevation, z: bh.y });
                box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z));
                const bottom = twd97ToWorld({ x: bh.x, y: bh.elevation - bh.totalDepth, z: bh.y });
                box.expandByPoint(new THREE.Vector3(bottom.x, bottom.y, bottom.z));
                hasContent = true;
            });

            // 嘗試位態
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

        // 計算中心點
        const center = new THREE.Vector3();
        box.getCenter(center);

        // 計算距離
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

        // 設定相機位置 (60度俯視)
        const phi = Math.PI / 3;
        const theta = Math.PI / 4;

        const offset = new THREE.Vector3(
            distance * Math.sin(phi) * Math.sin(theta),
            distance * Math.cos(phi),
            distance * Math.sin(phi) * Math.cos(theta)
        );

        const newPosition = center.clone().add(offset);
        camera.position.copy(newPosition);
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
            strategy: hasContent ? 'scene-traverse' : 'store-fallback'
        });
    }, [resetTrigger, targetCenter, camera, controls, scene, size, getActiveGeologyModel]);

    // === flyTo: 由外部觸發的相機飛行 ===
    const { flyToTarget, flyToTrigger } = useCameraStore();
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
