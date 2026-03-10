import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';
import type { FacilityScene, FacilityModel, FacilityAnimation, AnimationKeyframe, Transform } from '../types/facility';
import type { ColorRampName } from '../utils/colorRamps';

export interface FacilityTerrainSettings {
    visible: boolean;
    textureMode: 'satellite' | 'hillshade' | 'colorRamp';
    colorRamp: ColorRampName;
    reverse: boolean;
    minZ: number;
    maxZ: number;
    autoRange: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
    const token = useAuthStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Model group refs（不放進 Zustand state 以避免不必要的 re-render）──
// FacilityModelItem mount 時註冊，unmount 時清除
// AnimationTimeline 用來讀取模型即時 transform
const _modelGroupRefs = new Map<string, import('three').Group>();
export const registerModelGroupRef = (modelId: string, ref: import('three').Group) => {
    _modelGroupRefs.set(modelId, ref);
};
export const unregisterModelGroupRef = (modelId: string) => {
    _modelGroupRefs.delete(modelId);
};
export const getModelGroupRef = (modelId: string) => _modelGroupRefs.get(modelId) ?? null;

interface FacilityState {
    // Scene tree
    loadedProjectId: string | null;  // 記錄已載入的專案，避免重複重置
    scenes: FacilityScene[];
    currentSceneId: string | null;
    sceneStack: string[];            // navigation history

    // Models in current scene
    models: FacilityModel[];
    selectedModelIds: string[];       // 多選模型
    focusedModelId: string | null;    // 焦點模型（最後點擊的，顯示 TransformControls）
    hoveredModelId: string | null;
    hiddenModelIds: string[];         // 隱藏的模型 ID

    // Edit mode
    editMode: boolean;
    editingModelId: string | null;
    transformMode: 'translate' | 'rotate' | 'scale';

    // UI
    showLabels: boolean;
    showPlanView: boolean;

    // Camera fly-to
    flyToModelId: string | null;
    viewPreset: 'top' | 'default' | 'reset' | null;

    // Async state
    isLoading: boolean;
    error: string | null;

    // Scene actions
    fetchScenes: (projectId: string, force?: boolean) => Promise<void>;
    createScene: (data: { projectId: string; parentSceneId?: string; parentModelId?: string; name: string; description?: string }) => Promise<FacilityScene>;
    updateScene: (id: string, data: Partial<Pick<FacilityScene, 'name' | 'description' | 'cameraPosition' | 'cameraTarget' | 'coordShiftX' | 'coordShiftY' | 'coordShiftZ' | 'coordRotation' | 'sortOrder' | 'sceneType' | 'parentModelId' | 'sceneBounds'>>) => Promise<void>;
    deleteScene: (id: string) => Promise<void>;

    // Navigation
    enterScene: (sceneId: string) => Promise<void>;
    goBack: () => Promise<void>;
    goToRoot: () => Promise<void>;
    getCurrentScene: () => FacilityScene | undefined;
    getRootScene: () => FacilityScene | undefined;
    getBreadcrumbs: () => FacilityScene[];

    // Lobby mode
    isLobbyMode: () => boolean;
    getChildScenes: (modelId: string) => FacilityScene[];

    // Model actions
    fetchModels: (sceneId: string) => Promise<void>;
    selectModel: (modelId: string | null, multi?: boolean) => void;  // multi = Cmd/Ctrl+Click
    toggleModelSelection: (modelId: string) => void;
    setFocusedModel: (modelId: string | null) => void;
    setHoveredModel: (modelId: string | null) => void;
    updateModelTransform: (modelId: string, transform: Transform) => Promise<void>;
    updateModelMeta: (modelId: string, data: { name?: string; introduction?: string }) => Promise<void>;

    // Batch actions
    batchDeleteModels: (modelIds: string[]) => Promise<void>;
    toggleModelVisibility: (modelIds: string[]) => void;
    setSelectedModelIds: (ids: string[], focusId?: string | null) => void;
    setHiddenModelIds: (ids: string[]) => void;

    // Edit mode
    setEditMode: (enabled: boolean) => void;
    setEditingModel: (modelId: string | null) => void;
    setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;

    // UI
    toggleLabels: () => void;
    togglePlanView: () => void;

