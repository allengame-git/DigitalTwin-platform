/**
 * 地質資料 API
 * @module api/geology
 */

import { apiClient } from './client';
import type { Borehole, BoreholeDetail, Structure, Attitude } from '../types/geology';
import type { PaginatedResponse, GeoJSONResponse } from '../types/api';

export interface GetBoreholesParams {
    page?: number;
    pageSize?: number;
    area?: string;
    minDepth?: number;
    maxDepth?: number;
}

export const geologyApi = {
    /**
     * 取得鑽孔列表
     */
    getBoreholes: (params?: GetBoreholesParams): Promise<PaginatedResponse<Borehole>> => {
        return apiClient.get('/geology/boreholes', params as Record<string, string | number | boolean>);
    },

    /**
     * 取得鑽孔詳細資料
     */
    getBoreholeDetail: (id: string): Promise<BoreholeDetail> => {
        return apiClient.get(`/geology/boreholes/${id}`);
    },

    /**
     * 取得鑽孔 GeoJSON (用於地圖顯示)
     */
    getBoreholesGeoJSON: (): Promise<GeoJSONResponse> => {
        return apiClient.get('/geology/boreholes/geojson');
    },

    /**
     * 取得地質構造線
     */
    getStructures: (): Promise<Structure[]> => {
        return apiClient.get('/geology/structures');
    },

    /**
     * 取得位態資料
     */
    getAttitudes: (): Promise<Attitude[]> => {
        return apiClient.get('/geology/attitudes');
    },

    /**
     * 取得 3D 地質模型 Tileset URL
     */
    getGeologyTilesetUrl: (): Promise<{ url: string }> => {
        return apiClient.get('/geology/tileset');
    },
};

export default geologyApi;
