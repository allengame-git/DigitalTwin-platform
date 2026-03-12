// src/types/review.ts

export type ReviewStatus = 'draft' | 'active' | 'concluded';
export type MarkerStatus = 'open' | 'in_progress' | 'resolved';
export type MarkerPriority = 'low' | 'medium' | 'high';

export interface ReviewSession {
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    status: ReviewStatus;
    conclusion: string | null;
    scheduledAt: string | null;
    concludedAt: string | null;
    pdfUrl: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    markers?: ReviewMarker[];
    participants?: ReviewParticipant[];
    _count?: { markers: number };
}

export interface ReviewParticipant {
    id: string;
    sessionId: string;
    userId: string;
    role: string;
    joinedAt: string;
    user?: { id: string; name: string; email: string };
}

export interface ReviewMarker {
    id: string;
    sessionId: string;
    moduleId: string;
    title: string;
    description: string | null;
    status: MarkerStatus;
    priority: MarkerPriority;
    positionX: number;
    positionY: number;
    positionZ: number;
    cameraPositionX: number;
    cameraPositionY: number;
    cameraPositionZ: number;
    cameraTargetX: number;
    cameraTargetY: number;
    cameraTargetZ: number;
    screenshotUrl: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    comments?: ReviewComment[];
    module?: { id: string; type: string; name: string };
}

export interface ReviewComment {
    id: string;
    markerId: string;
    content: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    user?: { id: string; name: string };
}

export interface MarkerStats {
    open: number;
    in_progress: number;
    resolved: number;
    total: number;
}

export interface ReviewSessionWithStats extends ReviewSession {
    markerStats?: MarkerStats;
    participantNames?: string[];
}

// DTOs
export interface CreateSessionDTO {
    projectId: string;
    title: string;
    description?: string;
    scheduledAt?: string;
}

export interface UpdateSessionDTO {
    title?: string;
    description?: string;
    status?: ReviewStatus;
    conclusion?: string;
}

export interface CreateMarkerDTO {
    moduleId: string;
    title: string;
    description?: string;
    priority?: MarkerPriority;
    positionX: number;
    positionY: number;
    positionZ: number;
    cameraPositionX: number;
    cameraPositionY: number;
    cameraPositionZ: number;
    cameraTargetX: number;
    cameraTargetY: number;
    cameraTargetZ: number;
}

export interface UpdateMarkerDTO {
    title?: string;
    description?: string;
    status?: MarkerStatus;
    priority?: MarkerPriority;
}
