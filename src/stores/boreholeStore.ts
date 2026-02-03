/**
 * 鑽孔資料 Store
 * @module stores/boreholeStore
 */

import { create } from 'zustand';
import type { Borehole, BoreholeDetail } from '../types/geology';
import type { RequestStatus } from '../types/api';

interface BoreholeState {
    // 資料
    boreholes: Borehole[];
    selectedBorehole: BoreholeDetail | null;

    // 狀態
    status: RequestStatus;
    error: string | null;

    // 過濾
    filter: {
        area?: string;
        minDepth?: number;
        maxDepth?: number;
    };
}

interface BoreholeActions {
    fetchBoreholes: () => Promise<void>;
    selectBorehole: (id: string) => Promise<void>;
    clearSelection: () => void;
    setFilter: (filter: Partial<BoreholeState['filter']>) => void;
    setBoreholes: (boreholes: Borehole[]) => void;
}

// Mock 資料生成 (開發用)
const generateMockBoreholes = (count: number): Borehole[] => {
    const boreholes: Borehole[] = [];
    // TWD97 座標範圍 (與 coordinates.ts TWD97_ORIGIN 一致)
    const baseX = 250000;
    const baseY = 2600000;

    const LITHOLOGIES = [
        { code: 'CL', name: '黏土', color: '#8b4513' },
        { code: 'SM', name: '砂質粉土', color: '#c2b280' },
        { code: 'GP', name: '礫石', color: '#a0522d' },
        { code: 'SD', name: '砂岩', color: '#f4a460' },
        { code: 'SH', name: '頁岩', color: '#708090' },
    ];

    for (let i = 0; i < count; i++) {
        const totalDepth = 20 + Math.random() * 80;
        const layers = [];
        let currentDepth = 0;

        while (currentDepth < totalDepth) {
            const thickness = 2 + Math.random() * 10;
            const bottomDepth = Math.min(currentDepth + thickness, totalDepth);
            const lithology = LITHOLOGIES[Math.floor(Math.random() * LITHOLOGIES.length)];

            layers.push({
                id: `${i}-${layers.length}`,
                boreholeId: `BH-${String(i + 1).padStart(3, '0')}`,
                topDepth: currentDepth,
                bottomDepth: bottomDepth,
                lithologyCode: lithology.code,
                lithologyName: lithology.name,
                color: lithology.color,
            });

            currentDepth = bottomDepth;
        }

        boreholes.push({
            id: `BH-${String(i + 1).padStart(3, '0')}`,
            name: `鑽孔 ${i + 1}`,
            x: baseX + Math.random() * 5000 - 2500,
            y: baseY + Math.random() * 5000 - 2500,
            elevation: 100 + Math.random() * 200,
            totalDepth: totalDepth,
            area: ['A區', 'B區', 'C區'][Math.floor(Math.random() * 3)],
            layers: layers,
        });
    }
    return boreholes;
};

export const useBoreholeStore = create<BoreholeState & BoreholeActions>((set, get) => ({
    // 初始狀態
    boreholes: [],
    selectedBorehole: null,
    status: 'idle',
    error: null,
    filter: {},

    // Actions
    fetchBoreholes: async () => {
        set({ status: 'loading', error: null });

        try {
            // TODO: 替換為實際 API 呼叫
            // const response = await geologyApi.getBoreholes();

            // 開發階段使用 Mock 資料
            await new Promise(resolve => setTimeout(resolve, 500));
            const mockData = generateMockBoreholes(800);

            set({ boreholes: mockData, status: 'success' });
        } catch (error) {
            set({
                status: 'error',
                error: error instanceof Error ? error.message : '載入鑽孔資料失敗'
            });
        }
    },

    selectBorehole: async (id: string) => {
        const { boreholes } = get();
        const borehole = boreholes.find(b => b.id === id);

        if (!borehole) {
            set({ error: `找不到鑽孔 ${id}` });
            return;
        }

        set({ status: 'loading' });

        try {
            // TODO: 替換為實際 API 呼叫
            // const detail = await geologyApi.getBoreholeDetail(id);

            // Mock 詳細資料
            await new Promise(resolve => setTimeout(resolve, 200));
            const detail: BoreholeDetail = {
                ...borehole,
                layers: borehole.layers || [], // 使用現有的層位資料
                photos: [],
                properties: Array.from({ length: 10 }, (_, i) => ({
                    depth: i * (borehole.totalDepth / 10),
                    nValue: Math.floor(Math.random() * 50),
                    moisture: 10 + Math.random() * 30,
                })),
            };

            set({ selectedBorehole: detail, status: 'success' });
        } catch (error) {
            set({
                status: 'error',
                error: error instanceof Error ? error.message : '載入鑽孔詳細資料失敗'
            });
        }
    },

    clearSelection: () => {
        set({ selectedBorehole: null });
    },

    setFilter: (filter) => {
        set(state => ({ filter: { ...state.filter, ...filter } }));
    },

    setBoreholes: (boreholes) => {
        set({ boreholes, status: 'success' });
    },
}));
