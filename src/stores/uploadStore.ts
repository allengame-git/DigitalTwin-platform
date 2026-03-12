/**
 * Upload Store
 * @module stores/uploadStore
 * 
 * 管理上傳狀態與已上傳檔案列表
 */

import { create } from 'zustand';

// 使用相對路徑，Vite dev server 會 proxy /api 到後端
const API_BASE = '';

import { useProjectStore } from './projectStore';
import { useAuthStore } from './authStore';

/**
 * XHR-based upload with real progress tracking.
 * Returns parsed JSON response.
 */
function uploadWithProgress(
    url: string,
    formData: FormData,
    token: string | null,
    onProgress: (percent: number) => void,
): Promise<any> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });

        xhr.addEventListener('load', () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(data);
                } else {
                    reject(new Error(data.message || `HTTP ${xhr.status}`));
                }
            } catch {
                reject(new Error('回應格式錯誤'));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('網路錯誤')));
        xhr.addEventListener('abort', () => reject(new Error('上傳已取消')));

        xhr.send(formData);
    });
}

export interface UploadedFile {
    id: string;
    filename: string;
    originalName?: string;
    // Metadata
    year: number;
    name: string;
    source?: string | null;
    description?: string | null;
    // 地理定位資訊
    minX?: number | null;
    maxX?: number | null;
    minY?: number | null;
    maxY?: number | null;
    // 檔案資訊
    url: string;
    thumbnailUrl: string;
    size: number;
    createdAt: string;
    updatedAt?: string;
}

export interface ImageryMetadata {
    year: number;
    name: string;
    source?: string;
    description?: string;
    // 座標輸入 (可選)
    minX?: string;
    maxX?: string;
    minY?: string;
    maxY?: string;
}

// ===============================
// 地球物理探查資料類型
// ===============================

export interface GeophysicsFile {
    id: string;
    filename: string;
    originalName?: string;
    // Metadata
    year: number;
    name: string;
    lineId?: string | null;
    method: string;
    description?: string | null;
    // 左端點座標 (TWD97, 公尺)
    x1: number;
    y1: number;
    z1: number;
    // 右端點座標 (TWD97, 公尺)
    x2: number;
    y2: number;
    z2: number;
    // 深度範圍
    depthTop?: number | null;
    depthBottom?: number | null;
    // 檔案資訊
    url: string;
    thumbnailUrl: string;
    size: number;
    createdAt: string;
    updatedAt?: string;
}

export interface GeophysicsMetadata {
    year: number;
    name: string;
    lineId?: string;
    method: string;
    description?: string;
    x1: string;
    y1: string;
    z1: string;
    x2: string;
    y2: string;
    z2: string;
    depthTop?: string;
    depthBottom?: string;
}

// ===============================
// 3D 地質模型類型
// ===============================

