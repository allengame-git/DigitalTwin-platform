/**
 * Review Store
 * @module stores/reviewStore
 *
 * 審查作業狀態管理
 */

import { create } from 'zustand';
import * as reviewApi from '../api/review';
import type {
    ReviewSession,
    ReviewMarker,
    ReviewComment,
    ReviewSessionWithStats,
    MarkerStats,
    CreateSessionDTO,
    UpdateSessionDTO,
    CreateMarkerDTO,
    UpdateMarkerDTO,
} from '../types/review';

interface ReviewStore {
    // State
    sessions: ReviewSessionWithStats[];
    currentSession: ReviewSession | null;
    markers: ReviewMarker[];
    loading: boolean;
    error: string | null;

    // Review mode state (for 3D scene integration)
    reviewMode: boolean;
    activeSessionId: string | null;
    selectedMarkerId: string | null;

    // Session actions
    fetchSessions: (projectId: string) => Promise<void>;
    fetchSession: (sessionId: string) => Promise<void>;
    createSession: (data: CreateSessionDTO) => Promise<ReviewSession | null>;
    updateSession: (sessionId: string, data: UpdateSessionDTO) => Promise<ReviewSession | null>;
    deleteSession: (sessionId: string) => Promise<boolean>;

    // Marker actions
    fetchMarkers: (sessionId: string) => Promise<void>;
    createMarker: (sessionId: string, data: CreateMarkerDTO, screenshot?: Blob) => Promise<ReviewMarker | null>;
    updateMarker: (markerId: string, data: UpdateMarkerDTO) => Promise<ReviewMarker | null>;
    deleteMarker: (markerId: string) => Promise<boolean>;

    // Comment actions
    addComment: (markerId: string, content: string) => Promise<ReviewComment | null>;
    updateComment: (commentId: string, content: string) => Promise<ReviewComment | null>;
    deleteComment: (commentId: string, markerId: string) => Promise<boolean>;

    // Participant actions
    addParticipant: (sessionId: string, userId: string, role?: string) => Promise<boolean>;
    removeParticipant: (sessionId: string, userId: string) => Promise<boolean>;

    // PDF
    exportPdf: (sessionId: string) => Promise<string | null>;

    // Review mode actions
    enterReviewMode: (sessionId: string) => void;
    exitReviewMode: () => void;
    selectMarker: (markerId: string | null) => void;
}

