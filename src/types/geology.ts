/**
 * 地質資料類型定義
 * @module types/geology
 */

/** 鑽孔基本資訊 */
export interface Borehole {
    id: string;
    /** 鑽孔編號 (e.g. BH-001) */
    boreholeNo: string;
    name: string;
    /** TWD97 X 座標 (公尺) */
    x: number;
    /** TWD97 Y 座標 (公尺) */
    y: number;
    /** 孔口高程 (公尺) */
    elevation: number;
    /** 總深度 (公尺) */
    totalDepth: number;
    /** 鑽探日期 */
    drilledDate?: string;
    /** 所屬區域 */
    area?: string;
    /** 鑽探單位 */
    contractor?: string;
    /** 描述/備註 */
    description?: string;
    /** 簡易層位資料 (用於 3D 顯示) */
    layers?: Layer[];
    /** 物性資料 */
    properties?: PropertyData[];
}

/** 地層資訊 */
export interface Layer {
    id: string;
    boreholeId: string;
    /** 頂深 (公尺) */
    topDepth: number;
    /** 底深 (公尺) */
    bottomDepth: number;
    /** 岩性代碼 */
    lithologyCode: string;
    /** 岩性名稱 */
    lithologyName: string;
    /** 顏色 (hex) */
    color: string;
    /** 描述 */
    description?: string;
}

/** 岩芯照片 */
export interface Photo {
    id: string;
    boreholeId: string;
    /** 對應深度 (公尺) */
    depth: number;
    /** 圖片 URL */
    url: string;
    /** 縮圖 URL */
    thumbnailUrl?: string;
    /** 備註 */
    caption?: string;
}

/** 物性數據 */
export interface PropertyData {
    depth: number;
    /** N 值 (SPT) */
    nValue?: number;
    /** RQD (%) */
    rqd?: number;
    /** 含水量 (%) */
    moisture?: number;
    /** 單位重 (kN/m³) */
    unitWeight?: number;
    /** 不排水剪力強度 (kPa) */
    su?: number;
}

/** 鑽孔詳細資料 (包含地層、照片、物性) */
export interface BoreholeDetail extends Borehole {
    layers: Layer[];
    photos: Photo[];
    properties: PropertyData[];
}

/** 地質構造線 */
export interface Structure {
    id: string;
    type: 'fault' | 'fold' | 'contact';
    name: string;
    /** 座標點序列 [[x, y, z], ...] */
    coordinates: [number, number, number][];
    /** 屬性 */
    properties?: Record<string, unknown>;
}

/** 位態資料 (Strike/Dip) */
export interface Attitude {
    id: string;
    x: number;
    y: number;
    z: number;
    /** 走向角度 (0-360) */
    strike: number;
    /** 傾角 (0-90) */
    dip: number;
    /** 傾向 */
    dipDirection: string;
}
