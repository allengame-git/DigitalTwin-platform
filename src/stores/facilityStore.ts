import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';
import type { FacilityScene, FacilityModel, Transform } from '../types/facility';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
    const token = useAuthStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

interface FacilityState {
    // Scene tree
    scenes: FacilityScene[];
    currentSceneId: string | null;
    sceneStack: string[];            // navigation history

    // Models in current scene
    models: FacilityModel[];
    selectedModelId: string | null;
    hoveredModelId: string | null;

    // Edit mode
    editMode: boolean;
    editingModelId: string | null;
    transformMode: 'translate' | 'rotate' | 'scale';

    // UI
    showLabels: boolean;

    // Async state
    isLoading: boolean;
    error: string | null;

    // Scene actions
    fetchScenes: (projectId: string) => Promise<void>;
    createScene: (data: { projectId: string; parentSceneId?: string; name: string; description?: string }) => Promise<FacilityScene>;
    updateScene: (id: string, data: Partial<Pick<FacilityScene, 'name' | 'description' | 'cameraPosition' | 'cameraTarget' | 'coordShiftX' | 'coordShiftY' | 'coordShiftZ' | 'coordRotation' | 'sortOrder'>>) => Promise<void>;
    deleteScene: (id: string) => Promise<void>;

    // Navigation
    enterScene: (sceneId: string) => Promise<void>;
    goBack: () => Promise<void>;
    goToRoot: () => Promise<void>;
    getCurrentScene: () => FacilityScene | undefined;
    getRootScene: () => FacilityScene | undefined;
    getBreadcrumbs: () => FacilityScene[];

    // Model actions
    fetchModels: (sceneId: string) => Promise<void>;
    selectModel: (modelId: string | null) => void;
    setHoveredModel: (modelId: string | null) => void;
    updateModelTransform: (modelId: string, transform: Transform) => Promise<void>;
    updateModelMeta: (modelId: string, data: { name?: string; childSceneId?: string | null }) => Promise<void>;

    // Edit mode
    setEditMode: (enabled: boolean) => void;
    setEditingModel: (modelId: string | null) => void;
    setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;

    // UI
    toggleLabels: () => void;
}

