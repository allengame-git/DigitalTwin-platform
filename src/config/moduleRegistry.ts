/**
 * Module Type Registry
 * @module config/moduleRegistry
 *
 * 模組類型定義與元資料
 */

import { Layers, Building2, Ruler, Activity } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>;

export interface ModuleTypeConfig {
    label: string;
    icon: LucideIcon;
    description: string;
}

export const MODULE_TYPES: Record<string, ModuleTypeConfig> = {
    geology: { label: '地質資料', icon: Layers, description: '鑽孔、地質模型、斷層、地球物理等地質資料' },
    facility: { label: '設施導覽', icon: Building2, description: '3D 設施模型、場景與動畫導覽' },
    engineering: { label: '工程設計', icon: Ruler, description: '工程設計圖與 BIM 模型' },
    simulation: { label: '模擬分析', icon: Activity, description: '模擬分析與數據視覺化' },
};

export const getModuleTypeConfig = (type: string): ModuleTypeConfig | undefined =>
    MODULE_TYPES[type];

export const getAvailableModuleTypes = (): { type: string; config: ModuleTypeConfig }[] =>
    Object.entries(MODULE_TYPES).map(([type, config]) => ({ type, config }));
