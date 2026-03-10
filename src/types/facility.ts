/**
 * 設施模組資料類型定義
 * @module types/facility
 */

export interface FacilityScene {
    id: string;
    projectId: string;
    parentSceneId: string | null;
    parentModelId: string | null;
    name: string;
    description: string | null;
    planImageUrl: string | null;
    autoPlanImageUrl: string | null;
    cameraPosition: { x: number; y: number; z: number } | null;
    cameraTarget: { x: number; y: number; z: number } | null;
    terrainCsvUrl: string | null;
    terrainHeightmapUrl: string | null;
    terrainTextureUrl: string | null;
    terrainTextureMode: 'satellite' | 'colorRamp' | null;
    terrainBounds: {
        minX: number; maxX: number;
        minY: number; maxY: number;
        minZ: number; maxZ: number;
    } | null;
    coordShiftX: number;
    coordShiftY: number;
    coordShiftZ: number;
    coordRotation: number;
    sortOrder: number;
    sceneBounds: { width: number; depth: number; height: number } | null;
    sceneType: 'lobby' | 'normal';
    createdAt: string;
    updatedAt: string;
    models?: FacilityModelSummary[];
}

export interface FacilityModelSummary {
    id: string;
    name: string;
}

export interface FacilityModel {
    id: string;
    sceneId: string;
    name: string;
    modelUrl: string;
    fileSize: number;
    introduction?: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    sortOrder: number;
    modelType: 'primary' | 'decorative';
    createdAt: string;
    updatedAt: string;
    infos: FacilityModelInfo[];
}

export interface FacilityModelInfo {
    id: string;
    modelId: string;
    type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'LINK';
    label: string;
    content: string;
    sortOrder: number;
    createdAt: string;
}

export interface AnimationKeyframe {
    time: number;                                  // 秒
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
    pathMode?: 'linear' | 'catmullrom';           // 到下一個 keyframe 的插值模式（覆蓋動畫預設）
}

export interface FacilityAnimation {
    id: string;
    modelId: string;
    name: string;
    type: 'keyframe' | 'gltf';
    trigger: 'auto' | 'manual';
    loop: boolean;
    duration: number;
    easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
    gltfClipName?: string;
    pathMode: 'linear' | 'catmullrom';
    autoOrient: boolean;
    keyframes: AnimationKeyframe[];
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface Transform {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
}

/** 動畫匯出 JSON 格式 (version 1) */
export interface AnimationExportData {
    name: string;
    type: 'keyframe';
    trigger: 'auto' | 'manual';
    loop: boolean;
    duration: number;
    easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
    pathMode: 'linear' | 'catmullrom';
    autoOrient: boolean;
    keyframes: AnimationKeyframe[];
}

export interface AnimationExportFile {
    version: 1;
    exportedAt: string;
    sourceModelName: string;
    type: 'single' | 'batch';
    animations: AnimationExportData[];
}
