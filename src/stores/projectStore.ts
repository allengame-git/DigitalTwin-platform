/**
 * Project Store
 * @module stores/projectStore
 * 
 * 專案狀態管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Project {
    id: string;
    name: string;
    code: string;
    description?: string;
    originX: number;
    originY: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        geologyModels: number;
        imagery: number;
        geophysics: number;
    };
}

interface ProjectStore {
    // State
    projects: Project[];
    activeProjectId: string | null;
    loading: boolean;
    error: string | null;

    // Actions
    fetchProjects: () => Promise<void>;
    createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | '_count'>) => Promise<Project | null>;
    updateProject: (id: string, data: Partial<Project>) => Promise<Project | null>;
    deleteProject: (id: string, confirmName: string) => Promise<boolean>;
    setActiveProject: (id: string | null) => void;
    getActiveProject: () => Project | null;
    getProjectByCode: (code: string) => Project | undefined;
}

const API_BASE = '/api/project';

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set, get) => ({
            // Initial state
            projects: [],
            activeProjectId: null,
            loading: false,
            error: null,

            // Fetch all projects
            fetchProjects: async () => {
                set({ loading: true, error: null });
                try {
                    const res = await fetch(API_BASE);
                    const data = await res.json();
                    if (data.success) {
                        set({ projects: data.data, loading: false });
                    } else {
                        set({ error: data.error, loading: false });
                    }
                } catch (error) {
                    set({ error: 'Failed to fetch projects', loading: false });
                }
            },

            // Create project
            createProject: async (projectData) => {
                set({ loading: true, error: null });
                try {
                    const res = await fetch(API_BASE, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(projectData),
                    });
                    const data = await res.json();
                    if (data.success) {
                        set((state) => ({
                            projects: [data.data, ...state.projects],
                            loading: false,
                        }));
                        return data.data;
                    } else {
                        set({ error: data.error, loading: false });
                        return null;
                    }
                } catch (error) {
                    set({ error: 'Failed to create project', loading: false });
                    return null;
                }
            },

            // Update project
            updateProject: async (id, projectData) => {
                set({ loading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(projectData),
                    });
                    const data = await res.json();
                    if (data.success) {
                        set((state) => ({
                            projects: state.projects.map((p) =>
                                p.id === id ? { ...p, ...data.data } : p
                            ),
                            loading: false,
                        }));
                        return data.data;
                    } else {
                        set({ error: data.error, loading: false });
                        return null;
                    }
                } catch (error) {
                    set({ error: 'Failed to update project', loading: false });
                    return null;
                }
            },

            // Delete project (with confirmation)
            deleteProject: async (id, confirmName) => {
                set({ loading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/${id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ confirmName }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        set((state) => ({
                            projects: state.projects.filter((p) => p.id !== id),
                            activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
                            loading: false,
                        }));
                        return true;
                    } else {
                        set({ error: data.error, loading: false });
                        return false;
                    }
                } catch (error) {
                    set({ error: 'Failed to delete project', loading: false });
                    return false;
                }
            },

            // Set active project
            setActiveProject: (id) => {
                set({ activeProjectId: id });
            },

            // Get active project
            getActiveProject: () => {
                const { projects, activeProjectId } = get();
                return projects.find((p) => p.id === activeProjectId) || null;
            },

            // Get project by code
            getProjectByCode: (code) => {
                return get().projects.find((p) => p.code === code);
            },
        }),
        {
            name: 'project-storage',
            partialize: (state) => ({ activeProjectId: state.activeProjectId }),
        }
    )
);

export default useProjectStore;
