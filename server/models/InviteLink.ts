/**
 * InviteLink Model
 * 
 * Represents invite links for reviewer access.
 * @see specs/4-user-roles-system/spec.md FR-20
 */

import { UserRole } from './User';

export interface InviteLink {
    id: string;
    token: string;
    targetRole: Extract<UserRole, 'reviewer'>;
    expiresAt: Date;
    usedBy: string | null;
    usedAt: Date | null;
    createdAt: Date;
    createdBy: string;
}

export interface CreateInviteLinkDTO {
    expiresInHours?: number; // Default: 24 hours
}

export interface InviteLinkResponse {
    id: string;
    token: string;
    expiresAt: Date;
    isUsed: boolean;
    createdAt: Date;
}

/**
 * Generate invite link URL
 */
export function generateInviteUrl(token: string, baseUrl: string): string {
    return `${baseUrl}/invite/${token}`;
}
