/**
 * Session Model
 * 
 * Tracks active user sessions and refresh tokens.
 * @see specs/4-user-roles-system/spec.md FR-21
 */

import { UserRole } from './User';

/**
 * Session timeout configuration by role (in milliseconds)
 */
export const SESSION_TIMEOUT: Record<Exclude<UserRole, 'public'>, number> = {
    engineer: 8 * 60 * 60 * 1000,  // 8 hours
    reviewer: 1 * 60 * 60 * 1000,  // 1 hour
    admin: 8 * 60 * 60 * 1000,     // 8 hours
};

/**
 * Access token TTL (15 minutes for all roles)
 */
export const ACCESS_TOKEN_TTL = 15 * 60 * 1000;

export interface Session {
    id: string;
    userId: string;
    refreshToken: string;
    userAgent: string;
    ipAddress: string;
    expiresAt: Date;
    createdAt: Date;
    lastActivityAt: Date;
    isRevoked: boolean;
}

export interface CreateSessionDTO {
    userId: string;
    refreshToken: string;
    userAgent: string;
    ipAddress: string;
    expiresAt: Date;
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: Session): boolean {
    return new Date() > session.expiresAt || session.isRevoked;
}

/**
 * Get session expiry date based on role
 */
export function getSessionExpiry(role: Exclude<UserRole, 'public'>): Date {
    return new Date(Date.now() + SESSION_TIMEOUT[role]);
}