    // Refresh
    refreshCurrentScene: () => Promise<void>;

    // Camera
    flyToModel: (modelId: string) => void;
    clearFlyTo: () => void;
    setViewPreset: (preset: 'top' | 'default' | 'reset') => void;
    clearViewPreset: () => void;

    // Bbox centers (world-space, reported by FacilityModelItem on first frame)
    modelBboxCenters: Record<string, { x: number; y: number; z: number }>;
    setModelBboxCenter: (modelId: string, center: { x: number; y: number; z: number }) => void;

    // Terrain settings
    terrainSettings: FacilityTerrainSettings;
    setTerrainSettings: (patch: Partial<FacilityTerrainSettings>) => void;

    // Animation
    animations: FacilityAnimation[];
    animationMode: boolean;
    selectedAnimationId: string | null;
    selectedAnimPerModel: Record<string, string>;  // modelId → animationId 記憶
    playbackState: 'stopped' | 'playing' | 'paused';
    playbackTime: number;       // 目前播放時間（秒）
    editingKeyframeIndex: number | null;  // 正在編輯的關鍵幀 index
    manualPlayingModelIds: string[];     // 正在播放 manual 動畫的模型 ID

    // Scene transition (N1)
    transitionState: 'idle' | 'flyToModel' | 'fadeOut' | 'loading' | 'fadeIn';
    transitionTargetSceneId: string | null;
    transitionModelId: string | null;     // fly-to 目標模型 ID
    startSceneTransition: (sceneId: string, modelId: string | null) => void;
    advanceTransition: () => void;

