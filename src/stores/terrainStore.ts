import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';

export interface Terrain {
    id: string;
    projectId: string;
    name: string;
    filename: string;
    originalName: string | null;
    path: string;
    heightmap: string;
    texture: string | null;
    satelliteTexture: string | null;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
    width: number;
    height: number;
    isActive: boolean;
    createdAt: string;
}

interface TerrainState {
    terrains: Terrain[];
    activeTerrainId: string | null;
    isLoading: boolean;
    error: string | null;

    fetchTerrains: (projectId: string) => Promise<void>;
    uploadTerrain: (projectId: string, file: File, name?: string, method?: string, satellite?: File) => Promise<void>;
    setActiveTerrain: (id: string | null) => void;
    deleteTerrain: (id: string) => Promise<void>;
    getActiveTerrain: () => Terrain | undefined;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useTerrainStore = create<TerrainState>((set, get) => ({
    terrains: [],
    activeTerrainId: null,
    isLoading: false,
    error: null,

    fetchTerrains: async (projectId: string) => {
        set({ isLoading: true, error: null });
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await axios.get<Terrain[]>(
                `${API_BASE}/api/terrain`,
                {
                    params: { projectId },
                    withCredentials: true,
                    headers: {
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    }
                }
            );
            set({ terrains: Array.isArray(response.data) ? response.data : [], isLoading: false });

            // 自動選取第一個地形 (若無選取)
            const currentActive = get().activeTerrainId;
            if (!currentActive && Array.isArray(response.data) && response.data.length > 0) {
                set({ activeTerrainId: response.data[0].id });
            }
        } catch (error: any) {
            console.error('取得地形資料失敗:', error);
            set({ error: error.message, isLoading: false, terrains: [] }); // Ensure terrains is array on error
        }
    },

    uploadTerrain: async (projectId: string, file: File, name?: string, method: string = 'linear', satellite?: File) => {
        set({ isLoading: true, error: null });
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', projectId);
            if (name) formData.append('name', name);
            formData.append('method', method);
            if (satellite) formData.append('satellite', satellite);

            const token = useAuthStore.getState().accessToken;
            const response = await axios.post<Terrain>(
                `${API_BASE}/api/terrain`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    withCredentials: true
                }
            );

            // 加入新地形並設為啟用
            const newTerrain = response.data;

            if (!newTerrain || !newTerrain.id) {
                throw new Error('Server returned invalid terrain data');
            }

            set(state => {
                const currentTerrains = Array.isArray(state.terrains) ? state.terrains : [];
                return {
                    terrains: [newTerrain, ...currentTerrains],
                    activeTerrainId: newTerrain.id,
                    isLoading: false
                };
            });
        } catch (error: any) {
            console.error('地形上傳失敗:', error);
            set({ error: error.message || '上傳失敗', isLoading: false });
            throw error;
        }
    },

    setActiveTerrain: (id) => set({ activeTerrainId: id }),

    deleteTerrain: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const token = useAuthStore.getState().accessToken;
            await axios.delete(`${API_BASE}/api/terrain/${id}`, {
                withCredentials: true,
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            set(state => {
                const newTerrains = state.terrains.filter(t => t.id !== id);
                return {
                    terrains: newTerrains,
                    activeTerrainId: state.activeTerrainId === id
                        ? (newTerrains.length > 0 ? newTerrains[0].id : null)
                        : state.activeTerrainId,
                    isLoading: false
                };
            });
        } catch (error: any) {
            console.error('刪除地形失敗:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    getActiveTerrain: () => {
        const { terrains, activeTerrainId } = get();
        return terrains.find(t => t.id === activeTerrainId);
    }
}));
