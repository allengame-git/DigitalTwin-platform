/**
 * Module Store
 * @module stores/moduleStore
 *
 * 模組實例狀態管理
 */

import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface Module {
    id: string;
    projectId: string;
    type: string;
    name: string;
    description: string | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
}

export interface ModuleStats {
    moduleType: string;
    moduleName: string;
    counts: Record<string, number>;
}

interface ModuleStore {
    // State
    modules: Module[];
    loading: boolean;
    error: string | null;
    activeModuleId: string | null;

    // Actions
    fetchModules: (projectId: string) => Promise<void>;
    getModule: (moduleId: string) => Module | undefined;
    createModule: (projectId: string, type: string, name: string, description?: string) => Promise<Module | null>;
    updateModule: (moduleId: string, data: { name?: string; description?: string }) => Promise<Module | null>;
    deleteModule: (moduleId: string, confirmName: string) => Promise<boolean>;
    getModuleStats: (moduleId: string) => Promise<ModuleStats | null>;
    reorderModules: (orders: { id: string; sortOrder: number }[]) => Promise<boolean>;
    setActiveModuleId: (id: string | null) => void;
}

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ''}/api/module`;

function authHeaders(): Record<string, string> {
    const token = useAuthStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const useModuleStore = create<ModuleStore>()((set, get) => ({
    // Initial state
    modules: [],
    loading: false,
    error: null,
    activeModuleId: null,

    // Fetch modules for a project
    fetchModules: async (projectId) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`${API_BASE}?projectId=${projectId}`, {
                headers: authHeaders(),
            });
            const data = await res.json();
            if (data.success) {
                set({ modules: data.data, loading: false });
            } else {
                set({ error: data.error, loading: false });
            }
        } catch {
            set({ error: 'Failed to fetch modules', loading: false });
        }
    },

    // Get module from local state
    getModule: (moduleId) => {
        return get().modules.find((m) => m.id === moduleId);
    },

    // Create module
    createModule: async (projectId, type, name, description?) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ projectId, type, name, description }),
            });
            const data = await res.json();
            if (data.success) {
                set((state) => ({
                    modules: [...state.modules, data.data],
                    loading: false,
                }));
                return data.data;
            } else {
                set({ error: data.error, loading: false });
                return null;
            }
        } catch {
            set({ error: 'Failed to create module', loading: false });
            return null;
        }
    },

    // Update module
    updateModule: async (moduleId, updateData) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`${API_BASE}/${moduleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(updateData),
            });
            const data = await res.json();
            if (data.success) {
                set((state) => ({
                    modules: state.modules.map((m) =>
                        m.id === moduleId ? { ...m, ...data.data } : m
                    ),
                    loading: false,
                }));
                return data.data;
            } else {
                set({ error: data.error, loading: false });
                return null;
            }
        } catch {
            set({ error: 'Failed to update module', loading: false });
            return null;
        }
    },

    // Delete module (with confirmation)
    deleteModule: async (moduleId, confirmName) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`${API_BASE}/${moduleId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ confirmName }),
            });
            const data = await res.json();
            if (data.success) {
                set((state) => ({
                    modules: state.modules.filter((m) => m.id !== moduleId),
                    activeModuleId: state.activeModuleId === moduleId ? null : state.activeModuleId,
                    loading: false,
                }));
                return true;
            } else {
                set({ error: data.error, loading: false });
                return false;
            }
        } catch {
            set({ error: 'Failed to delete module', loading: false });
            return false;
        }
    },

    // Get module stats (returns promise, not stored)
    getModuleStats: async (moduleId) => {
        try {
            const res = await fetch(`${API_BASE}/${moduleId}/stats`, {
                headers: authHeaders(),
            });
            const data = await res.json();
            if (data.success) {
                return data.data as ModuleStats;
            }
            return null;
        } catch {
            return null;
        }
    },

    // Reorder modules
    reorderModules: async (orders) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`${API_BASE}/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ orders }),
            });
            const data = await res.json();
            if (data.success) {
                // Update local sort orders
                set((state) => {
                    const orderMap = new Map(orders.map((o) => [o.id, o.sortOrder]));
                    const updated = state.modules.map((m) => {
                        const newOrder = orderMap.get(m.id);
                        return newOrder !== undefined ? { ...m, sortOrder: newOrder } : m;
                    });
                    updated.sort((a, b) => a.sortOrder - b.sortOrder);
                    return { modules: updated, loading: false };
                });
                return true;
            } else {
                set({ error: data.error, loading: false });
                return false;
            }
        } catch {
            set({ error: 'Failed to reorder modules', loading: false });
            return false;
        }
    },

    // Set active module
    setActiveModuleId: (id) => {
        set({ activeModuleId: id });
    },
}));

export default useModuleStore;
