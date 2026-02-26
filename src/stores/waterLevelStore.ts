/**
 * 地下水位面 Store
 * @module stores/waterLevelStore
 */

import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';
import { useProjectStore } from './projectStore';

export interface WaterLevel {
    id: string;
    projectId: string;
    name: string;
    sourceType: 'well' | 'simulation';
    filename: string;
    originalName: string | null;
    path: string;
    heightmap: string;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
    width: number;
    height: number;
    pointCount: number;
    isActive: boolean;
    createdAt: string;
}

interface WaterLevelState {
    waterLevels: WaterLevel[];
    activeWaterLevelId: string | null;
    isLoading: boolean;
    error: string | null;

    fetchWaterLevels: (projectId: string) => Promise<void>;
    uploadWaterLevel: (
        projectId: string,
        file: File,
        name: string,
        sourceType: 'well' | 'simulation',
        method?: string,
        bounds?: string
    ) => Promise<void>;
    deleteWaterLevel: (id: string) => Promise<void>;
    setActiveWaterLevel: (id: string | null) => void;
    getActiveWaterLevel: () => WaterLevel | undefined;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useWaterLevelStore = create<WaterLevelState>((set, get) => ({
    waterLevels: [],
    activeWaterLevelId: null,
    isLoading: false,
    error: null,

    fetchWaterLevels: async (projectId: string) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await axios.get<WaterLevel[]>(
                `${API_BASE}/api/water-level`,
                {
                    params: { projectId },
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = response.data;
            set({ waterLevels: data });

            // Auto-select first active
            if (data.length > 0 && !get().activeWaterLevelId) {
                const active = data.find(w => w.isActive) || data[0];
                set({ activeWaterLevelId: active.id });
            }
        } catch (err: any) {
            console.error('[WaterLevelStore] Fetch error:', err);
        }
    },

    uploadWaterLevel: async (projectId, file, name, sourceType, method = 'linear', bounds) => {
        set({ isLoading: true, error: null });
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', projectId);
            formData.append('name', name);
            formData.append('sourceType', sourceType);
            formData.append('method', method);
            if (bounds) formData.append('bounds', bounds);

            const token = useAuthStore.getState().accessToken;
            const response = await axios.post<WaterLevel>(
                `${API_BASE}/api/water-level`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            set(state => ({
                waterLevels: [response.data, ...state.waterLevels],
                activeWaterLevelId: response.data.id,
                isLoading: false,
            }));
        } catch (err: any) {
            set({ isLoading: false, error: err.response?.data?.error || err.message });
            throw err;
        }
    },

    deleteWaterLevel: async (id: string) => {
        try {
            const token = useAuthStore.getState().accessToken;
            await axios.delete(`${API_BASE}/api/water-level/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            set(state => {
                const remaining = state.waterLevels.filter(w => w.id !== id);
                return {
                    waterLevels: remaining,
                    activeWaterLevelId: state.activeWaterLevelId === id
                        ? (remaining[0]?.id || null)
                        : state.activeWaterLevelId,
                };
            });
        } catch (err: any) {
            console.error('[WaterLevelStore] Delete error:', err);
            throw err;
        }
    },

    setActiveWaterLevel: (id) => set({ activeWaterLevelId: id }),

    getActiveWaterLevel: () => {
        const { waterLevels, activeWaterLevelId } = get();
        return waterLevels.find(w => w.id === activeWaterLevelId);
    },
}));
