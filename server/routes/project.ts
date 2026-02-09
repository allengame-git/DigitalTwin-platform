/**
 * Project Routes
 * @module server/routes/project
 * 
 * 專案管理 CRUD API
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

/**
 * GET /api/project
 * 取得所有專案
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        geologyModels: true,
                        imagery: true,
                        geophysics: true,
                        boreholes: true,
                    }
                }
            }
        });
        res.json({ success: true, data: projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
});

/**
 * GET /api/project/:id
 * 取得單一專案
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        geologyModels: true,
                        imagery: true,
                        geophysics: true,
                        boreholes: true,
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        res.json({ success: true, data: project });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch project' });
    }
});

/**
 * GET /api/project/code/:code
 * 根據專案代碼取得專案
 */
router.get('/code/:code', async (req: Request, res: Response) => {
    try {
        const code = req.params.code as string;
        const project = await prisma.project.findUnique({
            where: { code },
            include: {
                _count: {
                    select: {
                        geologyModels: true,
                        imagery: true,
                        geophysics: true,
                        boreholes: true,
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        res.json({ success: true, data: project });
    } catch (error) {
        console.error('Error fetching project by code:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch project' });
    }
});

/**
 * POST /api/project
 * 建立專案
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, code, description, originX, originY } = req.body;

        if (!name || !code) {
            return res.status(400).json({ success: false, error: 'Name and code are required' });
        }

        // 驗證 code 格式 (URL-friendly)
        if (!/^[a-z0-9-]+$/.test(code)) {
            return res.status(400).json({
                success: false,
                error: 'Code must be lowercase alphanumeric with hyphens only'
            });
        }

        const project = await prisma.project.create({
            data: {
                name,
                code,
                description,
                originX: originX ?? 224000,
                originY: originY ?? 2429000,
            }
        });

        res.status(201).json({ success: true, data: project });
    } catch (error: unknown) {
        console.error('Error creating project:', error);
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            return res.status(409).json({ success: false, error: 'Project name or code already exists' });
        }
        res.status(500).json({ success: false, error: 'Failed to create project' });
    }
});

/**
 * PUT /api/project/:id
 * 更新專案
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, description, originX, originY, isActive } = req.body;

        const project = await prisma.project.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(originX !== undefined && { originX }),
                ...(originY !== undefined && { originY }),
                ...(isActive !== undefined && { isActive }),
            }
        });

        res.json({ success: true, data: project });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ success: false, error: 'Failed to update project' });
    }
});

/**
 * DELETE /api/project/:id
 * 刪除專案 (Cascade - 需 admin 權限)
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { confirmName } = req.body;

        // 取得專案資訊
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        geologyModels: true,
                        imagery: true,
                        geophysics: true,
                        boreholes: true,
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // 防呆: 需要輸入專案名稱確認
        if (confirmName !== project.name) {
            return res.status(400).json({
                success: false,
                error: 'Please confirm by entering the project name',
                required: project.name,
                willDelete: project._count
            });
        }

        // 執行刪除 (Cascade)
        await prisma.project.delete({ where: { id } });

        res.json({
            success: true,
            message: `Project "${project.name}" and all associated data deleted`,
            deleted: project._count
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
});

/**
 * GET /api/project/:id/stats
 * 取得專案統計資訊
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const [geologyModels, imagery, geophysics, boreholes] = await Promise.all([
            prisma.geologyModel.count({ where: { projectId: id } }),
            prisma.imagery.count({ where: { projectId: id } }),
            prisma.geophysics.count({ where: { projectId: id } }),
            prisma.borehole.count({ where: { projectId: id } }),
        ]);

        res.json({
            success: true,
            data: {
                geologyModels,
                imagery,
                geophysics,
                boreholes,
                total: geologyModels + imagery + geophysics + boreholes,
            }
        });
    } catch (error) {
        console.error('Error fetching project stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

export default router;
