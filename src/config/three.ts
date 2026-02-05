/**
 * Three.js 全域設定
 * @module config/three
 */

import * as THREE from 'three';

// 預設相機設定
export const DEFAULT_CAMERA_CONFIG = {
    fov: 45,
    near: 0.1,
    far: 50000, // 50km 可視範圍 (TWD97 Local 座標)
    position: [0, 500, 1000] as const, // 初始相機位置
};

// LOD 距離閾值 (TWD97 公尺)
export const LOD_THRESHOLDS = {
    ICON: 2000,    // > 2km 顯示圓點
    COLUMN: 500,   // < 500m 顯示完整柱狀圖
    DETAIL: 100,   // < 100m 顯示詳細紋理
} as const;

// 渲染器設定
export const RENDERER_CONFIG = {
    antialias: true,
    alpha: false,
    stencil: true, // 啟用 Stencil Buffer (用於剖面填充)
    powerPreference: 'high-performance' as const,
    logarithmicDepthBuffer: true, // 避免 z-fighting
};

// 顏色常數
export const GEOLOGY_COLORS = {
    // 岩性顏色
    SANDSTONE: new THREE.Color(0xc2b280),
    SHALE: new THREE.Color(0x808080),
    LIMESTONE: new THREE.Color(0xf5f5dc),
    GRANITE: new THREE.Color(0xffc0cb),
    CLAY: new THREE.Color(0x8b4513),
    GRAVEL: new THREE.Color(0xa0522d),

    // UI 顏色
    HIGHLIGHT: new THREE.Color(0x00ff00),
    SELECTED: new THREE.Color(0xff6600),
} as const;

// InstancedMesh 設定
export const INSTANCED_MESH_CONFIG = {
    MAX_BOREHOLES: 1000,  // 最大鑽孔數量
    DEFAULT_RADIUS: 5,    // 預設半徑 (公尺)
    DEFAULT_HEIGHT: 100,  // 預設高度 (公尺)
} as const;
