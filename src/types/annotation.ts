/**
 * Annotation Types
 * 
 * Frontend type definitions for review annotations.
 * @see specs/4-user-roles-system/spec.md FR-10, FR-11
 */

export type AnnotationType = 'text' | 'arrow' | 'region';

export interface Position3D {
    x: number;
    y: number;
    z: number;
}

export interface CameraState {
    position: Position3D;
    heading: number;
    pitch: number;
    roll: number;
}

export interface Annotation {
    id: string;
    userId: string;
    userName: string;
    projectId: string;
    type: AnnotationType;
    content: string;
    position: Position3D;
    cameraState: CameraState;
    createdAt: string;
    updatedAt: string;
    isResolved: boolean;
}

export interface CreateAnnotationDTO {
    projectId: string;
    type: AnnotationType;
    content: string;
    position: Position3D;
    cameraState: CameraState;
}

export interface UpdateAnnotationDTO {
    content?: string;
    isResolved?: boolean;
}

export interface AnnotationListResponse {
    annotations: Annotation[];
    total: number;
}