export interface GeologyModelFile {
    id: string;
    filename: string;
    originalName?: string;
    version: string;
    year: number;
    name: string;
    description?: string;
    sourceData?: string;
    cellSizeX?: number;
    cellSizeY?: number;
    cellSizeZ?: number;
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    minZ?: number;
    maxZ?: number;
    tilesetUrl?: string;
    meshUrl?: string;
    meshFormat?: 'glb' | 'pnts';
    size: number;
    conversionStatus: 'pending' | 'processing' | 'completed' | 'failed';
    conversionProgress: number; // 0-100
    conversionError?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface GeologyModelMetadata {
    version: string;
    year: number;
    name: string;
    description?: string;
    sourceData?: string;
}

export interface UploadState {
    // 已上傳檔案
    imageryFiles: UploadedFile[];
    // 當前使用的航照圖 ID
    activeImageryId: string | null;
    // 地球物理探查資料
    geophysicsFiles: GeophysicsFile[];
    activeGeophysicsId: string | null;
    // 3D 地質模型
    geologyModels: GeologyModelFile[];
    activeGeologyModelId: string | null;
    // 上傳狀態
    isUploading: boolean;
    uploadProgress: number;
    uploadError: string | null;
}

export interface UploadActions {
    // 航照圖
    fetchImageryFiles: (moduleId?: string) => Promise<void>;
    uploadImagery: (file: File, metadata: ImageryMetadata) => Promise<void>;
    deleteImagery: (id: string) => Promise<void>;
    setActiveImagery: (id: string | null) => void;
    getActiveImagery: () => UploadedFile | null;
    // 地球物理探查
    fetchGeophysicsFiles: (moduleId?: string) => Promise<void>;
    uploadGeophysics: (file: File, metadata: GeophysicsMetadata) => Promise<void>;
    deleteGeophysics: (id: string) => Promise<void>;
    setActiveGeophysics: (id: string | null) => void;
    getActiveGeophysics: () => GeophysicsFile | null;
    // 3D 地質模型
    fetchGeologyModels: (moduleId?: string) => Promise<void>;
    uploadGeologyModel: (file: File, metadata: GeologyModelMetadata) => Promise<void>;
    deleteGeologyModel: (id: string) => Promise<void>;
    activateGeologyModel: (id: string) => Promise<void>;
    pollGeologyModelStatus: (id: string) => Promise<void>;
    getActiveGeologyModel: () => GeologyModelFile | null;
    // 共用
    clearError: () => void;
}

export const useUploadStore = create<UploadState & UploadActions>((set, get) => ({
    // 初始狀態
    imageryFiles: [],
    activeImageryId: null,
    geophysicsFiles: [],
    activeGeophysicsId: null,
    geologyModels: [],
    activeGeologyModelId: null,
    isUploading: false,
    uploadProgress: 0,
    uploadError: null,

    // ===============================
    // 航照圖 Actions
    // ===============================
    fetchImageryFiles: async (moduleId?: string) => {
        try {
            const projectId = useProjectStore.getState().activeProjectId;
            if (!projectId && !moduleId) return;

            const query = moduleId ? `moduleId=${moduleId}` : `projectId=${projectId}`;
            const res = await fetch(`${API_BASE}/api/upload/imagery?${query}`);
            const data = await res.json();
            if (data.success) {
                set(state => ({
                    imageryFiles: data.data,
                    activeImageryId: state.activeImageryId || (data.data.length > 0 ? data.data[0].id : null)
                }));
            }
        } catch (error) {
            console.error('Fetch imagery files error:', error);
        }
    },

    uploadImagery: async (file: File, metadata: ImageryMetadata) => {
        set({ isUploading: true, uploadProgress: 0, uploadError: null });

        try {
            const formData = new FormData();
            formData.append('file', file);
            const projectId = useProjectStore.getState().activeProjectId;
            if (!projectId) throw new Error('未選擇專案');
            formData.append('projectId', projectId);

            formData.append('year', metadata.year.toString());
            formData.append('name', metadata.name);
            if (metadata.source) formData.append('source', metadata.source);
            if (metadata.description) formData.append('description', metadata.description);
            // 座標資訊
            if (metadata.minX) formData.append('minX', metadata.minX);
            if (metadata.maxX) formData.append('maxX', metadata.maxX);
            if (metadata.minY) formData.append('minY', metadata.minY);
            if (metadata.maxY) formData.append('maxY', metadata.maxY);

            const token = useAuthStore.getState().accessToken;
            const data = await uploadWithProgress(
                `${API_BASE}/api/upload/imagery`,
                formData,
                token,
                (percent) => set({ uploadProgress: percent }),
            );

            if (data.success) {
                set(state => ({
                    imageryFiles: [data.data, ...state.imageryFiles],
                    activeImageryId: data.data.id,
                    isUploading: false,
                    uploadProgress: 100,
                }));
            } else {
                throw new Error(data.message || '上傳失敗');
            }
        } catch (error) {
            set({
                isUploading: false,
                uploadError: (error as Error).message,
            });
        }
    },

    deleteImagery: async (id: string) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${API_BASE}/api/upload/imagery/${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });
            const data = await res.json();

            if (data.success) {
                set(state => ({
                    imageryFiles: state.imageryFiles.filter(f => f.id !== id),
                    activeImageryId: state.activeImageryId === id
                        ? null
                        : state.activeImageryId,
                }));
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    },

    setActiveImagery: (id) => {
        set({ activeImageryId: id });
    },

    getActiveImagery: () => {
        const state = get();
        return state.imageryFiles.find(f => f.id === state.activeImageryId) || null;
    },

    // ===============================
    // 地球物理探查 Actions
    // ===============================
    fetchGeophysicsFiles: async (moduleId?: string) => {
        try {
            const projectId = useProjectStore.getState().activeProjectId;
            if (!projectId && !moduleId) return;

            const query = moduleId ? `moduleId=${moduleId}` : `projectId=${projectId}`;
            const res = await fetch(`${API_BASE}/api/upload/geophysics?${query}`);
            const data = await res.json();
            if (data.success) {
                set({ geophysicsFiles: data.data });
            }
        } catch (error) {
            console.error('Fetch geophysics files error:', error);
        }
    },

    uploadGeophysics: async (file: File, metadata: GeophysicsMetadata) => {
        set({ isUploading: true, uploadProgress: 0, uploadError: null });

        try {
            const formData = new FormData();
            formData.append('file', file);
            const projectId = useProjectStore.getState().activeProjectId;
            if (!projectId) throw new Error('未選擇專案');
            formData.append('projectId', projectId);

            formData.append('year', metadata.year.toString());
            formData.append('name', metadata.name);
            formData.append('method', metadata.method);
            if (metadata.lineId) formData.append('lineId', metadata.lineId);
            if (metadata.description) formData.append('description', metadata.description);
            // 座標
            formData.append('x1', metadata.x1);
            formData.append('y1', metadata.y1);
            formData.append('z1', metadata.z1);
            formData.append('x2', metadata.x2);
            formData.append('y2', metadata.y2);
            formData.append('z2', metadata.z2);
            // 深度
            if (metadata.depthTop) formData.append('depthTop', metadata.depthTop);
            if (metadata.depthBottom) formData.append('depthBottom', metadata.depthBottom);

            const token = useAuthStore.getState().accessToken;
            const data = await uploadWithProgress(
                `${API_BASE}/api/upload/geophysics`,
                formData,
                token,
                (percent) => set({ uploadProgress: percent }),
            );

            if (data.success) {
                set(state => ({
                    geophysicsFiles: [data.data, ...state.geophysicsFiles],
                    activeGeophysicsId: data.data.id,
                    isUploading: false,
                    uploadProgress: 100,
                }));
            } else {
                throw new Error(data.message || '上傳失敗');
            }
        } catch (error) {
            set({
                isUploading: false,
                uploadError: (error as Error).message,
            });
        }
    },

    deleteGeophysics: async (id: string) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${API_BASE}/api/upload/geophysics/${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });
            const data = await res.json();

            if (data.success) {
                set(state => ({
                    geophysicsFiles: state.geophysicsFiles.filter(f => f.id !== id),
                    activeGeophysicsId: state.activeGeophysicsId === id
                        ? null
                        : state.activeGeophysicsId,
                }));
            }
        } catch (error) {
            console.error('Delete geophysics error:', error);
        }
    },

    setActiveGeophysics: (id) => {
        set({ activeGeophysicsId: id });
    },

    getActiveGeophysics: () => {
        const state = get();
        return state.geophysicsFiles.find(f => f.id === state.activeGeophysicsId) || null;
    },

    // ===============================
    // 3D 地質模型 Actions
    // ===============================
    fetchGeologyModels: async (moduleId?: string) => {
        try {
            const projectId = useProjectStore.getState().activeProjectId;
            if (!projectId && !moduleId) return;

            const query = moduleId ? `moduleId=${moduleId}` : `projectId=${projectId}`;
            const res = await fetch(`${API_BASE}/api/geology-model?${query}`);
            const data = await res.json();
            if (data.success) {
                const models = data.data as GeologyModelFile[];
                set({ geologyModels: models });
                // 自動選中 isActive 的模型，若無則選第一個
                const activeModel = models.find(m => m.isActive);
                if (activeModel) {
                    set({ activeGeologyModelId: activeModel.id });
                } else if (models.length > 0) {
                    set({ activeGeologyModelId: models[0].id });
                }
            }
        } catch (error) {
            console.error('Fetch geology models error:', error);
        }
    },

    uploadGeologyModel: async (file: File, metadata: GeologyModelMetadata) => {
        set({ isUploading: true, uploadProgress: 0, uploadError: null });

        try {
            const formData = new FormData();
            const projectId = useProjectStore.getState().activeProjectId;
            if (!projectId) throw new Error('未選擇專案');
            formData.append('projectId', projectId);

            formData.append('file', file);
            formData.append('version', metadata.version);
            formData.append('year', metadata.year.toString());
            formData.append('name', metadata.name);
            if (metadata.description) formData.append('description', metadata.description);
            if (metadata.sourceData) formData.append('sourceData', metadata.sourceData);

            const token = useAuthStore.getState().accessToken;
            const data = await uploadWithProgress(
                `${API_BASE}/api/geology-model`,
                formData,
                token,
                (percent) => set({ uploadProgress: percent }),
            );

            if (data.success) {
                set(state => ({
                    geologyModels: [data.data, ...state.geologyModels],
                    isUploading: false,
                    uploadProgress: 100,
                }));
            } else {
                throw new Error(data.message || '上傳失敗');
            }
        } catch (error) {
            set({
                isUploading: false,
                uploadError: (error as Error).message,
            });
        }
    },

    deleteGeologyModel: async (id: string) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${API_BASE}/api/geology-model/${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });
            const data = await res.json();

            if (data.success) {
                set(state => ({
                    geologyModels: state.geologyModels.filter(m => m.id !== id),
                    activeGeologyModelId: state.activeGeologyModelId === id
                        ? null
                        : state.activeGeologyModelId,
                }));
            }
        } catch (error) {
            console.error('Delete geology model error:', error);
        }
    },

    activateGeologyModel: async (id: string) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${API_BASE}/api/geology-model/${id}/activate`, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });
            const data = await res.json();

            if (data.success) {
                // 更新所有模型的 isActive 狀態
                set(state => ({
                    geologyModels: state.geologyModels.map(m => ({
                        ...m,
                        isActive: m.id === id,
                    })),
                    activeGeologyModelId: id,
                }));
            }
        } catch (error) {
            console.error('Activate geology model error:', error);
        }
    },

    pollGeologyModelStatus: async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/geology-model/${id}/status`);
            const data = await res.json();

            if (data.success) {
                // 更新特定模型的狀態
                set(state => ({
                    geologyModels: state.geologyModels.map(m =>
                        m.id === id
                            ? { ...m, ...data.data }
                            : m
                    ),
                }));
            }
        } catch (error) {
            console.error('Poll geology model status error:', error);
        }
    },

    getActiveGeologyModel: () => {
        const state = get();
        return state.geologyModels.find(m => m.id === state.activeGeologyModelId) || null;
    },

    // ===============================
    // 共用
    // ===============================
    clearError: () => {
        set({ uploadError: null });
    },
}));

