/**
 * 鑽孔資料 Store
 * @module stores/boreholeStore
 */

import { create } from 'zustand';
import { useAuthStore } from './authStore';
import type { Borehole, BoreholeDetail, Photo } from '../types/geology';
import type { RequestStatus } from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface BoreholeState {
    // 資料
    boreholes: Borehole[];
    selectedBorehole: BoreholeDetail | null;

    // 狀態
    status: RequestStatus;
    error: string | null;

    // 過濾
    filter: {
        area?: string;
        minDepth?: number;
        maxDepth?: number;
    };
}

interface BoreholeActions {
    fetchBoreholes: (projectId?: string) => Promise<void>;
    selectBorehole: (id: string) => Promise<void>;
    clearSelection: () => void;
    setFilter: (filter: Partial<BoreholeState['filter']>) => void;
    setBoreholes: (boreholes: Borehole[]) => void;
    createBorehole: (data: CreateBoreholeData) => Promise<Borehole | null>;
    updateBorehole: (id: string, data: Partial<CreateBoreholeData>) => Promise<Borehole | null>;
    deleteBorehole: (id: string) => Promise<boolean>;
    batchDelete: (ids: string[]) => Promise<{ success: number; failed: number }>;
    batchImport: (projectId: string, boreholes: CreateBoreholeData[]) => Promise<BatchImportResult>;
    batchImportLayers: (projectId: string, layers: LayerCsvRow[]) => Promise<BatchImportResult>;
    batchImportProperties: (projectId: string, properties: PropertyCsvRow[]) => Promise<BatchImportResult>;
    uploadPhoto: (boreholeId: string, file: File, depth: number, caption?: string) => Promise<boolean>;
    deletePhoto: (boreholeId: string, photoId: string) => Promise<boolean>;
    fetchBoreholePhotos: (boreholeId: string) => Promise<Photo[]>;
}

// Types for API
interface CreateBoreholeData {
    projectId?: string;
    boreholeNo: string;
    name?: string;
    x: number;
    y: number;
    elevation: number;
    totalDepth: number;
    drilledDate?: string;
    contractor?: string;
    area?: string;
    description?: string;
    layers?: {
        topDepth: number;
        bottomDepth: number;
        lithologyCode: string;
        lithologyName?: string;
        description?: string;
    }[];
    properties?: {
        depth: number;
        nValue?: number;
        rqd?: number;
    }[];
}

interface BatchImportResult {
    success: number;
    failed: number;
    errors: { boreholeNo: string; error: string }[];
}

interface LayerCsvRow {
    boreholeNo: string;
    topDepth: string;
    bottomDepth: string;
    lithologyCode: string;
    lithologyName?: string;
    description?: string;
}

interface PropertyCsvRow {
    boreholeNo: string;
    depth: string;
    nValue?: string;
    rqd?: string;
}

// Import lithology config for color mapping
import { LITHOLOGY_MAP } from '../config/lithologyConfig';

// Helper to map API response to frontend Borehole type
const mapApiToBorehole = (apiData: any): Borehole => {
    return {
        id: apiData.id,
        boreholeNo: apiData.boreholeNo,
        name: apiData.name || '',
        x: apiData.x,
        y: apiData.y,
        elevation: apiData.elevation,
        totalDepth: apiData.totalDepth,
        drilledDate: apiData.drilledDate,
        area: apiData.area,
        contractor: apiData.contractor,
        description: apiData.description,
        layers: apiData.layers?.map((layer: any) => {
            const lithology = LITHOLOGY_MAP.find(l => l.code === layer.lithologyCode);
            return {
                id: layer.id,
                boreholeId: apiData.id,
                topDepth: layer.topDepth,
                bottomDepth: layer.bottomDepth,
                lithologyCode: layer.lithologyCode,
                lithologyName: layer.lithologyName || lithology?.name || layer.lithologyCode,
                color: lithology?.color || '#888888',
                description: layer.description,
            };
        }) || [],
        properties: apiData.properties?.map((prop: any) => ({
            depth: prop.depth,
            nValue: prop.nValue,
            rqd: prop.rqd,
        })) || [],
    };
};

