/**
 * Review Routes
 *
 * CRUD for review sessions, markers, comments, and participants.
 * Markers support screenshot uploads via multer.
 */

import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// === Multer for screenshot uploads ===

const REVIEWS_DIR = path.join(__dirname, '..', 'uploads', 'reviews');

const screenshotStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        // Actual dir created per-request in route handler
        cb(null, REVIEWS_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `screenshot-${Date.now()}${ext}`);
    },
});

const screenshotUpload = multer({
    storage: screenshotStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ============================================
// Review Session CRUD
// ============================================

// GET /api/review?projectId=xxx — list sessions with marker stats
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const projectId = req.query['projectId'] as string;
        if (!projectId) {
            res.status(400).json({ success: false, error: 'projectId is required' });
            return;
        }

        const sessions = await prisma.reviewSession.findMany({
            where: { projectId },
            include: {
                participants: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
                _count: { select: { markers: true } },
                markers: {
                    select: { status: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Compute marker stats per session
        const data = sessions.map((s) => {
            const markerStats = {
                open: s.markers.filter((m) => m.status === 'open').length,
                in_progress: s.markers.filter((m) => m.status === 'in_progress').length,
                resolved: s.markers.filter((m) => m.status === 'resolved').length,
                total: s.markers.length,
            };
            const participantNames = s.participants.map((p) => p.user.name);
            const { markers: _markers, ...rest } = s;
            return { ...rest, markerStats, participantNames };
        });

        res.json({ success: true, data });
    } catch (err) {
        console.error('GET /api/review error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/review — create session
router.post('/', authorize('admin', 'engineer'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId, title, description, scheduledAt } = req.body;

        if (!projectId || !title) {
            res.status(400).json({ success: false, error: 'projectId and title are required' });
            return;
        }

        const session = await prisma.reviewSession.create({
            data: {
                projectId,
                title,
                description: description || null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                createdBy: req.user!.userId,
                participants: {
                    create: {
                        userId: req.user!.userId,
                        role: 'host',
                    },
                },
            },
            include: {
                participants: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
            },
        });

        res.status(201).json({ success: true, data: session });
    } catch (err) {
        console.error('POST /api/review error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/review/:id — get session detail with markers, comments, participants
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params['id'] as string;

        const session = await prisma.reviewSession.findUnique({
            where: { id },
            include: {
                participants: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
                markers: {
                    include: {
                        comments: {
                            orderBy: { createdAt: 'asc' },
                        },
                        module: { select: { id: true, type: true, name: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!session) {
            res.status(404).json({ success: false, error: 'Review session not found' });
            return;
        }

        // Resolve user names for markers and comments
        const userIds = new Set<string>();
        userIds.add(session.createdBy);
        session.markers.forEach((m) => {
            userIds.add(m.createdBy);
            m.comments.forEach((c) => userIds.add(c.createdBy));
        });

        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, name: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u.name]));

        // Attach user names
        const markersWithUsers = session.markers.map((m) => ({
            ...m,
            createdByName: userMap.get(m.createdBy) || 'Unknown',
            comments: m.comments.map((c) => ({
                ...c,
                createdByName: userMap.get(c.createdBy) || 'Unknown',
            })),
        }));

        res.json({
            success: true,
            data: {
                ...session,
                createdByName: userMap.get(session.createdBy) || 'Unknown',
                markers: markersWithUsers,
            },
        });
    } catch (err) {
        console.error('GET /api/review/:id error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/review/:id — update session
router.put('/:id', authorize('admin', 'engineer'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params['id'] as string;
        const { title, description, status, conclusion } = req.body;

        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (conclusion !== undefined) updateData.conclusion = conclusion;
        if (status === 'concluded') updateData.concludedAt = new Date();

        const session = await prisma.reviewSession.update({
            where: { id },
            data: updateData,
        });

        res.json({ success: true, data: session });
    } catch (err) {
        console.error('PUT /api/review/:id error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/review/:id — delete session (admin only)
router.delete('/:id', authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params['id'] as string;

        // Delete associated files
        const screenshotDir = path.join(REVIEWS_DIR, id);
        if (fs.existsSync(screenshotDir)) {
            fs.rmSync(screenshotDir, { recursive: true });
        }

        await prisma.reviewSession.delete({ where: { id } });

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/review/:id error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// Review Markers
// ============================================

// GET /api/review/:sessionId/markers
router.get('/:sessionId/markers', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessionId = req.params['sessionId'] as string;

        const markers = await prisma.reviewMarker.findMany({
            where: { sessionId },
            include: {
                comments: { orderBy: { createdAt: 'asc' } },
                module: { select: { id: true, type: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ success: true, data: markers });
    } catch (err) {
        console.error('GET markers error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/review/:sessionId/markers — create marker with optional screenshot
router.post(
    '/:sessionId/markers',
    screenshotUpload.single('screenshot'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const sessionId = req.params['sessionId'] as string;
            const {
                moduleId, title, description, priority,
                positionX, positionY, positionZ,
                cameraPositionX, cameraPositionY, cameraPositionZ,
                cameraTargetX, cameraTargetY, cameraTargetZ,
            } = req.body;

            if (!moduleId || !title) {
                res.status(400).json({ success: false, error: 'moduleId and title are required' });
                return;
            }

            // Move screenshot to session-specific dir
            let screenshotUrl: string | null = null;
            if (req.file) {
                const sessionDir = path.join(REVIEWS_DIR, sessionId, 'screenshots');
                fs.mkdirSync(sessionDir, { recursive: true });
                const ext = path.extname(req.file.filename);
                const destFilename = `marker-${Date.now()}${ext}`;
                const destPath = path.join(sessionDir, destFilename);
                fs.renameSync(req.file.path, destPath);
                screenshotUrl = `/uploads/reviews/${sessionId}/screenshots/${destFilename}`;
            }

            const marker = await prisma.reviewMarker.create({
                data: {
                    sessionId,
                    moduleId,
                    title,
                    description: description || null,
                    priority: priority || 'medium',
                    positionX: parseFloat(positionX),
                    positionY: parseFloat(positionY),
                    positionZ: parseFloat(positionZ),
                    cameraPositionX: parseFloat(cameraPositionX),
                    cameraPositionY: parseFloat(cameraPositionY),
                    cameraPositionZ: parseFloat(cameraPositionZ),
                    cameraTargetX: parseFloat(cameraTargetX),
                    cameraTargetY: parseFloat(cameraTargetY),
                    cameraTargetZ: parseFloat(cameraTargetZ),
                    screenshotUrl,
                    createdBy: req.user!.userId,
                },
                include: {
                    module: { select: { id: true, type: true, name: true } },
                },
            });

            res.status(201).json({ success: true, data: marker });
        } catch (err) {
            console.error('POST marker error:', err);
            // Cleanup uploaded file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
);

// PUT /api/review/markers/:markerId
router.put('/markers/:markerId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const markerId = req.params['markerId'] as string;
        const { title, description, status, priority } = req.body;

        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;

        const marker = await prisma.reviewMarker.update({
            where: { id: markerId },
            data: updateData,
        });

        res.json({ success: true, data: marker });
    } catch (err) {
        console.error('PUT marker error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/review/markers/:markerId
router.delete('/markers/:markerId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const markerId = req.params['markerId'] as string;

        await prisma.reviewMarker.delete({ where: { id: markerId } });

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE marker error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// Review Comments
// ============================================

// POST /api/review/markers/:markerId/comments
router.post('/markers/:markerId/comments', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const markerId = req.params['markerId'] as string;
        const { content } = req.body;

        if (!content) {
            res.status(400).json({ success: false, error: 'content is required' });
            return;
        }

        const comment = await prisma.reviewComment.create({
            data: {
                markerId,
                content,
                createdBy: req.user!.userId,
            },
        });

        res.status(201).json({ success: true, data: comment });
    } catch (err) {
        console.error('POST comment error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/review/comments/:commentId
router.put('/comments/:commentId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const commentId = req.params['commentId'] as string;
        const { content } = req.body;

        const comment = await prisma.reviewComment.update({
            where: { id: commentId },
            data: { content },
        });

        res.json({ success: true, data: comment });
    } catch (err) {
        console.error('PUT comment error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/review/comments/:commentId
router.delete('/comments/:commentId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const commentId = req.params['commentId'] as string;

        await prisma.reviewComment.delete({ where: { id: commentId } });

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE comment error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// Participants
// ============================================

// POST /api/review/:sessionId/participants
router.post('/:sessionId/participants', authorize('admin', 'engineer'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessionId = req.params['sessionId'] as string;
        const { userId, role } = req.body;

        if (!userId) {
            res.status(400).json({ success: false, error: 'userId is required' });
            return;
        }

        const participant = await prisma.reviewParticipant.create({
            data: {
                sessionId,
                userId,
                role: role || 'participant',
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });

        res.status(201).json({ success: true, data: participant });
    } catch (err) {
        console.error('POST participant error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/review/:sessionId/participants/:userId
router.delete('/:sessionId/participants/:userId', authorize('admin', 'engineer'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessionId = req.params['sessionId'] as string;
        const userId = req.params['userId'] as string;

        await prisma.reviewParticipant.deleteMany({
            where: { sessionId, userId },
        });

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE participant error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// PDF Export (placeholder — Task 13 will implement pdfkit)
// ============================================

// POST /api/review/:sessionId/export-pdf
router.post('/:sessionId/export-pdf', async (req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Task 13 will implement pdfkit generation here
        res.json({
            success: false,
            error: 'PDF export not yet implemented',
        });
    } catch (err) {
        console.error('POST export-pdf error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/review/:sessionId/pdf — download existing PDF
router.get('/:sessionId/pdf', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessionId = req.params['sessionId'] as string;

        const session = await prisma.reviewSession.findUnique({
            where: { id: sessionId },
            select: { pdfUrl: true, title: true },
        });

        if (!session?.pdfUrl) {
            res.status(404).json({ success: false, error: 'PDF not found' });
            return;
        }

        const filePath = path.join(__dirname, '..', session.pdfUrl);
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ success: false, error: 'PDF file not found' });
            return;
        }

        res.download(filePath, `${session.title}.pdf`);
    } catch (err) {
        console.error('GET pdf error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
