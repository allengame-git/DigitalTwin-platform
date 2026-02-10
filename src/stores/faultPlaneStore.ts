/**
 * Fault Plane Store
 * @module stores/faultPlaneStore
 *
 * 斷層面狀態管理
 */

import { create } from 'zustand';
import { useAuthStore } from './authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface FaultCoordinate {
    x: number;
    y: number;
    z: number;
}

export interface FaultPlane {
    id: string;
    name: string;
    type: 'normal' | 'reverse' | 'strike-slip';
    dipAngle: number;
    dipDirection: number;
    depth: number;
    color: string;
    coordinates: FaultCoordinate[];
    projectId: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateFaultPlaneData {
    name: string;
    type: 'normal' | 'reverse' | 'strike-slip';
    dipAngle: number;
    dipDirection: number;
    depth: number;
    color?: string;
    coordinates: FaultCoordinate[];
}

export interface FaultPlaneImportRow {
    name: string;
    type: string;
    dipAngle: number;
    dipDirection: number;
    depth: number;
    color?: string;
    coordinates: string | FaultCoordinate[];
}

interface FaultPlaneState {
    faultPlanes: FaultPlane[];
    selectedFaultId: string | null;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
}

interface FaultPlaneActions {
    fetchFaultPlanes: (projectId: string) => Promise<void>;
    createFaultPlane: (projectId: string, data: CreateFaultPlaneData) => Promise<FaultPlane | null>;
    updateFaultPlane: (id: string, data: Partial<CreateFaultPlaneData>) => Promise<FaultPlane | null>;
    deleteFaultPlane: (id: string) => Promise<boolean>;
    batchImport: (projectId: string, data: FaultPlaneImportRow[]) => Promise<{ success: number; failed: number }>;
    selectFault: (id: string | null) => void;
    clearFaultPlanes: () => void;
}

type FaultPlaneStore = FaultPlaneState & FaultPlaneActions;

export const useFaultPlaneStore = create<FaultPlaneStore>((set, get) => ({
    // State
    faultPlanes: [],
    selectedFaultId: null,
    status: 'idle',
    error: null,

    // Actions
    fetchFaultPlanes: async (projectId: string) => {
        set({ status: 'loading', error: null });
        try {
            const response = await fetch(`${API_BASE}/api/fault-plane?projectId=${projectId}`, {
                credentials: 'include',
            });
            const result = await response.json();

            if (result.success) {
                const faultPlanes = result.data.map((fp: any) => ({
                    id: fp.id,
                    name: fp.name,
                    type: fp.type,
                    dipAngle: fp.dipAngle,
                    dipDirection: fp.dipDirection,
                    depth: fp.depth,
                    color: fp.color,
                    projectId: fp.projectId,
                    coordinates: fp.coordinates.map((c: any) => ({
                        x: c.x,
                        y: c.y,
                        z: c.z,
                    })),
                    createdAt: fp.createdAt,
                    updatedAt: fp.updatedAt,
                }));
                set({ faultPlanes, status: 'success' });
            } else {
                set({ status: 'error', error: result.error || 'Failed to fetch' });
            }
        } catch (error) {
            console.error('Error fetching fault planes:', error);
            set({ status: 'error', error: 'Network error' });
        }
    },

    createFaultPlane: async (projectId: string, data: CreateFaultPlaneData) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/fault-plane`, {
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
                const newFaultPlane: FaultPlane = {
                    id: result.data.id,
                    name: result.data.name,
                    type: result.data.type,
                    dipAngle: result.data.dipAngle,
                    dipDirection: result.data.dipDirection,
                    depth: result.data.depth,
                    color: result.data.color,
                    projectId: result.data.projectId,
                    coordinates: result.data.coordinates.map((c: any) => ({
                        x: c.x,
                        y: c.y,
                        z: c.z,
                    })),
                };
                set((state) => ({
                    faultPlanes: [newFaultPlane, ...state.faultPlanes],
                }));
                return newFaultPlane;
            }
            return null;
        } catch (error) {
            console.error('Error creating fault plane:', error);
            return null;
        }
    },

    updateFaultPlane: async (id: string, data: Partial<CreateFaultPlaneData>) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/fault-plane/${id}`, {
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
                const updatedFaultPlane: FaultPlane = {
                    id: result.data.id,
                    name: result.data.name,
                    type: result.data.type,
                    dipAngle: result.data.dipAngle,
                    dipDirection: result.data.dipDirection,
                    depth: result.data.depth,
                    color: result.data.color,
                    projectId: result.data.projectId,
                    coordinates: result.data.coordinates.map((c: any) => ({
                        x: c.x,
                        y: c.y,
                        z: c.z,
                    })),
                };
                set((state) => ({
                    faultPlanes: state.faultPlanes.map((fp) =>
                        fp.id === id ? updatedFaultPlane : fp
                    ),
                }));
                return updatedFaultPlane;
            }
            return null;
        } catch (error) {
            console.error('Error updating fault plane:', error);
            return null;
        }
    },

    deleteFaultPlane: async (id: string) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/fault-plane/${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
            });
            const result = await response.json();

            if (result.success) {
                set((state) => ({
                    faultPlanes: state.faultPlanes.filter((fp) => fp.id !== id),
                }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting fault plane:', error);
            return false;
        }
    },

    batchImport: async (projectId: string, data: FaultPlaneImportRow[]) => {
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${API_BASE}/api/fault-plane/batch-import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                credentials: 'include',
                body: JSON.stringify({ projectId, faultPlanes: data }),
            });
            const result = await response.json();

            if (result.success) {
                // 重新載入資料
                await get().fetchFaultPlanes(projectId);
                return { success: result.data.success, failed: result.data.failed };
            }
            return { success: 0, failed: data.length };
        } catch (error) {
            console.error('Error batch importing fault planes:', error);
            return { success: 0, failed: data.length };
        }
    },

    selectFault: (id: string | null) => {
        set({ selectedFaultId: id });
    },

    clearFaultPlanes: () => {
        set({ faultPlanes: [], selectedFaultId: null, status: 'idle', error: null });
    },
}));

export default useFaultPlaneStore;
