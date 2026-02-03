/**
 * 檢視器狀態 Store
 * @module stores/viewerStore
 */

import { create } from 'zustand';
import type {
    CameraState,
    LODLevel,
    ViewerConfig,
    ClippingPlaneConfig
} from '../types/viewer';
import { LOD_THRESHOLDS } from '../config/three';

interface ViewerState {
    camera: CameraState;
    config: ViewerConfig;
    clippingPlane: ClippingPlaneConfig;
    isLoading: boolean;
    loadingProgress: number;
}

interface ViewerActions {
    setCameraState: (camera: Partial<CameraState>) => void;
    setConfig: (config: Partial<ViewerConfig>) => void;
    setLODLevel: (level: LODLevel) => void;
    setClippingPlane: (plane: Partial<ClippingPlaneConfig>) => void;
    setLoading: (isLoading: boolean, progress?: number) => void;
    resetCamera: () => void;
    calculateLODFromDistance: (distance: number) => LODLevel;
}

const defaultCamera: CameraState = {
    position: [0, 500, 1000],
    target: [0, 0, 0],
    zoom: 1,
};

const defaultConfig: ViewerConfig = {
    undergroundTransparency: true,
    undergroundOpacity: 0.3,
    lodLevel: 'icon',
    enableAO: false,
    enableShadows: true,
    backgroundColor: '#f0f0f0',
    autoLOD: true,
};

const defaultClippingPlane: ClippingPlaneConfig = {
    enabled: false,
    normal: [0, 1, 0],
    constant: 0,
};

export const useViewerStore = create<ViewerState & ViewerActions>((set, get) => ({
    // 初始狀態
    camera: { ...defaultCamera },
    config: { ...defaultConfig },
    clippingPlane: { ...defaultClippingPlane },
    isLoading: false,
    loadingProgress: 0,

    // Actions
    setCameraState: (camera) => {
        set(state => ({
            camera: { ...state.camera, ...camera },
        }));
    },

    setConfig: (config) => {
        set(state => ({
            config: { ...state.config, ...config },
        }));
    },

    setLODLevel: (level) => {
        set(state => ({
            config: { ...state.config, lodLevel: level },
        }));
    },

    setClippingPlane: (plane) => {
        set(state => ({
            clippingPlane: { ...state.clippingPlane, ...plane },
        }));
    },

    setLoading: (isLoading, progress = 0) => {
        set({ isLoading, loadingProgress: progress });
    },

    resetCamera: () => {
        set({ camera: { ...defaultCamera } });
    },

    calculateLODFromDistance: (distance: number): LODLevel => {
        if (distance > LOD_THRESHOLDS.ICON) {
            return 'icon';
        } else if (distance > LOD_THRESHOLDS.COLUMN) {
            return 'column';
        }
        return 'detail';
    },
}));
