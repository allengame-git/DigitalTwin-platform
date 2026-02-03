/**
 * Annotation Store
 * 
 * Zustand store for annotation state management.
 * @see specs/4-user-roles-system/spec.md FR-10, FR-11
 */

import { create } from 'zustand';
import type { Annotation, CreateAnnotationDTO, UpdateAnnotationDTO } from '../types/annotation';
import * as annotationApi from '../api/annotation';

interface AnnotationState {
    annotations: Annotation[];
    selectedAnnotation: Annotation | null;
    isLoading: boolean;
    error: string | null;
}

interface AnnotationStore extends AnnotationState {
    // Actions
    fetchAnnotations: (projectId: string) => Promise<void>;
    createAnnotation: (data: CreateAnnotationDTO) => Promise<Annotation>;
    updateAnnotation: (id: string, data: UpdateAnnotationDTO) => Promise<void>;
    deleteAnnotation: (id: string) => Promise<void>;
    resolveAnnotation: (id: string) => Promise<void>;

    // Selection
    selectAnnotation: (annotation: Annotation | null) => void;
    navigateToAnnotation: (annotation: Annotation) => void;

    // Utilities
    clearError: () => void;
    getUnresolvedCount: () => number;
}

const initialState: AnnotationState = {
    annotations: [],
    selectedAnnotation: null,
    isLoading: false,
    error: null,
};

export const useAnnotationStore = create<AnnotationStore>()((set, get) => ({
    ...initialState,

    fetchAnnotations: async (projectId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await annotationApi.getAnnotations(projectId);
            set({ annotations: response.annotations, isLoading: false });
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : '載入標註失敗',
            });
        }
    },

    createAnnotation: async (data: CreateAnnotationDTO) => {
        set({ isLoading: true, error: null });
        try {
            const annotation = await annotationApi.createAnnotation(data);
            set((state) => ({
                annotations: [...state.annotations, annotation],
                isLoading: false,
            }));
            return annotation;
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : '建立標註失敗',
            });
            throw error;
        }
    },

    updateAnnotation: async (id: string, data: UpdateAnnotationDTO) => {
        try {
            const updated = await annotationApi.updateAnnotation(id, data);
            set((state) => ({
                annotations: state.annotations.map((a) => (a.id === id ? updated : a)),
                selectedAnnotation: state.selectedAnnotation?.id === id ? updated : state.selectedAnnotation,
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : '更新標註失敗',
            });
            throw error;
        }
    },

    deleteAnnotation: async (id: string) => {
        try {
            await annotationApi.deleteAnnotation(id);
            set((state) => ({
                annotations: state.annotations.filter((a) => a.id !== id),
                selectedAnnotation: state.selectedAnnotation?.id === id ? null : state.selectedAnnotation,
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : '刪除標註失敗',
            });
            throw error;
        }
    },

    resolveAnnotation: async (id: string) => {
        await get().updateAnnotation(id, { isResolved: true });
    },

    selectAnnotation: (annotation: Annotation | null) => {
        set({ selectedAnnotation: annotation });
    },

    navigateToAnnotation: (annotation: Annotation) => {
        // This will be implemented to trigger camera movement in the 3D scene
        set({ selectedAnnotation: annotation });
        // Emit event for 3D scene to handle camera navigation
        window.dispatchEvent(
            new CustomEvent('navigateToAnnotation', { detail: annotation })
        );
    },

    clearError: () => set({ error: null }),

    getUnresolvedCount: () => {
        return get().annotations.filter((a) => !a.isResolved).length;
    },
}));

export default useAnnotationStore;
