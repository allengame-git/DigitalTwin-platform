/**
 * Admin API
 *
 * API client for admin management endpoints.
 */

import type {
    AdminUser, CreateUserRequest, CreateUserResponse,
    AuditLogEntry, AuditLogFilters, PaginatedResponse, UserSession
} from '../types/auth';
import { useAuthStore } from '../stores/authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = useAuthStore.getState().accessToken;
    const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];

    const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
            ...(options.headers || {}),
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

export const fetchUsers = () => adminFetch<AdminUser[]>('/admin/users');

export const createUser = (data: CreateUserRequest) =>
    adminFetch<CreateUserResponse>('/admin/users', { method: 'POST', body: JSON.stringify(data) });

export const updateUser = (id: string, data: Partial<AdminUser>) =>
    adminFetch<AdminUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const resetPassword = (id: string) =>
    adminFetch<{ temporaryPassword: string }>(`/admin/users/${id}/reset-password`, { method: 'POST' });

export const unlockUser = (id: string) =>
    adminFetch<AdminUser>(`/admin/users/${id}/unlock`, { method: 'POST' });

export const disableUser = (id: string) =>
    adminFetch<void>(`/admin/users/${id}`, { method: 'DELETE' });

export const fetchUserSessions = (id: string) =>
    adminFetch<UserSession[]>(`/admin/users/${id}/sessions`);

export const revokeUserSessions = (id: string) =>
    adminFetch<void>(`/admin/users/${id}/sessions`, { method: 'DELETE' });

export const fetchAuditLogs = (filters: AuditLogFilters) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.action) params.set('action', filters.action);
    if (filters.userId) params.set('userId', filters.userId);
    return adminFetch<PaginatedResponse<AuditLogEntry>>(`/admin/audit-logs?${params}`);
};
