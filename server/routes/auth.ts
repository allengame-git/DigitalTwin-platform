import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import {
    authenticate,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    AuthenticatedRequest
} from '../middleware/auth';
import { loginRateLimit, passwordRateLimit } from '../middleware/rateLimit';
import { setCsrfToken } from '../middleware/csrf';
import { writeAuditLog } from '../lib/auditLog';
import { validatePassword } from '../lib/passwordPolicy';

const router = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SESSIONS = 3;

// Session timeout by role (ms)
const SESSION_TIMEOUT: Record<string, number> = {
    engineer: 8 * 60 * 60 * 1000,
    reviewer: 1 * 60 * 60 * 1000,
    admin: 8 * 60 * 60 * 1000,
};

function getClientInfo(req: Request) {
    return {
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
    };
}

/**
 * POST /auth/login
 */
router.post('/login', loginRateLimit, async (req: Request, res: Response) => {
    const { email: identifier, password } = req.body;
    const client = getClientInfo(req);

    if (!identifier || !password) {
        res.status(400).json({ message: '請提供帳號和密碼' });
        return;
    }

    try {
        // 支援 email 或使用者名稱登入
        const isEmail = identifier.includes('@');
        const user = isEmail
            ? await prisma.user.findUnique({ where: { email: identifier } })
            : await prisma.user.findFirst({ where: { name: identifier } });

        if (!user) {
            await writeAuditLog({
                action: 'LOGIN_FAILED',
                ...client,
                details: { attemptedIdentifier: identifier, reason: 'user_not_found' },
            });
            res.status(401).json({ message: '帳號或密碼錯誤' });
            return;
        }

        // 檢查帳號狀態
        if (user.status === 'disabled') {
            await writeAuditLog({
                userId: user.id, action: 'LOGIN_FAILED', ...client,
                details: { reason: 'account_disabled' },
            });
            res.status(403).json({ message: '帳號已停用，請聯繫管理員' });
            return;
        }

        // 自動解鎖檢查
        if (user.status === 'locked') {
            if (user.lockedUntil && user.lockedUntil > new Date()) {
                const remainingSec = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
                res.status(423).json({
                    message: `帳號已鎖定，請 ${remainingSec} 秒後再試`,
                    lockedUntil: user.lockedUntil.toISOString(),
                    remainingSeconds: remainingSec,
                });
                return;
            }
            // 鎖定時間已過，自動解鎖
            await prisma.user.update({
                where: { id: user.id },
                data: { status: 'active', failedLoginCount: 0, lockedUntil: null },
            });
        }

        // 驗證密碼
        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
            const newCount = user.failedLoginCount + 1;
            const updateData: Record<string, unknown> = { failedLoginCount: newCount };

            if (newCount >= MAX_FAILED_ATTEMPTS) {
                updateData.status = 'locked';
                updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            }

            await prisma.user.update({ where: { id: user.id }, data: updateData });
            await writeAuditLog({
                userId: user.id, action: 'LOGIN_FAILED', ...client,
                details: { reason: 'wrong_password', failedCount: newCount },
            });

            const remaining = MAX_FAILED_ATTEMPTS - newCount;
            const msg = remaining > 0
                ? `帳號或密碼錯誤（還有 ${remaining} 次嘗試機會）`
                : '登入失敗次數過多，帳號已鎖定 15 分鐘';
            res.status(401).json({ message: msg });
            return;
        }

        // ── 登入成功 ──

        // 重置失敗計數
        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginCount: 0,
                lockedUntil: null,
                status: 'active',
                lastLoginAt: new Date(),
            },
        });

        // Session 併發控制：最多 MAX_SESSIONS 個
        const activeSessions = await prisma.session.findMany({
            where: { userId: user.id, isRevoked: false, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'asc' },
        });

        if (activeSessions.length >= MAX_SESSIONS) {
            const toRevoke = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS + 1);
            await prisma.session.updateMany({
                where: { id: { in: toRevoke.map(s => s.id) } },
                data: { isRevoked: true },
            });
            for (const s of toRevoke) {
                await writeAuditLog({
                    userId: user.id, action: 'SESSION_REVOKED', ...client,
                    details: { revokedSessionId: s.id, reason: 'max_sessions_exceeded' },
                });
            }
        }

        // 建立 token
        const accessToken = generateAccessToken(user.id, user.email, user.role);
        const refreshToken = generateRefreshToken(user.id, user.role);

        // 建立 Session record
        const sessionTimeout = SESSION_TIMEOUT[user.role] || SESSION_TIMEOUT.engineer;
        await prisma.session.create({
            data: {
                userId: user.id,
                refreshToken,
                userAgent: client.userAgent,
                ipAddress: client.ipAddress,
                expiresAt: new Date(Date.now() + sessionTimeout),
            },
        });

        // CSRF token
        const csrfToken = setCsrfToken(res);

        // Audit log
        await writeAuditLog({ userId: user.id, action: 'LOGIN_SUCCESS', ...client });

        // Set refresh token cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: sessionTimeout,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                mustChangePassword: user.mustChangePassword,
                createdAt: user.createdAt.toISOString(),
                lastLoginAt: new Date().toISOString(),
            },
            tokens: {
                accessToken,
                expiresIn: 24 * 60 * 60 * 1000,
            },
            csrfToken,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: '登入失敗' });
    }
});

/**
 * POST /auth/logout
 */
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const client = getClientInfo(req);
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
        await prisma.session.updateMany({
            where: { refreshToken },
            data: { isRevoked: true },
        });
    }

    if (req.user) {
        await writeAuditLog({ userId: req.user.userId, action: 'LOGOUT', ...client });
    }

    res.clearCookie('refreshToken');
    res.clearCookie('csrf-token');
    res.json({ message: '已登出' });
});

/**
 * POST /auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
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

    // 查 Session
    const session = await prisma.session.findUnique({ where: { refreshToken } });
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
        res.status(401).json({ message: 'Session 已失效，請重新登入' });
        return;
    }

    // 查 User
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status === 'disabled') {
        res.status(401).json({ message: '帳號不存在或已停用' });
        return;
    }

    // 更新 session 活動時間
    await prisma.session.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
    });

    const accessToken = generateAccessToken(user.id, user.email, user.role);

    res.json({
        accessToken,
        expiresIn: 15 * 60 * 1000,
    });
});

/**
 * GET /auth/me
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: '未認證' });
        return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
        res.status(404).json({ message: '使用者不存在' });
        return;
    }

    res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
    });
});

/**
 * PUT /auth/change-password
 */
router.put('/change-password', authenticate, passwordRateLimit, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: '未認證' });
        return;
    }

    const { oldPassword, newPassword } = req.body;
    const client = getClientInfo(req);

    if (!oldPassword || !newPassword) {
        res.status(400).json({ message: '請提供舊密碼和新密碼' });
        return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
        res.status(404).json({ message: '使用者不存在' });
        return;
    }

    // 驗證舊密碼
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
        res.status(401).json({ message: '舊密碼錯誤' });
        return;
    }

    // 密碼強度驗證
    const validation = validatePassword(newPassword, user.email);
    if (!validation.valid) {
        res.status(400).json({ message: '密碼不符合規則', errors: validation.errors });
        return;
    }

    // 更新密碼
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash: hash,
            mustChangePassword: false,
            passwordChangedAt: new Date(),
        },
    });

    await writeAuditLog({ userId: user.id, action: 'PASSWORD_CHANGE', ...client });

    res.json({ message: '密碼已更新' });
});

export default router;
