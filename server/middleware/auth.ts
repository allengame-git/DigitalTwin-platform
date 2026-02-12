/**
 * Auth Middleware
 * 
 * JWT validation middleware for protected routes.
 * @see specs/4-user-roles-system/spec.md NFR-02
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
}

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

/**
 * Verify JWT token and attach user to request
 */
export function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: '未提供認證 Token' });
        return;
    }

    const token = authHeader.substring(7);

    try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = payload;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ message: 'Token 已過期，請重新登入' });
        } else if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ message: 'Token 無效' });
        } else {
            res.status(500).json({ message: '認證錯誤' });
        }
    }
}

/**
 * Check if user has required role(s)
 */
export function authorize(...allowedRoles: UserRole[]) {
    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): void => {
        if (!req.user) {
            res.status(401).json({ message: '未認證' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                message: '您沒有權限存取此功能',
                requiredRoles: allowedRoles,
                yourRole: req.user.role,
            });
            return;
        }

        next();
    };
}

/**
 * Optional authentication - attach user if token present, but don't require it
 */
export function optionalAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
    }

    const token = authHeader.substring(7);

    try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = payload;
    } catch {
        // Ignore invalid tokens for optional auth
    }

    next();
}

/**
 * Generate access token
 */
export function generateAccessToken(
    userId: string,
    email: string,
    role: UserRole
): string {
    return jwt.sign(
        { userId, email, role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
    userId: string,
    role: UserRole
): string {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
    const expiresIn = '7d';

    return jwt.sign(
        { userId, role, type: 'refresh' },
        refreshSecret,
        { expiresIn }
    );
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload | null {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

    try {
        return jwt.verify(token, refreshSecret) as JwtPayload;
    } catch {
        return null;
    }
}
