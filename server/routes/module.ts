/**
 * Module Routes
 *
 * CRUD for project modules (geology, facility, etc.).
 * Modules are project-scoped and ordered by sortOrder.
 */

import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// GET / — List modules for a project (?projectId=xxx), ordered by sortOrder
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.query['projectId'] as string;

    if (!projectId) {
        res.status(400).json({ success: false, message: '缺少 projectId 參數' });
        return;
    }

    const modules = await prisma.module.findMany({
        where: { projectId },
        orderBy: { sortOrder: 'asc' },
    });

    res.json({ success: true, data: modules });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST / — Create module (admin/engineer)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authorize('admin', 'engineer'), async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, type, name, description } = req.body as {
        projectId: string;
        type: string;
        name: string;
        description?: string;
    };

    if (!projectId || !type || !name) {
        res.status(400).json({ success: false, message: '缺少必要欄位：projectId, type, name' });
        return;
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
        res.status(404).json({ success: false, message: '專案不存在' });
        return;
    }

    // Auto-set sortOrder to max+1
    const maxOrder = await prisma.module.aggregate({
        where: { projectId },
        _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const mod = await prisma.module.create({
        data: {
            projectId,
            type,
            name,
            description: description ?? null,
            sortOrder,
            createdBy: req.user?.userId,
        },
    });

    res.status(201).json({ success: true, data: mod });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /reorder — Batch update sortOrder (admin only)
// MUST be declared before /:id to avoid "reorder" matching as id param
// ─────────────────────────────────────────────────────────────────────────────
router.put('/reorder', authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
    const { orders } = req.body as { orders: { id: string; sortOrder: number }[] };

    if (!Array.isArray(orders) || orders.length === 0) {
        res.status(400).json({ success: false, message: 'orders 必須是非空陣列' });
        return;
    }

    await prisma.$transaction(
        orders.map((o) =>
            prisma.module.update({
                where: { id: o.id },
                data: { sortOrder: o.sortOrder },
            })
        )
    );

    res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id — Get single module
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params['id'] as string;

    const mod = await prisma.module.findUnique({ where: { id } });
    if (!mod) {
        res.status(404).json({ success: false, message: '模組不存在' });
        return;
    }

    res.json({ success: true, data: mod });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id/stats — Get data counts before delete (admin)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/stats', authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params['id'] as string;

    const mod = await prisma.module.findUnique({ where: { id } });
    if (!mod) {
        res.status(404).json({ success: false, message: '模組不存在' });
        return;
    }

    const [
        boreholes,
        geologyModels,
        faultPlanes,
        attitudes,
        terrains,
        waterLevels,
        imageries,
        geophysics,
        facilityScenes,
    ] = await Promise.all([
        prisma.borehole.count({ where: { moduleId: id } }),
        prisma.geologyModel.count({ where: { moduleId: id } }),
        prisma.faultPlane.count({ where: { moduleId: id } }),
        prisma.attitude.count({ where: { moduleId: id } }),
        prisma.terrain.count({ where: { moduleId: id } }),
        prisma.waterLevel.count({ where: { moduleId: id } }),
        prisma.imagery.count({ where: { moduleId: id } }),
        prisma.geophysics.count({ where: { moduleId: id } }),
        prisma.facilityScene.count({ where: { moduleId: id } }),
    ]);

    res.json({
        success: true,
        data: {
            moduleId: id,
            moduleName: mod.name,
            counts: {
                boreholes,
                geologyModels,
                faultPlanes,
                attitudes,
                terrains,
                waterLevels,
                imageries,
                geophysics,
                facilityScenes,
            },
            total: boreholes + geologyModels + faultPlanes + attitudes + terrains + waterLevels + imageries + geophysics + facilityScenes,
        },
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:id — Update module name/description (admin/engineer)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', authorize('admin', 'engineer'), async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params['id'] as string;
    const { name, description } = req.body as { name?: string; description?: string };

    const existing = await prisma.module.findUnique({ where: { id } });
    if (!existing) {
        res.status(404).json({ success: false, message: '模組不存在' });
        return;
    }

    const mod = await prisma.module.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
        },
    });

    res.json({ success: true, data: mod });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:id — Delete module (admin). Requires confirmName matching module name.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params['id'] as string;
    const { confirmName } = req.body as { confirmName?: string };

    const mod = await prisma.module.findUnique({ where: { id } });
    if (!mod) {
        res.status(404).json({ success: false, message: '模組不存在' });
        return;
    }

    if (!confirmName || confirmName !== mod.name) {
        res.status(400).json({
            success: false,
            message: '請輸入模組名稱以確認刪除',
            expected: mod.name,
        });
        return;
    }

    await prisma.module.delete({ where: { id } });

    res.json({ success: true, message: `模組「${mod.name}」已刪除` });
});

export default router;
