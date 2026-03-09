/**
 * Auth API
 * 
 * API client for authentication endpoints.
 * @see specs/4-user-roles-system/contracts/auth-api.yaml
 */

import type {
    LoginCredentials,
    LoginResponse,
    RefreshResponse,
    User
} from '../types/auth';
import { useAuthStore } from '../stores/authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * HTTP client with default options
 */
async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
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

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    return fetchApi<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
}

/**
 * Logout and invalidate refresh token
 */
export async function logout(): Promise<void> {
    await fetchApi<void>('/auth/logout', {
        method: 'POST',
    });
}

/**
 * Refresh access token using httpOnly cookie
 */
export async function refresh(): Promise<RefreshResponse> {
    return fetchApi<RefreshResponse>('/auth/refresh', {
        method: 'POST',
    });
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(token?: string): Promise<User> {
    const headers = token ? getAuthHeader(token) : {};
    return fetchApi<User>('/auth/me', { headers });
}

/**
 * Validate invite link and get session
 */
export async function validateInvite(token: string): Promise<LoginResponse> {
    return fetchApi<LoginResponse>('/invite/validate', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
}

/**
 * Change password
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword }),
    });
}

/**
 * Set authorization header for authenticated requests
 */
export function getAuthHeader(accessToken: string): Record<string, string> {
    return {
        Authorization: `Bearer ${accessToken}`,
    };
}
