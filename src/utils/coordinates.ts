/**
 * TWD97 座標轉換工具
 * @module utils/coordinates
 * 
 * TWD97 (EPSG:3826) 是台灣常用的橫麥卡托投影座標系統
 * 本模組提供 TWD97 座標與 Three.js 世界座標的轉換
 */

// TWD97 中央經線參數 (場址區域中心)
const TWD97_ORIGIN = {
    x: 224000,  // 中央參考點 X (接近場址區域)
    y: 2429000, // 中央參考點 Y
};

// 座標縮放因子 (1單位 = 1公尺)
const SCALE_FACTOR = 1;

export interface TWD97Coordinate {
    x: number;  // 東距 (公尺)
    y: number;  // 北距 (公尺)
    z?: number; // 高程 (公尺)
}

export interface WorldCoordinate {
    x: number;  // Three.js X (東西向)
    y: number;  // Three.js Y (垂直向)
    z: number;  // Three.js Z (南北向)
}

/**
 * TWD97 座標轉 Three.js 世界座標
 * @param twd97 TWD97 座標
 * @returns Three.js 世界座標
 */
export function twd97ToWorld(twd97: TWD97Coordinate): WorldCoordinate {
    return {
        x: (twd97.x - TWD97_ORIGIN.x) * SCALE_FACTOR,
        y: (twd97.z ?? 0) * SCALE_FACTOR, // 高程映射到 Y 軸
        z: -(twd97.y - TWD97_ORIGIN.y) * SCALE_FACTOR, // 北距映射到 -Z (Three.js慣例)
    };
}

/**
 * Three.js 世界座標轉 TWD97 座標
 * @param world Three.js 世界座標
 * @returns TWD97 座標
 */
export function worldToTwd97(world: WorldCoordinate): TWD97Coordinate {
    return {
        x: world.x / SCALE_FACTOR + TWD97_ORIGIN.x,
        y: -world.z / SCALE_FACTOR + TWD97_ORIGIN.y,
        z: world.y / SCALE_FACTOR,
    };
}

/**
 * 計算兩個 TWD97 座標之間的距離 (公尺)
 */
export function twd97Distance(a: TWD97Coordinate, b: TWD97Coordinate): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = (b.z ?? 0) - (a.z ?? 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 批次轉換 TWD97 座標陣列
 */
export function batchTwd97ToWorld(coordinates: TWD97Coordinate[]): WorldCoordinate[] {
    return coordinates.map(twd97ToWorld);
}

/**
 * 設定新的座標原點 (用於不同專案區域)
 */
export function setOrigin(x: number, y: number): void {
    TWD97_ORIGIN.x = x;
    TWD97_ORIGIN.y = y;
}

/**
 * 取得當前座標原點
 */
export function getOrigin(): { x: number; y: number } {
    return { ...TWD97_ORIGIN };
}
