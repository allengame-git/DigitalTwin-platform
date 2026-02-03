/**
 * Annotation API
 * 
 * API client for annotation endpoints.
 * @see specs/4-user-roles-system/spec.md FR-10, FR-11
 */

import type {
    Annotation,
    CreateAnnotationDTO,
    UpdateAnnotationDTO,
    AnnotationListResponse
} from '../types/annotation';
import { useAuthStore } from '../stores/authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * HTTP client with auth header
 */
async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const accessToken = useAuthStore.getState().accessToken;

    const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...options.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Get annotations for a project
 */
export async function getAnnotations(projectId: string): Promise<AnnotationListResponse> {
    return fetchApi<AnnotationListResponse>(`/annotations?projectId=${projectId}`);
}

/**
 * Create a new annotation
 */
export async function createAnnotation(data: CreateAnnotationDTO): Promise<Annotation> {
    return fetchApi<Annotation>('/annotations', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Update an annotation
 */
export async function updateAnnotation(
    id: string,
    data: UpdateAnnotationDTO
): Promise<Annotation> {
    return fetchApi<Annotation>(`/annotations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

/**
 * Delete an annotation
 */
export async function deleteAnnotation(id: string): Promise<void> {
    await fetchApi<void>(`/annotations/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Get a single annotation by ID
 */
export async function getAnnotation(id: string): Promise<Annotation> {
    return fetchApi<Annotation>(`/annotations/${id}`);
}
