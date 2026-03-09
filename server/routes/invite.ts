/**
 * Invite Routes
 * 
 * Invite link generation and validation endpoints.
 * @see specs/4-user-roles-system/spec.md FR-20
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authenticate, authorize, generateAccessToken, generateRefreshToken, AuthenticatedRequest } from '../middleware/auth';

const SESSION_TIMEOUT: Record<string, number> = {
    engineer: 8 * 60 * 60 * 1000,  // 8 hours
    reviewer: 1 * 60 * 60 * 1000,  // 1 hour
    admin: 8 * 60 * 60 * 1000,     // 8 hours
};

const router = Router();

// Simulated invite store (replace with database in production)
const inviteLinks = new Map<string, {
    id: string;
    token: string;
    expiresAt: Date;
    usedBy: string | null;
    createdBy: string;
}>();

// Simulated reviewer users created from invites
let nextReviewerId = 100;

/**
 * POST /invite/generate
 * Generate a new invite link (engineers only)
 */
router.post(
    '/generate',
    authenticate,
    authorize('engineer'),
    (req: AuthenticatedRequest, res: Response) => {
        const { expiresInHours = 24 } = req.body;

        const token = crypto.randomBytes(32).toString('hex');
        const id = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        inviteLinks.set(token, {
            id,
            token,
            expiresAt,
            usedBy: null,
            createdBy: req.user!.userId,
        });

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        res.status(201).json({
            id,
            token,
            url: `${baseUrl}/invite/${token}`,
            expiresAt: expiresAt.toISOString(),
        });
    }
);

/**
 * POST /invite/validate
 * Validate invite link and create session
 */
router.post('/validate', (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
        res.status(400).json({ message: '請提供邀請 Token' });
        return;
    }

    const invite = inviteLinks.get(token);

    if (!invite) {
        res.status(404).json({ message: '邀請連結無效' });
        return;
    }

    if (invite.usedBy) {
        res.status(410).json({ message: '邀請連結已被使用' });
        return;
    }

    if (invite.expiresAt < new Date()) {
        res.status(410).json({ message: '邀請連結已過期' });
        return;
    }

    // Create temporary reviewer user
    const reviewerId = `reviewer-${++nextReviewerId}`;
    invite.usedBy = reviewerId;

    const user = {
        id: reviewerId,
        email: `reviewer-${nextReviewerId}@invited.local`,
        name: `審查委員 #${nextReviewerId}`,
        role: 'reviewer' as const,
    };

    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_TIMEOUT.reviewer,
    });

    res.json({
        user: {
            ...user,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
        },
        tokens: {
            accessToken,
            expiresIn: 15 * 60 * 1000,
        },
    });
});

/**
 * GET /invite/:token/info
 * Get invite link info without consuming it
 */
router.get('/:token/info', (req: Request, res: Response) => {
    const token = req.params.token as string;

    const invite = inviteLinks.get(token);

    if (!invite) {
        res.status(404).json({ message: '邀請連結無效' });
        return;
    }

    const isExpired = invite.expiresAt < new Date();
    const isUsed = invite.usedBy !== null;

    res.json({
        valid: !isExpired && !isUsed,
        isExpired,
        isUsed,
        expiresAt: invite.expiresAt.toISOString(),
    });
});

export default router;
