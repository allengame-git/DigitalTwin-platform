/**
 * LOD 計算工具
 * @module utils/lod
 */

import { LOD_THRESHOLDS } from '../config/three';
import type { LODLevel } from '../types/viewer';

/**
 * 根據相機距離計算 LOD 層級
 * @param distance 相機到目標的距離 (公尺)
 * @returns LOD 層級
 */
export function calculateLODLevel(distance: number): LODLevel {
    if (distance > LOD_THRESHOLDS.ICON) {
        return 'icon';
    } else if (distance > LOD_THRESHOLDS.COLUMN) {
        return 'column';
    }
    return 'detail';
}

/**
 * 判斷是否需要更新 LOD
 * @param currentLevel 當前層級
 * @param newLevel 新層級
 * @returns 是否需要更新
 */
export function shouldUpdateLOD(currentLevel: LODLevel, newLevel: LODLevel): boolean {
    return currentLevel !== newLevel;
}

/**
 * 計算 LOD 過渡權重 (用於平滑過渡)
 * @param distance 相機距離
 * @param threshold 閾值
 * @param range 過渡範圍
 * @returns 0-1 的權重值
 */
export function calculateLODWeight(
    distance: number,
    threshold: number,
    range: number = 200
): number {
    if (distance >= threshold + range) return 0;
    if (distance <= threshold - range) return 1;
    return 1 - (distance - (threshold - range)) / (range * 2);
}

/**
 * 線性插值
 */
export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * Math.max(0, Math.min(1, t));
}

/**
 * 平滑步進函數 (smoothstep)
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

/**
 * 計算多個物件的 LOD 優先級 (用於批次處理)
 * @param distances 各物件到相機的距離陣列
 * @returns 按優先級排序的索引陣列 (近的優先)
 */
export function calculateLODPriority(distances: number[]): number[] {
    return distances
        .map((distance, index) => ({ distance, index }))
        .sort((a, b) => a.distance - b.distance)
        .map(item => item.index);
}

/**
 * 視錐體剔除輔助函數
 * @param position 物件位置 [x, y, z]
 * @param radius 物件半徑
 * @param frustum 視錐體 (由 Three.js Frustum 提供)
 * @returns 是否在視錐體內
 */
export function isInFrustum(
    position: [number, number, number],
    radius: number,
    frustum: { containsPoint: (point: { x: number; y: number; z: number }) => boolean }
): boolean {
    return frustum.containsPoint({
        x: position[0],
        y: position[1],
        z: position[2],
    });
}
