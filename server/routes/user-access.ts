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

// All routes require admin or engineer role
router.use(authenticate, authorize('admin', 'engineer'));

/**
 * Resolve module identifiers to validated Module records.
 * Accepts moduleIds (UUIDs) or legacy module type strings.
 * Returns validated Module records from DB.
 */
async function resolveModules(
    body: { moduleIds?: string[]; modules?: string[] },
    projectId: string
): Promise<{ valid: { id: string; type: string }[]; error?: string }> {
    const { moduleIds, modules } = body;

    if (moduleIds && Array.isArray(moduleIds) && moduleIds.length > 0) {
        // New format: moduleIds are UUIDs referencing Module table
        const dbModules = await prisma.module.findMany({
            where: { id: { in: moduleIds }, projectId },
            select: { id: true, type: true },
        });
        const foundIds = new Set(dbModules.map(m => m.id));
        const invalid = moduleIds.filter(id => !foundIds.has(id));
        if (invalid.length > 0) {
            return { valid: [], error: `無效的模組 ID：${invalid.join(', ')}` };
        }
        return { valid: dbModules };
    }

    if (modules && Array.isArray(modules) && modules.length > 0) {
        // Legacy format: module type strings — resolve to Module records by type
        const dbModules = await prisma.module.findMany({
            where: { type: { in: modules }, projectId },
            select: { id: true, type: true },
        });
        const foundTypes = new Set(dbModules.map(m => m.type));
        const unresolved = modules.filter(m => !foundTypes.has(m));
        if (unresolved.length > 0) {
            return { valid: [], error: `無法解析的模組類型：${unresolved.join(', ')}（該專案可能尚未建立對應模組）` };
        }
        return { valid: dbModules };
    }

    // Empty — no modules assigned
    return { valid: [] };
}

/**
 * Format UserProjectModule records for API response.
 */
function formatModulesResponse(modules: Array<{ moduleId: string }>) {
    return {
        moduleIds: modules.map(m => m.moduleId),
    };
}

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
            modules: { select: { moduleId: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    const data = userProjects.map((up) => {
        const { moduleIds } = formatModulesResponse(up.modules);
        return {
            projectId: up.projectId,
            project: up.project,
            moduleIds,
            createdAt: up.createdAt,
        };
    });

    res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:userId/projects/:projectId — Set modules for one project
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:userId/projects/:projectId', async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params['userId'] as string;
    const projectId = req.params['projectId'] as string;
    const { moduleIds, modules } = req.body as { moduleIds?: string[]; modules?: string[] };

    // Validate input: at least one format provided (or empty = remove all modules)
    if (moduleIds !== undefined && !Array.isArray(moduleIds)) {
        res.status(400).json({ success: false, message: 'moduleIds 必須是陣列' });
        return;
    }
    if (modules !== undefined && !Array.isArray(modules)) {
        res.status(400).json({ success: false, message: 'modules 必須是陣列' });
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

    // Resolve and validate modules
    const resolved = await resolveModules({ moduleIds, modules }, projectId);
    if (resolved.error) {
        res.status(400).json({ success: false, message: resolved.error });
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

    if (resolved.valid.length > 0) {
        await prisma.userProjectModule.createMany({
            data: resolved.valid.map((mod) => ({
                userProjectId: userProject.id,
                moduleId: mod.id,
            })),
        });
    }

    const updated = await prisma.userProject.findUnique({
        where: { id: userProject.id },
        include: {
            project: { select: { id: true, name: true, code: true } },
            modules: { select: { moduleId: true } },
        },
    });

    const fmt = formatModulesResponse(updated!.modules);
    res.json({
        success: true,
        data: {
            projectId: updated!.projectId,
            project: updated!.project,
            moduleIds: fmt.moduleIds,
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
            modules: { select: { moduleId: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    const data = userProjects.map((up) => {
        const { moduleIds } = formatModulesResponse(up.modules);
        return {
            userId: up.userId,
            user: up.user,
            moduleIds,
            createdAt: up.createdAt,
        };
    });

    res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:userId/batch — Batch set all assignments
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:userId/batch', async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params['userId'] as string;
    const { assignments } = req.body as {
        assignments: { projectId: string; moduleIds?: string[]; modules?: string[] }[];
    };

    if (!Array.isArray(assignments)) {
        res.status(400).json({ success: false, message: 'assignments 必須是陣列' });
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

    // Validate and resolve all modules up front
    const resolvedAssignments: { projectId: string; validModules: { id: string; type: string }[] }[] = [];
    for (const assignment of assignments) {
        if (assignment.moduleIds !== undefined && !Array.isArray(assignment.moduleIds)) {
            res.status(400).json({ success: false, message: 'assignments[].moduleIds 必須是陣列' });
            return;
        }
        if (assignment.modules !== undefined && !Array.isArray(assignment.modules)) {
            res.status(400).json({ success: false, message: 'assignments[].modules 必須是陣列' });
            return;
        }
        const resolved = await resolveModules(
            { moduleIds: assignment.moduleIds, modules: assignment.modules },
            assignment.projectId
        );
        if (resolved.error) {
            res.status(400).json({ success: false, message: resolved.error });
            return;
        }
        resolvedAssignments.push({ projectId: assignment.projectId, validModules: resolved.valid });
    }

    const createdBy = req.user?.userId;
    const assignedProjectIds = resolvedAssignments.map((a) => a.projectId);

    await prisma.$transaction(async (tx) => {
        // Delete UserProjects NOT in the new assignment list (cascade deletes modules)
        await tx.userProject.deleteMany({
            where: {
                userId,
                projectId: { notIn: assignedProjectIds },
            },
        });

        for (const { projectId, validModules } of resolvedAssignments) {
            const userProject = await tx.userProject.upsert({
                where: { userId_projectId: { userId, projectId } },
                create: { userId, projectId, createdBy },
                update: { createdBy },
            });

            await tx.userProjectModule.deleteMany({ where: { userProjectId: userProject.id } });

            if (validModules.length > 0) {
                await tx.userProjectModule.createMany({
                    data: validModules.map((mod) => ({
                        userProjectId: userProject.id,
                        moduleId: mod.id,
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
            modules: { select: { moduleId: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    res.json({
        success: true,
        data: userProjects.map((up) => {
            const { moduleIds } = formatModulesResponse(up.modules);
            return {
                projectId: up.projectId,
                project: up.project,
                moduleIds,
                createdAt: up.createdAt,
            };
        }),
    });
});

export default router;
