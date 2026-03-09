import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { adminRateLimit } from '../middleware/rateLimit';
import { writeAuditLog } from '../lib/auditLog';
import { generateTempPassword } from '../lib/passwordPolicy';

const router = Router();

// All admin routes require authentication + admin role + rate limiting
router.use(authenticate, authorize('admin'), adminRateLimit);

/**
 * GET /admin/users — 使用者列表
 */
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            mustChangePassword: true,
            failedLoginCount: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            _count: {
                select: {
                    sessions: {
                        where: { isRevoked: false, expiresAt: { gt: new Date() } },
                    },
                },
            },
        },
    });

    res.json(users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        mustChangePassword: u.mustChangePassword,
        failedLoginCount: u.failedLoginCount,
        activeSessions: u._count.sessions,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
    })));
});

/**
 * POST /admin/users — 建立帳號
 */
router.post('/users', async (req: AuthenticatedRequest, res: Response) => {
    const { email, name, role } = req.body;
    const client = {
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
    };

    if (!email || !name) {
        res.status(400).json({ message: '請提供 email 和名稱' });
        return;
    }

    // Check duplicate
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        res.status(409).json({ message: '此 email 已被使用' });
        return;
    }

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
        data: {
            email,
            name,
            role: role || 'engineer',
            passwordHash: hash,
            mustChangePassword: true,
        },
    });

    await writeAuditLog({
        userId: req.user!.userId,
        action: 'ACCOUNT_CREATE',
        ...client,
        details: { createdUserId: user.id, createdEmail: email },
    });

    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            mustChangePassword: user.mustChangePassword,
            failedLoginCount: 0,
            activeSessions: 0,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            lastLoginAt: null,
        },
        temporaryPassword: tempPassword,
    });
});

/**
 * PUT /admin/users/:id — 更新帳號（name, role, status）
 */
router.put('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, role, status } = req.body;
    const client = {
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
    };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
        res.status(404).json({ message: '使用者不存在' });
        return;
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.user.update({
        where: { id },
        data: updateData,
    });

    await writeAuditLog({
        userId: req.user!.userId,
        action: 'ACCOUNT_UPDATE',
        ...client,
        details: { targetUserId: id, changes: updateData },
    });

    res.json({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        lastLoginAt: updated.lastLoginAt?.toISOString() || null,
    });
});

/**
 * POST /admin/users/:id/reset-password — 重設密碼
 */
router.post('/users/:id/reset-password', async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const client = {
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
    };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
        res.status(404).json({ message: '使用者不存在' });
        return;
    }

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
        where: { id },
        data: {
            passwordHash: hash,
            mustChangePassword: true,
            status: 'pending_reset',
        },
    });

    // Revoke all sessions
    await prisma.session.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
    });

    await writeAuditLog({
        userId: req.user!.userId,
        action: 'PASSWORD_RESET',
        ...client,
        details: { targetUserId: id },
    });

    res.json({ temporaryPassword: tempPassword });
});

/**
 * POST /admin/users/:id/unlock — 手動解鎖
 */
router.post('/users/:id/unlock', async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const client = {
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
    };

    const updated = await prisma.user.update({
        where: { id },
        data: {
            status: 'active',
            failedLoginCount: 0,
            lockedUntil: null,
        },
    });

    await writeAuditLog({
        userId: req.user!.userId,
        action: 'ACCOUNT_UNLOCK',
        ...client,
        details: { targetUserId: id },
    });

    res.json({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        status: updated.status,
    });
});

/**
 * DELETE /admin/users/:id — 停用帳號（soft delete）
 */
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const client = {
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
    };

    // 不能停用自己
    if (id === req.user!.userId) {
        res.status(400).json({ message: '不能停用自己的帳號' });
        return;
    }

    await prisma.user.update({
        where: { id },
        data: { status: 'disabled' },
    });

    // Revoke all sessions
    await prisma.session.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
    });

    await writeAuditLog({
        userId: req.user!.userId,
        action: 'ACCOUNT_DISABLE',
        ...client,
        details: { targetUserId: id },
    });

    res.json({ message: '帳號已停用' });
});

/**
 * GET /admin/users/:id/sessions — 該使用者的 active sessions
 */
router.get('/users/:id/sessions', async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const sessions = await prisma.session.findMany({
        where: { userId: id, isRevoked: false, expiresAt: { gt: new Date() } },
        orderBy: { lastActivityAt: 'desc' },
        select: {
            id: true,
            userAgent: true,
            ipAddress: true,
            createdAt: true,
            lastActivityAt: true,
            expiresAt: true,
        },
    });

    res.json(sessions.map(s => ({
        id: s.id,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
        lastActivityAt: s.lastActivityAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
    })));
});

/**
 * DELETE /admin/users/:id/sessions — 踢掉全部 session
 */
router.delete('/users/:id/sessions', async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const client = {
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
    };

    const result = await prisma.session.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
    });

    await writeAuditLog({
        userId: req.user!.userId,
        action: 'SESSION_REVOKED',
        ...client,
        details: { targetUserId: id, revokedCount: result.count },
    });

    res.json({ message: `已踢出 ${result.count} 個 session` });
});

/**
 * GET /admin/audit-logs — 稽核日誌（分頁 + 篩選）
 */
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const { startDate, endDate, action, userId } = req.query;

    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
        const createdAt: Record<string, Date> = {};
        if (startDate) createdAt.gte = new Date(startDate as string);
        if (endDate) createdAt.lte = new Date(endDate as string);
        where.createdAt = createdAt;
    }

    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                user: { select: { name: true, email: true } },
            },
        }),
        prisma.auditLog.count({ where }),
    ]);

    res.json({
        data: data.map(log => ({
            id: log.id,
            userId: log.userId,
            action: log.action,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            details: log.details,
            createdAt: log.createdAt.toISOString(),
            user: log.user ? { name: log.user.name, email: log.user.email } : null,
        })),
        total,
        page,
        limit,
    });
});

export default router;
