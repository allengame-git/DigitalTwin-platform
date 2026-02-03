import { create } from 'zustand';

interface PerformanceState {
    fps: number;
    memory: number; // in MB
    drawCalls: number;
    triangles: number;
    updateStats: (stats: Partial<Omit<PerformanceState, 'updateStats'>>) => void;
}

export const usePerformanceStore = create<PerformanceState>((set) => ({
    fps: 0,
    memory: 0,
    drawCalls: 0,
    triangles: 0,
    updateStats: (stats) => set((state) => ({ ...state, ...stats })),
}));
