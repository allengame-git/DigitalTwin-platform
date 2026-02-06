/**
 * Camera Controller Component
 * @module components/scene/CameraController
 * 
 * 監聽 cameraStore 的重置觸發，將相機移動到目標中心
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCameraStore } from '../../stores/cameraStore';
import { useUploadStore } from '../../stores/uploadStore';
import { twd97ToWorld } from '../../utils/coordinates';

export function CameraController() {
    const { camera, controls } = useThree();
    const { resetTrigger, targetCenter } = useCameraStore();
    const { getActiveGeologyModel } = useUploadStore();
    const prevResetTrigger = useRef(resetTrigger);

    useEffect(() => {
        // 只在 resetTrigger 變化時執行
        if (prevResetTrigger.current === resetTrigger) return;
        prevResetTrigger.current = resetTrigger;

        // 計算目標中心
        let center: THREE.Vector3;

        // 優先使用 store 中設定的目標中心
        if (targetCenter) {
            center = new THREE.Vector3(...targetCenter);
        } else {
            // 嘗試從 active geology model 取得邊界中心
            const activeModel = getActiveGeologyModel();
            if (activeModel && activeModel.minX != null && activeModel.maxX != null) {
                const cx = (activeModel.minX + activeModel.maxX) / 2;
                const cy = (activeModel.minY! + activeModel.maxY!) / 2;
                const cz = (activeModel.minZ! + activeModel.maxZ!) / 2;

                // 轉換為世界座標
                const worldPos = twd97ToWorld({
                    x: cx,
                    y: cy,
                    z: cz
                });
                center = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
            } else {
                // 預設中心點
                center = new THREE.Vector3(0, 0, 0);
            }
        }

        // 計算適當的相機距離
        const activeModel = getActiveGeologyModel();
        let distance = 500;
        if (activeModel && activeModel.minX != null && activeModel.maxX != null) {
            const rangeX = activeModel.maxX - activeModel.minX;
            const rangeY = activeModel.maxY! - activeModel.minY!;
            const rangeZ = activeModel.maxZ! - activeModel.minZ!;
            distance = Math.max(rangeX, rangeY, rangeZ) * 1.5;
        }

        // 設定相機位置 (從斜上方俯視)
        const offset = new THREE.Vector3(distance * 0.7, distance, distance * 0.7);
        const newPosition = center.clone().add(offset);

        camera.position.copy(newPosition);
        camera.lookAt(center);

        // 更新 controls target
        if (controls && 'target' in controls) {
            (controls.target as THREE.Vector3).copy(center);
            (controls as any).update?.();
        }

        console.log('📷 Camera reset to:', center.toArray(), 'distance:', distance);
    }, [resetTrigger, targetCenter, camera, controls, getActiveGeologyModel]);

    return null;
}

export default CameraController;
