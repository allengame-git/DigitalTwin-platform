/**
 * Camera Store
 * @module stores/cameraStore
 * 
 * 管理 3D 場景相機狀態，支援重置相機位置到物件中心
 */

import { create } from 'zustand';

export interface CameraTarget {
    position: [number, number, number];
    lookAt: [number, number, number];
}

export interface CameraState {
    // 目標位置 (物件中心)
    targetCenter: [number, number, number] | null;
    // 重置觸發計數器 (每次變化時觸發重置)
    resetTrigger: number;
    // flyTo 目標
    flyToTarget: CameraTarget | null;
    flyToTrigger: number;
}

export interface CameraActions {
    setTargetCenter: (center: [number, number, number]) => void;
    resetCamera: () => void;
    flyTo: (target: CameraTarget) => void;
}

export const useCameraStore = create<CameraState & CameraActions>((set) => ({
    targetCenter: null,
    resetTrigger: 0,
    flyToTarget: null,
    flyToTrigger: 0,

    setTargetCenter: (center) => {
        set({ targetCenter: center });
    },

    resetCamera: () => {
        set((state) => ({ resetTrigger: state.resetTrigger + 1 }));
    },

    flyTo: (target) => {
        set((state) => ({
            flyToTarget: target,
            flyToTrigger: state.flyToTrigger + 1,
        }));
    },
}));
