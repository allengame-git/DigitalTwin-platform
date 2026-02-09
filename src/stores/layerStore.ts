/**
 * 圖層控制 Store
 * @module stores/layerStore
 */

import { create } from 'zustand';

export type LayerType =
    | 'boreholes'
    | 'geology3d'
    | 'faults'
    | 'attitudes'
    | 'terrain'
    | 'imagery'
    | 'geophysics';

interface LayerConfig {
    id: LayerType;
    name: string;
    visible: boolean;
    opacity: number;
}

interface LayerState {
    layers: Record<LayerType, LayerConfig>;
}

interface LayerActions {
    toggleLayer: (layerId: LayerType) => void;
    setOpacity: (layerId: LayerType, opacity: number) => void;
    setLayerVisible: (layerId: LayerType, visible: boolean) => void;
    resetLayers: () => void;
}

const defaultLayers: Record<LayerType, LayerConfig> = {
    boreholes: { id: 'boreholes', name: '鑽孔點位', visible: true, opacity: 1 },
    geology3d: { id: 'geology3d', name: '3D 地質模型', visible: true, opacity: 1 },
    faults: { id: 'faults', name: '斷層線', visible: true, opacity: 1 },
    attitudes: { id: 'attitudes', name: '位態符號', visible: true, opacity: 1 },
    terrain: { id: 'terrain', name: 'DEM 地形', visible: true, opacity: 1 },
    imagery: { id: 'imagery', name: '航照圖', visible: false, opacity: 0.7 },
    geophysics: { id: 'geophysics', name: '地球物理探查', visible: true, opacity: 1 },
};

export const useLayerStore = create<LayerState & LayerActions>((set) => ({
    // 初始狀態
    layers: { ...defaultLayers },

    // Actions
    toggleLayer: (layerId) => {
        set(state => ({
            layers: {
                ...state.layers,
                [layerId]: {
                    ...state.layers[layerId],
                    visible: !state.layers[layerId].visible,
                },
            },
        }));
    },

    setOpacity: (layerId, opacity) => {
        set(state => ({
            layers: {
                ...state.layers,
                [layerId]: {
                    ...state.layers[layerId],
                    opacity: Math.max(0, Math.min(1, opacity)),
                },
            },
        }));
    },


    setLayerVisible: (layerId, visible) => {
        set(state => ({
            layers: {
                ...state.layers,
                [layerId]: {
                    ...state.layers[layerId],
                    visible,
                },
            },
        }));
    },

    resetLayers: () => {
        set({ layers: { ...defaultLayers } });
    },
}));
