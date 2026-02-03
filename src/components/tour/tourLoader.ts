/**
 * Tour Loader
 * @module components/tour/tourLoader
 * 
 * 導覽配置載入器
 * Task: T044
 */

export interface TourStep {
    id: string;
    title: string;
    description: string;
    cameraPosition: {
        x: number;
        y: number;
        z: number;
    };
    cameraTarget?: {
        x: number;
        y: number;
        z: number;
    };
    duration: number; // 顯示秒數
    highlightEntities?: string[];
}

export interface TourConfig {
    id: string;
    name: string;
    description: string;
    steps: TourStep[];
}

/**
 * 載入導覽配置
 */
export async function loadTourConfig(tourPath: string): Promise<TourConfig> {
    try {
        const response = await fetch(tourPath);
        if (!response.ok) {
            throw new Error(`Failed to load tour: ${response.statusText}`);
        }
        const config: TourConfig = await response.json();

        // 驗證配置
        validateTourConfig(config);

        return config;
    } catch (error) {
        console.error('Tour loading error:', error);
        throw error;
    }
}

/**
 * 驗證導覽配置
 */
function validateTourConfig(config: TourConfig): void {
    if (!config.id || typeof config.id !== 'string') {
        throw new Error('Tour config must have a valid id');
    }
    if (!config.name || typeof config.name !== 'string') {
        throw new Error('Tour config must have a valid name');
    }
    if (!Array.isArray(config.steps) || config.steps.length === 0) {
        throw new Error('Tour config must have at least one step');
    }

    config.steps.forEach((step, index) => {
        if (!step.id) {
            throw new Error(`Step ${index} must have an id`);
        }
        if (!step.cameraPosition) {
            throw new Error(`Step ${step.id} must have cameraPosition`);
        }
        if (typeof step.duration !== 'number' || step.duration <= 0) {
            throw new Error(`Step ${step.id} must have a positive duration`);
        }
    });
}

/**
 * 預設導覽配置 (開發用)
 */
export const DEFAULT_TOUR_CONFIG: TourConfig = {
    id: 'default-geology-tour',
    name: '地質導覽',
    description: '了解本區域的地質特徵',
    steps: [
        {
            id: 'overview',
            title: '區域概覽',
            description: '這是研究區域的全景視角，可以看到所有鑽孔點位的分佈。',
            cameraPosition: { x: 0, y: 800, z: 1200 },
            cameraTarget: { x: 0, y: 0, z: 0 },
            duration: 5,
        },
        {
            id: 'borehole-cluster',
            title: '鑽孔群集',
            description: '這裡是主要的鑽孔密集區，提供了詳細的地層資訊。',
            cameraPosition: { x: 200, y: 300, z: 400 },
            cameraTarget: { x: 100, y: 0, z: 100 },
            duration: 5,
        },
        {
            id: 'fault-zone',
            title: '斷層帶',
            description: '紅色線條標示的是區域內的主要斷層構造。',
            cameraPosition: { x: -100, y: 200, z: 300 },
            cameraTarget: { x: 0, y: -50, z: 0 },
            duration: 5,
        },
    ],
};
