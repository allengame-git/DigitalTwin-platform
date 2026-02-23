/**
 * 3D 檢視器類型定義
 * @module types/viewer
 */

import type { Camera } from 'three';

/** 相機狀態 */
export interface CameraState {
    /** 相機位置 [x, y, z] */
    position: [number, number, number];
    /** 觀察目標 [x, y, z] */
    target: [number, number, number];
    /** 縮放層級 */
    zoom: number;
}

/** LOD 層級 */
export type LODLevel = 'icon' | 'column' | 'detail';

/** 檢視器設定 */
export interface ViewerConfig {
    /** 當前 LOD 層級 */
    lodLevel: LODLevel;
    /** 是否啟用環境光遮蔽 */
    enableAO: boolean;
    /** 是否啟用陰影 */
    enableShadows: boolean;
    /** 背景顏色 */
    backgroundColor: string;
    /** 是否自動調整 LOD */
    autoLOD: boolean;
    /** 是否顯示位態標籤 */
    showAttitudeLabels: boolean;
    /** 是否啟用霧氣效果 */
    showFog: boolean;
}

/** 切片面設定 */
export interface ClippingPlaneConfig {
    /** 是否啟用 */
    enabled: boolean;
    /** 法向量 [x, y, z] */
    normal: [number, number, number];
    /** 距離原點距離 */
    constant: number;
}

/** 多剖面切割設定 */
export interface MultiSectionConfig {
    /** 是否啟用 */
    enabled: boolean;
    /** 切割軸向 */
    axis: 'x' | 'y';
    /** 剖面數量 (1-10) */
    count: number;
    /** 剖面間距 (公尺) */
    spacing: number;
    /** 間隙寬度 (公尺) - 用於顯示內部剖面 */
    gapWidth: number;
    /** 起始位置 (公尺) */
    startPosition: number;
}

/** 檢視器狀態 (Zustand store 用) */
export interface ViewerState {
    camera: CameraState;
    config: ViewerConfig;
    clippingPlane: ClippingPlaneConfig;
    multiSection: MultiSectionConfig;
    /** 是否正在載入 */
    isLoading: boolean;
    /** 載入進度 (0-100) */
    loadingProgress: number;
}

/** 檢視器 Actions */
export interface ViewerActions {
    setCameraState: (camera: Partial<CameraState>) => void;
    setConfig: (config: Partial<ViewerConfig>) => void;
    setLODLevel: (level: LODLevel) => void;
    setClippingPlane: (plane: Partial<ClippingPlaneConfig>) => void;
    setMultiSection: (section: Partial<MultiSectionConfig>) => void;
    setLoading: (isLoading: boolean, progress?: number) => void;
    resetCamera: () => void;
}

/** 擴展的 Three.js Camera 參考 */
export interface CameraRef {
    camera: Camera | null;
    updateCamera: (state: Partial<CameraState>) => void;
}

