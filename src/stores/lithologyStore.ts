/**
 * 專案岩性 Store
 * @module stores/lithologyStore
 */

import { create } from 'zustand';
import type { RequestStatus } from '../types/api';
import { useAuthStore } from './authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders(): Record<string, string> {
    const token = useAuthStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ProjectLithology {
    id: string;
    lithId: number;
    code: string;
    name: string;
    color: string;
}

interface LithologyState {
    lithologies: ProjectLithology[];
    status: RequestStatus;
    error: string | null;
}

interface LithologyActions {
    fetchLithologies: (projectId: string, moduleId?: string) => Promise<void>;
    createLithology: (projectId: string, moduleId: string, data: Omit<ProjectLithology, 'id'>) => Promise<ProjectLithology | null>;
    importLithologies: (projectId: string, moduleId: string, data: Omit<ProjectLithology, 'id'>[]) => Promise<number | null>;
    updateLithology: (id: string, data: Partial<ProjectLithology>) => Promise<ProjectLithology | null>;
    deleteLithology: (id: string) => Promise<boolean>;
    initDefaults: (projectId: string, moduleId: string) => Promise<boolean>;
    getLithologyByCode: (code: string) => ProjectLithology | undefined;
    getLithologyById: (lithId: number) => ProjectLithology | undefined;
}

export const useLithologyStore = create<LithologyState & LithologyActions>((set, get) => ({
    lithologies: [],
    status: 'idle',
    error: null,

    fetchLithologies: async (projectId: string, moduleId?: string) => {
        set({ status: 'loading', error: null });
        try {
            const query = moduleId ? `moduleId=${moduleId}` : `projectId=${projectId}`;
            const response = await fetch(`${API_BASE}/api/lithology?${query}`, {
                headers: authHeaders(),
            });

            if (!response.ok) {
                throw new Error('無法取得岩性資料');
            }

            const lithologies = await response.json();
            set({ lithologies, status: 'success' });
        } catch (error) {
            set({
                status: 'error',
                error: error instanceof Error ? error.message : '無法取得岩性資料'
            });
        }
    },

    createLithology: async (projectId: string, moduleId: string, data: Omit<ProjectLithology, 'id'>) => {
        try {
            const response = await fetch(`${API_BASE}/api/lithology`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ projectId, moduleId, ...data }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '新增岩性失敗');
            }

            const created = await response.json();
            set(state => ({
                lithologies: [...state.lithologies, created].sort((a, b) => a.lithId - b.lithId)
            }));

            return created;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '新增岩性失敗' });
            return null;
        }
    },

    importLithologies: async (projectId: string, moduleId: string, data: Omit<ProjectLithology, 'id'>[]) => {
        set({ status: 'loading', error: null });
        try {
            const response = await fetch(`${API_BASE}/api/lithology/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ projectId, moduleId, lithologies: data }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '匯入岩性失敗');
            }

            const result = await response.json();

            // 重新讀取完整清單以確保順序正確
            await get().fetchLithologies(projectId);

            return result.count;
        } catch (error) {
            set({
                status: 'error',
                error: error instanceof Error ? error.message : '匯入岩性失敗'
            });
            return null;
        }
    },

    updateLithology: async (id: string, data: Partial<ProjectLithology>) => {
        try {
            const response = await fetch(`${API_BASE}/api/lithology/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '更新岩性失敗');
            }

            const updated = await response.json();
            set(state => ({
                lithologies: state.lithologies.map(l => l.id === id ? updated : l)
            }));

            return updated;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '更新岩性失敗' });
            return null;
        }
    },

    deleteLithology: async (id: string) => {
        try {
            const response = await fetch(`${API_BASE}/api/lithology/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '刪除岩性失敗');
            }

            set(state => ({
                lithologies: state.lithologies.filter(l => l.id !== id),
                error: null
            }));

            return true;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '刪除岩性失敗' });
            return false;
        }
    },

    initDefaults: async (projectId: string, moduleId: string) => {
        try {
            const response = await fetch(`${API_BASE}/api/lithology/init-defaults`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ projectId, moduleId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '初始化預設岩性失敗');
            }

            // Refresh lithology list
            await get().fetchLithologies(projectId);
            return true;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : '初始化預設岩性失敗' });
            return false;
        }
    },

    getLithologyByCode: (code: string) => {
        return get().lithologies.find(l => l.code === code);
    },

    getLithologyById: (lithId: number) => {
        return get().lithologies.find(l => l.lithId === lithId);
    },
}));
