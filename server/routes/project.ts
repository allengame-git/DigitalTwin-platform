/**
 * Project Routes
 * @module server/routes/project
 * 
 * 專案管理 CRUD API
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from "zod";
import { authenticate, authorize, enforceProjectAccess, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/project
 * 取得所有專案
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userRole = authReq.user?.role;
        const userId = authReq.user?.userId;

        let projects;

        if (userRole === 'viewer' && userId) {
            // viewer: only return projects with UserProject records + allowedModules
            const userProjects = await prisma.userProject.findMany({
                where: { userId },
                include: {
                    project: {
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
                    },
                    modules: { select: { moduleId: true, moduleKey: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            projects = userProjects.map(up => {
                // Prefer moduleId (new); fall back to moduleKey during transition
                const allowedModules = up.modules
                    .map(m => m.moduleId ?? m.moduleKey)
                    .filter((v): v is string => v !== null);
                return { ...up.project, allowedModules };
            });
        } else {
            // admin/engineer: all projects
            projects = await prisma.project.findMany({
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
        }

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
router.get('/:id', authenticate, enforceProjectAccess('id'), async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const authReq = req as AuthenticatedRequest;
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

        // viewer: attach allowedModules
        if (authReq.user?.role === 'viewer') {
            const up = await prisma.userProject.findUnique({
                where: { userId_projectId: { userId: authReq.user.userId, projectId: id } },
                include: { modules: { select: { moduleId: true, moduleKey: true } } },
            });
            const allowedModules = (up?.modules ?? [])
                .map(m => m.moduleId ?? m.moduleKey)
                .filter((v): v is string => v !== null);
            return res.json({ success: true, data: { ...project, allowedModules } });
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
router.get('/code/:code', authenticate, async (req: Request, res: Response) => {
    try {
        const code = req.params.code as string;
        const authReq = req as AuthenticatedRequest;
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

        // viewer: check access by project.id
        if (authReq.user?.role === 'viewer') {
            const up = await prisma.userProject.findUnique({
                where: { userId_projectId: { userId: authReq.user.userId, projectId: project.id } },
                include: { modules: { select: { moduleId: true, moduleKey: true } } },
            });
            if (!up) {
                return res.status(403).json({ success: false, error: '您沒有此專案的存取權限' });
            }
            const allowedModules = up.modules
                .map(m => m.moduleId ?? m.moduleKey)
                .filter((v): v is string => v !== null);
            return res.json({ success: true, data: { ...project, allowedModules } });
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
router.post('/', authenticate, authorize('admin', 'engineer'), async (req: Request, res: Response) => {
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
router.put('/:id', authenticate, authorize('admin', 'engineer'), async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const updateProjectSchema = z.object({
            name: z.string().min(1, "Name is required").optional(),
            description: z.string().optional(),
            originX: z.number().optional(),
            originY: z.number().optional(),
            northAngle: z.number().optional(),
            isActive: z.boolean().optional(),
        });

        const { name, description, originX, originY, northAngle, isActive } = updateProjectSchema.parse(req.body);

        const project = await prisma.project.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(originX !== undefined && { originX }),
                ...(originY !== undefined && { originY }),
                ...(northAngle !== undefined && { northAngle }),
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
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
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
router.get('/:id/stats', authenticate, async (req: Request, res: Response) => {
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