export const useFacilityStore = create<FacilityState>((set, get) => ({
    scenes: [],
    currentSceneId: null,
    sceneStack: [],
    models: [],
    selectedModelId: null,
    hoveredModelId: null,
    editMode: false,
    editingModelId: null,
    transformMode: 'translate',
    showLabels: true,
    isLoading: false,
    error: null,

    // ===== Scene Actions =====
    fetchScenes: async (projectId: string) => {
        try {
            const res = await axios.get<FacilityScene[]>(`${API_BASE}/api/facility/scenes`, {
                params: { projectId },
                headers: getAuthHeaders(),
                withCredentials: true,
            });
            set({ scenes: Array.isArray(res.data) ? res.data : [] });
        } catch (err: any) {
            console.error('[FacilityStore] fetchScenes error:', err);
            set({ error: err.message });
        }
    },

    createScene: async (data) => {
        const res = await axios.post<FacilityScene>(`${API_BASE}/api/facility/scenes`, data, {
            headers: getAuthHeaders(),
            withCredentials: true,
        });
        set(state => ({ scenes: [...state.scenes, res.data] }));
        return res.data;
    },

    updateScene: async (id, data) => {
        const res = await axios.put<FacilityScene>(`${API_BASE}/api/facility/scenes/${id}`, data, {
            headers: getAuthHeaders(),
            withCredentials: true,
        });
        set(state => ({
            scenes: state.scenes.map(s => s.id === id ? { ...s, ...res.data } : s),
        }));
    },

    deleteScene: async (id) => {
        await axios.delete(`${API_BASE}/api/facility/scenes/${id}`, {
            headers: getAuthHeaders(),
            withCredentials: true,
        });
        set(state => ({
            scenes: state.scenes.filter(s => s.id !== id),
            currentSceneId: state.currentSceneId === id ? null : state.currentSceneId,
            sceneStack: state.sceneStack.filter(sid => sid !== id),
        }));
    },

    // ===== Navigation =====
    enterScene: async (sceneId: string) => {
        const { currentSceneId, fetchModels } = get();
        set(state => ({
            currentSceneId: sceneId,
            sceneStack: currentSceneId
                ? [...state.sceneStack, currentSceneId]
                : state.sceneStack,
            selectedModelId: null,
            hoveredModelId: null,
            editingModelId: null,
        }));
        await fetchModels(sceneId);
    },

    goBack: async () => {
        const { sceneStack, fetchModels } = get();
        if (sceneStack.length === 0) return;

        const newStack = [...sceneStack];
        const prevSceneId = newStack.pop()!;

        set({
            currentSceneId: prevSceneId,
            sceneStack: newStack,
            selectedModelId: null,
            hoveredModelId: null,
            editingModelId: null,
        });
        await fetchModels(prevSceneId);
    },

    goToRoot: async () => {
        const { scenes, fetchModels } = get();
        const root = scenes.find(s => s.parentSceneId === null);
        if (!root) return;

        set({
            currentSceneId: root.id,
            sceneStack: [],
            selectedModelId: null,
            hoveredModelId: null,
            editingModelId: null,
        });
        await fetchModels(root.id);
    },

    getCurrentScene: () => {
        const { scenes, currentSceneId } = get();
        return scenes.find(s => s.id === currentSceneId);
    },

    getRootScene: () => {
        const { scenes } = get();
        return scenes.find(s => s.parentSceneId === null);
    },

    getBreadcrumbs: () => {
        const { scenes, sceneStack, currentSceneId } = get();
        const ids = [...sceneStack, currentSceneId].filter(Boolean) as string[];
        return ids.map(id => scenes.find(s => s.id === id)).filter(Boolean) as FacilityScene[];
    },

    // ===== Model Actions =====
    fetchModels: async (sceneId: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await axios.get<FacilityModel[]>(`${API_BASE}/api/facility/models`, {
                params: { sceneId },
                headers: getAuthHeaders(),
                withCredentials: true,
            });
            set({ models: Array.isArray(res.data) ? res.data : [], isLoading: false });
        } catch (err: any) {
            console.error('[FacilityStore] fetchModels error:', err);
            set({ error: err.message, isLoading: false, models: [] });
        }
    },

    selectModel: (modelId) => set({ selectedModelId: modelId }),
    setHoveredModel: (modelId) => set({ hoveredModelId: modelId }),

    updateModelTransform: async (modelId, transform) => {
        try {
            const res = await axios.put<FacilityModel>(
                `${API_BASE}/api/facility/models/${modelId}/transform`,
                transform,
                { headers: getAuthHeaders(), withCredentials: true }
            );
            set(state => ({
                models: state.models.map(m => m.id === modelId ? { ...m, ...res.data } : m),
            }));
        } catch (err: any) {
            console.error('[FacilityStore] updateModelTransform error:', err);
        }
    },

    updateModelMeta: async (modelId, data) => {
        try {
            const res = await axios.put<FacilityModel>(
                `${API_BASE}/api/facility/models/${modelId}`,
                data,
                { headers: getAuthHeaders(), withCredentials: true }
            );
            set(state => ({
                models: state.models.map(m => m.id === modelId ? { ...m, ...res.data } : m),
            }));
        } catch (err: any) {
            console.error('[FacilityStore] updateModelMeta error:', err);
        }
    },

    // ===== Edit Mode =====
    setEditMode: (enabled) => set(state => ({
        editMode: enabled,
        editingModelId: enabled ? state.editingModelId : null,
    })),
    setEditingModel: (modelId) => set({ editingModelId: modelId }),
    setTransformMode: (mode) => set({ transformMode: mode }),

    // ===== UI =====
    toggleLabels: () => set(state => ({ showLabels: !state.showLabels })),
}));
