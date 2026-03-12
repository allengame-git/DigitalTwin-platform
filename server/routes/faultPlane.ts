/**
 * Fault Plane Routes
 * @module server/routes/faultPlane
 * 
 * 斷層面 CRUD API
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/fault-plane
 * 取得專案的所有斷層面 (含座標)
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const projectId = req.query.projectId as string;
        const moduleId = req.query.moduleId as string;

        if (!projectId && !moduleId) {
            return res.status(400).json({ success: false, error: 'projectId or moduleId is required' });
        }

        const where: any = {};
        if (moduleId) where.moduleId = moduleId;
        else if (projectId) where.projectId = projectId;

        const faultPlanes = await prisma.faultPlane.findMany({
            where,
            include: {
                coordinates: {
                    orderBy: { sortOrder: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: faultPlanes });
    } catch (error) {
        console.error('Error fetching fault planes:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fault planes' });
    }
});

/**
 * GET /api/fault-plane/:id
 * 取得單一斷層面詳情
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const faultPlane = await prisma.faultPlane.findUnique({
            where: { id },
            include: {
                coordinates: {
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });

        if (!faultPlane) {
            return res.status(404).json({ success: false, error: 'Fault plane not found' });
        }

        res.json({ success: true, data: faultPlane });
    } catch (error) {
        console.error('Error fetching fault plane:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fault plane' });
    }
});

/**
 * POST /api/fault-plane
 * 新增單一斷層面
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, moduleId, name, type, dipAngle, dipDirection, depth, color, coordinates } = req.body;

        if (!projectId || !name || !type || dipAngle === undefined || dipDirection === undefined || depth === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, name, type, dipAngle, dipDirection, depth'
            });
        }

        if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'coordinates must be an array with at least 2 points'
            });
        }

        const faultPlane = await prisma.faultPlane.create({
            data: {
                projectId,
                ...(moduleId && { moduleId }),
                name,
                type,
                dipAngle: parseFloat(dipAngle),
                dipDirection: parseFloat(dipDirection),
                depth: parseFloat(depth),
                color: color || '#ff4444',
                coordinates: {
                    create: coordinates.map((coord: { x: number; y: number; z: number }, idx: number) => ({
                        x: parseFloat(String(coord.x)),
                        y: parseFloat(String(coord.y)),
                        z: parseFloat(String(coord.z)),
                        sortOrder: idx
                    }))
                }
            },
            include: {
                coordinates: {
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });

        res.status(201).json({ success: true, data: faultPlane });
    } catch (error) {
        console.error('Error creating fault plane:', error);
        res.status(500).json({ success: false, error: 'Failed to create fault plane' });
    }
});

/**
 * PUT /api/fault-plane/:id
 * 更新斷層面
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, type, dipAngle, dipDirection, depth, color, coordinates } = req.body;

        // 確認存在
        const existing = await prisma.faultPlane.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Fault plane not found' });
        }

        // 使用交易更新
        const faultPlane = await prisma.$transaction(async (tx) => {
            // 更新主資料
            await tx.faultPlane.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(type && { type }),
                    ...(dipAngle !== undefined && { dipAngle: parseFloat(dipAngle) }),
                    ...(dipDirection !== undefined && { dipDirection: parseFloat(dipDirection) }),
                    ...(depth !== undefined && { depth: parseFloat(depth) }),
                    ...(color && { color }),
                }
            });

            // 如果有新座標，刪除舊的並重建
            if (coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
                await tx.faultCoordinate.deleteMany({ where: { faultPlaneId: id } });
                await tx.faultCoordinate.createMany({
                    data: coordinates.map((coord: { x: number; y: number; z: number }, idx: number) => ({
                        faultPlaneId: id,
                        x: parseFloat(String(coord.x)),
                        y: parseFloat(String(coord.y)),
                        z: parseFloat(String(coord.z)),
                        sortOrder: idx
                    }))
                });
            }

            // 回傳完整資料
            return tx.faultPlane.findUnique({
                where: { id },
                include: {
                    coordinates: {
                        orderBy: { sortOrder: 'asc' }
                    }
                }
            });
        });

        res.json({ success: true, data: faultPlane });
    } catch (error) {
        console.error('Error updating fault plane:', error);
        res.status(500).json({ success: false, error: 'Failed to update fault plane' });
    }
});

/**
 * DELETE /api/fault-plane/:id
 * 刪除斷層面
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.faultPlane.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Fault plane not found' });
        }

        await prisma.faultPlane.delete({ where: { id } });

        res.json({ success: true, message: 'Fault plane deleted' });
    } catch (error) {
        console.error('Error deleting fault plane:', error);
        res.status(500).json({ success: false, error: 'Failed to delete fault plane' });
    }
});

/**
 * POST /api/fault-plane/batch-import
 * 批次匯入斷層面 (CSV)
 */
router.post('/batch-import', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, moduleId, faultPlanes } = req.body;

        if (!projectId) {
            return res.status(400).json({ success: false, error: 'projectId is required' });
        }

        if (!faultPlanes || !Array.isArray(faultPlanes) || faultPlanes.length === 0) {
            return res.status(400).json({ success: false, error: 'faultPlanes array is required' });
        }

        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (let i = 0; i < faultPlanes.length; i++) {
            const fp = faultPlanes[i];
            try {
                // 解析座標 (支援 JSON 字串或陣列)
                let coordinates = fp.coordinates;
                if (typeof coordinates === 'string') {
                    coordinates = JSON.parse(coordinates);
                }

                if (!Array.isArray(coordinates) || coordinates.length < 2) {
                    throw new Error('coordinates must have at least 2 points');
                }

                await prisma.faultPlane.create({
                    data: {
                        projectId,
                        ...(moduleId && { moduleId }),
                        name: fp.name,
                        type: fp.type || 'normal',
                        dipAngle: parseFloat(fp.dipAngle),
                        dipDirection: parseFloat(fp.dipDirection),
                        depth: parseFloat(fp.depth),
                        color: fp.color || '#ff4444',
                        coordinates: {
                            create: coordinates.map((coord: { x: number; y: number; z: number }, idx: number) => ({
                                x: parseFloat(String(coord.x)),
                                y: parseFloat(String(coord.y)),
                                z: parseFloat(String(coord.z)),
                                sortOrder: idx
                            }))
                        }
                    }
                });
                success++;
            } catch (err) {
                failed++;
                errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }

        res.json({
            success: true,
            data: { success, failed, errors: errors.slice(0, 10) }
        });
    } catch (error) {
        console.error('Error batch importing fault planes:', error);
        res.status(500).json({ success: false, error: 'Failed to batch import' });
    }
});

export default router;
