/**
 * 岩性顏色設定
 * @module config/lithologyConfig
 * 
 * 統一定義岩性代碼、名稱與顏色
 * 供鑽孔柱狀圖與 3D 地質模型共用
 */

export interface LithologyDef {
    /** Voxel 資料中的 lith_id */
    id: number;
    /** 岩性代碼 (USCS) */
    code: string;
    /** 中文名稱 */
    name: string;
    /** 顏色 (Hex) */
    color: string;
}

/**
 * 岩性對照表
 * 依照 lith_id 排序
 */
export const LITHOLOGY_MAP: LithologyDef[] = [
    { id: 1, code: 'CL', name: '黏土', color: '#8b4513' },
    { id: 2, code: 'SM', name: '砂質粉土', color: '#c2b280' },
    { id: 3, code: 'GP', name: '礫石', color: '#a0522d' },
    { id: 4, code: 'SD', name: '砂岩', color: '#f4a460' },
    { id: 5, code: 'SH', name: '頁岩', color: '#708090' },
    { id: 6, code: 'ML', name: '粉土', color: '#d2b48c' },
    { id: 7, code: 'SC', name: '黏質砂土', color: '#deb887' },
    { id: 8, code: 'GW', name: '級配良好礫石', color: '#bc8f8f' },
    { id: 9, code: 'SW', name: '級配良好砂', color: '#f5deb3' },
    { id: 10, code: 'BR', name: '基岩', color: '#5a3e1b' },
];

/**
 * 依 lith_id 取得岩性定義
 */
export const getLithologyById = (id: number): LithologyDef | undefined =>
    LITHOLOGY_MAP.find(l => l.id === id);

/**
 * 依岩性代碼取得定義
 */
export const getLithologyByCode = (code: string): LithologyDef | undefined =>
    LITHOLOGY_MAP.find(l => l.code === code);

/**
 * 取得顏色 (Hex to Number for Three.js)
 */
export const getLithologyColorHex = (id: number): number => {
    const lith = getLithologyById(id);
    if (!lith) return 0x888888; // 預設灰色
    return parseInt(lith.color.replace('#', ''), 16);
};

/**
 * 所有岩性代碼 (供 select 使用)
 */
export const LITHOLOGY_CODES = LITHOLOGY_MAP.map(l => l.code);
