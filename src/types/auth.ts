/**
 * Auth Types
 * 
 * Frontend type definitions for authentication and authorization.
 * @see specs/4-user-roles-system/spec.md
 */

export type UserRole = 'engineer' | 'viewer' | 'public' | 'admin';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status?: 'active' | 'locked' | 'disabled' | 'pending_reset';
    mustChangePassword?: boolean;
    createdAt: string;
    lastLoginAt: string | null;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthTokens {
    accessToken: string;
    expiresIn: number;
}

export interface LoginResponse {
    user: User;
    tokens: AuthTokens;
    csrfToken?: string;
}

export interface RefreshResponse {
    accessToken: string;
    expiresIn: number;
}

export type AccountStatus = 'active' | 'locked' | 'disabled' | 'pending_reset';

export interface AdminUser extends User {
    status: AccountStatus;
    activeSessions: number;
    failedLoginCount: number;
    updatedAt: string;
}

export interface CreateUserRequest {
    email: string;
    name: string;
    role: UserRole;
}

export interface CreateUserResponse {
    user: AdminUser;
    temporaryPassword: string;
}

export interface AuditLogEntry {
    id: string;
    userId: string | null;
    action: string;
    ipAddress: string | null;
    userAgent: string | null;
    details: Record<string, unknown> | null;
    createdAt: string;
    user?: { name: string; email: string } | null;
}

export interface AuditLogFilters {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    action?: string;
    userId?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export interface UserSession {
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
    lastActivityAt: string;
    expiresAt: string;
}

/**
 * Session timeout configuration by role (in milliseconds)
 */
export const SESSION_TIMEOUT: Record<Exclude<UserRole, 'public'>, number> = {
    engineer: 8 * 60 * 60 * 1000,  // 8 hours
    viewer: 1 * 60 * 60 * 1000,  // 1 hour
    admin: 8 * 60 * 60 * 1000,     // 8 hours
};

/**
 * Access token TTL (15 minutes)
 */
export const ACCESS_TOKEN_TTL = 15 * 60 * 1000;

/**
 * Session warning threshold (5 minutes before expiry)
 */
export const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000;
