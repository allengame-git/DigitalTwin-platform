/**
 * User Model
 * 
 * Represents a user in the DigitalTwin platform with role-based access control.
 * @see specs/4-user-roles-system/spec.md
 */

export type UserRole = 'engineer' | 'reviewer' | 'public' | 'admin';

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    createdAt: Date;
    lastLoginAt: Date | null;
}

export interface CreateUserDTO {
    email: string;
    password: string;
    name: string;
    role: UserRole;
}

export interface UserResponse {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: Date;
    lastLoginAt: Date | null;
}

/**
 * Convert User to safe response (no password hash)
 */
export function toUserResponse(user: User): UserResponse {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
    };
}
