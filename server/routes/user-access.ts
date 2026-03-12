/**
 * User Access Routes
 *
 * Manages viewer project assignments and module permissions.
 * All routes require authenticate + authorize('admin', 'engineer').
 */

import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

const VALID_MODULES = ['geology', 'facility', 'engineering', 'simulation'];

// All routes require admin or engineer role
router.use(authenticate, authorize('admin', 'engineer'));

// ─────────────────────────────────────────────────────────────────────────────
// GET /:userId/projects — Get viewer's project assignments with modules
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:userId/projects', async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params['userId'] as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        res.status(404).json({ success: false, message: '使用者不存在' });
        return;
    }
    if (user.role !== 'viewer') {
        res.status(400).json({ success: false, message: '目標使用者必須是 viewer 角色' });
        return;
    }

    const userProjects = await prisma.userProject.findMany({
        where: { userId },
        include: {
            project: { select: { id: true, name: true, code: true } },
            modules: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    const data = userProjects.map((up) => ({
        projectId: up.projectId,
        project: up.project,
        modules: up.modules.map((m) => m.moduleKey),
        createdAt: up.createdAt,
    }));

    res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:userId/projects/:projectId — Set modules for one project
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:userId/projects/:projectId', async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params['userId'] as string;
    const projectId = req.params['projectId'] as string;
    const { modules } = req.body as { modules: string[] };

    if (!Array.isArray(modules)) {
        res.status(400).json({ success: false, message: 'modules 必須是陣列' });
        return;
    }

    const invalidModules = modules.filter((m) => !VALID_MODULES.includes(m));
    if (invalidModules.length > 0) {
        res.status(400).json({ success: false, message: `無效的模組：${invalidModules.join(', ')}` });
        return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        res.status(404).json({ success: false, message: '使用者不存在' });
        return;
    }
    if (user.role !== 'viewer') {
        res.status(400).json({ success: false, message: '目標使用者必須是 viewer 角色' });
        return;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
        res.status(404).json({ success: false, message: '專案不存在' });
        return;
    }

    const createdBy = req.user?.userId;

    // Upsert UserProject
    const userProject = await prisma.userProject.upsert({
        where: { userId_projectId: { userId, projectId } },
        create: { userId, projectId, createdBy },
        update: { createdBy },
    });

    // Delete existing modules then recreate
    await prisma.userProjectModule.deleteMany({ where: { userProjectId: userProject.id } });

    if (modules.length > 0) {
        await prisma.userProjectModule.createMany({
            data: modules.map((moduleKey) => ({
                userProjectId: userProject.id,
                moduleKey,
            })),
        });
    }

    const updated = await prisma.userProject.findUnique({
        where: { id: userProject.id },
        include: {
            project: { select: { id: true, name: true, code: true } },
            modules: true,
        },
    });

    res.json({
        success: true,
        data: {
            projectId: updated!.projectId,
            project: updated!.project,
            modules: updated!.modules.map((m) => m.moduleKey),
            createdAt: updated!.createdAt,
        },
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:userId/projects/:projectId — Remove project access
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:userId/projects/:projectId', async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params['userId'] as string;
    const projectId = req.params['projectId'] as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        res.status(404).json({ success: false, message: '使用者不存在' });
        return;
    }
    if (user.role !== 'viewer') {
        res.status(400).json({ success: false, message: '只能管理 viewer 角色的專案存取權限' });
        return;
    }

    await prisma.userProject.deleteMany({ where: { userId, projectId } });

    res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /project/:projectId/viewers — Get all viewers for a project
// ─────────────────────────────────────────────────────────────────────────────
router.get('/project/:projectId/viewers', async (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.params['projectId'] as string;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
        res.status(404).json({ success: false, message: '專案不存在' });
        return;
    }

    const userProjects = await prisma.userProject.findMany({
        where: {
            projectId,
            user: { role: 'viewer' },
        },
        include: {
            user: { select: { id: true, name: true, email: true, role: true, status: true } },
            modules: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    const data = userProjects.map((up) => ({
        userId: up.userId,
        user: up.user,
        modules: up.modules.map((m) => m.moduleKey),
        createdAt: up.createdAt,
    }));

    res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:userId/batch — Batch set all assignments
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:userId/batch', async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params['userId'] as string;
    const { assignments } = req.body as { assignments: { projectId: string; modules: string[] }[] };

    if (!Array.isArray(assignments)) {
        res.status(400).json({ success: false, message: 'assignments 必須是陣列' });
        return;
    }

    // Validate all modules up front
    for (const assignment of assignments) {
        if (!Array.isArray(assignment.modules)) {
            res.status(400).json({ success: false, message: 'assignments[].modules 必須是陣列' });
            return;
        }
        const invalid = assignment.modules.filter((m) => !VALID_MODULES.includes(m));
        if (invalid.length > 0) {
            res.status(400).json({ success: false, message: `無效的模組：${invalid.join(', ')}` });
            return;
        }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        res.status(404).json({ success: false, message: '使用者不存在' });
        return;
    }
    if (user.role !== 'viewer') {
        res.status(400).json({ success: false, message: '目標使用者必須是 viewer 角色' });
        return;
    }

    const createdBy = req.user?.userId;
    const assignedProjectIds = assignments.map((a) => a.projectId);

    await prisma.$transaction(async (tx) => {
        // Delete UserProjects NOT in the new assignment list (cascade deletes modules)
        await tx.userProject.deleteMany({
            where: {
                userId,
                projectId: { notIn: assignedProjectIds },
            },
        });

        for (const { projectId, modules } of assignments) {
            const userProject = await tx.userProject.upsert({
                where: { userId_projectId: { userId, projectId } },
                create: { userId, projectId, createdBy },
                update: { createdBy },
            });

            await tx.userProjectModule.deleteMany({ where: { userProjectId: userProject.id } });

            if (modules.length > 0) {
                await tx.userProjectModule.createMany({
                    data: modules.map((moduleKey) => ({
                        userProjectId: userProject.id,
                        moduleKey,
                    })),
                });
            }
        }
    });

    // Return updated state
    const userProjects = await prisma.userProject.findMany({
        where: { userId },
        include: {
            project: { select: { id: true, name: true, code: true } },
            modules: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    res.json({
        success: true,
        data: userProjects.map((up) => ({
            projectId: up.projectId,
            project: up.project,
            modules: up.modules.map((m) => m.moduleKey),
            createdAt: up.createdAt,
        })),
    });
});

export default router;
