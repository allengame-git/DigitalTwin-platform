/**
 * Auth Routes
 * 
 * Authentication endpoints: login, logout, refresh.
 * @see specs/4-user-roles-system/contracts/auth-api.yaml
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
    authenticate,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    AuthenticatedRequest
} from '../middleware/auth';
import { SESSION_TIMEOUT } from '../models/Session';
import { UserRole } from '../models/User';

const router = Router();

// Simulated user store (replace with database in production)
const users = new Map<string, {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
}>();

// Simulated session store (replace with database in production)
const sessions = new Map<string, {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
}>();

// Add demo users synchronously to ensure they exist on server start
const engineerHash = bcrypt.hashSync('engineer123', 10);
const reviewerHash = bcrypt.hashSync('reviewer123', 10);
const adminHash = bcrypt.hashSync('admin123', 10);

users.set('engineer@example.com', {
    id: '1',
    email: 'engineer@example.com',
    passwordHash: engineerHash,
    name: '工程師 Demo',
    role: 'engineer',
});

users.set('reviewer@example.com', {
    id: '2',
    email: 'reviewer@example.com',
    passwordHash: reviewerHash,
    name: '審查委員 Demo',
    role: 'reviewer',
});

users.set('admin@example.com', {
    id: '3',
    email: 'admin@example.com',
    passwordHash: adminHash,
    name: '管理員 Demo',
    role: 'admin',
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: '請提供 email 和密碼' });
            return;
        }

        const user = users.get(email);
        if (!user) {
            res.status(401).json({ message: '帳號或密碼錯誤' });
            return;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            res.status(401).json({ message: '帳號或密碼錯誤' });
            return;
        }

        const accessToken = generateAccessToken(user.id, user.email, user.role);
        const refreshToken = generateRefreshToken(user.id, user.role);

        // Store session
        const expiresAt = new Date(Date.now() + SESSION_TIMEOUT[user.role as Exclude<UserRole, 'public'>]);
        sessions.set(user.id, {
            userId: user.id,
            refreshToken,
            expiresAt,
        });

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: SESSION_TIMEOUT[user.role as Exclude<UserRole, 'public'>],
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
            },
            tokens: {
                accessToken,
                expiresIn: 24 * 60 * 60 * 1000, // 24 hours in ms
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: '登入失敗' });
    }
});

/**
 * POST /auth/logout
 * Logout and invalidate refresh token
 */
router.post('/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
    if (req.user) {
        sessions.delete(req.user.userId);
    }

    res.clearCookie('refreshToken');
    res.json({ message: '已登出' });
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token cookie
 */
router.post('/refresh', (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        res.status(401).json({ message: '未提供 Refresh Token' });
        return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
        res.status(401).json({ message: 'Refresh Token 無效或已過期' });
        return;
    }

    // Verify session exists and is valid
    const session = sessions.get(payload.userId);
    if (!session || session.refreshToken !== refreshToken || session.expiresAt < new Date()) {
        res.status(401).json({ message: 'Session 已失效，請重新登入' });
        return;
    }

    // Find user to get current email
    let userEmail = '';
    for (const [email, user] of users) {
        if (user.id === payload.userId) {
            userEmail = email;
            break;
        }
    }

    const accessToken = generateAccessToken(payload.userId, userEmail, payload.role);

    res.json({
        accessToken,
        expiresIn: 15 * 60 * 1000,
    });
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: '未認證' });
        return;
    }

    // Find user details
    let foundUser = null;
    for (const user of users.values()) {
        if (user.id === req.user.userId) {
            foundUser = user;
            break;
        }
    }

    if (!foundUser) {
        res.status(404).json({ message: '使用者不存在' });
        return;
    }

    res.json({
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
    });
});

export default router;