export const useReviewStore = create<ReviewStore>()((set, get) => ({
    // Initial state
    sessions: [],
    currentSession: null,
    markers: [],
    loading: false,
    error: null,
    reviewMode: false,
    activeSessionId: null,
    selectedMarkerId: null,

    // === Session actions ===

    fetchSessions: async (projectId) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.fetchSessions(projectId);
            if (data.success) {
                set({ sessions: data.data, loading: false });
            } else {
                set({ error: data.error, loading: false });
            }
        } catch {
            set({ error: '無法載入審查作業', loading: false });
        }
    },

    fetchSession: async (sessionId) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.fetchSession(sessionId);
            if (data.success) {
                set({
                    currentSession: data.data,
                    markers: data.data.markers || [],
                    loading: false,
                });
            } else {
                set({ error: data.error, loading: false });
            }
        } catch {
            set({ error: '無法載入審查詳情', loading: false });
        }
    },

    createSession: async (dto) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.createSession(dto);
            if (data.success) {
                set((s) => ({
                    sessions: [...s.sessions, data.data],
                    loading: false,
                }));
                return data.data;
            } else {
                set({ error: data.error, loading: false });
                return null;
            }
        } catch {
            set({ error: '無法建立審查作業', loading: false });
            return null;
        }
    },

    updateSession: async (sessionId, dto) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.updateSession(sessionId, dto);
            if (data.success) {
                set((s) => ({
                    sessions: s.sessions.map((ss) =>
                        ss.id === sessionId ? { ...ss, ...data.data } : ss
                    ),
                    currentSession:
                        s.currentSession?.id === sessionId
                            ? { ...s.currentSession, ...data.data }
                            : s.currentSession,
                    loading: false,
                }));
                return data.data;
            } else {
                set({ error: data.error, loading: false });
                return null;
            }
        } catch {
            set({ error: '無法更新審查作業', loading: false });
            return null;
        }
    },

    deleteSession: async (sessionId) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.deleteSession(sessionId);
            if (data.success) {
                set((s) => ({
                    sessions: s.sessions.filter((ss) => ss.id !== sessionId),
                    currentSession:
                        s.currentSession?.id === sessionId ? null : s.currentSession,
                    loading: false,
                }));
                return true;
            } else {
                set({ error: data.error, loading: false });
                return false;
            }
        } catch {
            set({ error: '無法刪除審查作業', loading: false });
            return false;
        }
    },

    // === Marker actions ===

    fetchMarkers: async (sessionId) => {
        try {
            const data = await reviewApi.fetchMarkers(sessionId);
            if (data.success) {
                set({ markers: data.data });
            }
        } catch {
            // silent
        }
    },

    createMarker: async (sessionId, dto, screenshot?) => {
        set({ loading: true, error: null });
        try {
            const formData = new FormData();
            Object.entries(dto).forEach(([key, value]) => {
                formData.append(key, String(value));
            });
            if (screenshot) {
                formData.append('screenshot', screenshot, 'screenshot.jpg');
            }
            const data = await reviewApi.createMarker(sessionId, formData);
            if (data.success) {
                set((s) => ({
                    markers: [...s.markers, data.data],
                    loading: false,
                }));
                return data.data;
            } else {
                set({ error: data.error, loading: false });
                return null;
            }
        } catch {
            set({ error: '無法建立標記', loading: false });
            return null;
        }
    },

    updateMarker: async (markerId, dto) => {
        try {
            const data = await reviewApi.updateMarker(markerId, dto);
            if (data.success) {
                set((s) => ({
                    markers: s.markers.map((m) =>
                        m.id === markerId ? { ...m, ...data.data } : m
                    ),
                }));
                return data.data;
            }
            return null;
        } catch {
            return null;
        }
    },

    deleteMarker: async (markerId) => {
        try {
            const data = await reviewApi.deleteMarker(markerId);
            if (data.success) {
                set((s) => ({
                    markers: s.markers.filter((m) => m.id !== markerId),
                    selectedMarkerId:
                        s.selectedMarkerId === markerId ? null : s.selectedMarkerId,
                }));
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    // === Comment actions ===

    addComment: async (markerId, content) => {
        try {
            const data = await reviewApi.createComment(markerId, content);
            if (data.success) {
                set((s) => ({
                    markers: s.markers.map((m) =>
                        m.id === markerId
                            ? { ...m, comments: [...(m.comments || []), data.data] }
                            : m
                    ),
                }));
                return data.data;
            }
            return null;
        } catch {
            return null;
        }
    },

    updateComment: async (commentId, content) => {
        try {
            const data = await reviewApi.updateComment(commentId, content);
            if (data.success) {
                set((s) => ({
                    markers: s.markers.map((m) => ({
                        ...m,
                        comments: m.comments?.map((c) =>
                            c.id === commentId ? { ...c, ...data.data } : c
                        ),
                    })),
                }));
                return data.data;
            }
            return null;
        } catch {
            return null;
        }
    },

    deleteComment: async (commentId, markerId) => {
        try {
            const data = await reviewApi.deleteComment(commentId);
            if (data.success) {
                set((s) => ({
                    markers: s.markers.map((m) =>
                        m.id === markerId
                            ? {
                                  ...m,
                                  comments: m.comments?.filter((c) => c.id !== commentId),
                              }
                            : m
                    ),
                }));
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    // === Participant actions ===

    addParticipant: async (sessionId, userId, role?) => {
        try {
            const data = await reviewApi.addParticipant(sessionId, userId, role);
            return data.success === true;
        } catch {
            return false;
        }
    },

    removeParticipant: async (sessionId, userId) => {
        try {
            const data = await reviewApi.removeParticipant(sessionId, userId);
            return data.success === true;
        } catch {
            return false;
        }
    },

    // === PDF ===

    exportPdf: async (sessionId) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.exportPdf(sessionId);
            if (data.success) {
                // Update session's pdfUrl
                set((s) => ({
                    sessions: s.sessions.map((ss) =>
                        ss.id === sessionId ? { ...ss, pdfUrl: data.data.pdfUrl } : ss
                    ),
                    currentSession:
                        s.currentSession?.id === sessionId
                            ? { ...s.currentSession, pdfUrl: data.data.pdfUrl }
                            : s.currentSession,
                    loading: false,
                }));
                return data.data.pdfUrl;
            } else {
                set({ error: data.error, loading: false });
                return null;
            }
        } catch {
            set({ error: '無法匯出 PDF', loading: false });
            return null;
        }
    },

    // === Review mode ===

    enterReviewMode: (sessionId) => {
        set({ reviewMode: true, activeSessionId: sessionId, selectedMarkerId: null });
        // Also fetch markers for this session
        get().fetchMarkers(sessionId);
    },

    exitReviewMode: () => {
        set({ reviewMode: false, activeSessionId: null, selectedMarkerId: null });
    },

    selectMarker: (markerId) => {
        set({ selectedMarkerId: markerId });
    },
}));

export default useReviewStore;