    toggleManualPlay: (modelId: string) => void;
    fetchAnimations: (modelId: string) => Promise<void>;
    fetchAnimationsForModels: (modelIds: string[]) => Promise<void>;
    createAnimation: (modelId: string, data?: Partial<FacilityAnimation>) => Promise<FacilityAnimation>;
    updateAnimation: (animId: string, data: Partial<FacilityAnimation>) => Promise<void>;
    deleteAnimation: (animId: string) => Promise<void>;
    setAnimationMode: (enabled: boolean) => void;
    selectAnimation: (animId: string | null) => void;
    setPlaybackState: (state: 'stopped' | 'playing' | 'paused') => void;
    setPlaybackTime: (time: number) => void;
    setEditingKeyframeIndex: (index: number | null) => void;
    addKeyframe: (animId: string, keyframe: AnimationKeyframe) => Promise<void>;
    updateKeyframe: (animId: string, index: number, keyframe: AnimationKeyframe) => Promise<void>;
    deleteKeyframe: (animId: string, index: number) => Promise<void>;
}

export const useFacilityStore = create<FacilityState>((set, get) => ({
    loadedProjectId: null,
    scenes: [],
    currentSceneId: null,
    sceneStack: [],
    models: [],
    selectedModelIds: [],
    focusedModelId: null,
    hoveredModelId: null,
    hiddenModelIds: [],
    editMode: false,
    editingModelId: null,
    transformMode: 'translate',
    showLabels: true,
    showPlanView: false,
    flyToModelId: null,
    viewPreset: null,
    modelBboxCenters: {},
    isLoading: false,
    error: null,

    // Terrain settings
    terrainSettings: {
        visible: true,
        textureMode: 'hillshade',
        colorRamp: 'spectral',
        reverse: false,
        minZ: 0,
        maxZ: 100,
        autoRange: true,
    },
    setTerrainSettings: (patch) => set(state => ({
        terrainSettings: { ...state.terrainSettings, ...patch },
    })),

    // Scene transition (N1)
    transitionState: 'idle' as const,
    transitionTargetSceneId: null,
    transitionModelId: null,

    // ===== Scene Actions =====
    fetchScenes: async (projectId: string, force = false) => {
        // 同一專案不重複重置（避免重新進入頁面時場景閃爍重載），force=true 強制刷新
        if (!force && get().loadedProjectId === projectId) return;
        try {
            const res = await axios.get<FacilityScene[]>(`${API_BASE}/api/facility/scenes`, {
                params: { projectId },
                headers: getAuthHeaders(),
                withCredentials: true,
            });
            set({
                loadedProjectId: projectId,
                scenes: Array.isArray(res.data) ? res.data : [],
                // 切換專案時清空導覽狀態，避免殘留舊專案資料
                currentSceneId: null,
                sceneStack: [],
                models: [],
                selectedModelIds: [],
                focusedModelId: null,
                hoveredModelId: null,
                hiddenModelIds: [], manualPlayingModelIds: [],
                editingModelId: null,
                flyToModelId: null,
                modelBboxCenters: {},
            });
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
            selectedModelIds: [],
            focusedModelId: null,
            hoveredModelId: null,
            hiddenModelIds: [], manualPlayingModelIds: [],
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
            selectedModelIds: [],
            focusedModelId: null,
            hoveredModelId: null,
            hiddenModelIds: [], manualPlayingModelIds: [],
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
            selectedModelIds: [],
            focusedModelId: null,
            hoveredModelId: null,
            hiddenModelIds: [], manualPlayingModelIds: [],
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

    // ===== Lobby Mode =====
    isLobbyMode: () => {
        const scene = get().getCurrentScene();
        return scene?.sceneType === 'lobby';
    },

    getChildScenes: (modelId: string) => {
        return get().scenes.filter(s => s.parentModelId === modelId);
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
            const loadedModels = Array.isArray(res.data) ? res.data : [];
            set({ models: loadedModels, isLoading: false });
            // 載入所有模型的動畫（auto-play 動畫需要）
            if (loadedModels.length > 0) {
                get().fetchAnimationsForModels(loadedModels.map(m => m.id));
            }
        } catch (err: any) {
            console.error('[FacilityStore] fetchModels error:', err);
            set({ error: err.message, isLoading: false, models: [] });
        }
    },

    selectModel: (modelId, multi) => {
        if (modelId === null) {
            set({ selectedModelIds: [], focusedModelId: null });
            return;
        }
        if (multi) {
            // Cmd/Ctrl+Click: toggle in/out of selection
            set(state => {
                const has = state.selectedModelIds.includes(modelId);
                const newIds = has
                    ? state.selectedModelIds.filter(id => id !== modelId)
                    : [...state.selectedModelIds, modelId];
                return {
                    selectedModelIds: newIds,
                    focusedModelId: has
                        ? (newIds.length > 0 ? newIds[newIds.length - 1] : null)
                        : modelId,
                };
            });
        } else {
            // Normal click: single select
            set({ selectedModelIds: [modelId], focusedModelId: modelId });
        }
    },

    toggleModelSelection: (modelId) => {
        set(state => {
            const has = state.selectedModelIds.includes(modelId);
            const newIds = has
                ? state.selectedModelIds.filter(id => id !== modelId)
                : [...state.selectedModelIds, modelId];
            return {
                selectedModelIds: newIds,
                focusedModelId: has
                    ? (newIds.length > 0 ? newIds[newIds.length - 1] : null)
                    : modelId,
            };
        });
    },

    setFocusedModel: (modelId) => set({ focusedModelId: modelId }),
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

    // ===== Batch Actions =====
    batchDeleteModels: async (modelIds) => {
        try {
            await Promise.all(
                modelIds.map(id =>
                    axios.delete(`${API_BASE}/api/facility/models/${id}`, {
                        headers: getAuthHeaders(), withCredentials: true,
                    })
                )
            );
            set(state => ({
                models: state.models.filter(m => !modelIds.includes(m.id)),
                selectedModelIds: state.selectedModelIds.filter(id => !modelIds.includes(id)),
                focusedModelId: modelIds.includes(state.focusedModelId ?? '') ? null : state.focusedModelId,
                animations: state.animations.filter(a => !modelIds.includes(a.modelId)),
            }));
        } catch (err: any) {
            console.error('[FacilityStore] batchDeleteModels error:', err);
        }
    },

    toggleModelVisibility: (modelIds) => {
        set(state => {
            const newHidden = [...state.hiddenModelIds];
            for (const id of modelIds) {
                const idx = newHidden.indexOf(id);
                if (idx >= 0) {
                    newHidden.splice(idx, 1);
                } else {
                    newHidden.push(id);
                }
            }
            return { hiddenModelIds: newHidden };
        });
    },

    setSelectedModelIds: (ids, focusId) => set({
        selectedModelIds: ids,
        focusedModelId: focusId !== undefined ? focusId : (ids.length > 0 ? ids[ids.length - 1] : null),
    }),

    setHiddenModelIds: (ids) => set({ hiddenModelIds: ids }),

    // ===== Edit Mode =====
    setEditMode: (enabled) => set(state => ({
        editMode: enabled,
        editingModelId: enabled ? state.editingModelId : null,
    })),
    setEditingModel: (modelId) => set({ editingModelId: modelId }),
    setTransformMode: (mode) => set({ transformMode: mode }),

    // ===== UI =====
    toggleLabels: () => set(state => ({ showLabels: !state.showLabels })),
    togglePlanView: () => set(state => ({ showPlanView: !state.showPlanView })),

    // ===== Refresh =====
    refreshCurrentScene: async () => {
        const { currentSceneId, loadedProjectId, fetchModels } = get();
        // 重新取得場景列表（繞過 loadedProjectId 守衛）
        if (loadedProjectId) {
            try {
                const res = await axios.get<FacilityScene[]>(`${API_BASE}/api/facility/scenes`, {
                    params: { projectId: loadedProjectId },
                    headers: getAuthHeaders(),
                    withCredentials: true,
                });
                set({ scenes: Array.isArray(res.data) ? res.data : [] });
            } catch (err: any) {
                console.error('[FacilityStore] refreshCurrentScene scenes error:', err);
            }
        }
        // 重新取得當前場景模型
        if (currentSceneId) {
            await fetchModels(currentSceneId);
        }
    },

    // ===== Camera =====
    flyToModel: (modelId) => set({ flyToModelId: modelId }),
    clearFlyTo: () => set({ flyToModelId: null }),
    setViewPreset: (preset) => set({ viewPreset: preset }),
    clearViewPreset: () => set({ viewPreset: null }),
    setModelBboxCenter: (modelId, center) => set(state => ({
        modelBboxCenters: { ...state.modelBboxCenters, [modelId]: center },
    })),

    // ===== Scene Transition (N1) =====
    startSceneTransition: (sceneId, modelId) => {
        if (get().transitionState !== 'idle') return; // 防止重複觸發
        if (modelId) {
            // 有模型 → 先飛向模型再淡出
            set({
                transitionState: 'flyToModel',
                transitionTargetSceneId: sceneId,
                transitionModelId: modelId,
                flyToModelId: modelId,
            });
        } else {
            // 無模型（如 lobby 直接進入）→ 直接淡出
            set({
                transitionState: 'fadeOut',
                transitionTargetSceneId: sceneId,
                transitionModelId: null,
            });
        }
    },

    advanceTransition: () => {
        const { transitionState, transitionTargetSceneId, enterScene } = get();
        switch (transitionState) {
            case 'flyToModel':
                // fly-to 完成 → 開始淡出
                set({ transitionState: 'fadeOut' });
                break;
            case 'fadeOut':
                // 淡出完成 → 切換場景
                set({ transitionState: 'loading' });
                if (transitionTargetSceneId) {
                    enterScene(transitionTargetSceneId);
                }
                break;
            case 'loading':
                // 載入完成 → 開始淡入
                set({ transitionState: 'fadeIn' });
                break;
            case 'fadeIn':
                // 淡入完成 → 回到 idle
                set({
                    transitionState: 'idle',
                    transitionTargetSceneId: null,
                    transitionModelId: null,
                });
                break;
        }
    },

    // ===== Animation =====
    animations: [],
    animationMode: false,
    selectedAnimationId: null,
    selectedAnimPerModel: {},
    playbackState: 'stopped',
    playbackTime: 0,
    editingKeyframeIndex: null,
    manualPlayingModelIds: [],

    toggleManualPlay: (modelId) => set(state => {
        const isPlaying = state.manualPlayingModelIds.includes(modelId);
        return {
            manualPlayingModelIds: isPlaying
                ? state.manualPlayingModelIds.filter(id => id !== modelId)
                : [...state.manualPlayingModelIds, modelId],
        };
    }),

    fetchAnimations: async (modelId: string) => {
        try {
            const res = await axios.get<FacilityAnimation[]>(
                `${API_BASE}/api/facility/models/${modelId}/animations`,
                { headers: getAuthHeaders(), withCredentials: true }
            );
            set({ animations: Array.isArray(res.data) ? res.data : [] });
        } catch (err: any) {
            console.error('[FacilityStore] fetchAnimations error:', err);
        }
    },

    fetchAnimationsForModels: async (modelIds: string[]) => {
        if (modelIds.length === 0) return;
        try {
            const results = await Promise.all(
                modelIds.map(id =>
                    axios.get<FacilityAnimation[]>(
                        `${API_BASE}/api/facility/models/${id}/animations`,
                        { headers: getAuthHeaders(), withCredentials: true }
                    )
                )
            );
            const fetched = results.flatMap(r => Array.isArray(r.data) ? r.data : []);
            // 合併：保留不在本次 fetch 範圍的既有動畫 + 本次取得的新資料
            const fetchedModelIdSet = new Set(modelIds);
            set(state => ({
                animations: [
                    ...state.animations.filter(a => !fetchedModelIdSet.has(a.modelId)),
                    ...fetched,
                ],
            }));
        } catch (err: any) {
            console.error('[FacilityStore] fetchAnimationsForModels error:', err);
        }
    },

    createAnimation: async (modelId, data = {}) => {
        const res = await axios.post<FacilityAnimation>(
            `${API_BASE}/api/facility/models/${modelId}/animations`,
            { name: '未命名動畫', ...data },
            { headers: getAuthHeaders(), withCredentials: true }
        );
        set(state => ({ animations: [...state.animations, res.data] }));
        return res.data;
    },

    updateAnimation: async (animId, data) => {
        const res = await axios.put<FacilityAnimation>(
            `${API_BASE}/api/facility/animations/${animId}`,
            data,
            { headers: getAuthHeaders(), withCredentials: true }
        );
        set(state => ({
            animations: state.animations.map(a => a.id === animId ? { ...a, ...res.data } : a),
        }));
    },

    deleteAnimation: async (animId) => {
        await axios.delete(`${API_BASE}/api/facility/animations/${animId}`, {
            headers: getAuthHeaders(), withCredentials: true,
        });
        set(state => ({
            animations: state.animations.filter(a => a.id !== animId),
            selectedAnimationId: state.selectedAnimationId === animId ? null : state.selectedAnimationId,
        }));
    },

    setAnimationMode: (enabled) => set(state => ({
        animationMode: enabled,
        selectedAnimationId: null,
        selectedAnimPerModel: enabled ? {} : state.selectedAnimPerModel,
        playbackState: enabled ? 'paused' : 'stopped',
        playbackTime: enabled ? state.playbackTime : 0,
        editingKeyframeIndex: null,
        manualPlayingModelIds: [],
    })),

    selectAnimation: (animId) => {
        const focusedId = get().focusedModelId;
        const anim = animId ? get().animations.find(a => a.id === animId) : null;
        const modelId = anim?.modelId ?? focusedId;
        return set(state => ({
            selectedAnimationId: animId,
            playbackState: 'stopped',
            playbackTime: 0,
            editingKeyframeIndex: null,
            selectedAnimPerModel: modelId && animId
                ? { ...state.selectedAnimPerModel, [modelId]: animId }
                : state.selectedAnimPerModel,
        }));
    },

    setPlaybackState: (state) => set({ playbackState: state }),
    setPlaybackTime: (time) => set({ playbackTime: time }),
    setEditingKeyframeIndex: (index) => set({ editingKeyframeIndex: index }),

    addKeyframe: async (animId, keyframe) => {
        const anim = get().animations.find(a => a.id === animId);
        if (!anim) return;
        const keyframes = [...anim.keyframes, keyframe].sort((a, b) => a.time - b.time);
        await get().updateAnimation(animId, { keyframes });
    },

    updateKeyframe: async (animId, index, keyframe) => {
        const anim = get().animations.find(a => a.id === animId);
        if (!anim) return;
        const keyframes = [...anim.keyframes];
        keyframes[index] = keyframe;
        keyframes.sort((a, b) => a.time - b.time);
        await get().updateAnimation(animId, { keyframes });
    },

    deleteKeyframe: async (animId, index) => {
        const anim = get().animations.find(a => a.id === animId);
        if (!anim) return;
        const keyframes = anim.keyframes.filter((_, i) => i !== index);
        await get().updateAnimation(animId, { keyframes });
    },
}));
