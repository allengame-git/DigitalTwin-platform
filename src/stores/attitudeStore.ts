/**
 * Attitude Store
 * @module stores/attitudeStore
 *
 * 位態資料狀態管理
 */

import { create } from 'zustand';
import { useAuthStore } from './authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AttitudeData {
    id: string;
    x: number;
    y: number;
    z: number;
    strike: number;
    dip: number;
    dipDirection?: string | null;
    description?: string | null;
    projectId: string;
    createdAt?: string;
}

export interface CreateAttitudeData {
    x: number;
    y: number;
    z: number;
    strike: number;
    dip: number;
    dipDirection?: string;
    description?: string;
}

export interface AttitudeImportRow {
    x: number | string;
    y: number | string;
    z: number | string;
    strike: number | string;
    dip: number | string;
    dipDirection?: string;
    description?: string;
}

interface AttitudeState {
    attitudes: AttitudeData[];
    selectedAttitudeId: string | null;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
}

interface AttitudeActions {
    fetchAttitudes: (projectId: string) => Promise<void>;
    createAttitude: (projectId: string, data: CreateAttitudeData) => Promise<AttitudeData | null>;
    updateAttitude: (id: string, data: Partial<CreateAttitudeData>) => Promise<AttitudeData | null>;
    deleteAttitude: (id: string) => Promise<boolean>;
    batchImport: (projectId: string, data: AttitudeImportRow[]) => Promise<{ success: number; failed: number; duplicates: number }>;
    selectAttitude: (id: string | null) => void;
    clearAttitudes: () => void;
}

type AttitudeStore = AttitudeState & AttitudeActions;

export const useAttitudeStore = create<AttitudeStore>((set, get) => ({
    // State
    attitudes: [],
    selectedAttitudeId: null,
    status: 'idle',
    error: null,

    // Actions
    fetchAttitudes: async (projectId: string) => {
        set({ status: 'loading', error: null });
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/attitude?projectId=${projectId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const result = await response.json();

            if (result.success) {
                set({ attitudes: result.data, status: 'success' });
            } else {
                set({ status: 'error', error: result.error || 'Failed to fetch' });
            }
        } catch (error) {
            console.error('Error fetching attitudes:', error);
            set({ status: 'error', error: 'Network error' });
        }
    },

    createAttitude: async (projectId: string, data: CreateAttitudeData) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/attitude`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
                body: JSON.stringify({ projectId, ...data }),
            });
            const result = await response.json();

            if (result.success) {
                set((state) => ({
                    attitudes: [result.data, ...state.attitudes],
                }));
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('Error creating attitude:', error);
            return null;
        }
    },

    updateAttitude: async (id: string, data: Partial<CreateAttitudeData>) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/attitude/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
                body: JSON.stringify(data),
            });
            const result = await response.json();

            if (result.success) {
                set((state) => ({
                    attitudes: state.attitudes.map((a) =>
                        a.id === id ? result.data : a
                    ),
                }));
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('Error updating attitude:', error);
            return null;
        }
    },

    deleteAttitude: async (id: string) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/attitude/${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
            });
            const result = await response.json();

            if (result.success) {
                set((state) => ({
                    attitudes: state.attitudes.filter((a) => a.id !== id),
                }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting attitude:', error);
            return false;
        }
    },

    batchImport: async (projectId: string, data: AttitudeImportRow[]) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/attitude/batch-import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
                body: JSON.stringify({ projectId, attitudes: data }),
            });
            const result = await response.json();

            if (result.success) {
                // 重新載入資料
                await get().fetchAttitudes(projectId);
                return {
                    success: result.data.success,
                    failed: result.data.failed,
                    duplicates: result.data.duplicates || 0
                };
            }
            return { success: 0, failed: data.length, duplicates: 0 };
        } catch (error) {
            console.error('Error batch importing attitudes:', error);
            return { success: 0, failed: data.length, duplicates: 0 };
        }
    },

    selectAttitude: (id: string | null) => {
        set({ selectedAttitudeId: id });
    },

    clearAttitudes: () => {
        set({ attitudes: [], selectedAttitudeId: null, status: 'idle', error: null });
    },
}));

export default useAttitudeStore;
