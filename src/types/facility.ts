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
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    sortOrder: number;
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

export interface Transform {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
}
