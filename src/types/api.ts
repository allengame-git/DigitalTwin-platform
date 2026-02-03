/**
 * API 回應類型定義
 * @module types/api
 */

/** 分頁回應 */
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

/** GeoJSON Feature */
export interface GeoJSONFeature<P = Record<string, unknown>> {
    type: 'Feature';
    geometry: {
        type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
        coordinates: number[] | number[][] | number[][][];
    };
    properties: P;
}

/** GeoJSON FeatureCollection */
export interface GeoJSONResponse<P = Record<string, unknown>> {
    type: 'FeatureCollection';
    features: GeoJSONFeature<P>[];
}

/** API 錯誤回應 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

/** API 通用回應包裝 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

/** 請求狀態 */
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

/** 非同步狀態包裝 */
export interface AsyncState<T> {
    status: RequestStatus;
    data: T | null;
    error: ApiError | null;
}