export const useBoreholeStore = create<BoreholeState & BoreholeActions>((set, get) => ({
    // 初始狀態
    boreholes: [],
    selectedBorehole: null,
    status: 'idle',
    error: null,
    filter: {},

    // Actions
    fetchBoreholes: async (projectId?: string) => {
        set({ status: 'loading', error: null });

        try {
            const url = projectId
                ? `${API_BASE}/api/borehole?projectId=${projectId}`
                : `${API_BASE}/api/borehole`;

            const response = await fetch(url, { credentials: 'include' });

            if (!response.ok) {
                throw new Error('Failed to fetch boreholes');
            }

            const data = await response.json();
            const boreholes = data.map(mapApiToBorehole);

            set({ boreholes, status: 'success' });
        } catch (error) {
            set({
                status: 'error',
                error: error instanceof Error ? error.message : '載入鑽孔資料失敗'
            });
        }
    },

    selectBorehole: async (id: string) => {
        set({ status: 'loading' });

        try {
            const response = await fetch(`${API_BASE}/api/borehole/${id}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch borehole detail');
            }

            const data = await response.json();

            // Map to BoreholeDetail
            const detail: BoreholeDetail = {
                ...mapApiToBorehole(data),
                layers: data.layers?.map((layer: any) => {
                    const lithology = LITHOLOGY_MAP.find(l => l.code === layer.lithologyCode);
                    return {
                        id: layer.id,
                        boreholeId: data.id,
                        topDepth: layer.topDepth,
                        bottomDepth: layer.bottomDepth,
                        lithologyCode: layer.lithologyCode,
                        lithologyName: layer.lithologyName || lithology?.name || layer.lithologyCode,
                        color: lithology?.color || '#888888',
                        description: layer.description,
                    };
                }) || [],
                photos: data.photos || [],
                properties: data.properties?.map((prop: any) => ({
                    depth: prop.depth,
                    nValue: prop.nValue,
                    rqd: prop.rqd,
                })) || [],
            };

            set({ selectedBorehole: detail, status: 'success' });
        } catch (error) {
            set({
                status: 'error',
                error: error instanceof Error ? error.message : '載入鑽孔詳細資料失敗'
            });
        }
    },

    clearSelection: () => {
        set({ selectedBorehole: null });
    },

    setFilter: (filter) => {
        set(state => ({ filter: { ...state.filter, ...filter } }));
    },

    setBoreholes: (boreholes) => {
        set({ boreholes, status: 'success' });
    },

    createBorehole: async (data: CreateBoreholeData) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/borehole`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '新增鑽孔失敗');
            }

            const created = await response.json();
            const borehole = mapApiToBorehole(created);

            // Add to local state
            set(state => ({
                boreholes: [...state.boreholes, borehole]
            }));

            return borehole;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '新增鑽孔失敗' });
            return null;
        }
    },

    updateBorehole: async (id: string, data: Partial<CreateBoreholeData>) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/borehole/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '更新鑽孔失敗');
            }

            const updated = await response.json();
            const borehole = mapApiToBorehole(updated);

            // Update in local state
            set(state => ({
                boreholes: state.boreholes.map(b => b.id === id ? borehole : b)
            }));

            return borehole;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '更新鑽孔失敗' });
            return null;
        }
    },

    deleteBorehole: async (id: string) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/borehole/${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('刪除鑽孔失敗');
            }

            // Remove from local state
            set(state => ({
                boreholes: state.boreholes.filter(b => b.id !== id)
            }));

            return true;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '刪除鑽孔失敗' });
            return false;
        }
    },

    batchDelete: async (ids: string[]) => {
        let success = 0;
        let failed = 0;

        for (const id of ids) {
            try {
                const response = await fetch(`${API_BASE}/api/borehole/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });

                if (response.ok) {
                    success++;
                } else {
                    failed++;
                }
            } catch {
                failed++;
            }
        }

        // Remove deleted items from local state
        set(state => ({
            boreholes: state.boreholes.filter(b => !ids.includes(b.id))
        }));

        return { success, failed };
    },

    batchImport: async (projectId: string, boreholes: CreateBoreholeData[]) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/borehole/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
                body: JSON.stringify({ projectId, boreholes }),
            });

            if (!response.ok) {
                throw new Error('批次匯入失敗');
            }

            const result = await response.json();

            // Refresh borehole list
            get().fetchBoreholes(projectId);

            return result;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '批次匯入失敗' });
            return { success: 0, failed: boreholes.length, errors: [] };
        }
    },

    batchImportLayers: async (projectId: string, layers: LayerCsvRow[]) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/borehole/batch-layers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
                body: JSON.stringify({ projectId, layers }),
            });

            if (!response.ok) {
                throw new Error('批次匯入地層資料失敗');
            }

            const result = await response.json();
            get().fetchBoreholes(projectId);
            return result;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '批次匯入地層資料失敗' });
            return { success: 0, failed: layers.length, errors: [] };
        }
    },

    batchImportProperties: async (projectId: string, properties: PropertyCsvRow[]) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/borehole/batch-properties`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
                body: JSON.stringify({ projectId, properties }),
            });

            if (!response.ok) {
                throw new Error('批次匯入物性資料失敗');
            }

            const result = await response.json();
            get().fetchBoreholes(projectId);
            return result;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '批次匯入物性資料失敗' });
            return { success: 0, failed: properties.length, errors: [] };
        }
    },

    uploadPhoto: async (boreholeId: string, file: File, depth: number, caption?: string) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('depth', depth.toString());
            if (caption) formData.append('caption', caption);

            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/borehole/${boreholeId}/photos`, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '上傳照片失敗');
            }

            const newPhoto = await response.json();

            // Update selectedBorehole photos if it's the same borehole
            const current = get().selectedBorehole;
            if (current && current.id === boreholeId) {
                set({
                    selectedBorehole: {
                        ...current,
                        photos: [...current.photos, newPhoto].sort((a, b) => a.depth - b.depth),
                    },
                });
            }

            return true;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '上傳照片失敗' });
            return false;
        }
    },

    deletePhoto: async (boreholeId: string, photoId: string) => {
        try {
            const response = await fetch(`${API_BASE}/api/borehole/${boreholeId}/photos/${photoId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('刪除照片失敗');
            }

            // Update selectedBorehole photos
            const current = get().selectedBorehole;
            if (current && current.id === boreholeId) {
                set({
                    selectedBorehole: {
                        ...current,
                        photos: current.photos.filter(p => p.id !== photoId),
                    },
                });
            }

            return true;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '刪除照片失敗' });
            return false;
        }
    },

    fetchBoreholePhotos: async (boreholeId: string) => {
        try {
            const response = await fetch(`${API_BASE}/api/borehole/${boreholeId}`, {
                credentials: 'include',
            });

            if (!response.ok) throw new Error('載入照片失敗');

            const data = await response.json();
            return data.photos || [];
        } catch {
            return [];
        }
    },
}));
