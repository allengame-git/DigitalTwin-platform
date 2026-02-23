/**
 * Camera Store
 * @module stores/cameraStore
 * 
 * 管理 3D 場景相機狀態，支援重置相機位置到物件中心
 * 支援框選目標過濾 (all / geology / borehole) 與預設視角切換
 */

import { create } from 'zustand';

/** 重置時掃描的目標範圍 */
export type ResetTarget = 'all' | 'geology' | 'borehole';

/** 預設視角 */
export type ViewPreset = 'default' | 'top' | 'xPositive' | 'yPositive';

export interface CameraTarget {
    position: [number, number, number];
    lookAt: [number, number, number];
}

export interface CameraState {
    // 目標位置 (物件中心)
    targetCenter: [number, number, number] | null;
    // 重置觸發計數器 (每次變化時觸發重置)
    resetTrigger: number;
    // 重置目標過濾
    resetTarget: ResetTarget;
    // flyTo 目標
    flyToTarget: CameraTarget | null;
    flyToTrigger: number;
    // 預設視角切換
    viewPreset: ViewPreset;
    viewPresetTrigger: number;
}

export interface CameraActions {
    setTargetCenter: (center: [number, number, number]) => void;
    resetCamera: () => void;
    setResetTarget: (target: ResetTarget) => void;
    setViewPreset: (preset: ViewPreset) => void;
    flyTo: (target: CameraTarget) => void;
}

export const useCameraStore = create<CameraState & CameraActions>((set) => ({
    targetCenter: null,
    resetTrigger: 0,
    resetTarget: 'all',
    flyToTarget: null,
    flyToTrigger: 0,
    viewPreset: 'default',
    viewPresetTrigger: 0,

    setTargetCenter: (center) => {
        set({ targetCenter: center });
    },

    resetCamera: () => {
        set((state) => ({ resetTrigger: state.resetTrigger + 1 }));
    },

    setResetTarget: (target) => {
        set({ resetTarget: target });
    },

    setViewPreset: (preset) => {
        set((state) => ({
            viewPreset: preset,
            viewPresetTrigger: state.viewPresetTrigger + 1,
        }));
    },

    flyTo: (target) => {
        set((state) => ({
            flyToTarget: target,
            flyToTrigger: state.flyToTrigger + 1,
        }));
    },
}));
