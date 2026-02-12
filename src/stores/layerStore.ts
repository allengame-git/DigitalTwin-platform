/**
 * 圖層控制 Store
 * @module stores/layerStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    zOffset?: number;
}


export interface TerrainSettings {
    minZ: number;
    maxZ: number;
    colorRamp: 'rainbow' | 'spectral' | 'terrain' | 'viridis' | 'magma';
    autoRange: boolean;
    reverse: boolean;
}

interface LayerState {
    layers: Record<LayerType, LayerConfig>;
    terrainSettings: TerrainSettings;
}

interface LayerActions {
    toggleLayer: (layerId: LayerType) => void;
    setOpacity: (layerId: LayerType, opacity: number) => void;
    setLayerZOffset: (layerId: LayerType, zOffset: number) => void;
    setLayerVisible: (layerId: LayerType, visible: boolean) => void;
    resetLayers: () => void;
    setTerrainSettings: (settings: Partial<TerrainSettings>) => void;
}

const defaultLayers: Record<LayerType, LayerConfig> = {
    boreholes: { id: 'boreholes', name: '鑽孔點位', visible: true, opacity: 1 },
    geology3d: { id: 'geology3d', name: '3D 地質模型', visible: false, opacity: 1 },
    faults: { id: 'faults', name: '斷層線', visible: false, opacity: 1 },
    attitudes: { id: 'attitudes', name: '位態符號', visible: false, opacity: 1 },
    terrain: { id: 'terrain', name: 'DEM 地形', visible: true, opacity: 1 },
    imagery: { id: 'imagery', name: '航照圖', visible: false, opacity: 0.7, zOffset: 5 }, // Default zOffset 5m
    geophysics: { id: 'geophysics', name: '地球物理探查', visible: false, opacity: 1 },
};

const defaultTerrainSettings: TerrainSettings = {
    minZ: 0,
    maxZ: 1000,
    colorRamp: 'spectral',
    autoRange: true,
    reverse: false
};

export const useLayerStore = create<LayerState & LayerActions>()(
    persist(
        (set) => ({
            // 初始狀態
            layers: { ...defaultLayers },
            terrainSettings: { ...defaultTerrainSettings },

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

            setLayerZOffset: (layerId, zOffset) => {
                set(state => ({
                    layers: {
                        ...state.layers,
                        [layerId]: {
                            ...state.layers[layerId],
                            zOffset,
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

            setTerrainSettings: (settings) => {
                set(state => ({
                    terrainSettings: {
                        ...state.terrainSettings,
                        ...settings
                    }
                }));
            },
        }),
        {
            name: 'layer-storage',
            partialize: (state) => ({
                layers: state.layers,
                terrainSettings: state.terrainSettings
            }),
        }
    )
);
