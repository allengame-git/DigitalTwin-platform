/**
 * Upload Store
 * @module stores/uploadStore
 * 
 * 管理上傳狀態與已上傳檔案列表
 */

import { create } from 'zustand';

// 使用相對路徑，Vite dev server 會 proxy /api 到後端
const API_BASE = '';

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

export interface UploadState {
    // 已上傳檔案
    imageryFiles: UploadedFile[];
    // 當前使用的航照圖 ID
    activeImageryId: string | null;
    // 地球物理探查資料
    geophysicsFiles: GeophysicsFile[];
    activeGeophysicsId: string | null;
    // 上傳狀態
    isUploading: boolean;
    uploadProgress: number;
    uploadError: string | null;
}

export interface UploadActions {
    // 航照圖
    fetchImageryFiles: () => Promise<void>;
    uploadImagery: (file: File, metadata: ImageryMetadata) => Promise<void>;
    deleteImagery: (id: string) => Promise<void>;
    setActiveImagery: (id: string | null) => void;
    getActiveImagery: () => UploadedFile | null;
    // 地球物理探查
    fetchGeophysicsFiles: () => Promise<void>;
    uploadGeophysics: (file: File, metadata: GeophysicsMetadata) => Promise<void>;
    deleteGeophysics: (id: string) => Promise<void>;
    setActiveGeophysics: (id: string | null) => void;
    getActiveGeophysics: () => GeophysicsFile | null;
    // 共用
    clearError: () => void;
}

export const useUploadStore = create<UploadState & UploadActions>((set, get) => ({
    // 初始狀態
    imageryFiles: [],
    activeImageryId: null,
    geophysicsFiles: [],
    activeGeophysicsId: null,
    isUploading: false,
    uploadProgress: 0,
    uploadError: null,

    // ===============================
    // 航照圖 Actions
    // ===============================
    fetchImageryFiles: async () => {
        try {
            const res = await fetch(`${API_BASE}/api/upload/imagery`);
            const data = await res.json();
            if (data.success) {
                set({ imageryFiles: data.data });
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
            formData.append('year', metadata.year.toString());
            formData.append('name', metadata.name);
            if (metadata.source) formData.append('source', metadata.source);
            if (metadata.description) formData.append('description', metadata.description);
            // 座標資訊
            if (metadata.minX) formData.append('minX', metadata.minX);
            if (metadata.maxX) formData.append('maxX', metadata.maxX);
            if (metadata.minY) formData.append('minY', metadata.minY);
            if (metadata.maxY) formData.append('maxY', metadata.maxY);

            const res = await fetch(`${API_BASE}/api/upload/imagery`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

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
            const res = await fetch(`${API_BASE}/api/upload/imagery/${id}`, {
                method: 'DELETE',
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
    fetchGeophysicsFiles: async () => {
        try {
            const res = await fetch(`${API_BASE}/api/upload/geophysics`);
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

            const res = await fetch(`${API_BASE}/api/upload/geophysics`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

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
            const res = await fetch(`${API_BASE}/api/upload/geophysics/${id}`, {
                method: 'DELETE',
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
    // 共用
    // ===============================
    clearError: () => {
        set({ uploadError: null });
    },
}));

