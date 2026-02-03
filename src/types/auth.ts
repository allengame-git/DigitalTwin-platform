/**
 * Auth Types
 * 
 * Frontend type definitions for authentication and authorization.
 * @see specs/4-user-roles-system/spec.md
 */

export type UserRole = 'engineer' | 'reviewer' | 'public' | 'admin';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
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
}

export interface RefreshResponse {
    accessToken: string;
    expiresIn: number;
}

/**
 * Session timeout configuration by role (in milliseconds)
 */
export const SESSION_TIMEOUT: Record<Exclude<UserRole, 'public'>, number> = {
    engineer: 8 * 60 * 60 * 1000,  // 8 hours
    reviewer: 1 * 60 * 60 * 1000,  // 1 hour
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
