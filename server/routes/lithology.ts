/**
 * Lithology API Routes
 * @module routes/lithology
 * 
 * 專案岩性管理 CRUD API
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// 預設岩性列表
const DEFAULT_LITHOLOGIES = [
    { lithId: 1, code: 'CL', name: '黏土', color: '#8b4513' },
    { lithId: 2, code: 'SM', name: '砂質粉土', color: '#c2b280' },
    { lithId: 3, code: 'GP', name: '礫石', color: '#a0522d' },
    { lithId: 4, code: 'SD', name: '砂岩', color: '#f4a460' },
    { lithId: 5, code: 'SH', name: '頁岩', color: '#708090' },
    { lithId: 6, code: 'ML', name: '粉土', color: '#d2b48c' },
    { lithId: 7, code: 'SC', name: '黏質砂土', color: '#deb887' },
    { lithId: 8, code: 'GW', name: '級配良好礫石', color: '#bc8f8f' },
    { lithId: 9, code: 'SW', name: '級配良好砂', color: '#f5deb3' },
    { lithId: 10, code: 'BR', name: '基岩', color: '#5a3e1b' },
    { lithId: 11, code: 'SF', name: '回填土', color: '#a9a9a9' },
];

/**
 * GET /api/lithology
 * 取得專案岩性列表
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({ error: '缺少 projectId 參數' });
        }

        const lithologies = await prisma.projectLithology.findMany({
            where: { projectId: projectId as string },
            orderBy: { lithId: 'asc' }
        });

        res.json(lithologies);
    } catch (error) {
        console.error('Error fetching lithologies:', error);
        res.status(500).json({ error: '無法取得岩性資料' });
    }
});

/**
 * POST /api/lithology
 * 新增岩性
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { projectId, lithId, code, name, color } = req.body;

        if (!projectId || !lithId || !code || !name || !color) {
            return res.status(400).json({ error: '缺少必填欄位' });
        }

        const lithology = await prisma.projectLithology.create({
            data: {
                projectId,
                lithId: parseInt(lithId),
                code: code.trim().toUpperCase(),
                name: name.trim(),
                color: color.trim()
            }
        });

        res.status(201).json(lithology);
    } catch (error: any) {
        console.error('Error creating lithology:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: '岩性代碼或 ID 已存在' });
        }
        res.status(500).json({ error: '無法新增岩性' });
    }
});

/**
 * PUT /api/lithology/:id
 * 更新岩性
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { lithId, code, name, color } = req.body;

        const lithology = await prisma.projectLithology.update({
            where: { id: id as string },
            data: {
                lithId: lithId !== undefined ? parseInt(lithId) : undefined,
                code: code?.trim().toUpperCase(),
                name: name?.trim(),
                color: color?.trim()
            }
        });

        res.json(lithology);
    } catch (error: any) {
        console.error('Error updating lithology:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: '岩性代碼或 ID 已存在' });
        }
        res.status(500).json({ error: '無法更新岩性' });
    }
});

/**
 * DELETE /api/lithology/:id
 * 刪除岩性
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.projectLithology.delete({
            where: { id: id as string }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting lithology:', error);
        res.status(500).json({ error: '無法刪除岩性' });
    }
});

/**
 * POST /api/lithology/init-defaults
 * 以預設岩性初始化專案
 */
router.post('/init-defaults', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({ error: '缺少 projectId 參數' });
        }

        // 檢查是否已有岩性資料
        const existing = await prisma.projectLithology.count({
            where: { projectId }
        });

        if (existing > 0) {
            return res.status(400).json({ error: '專案已有岩性資料，請先清除後再初始化' });
        }

        // 批次建立預設岩性
        const created = await prisma.projectLithology.createMany({
            data: DEFAULT_LITHOLOGIES.map(l => ({
                projectId,
                lithId: l.lithId,
                code: l.code,
                name: l.name,
                color: l.color
            }))
        });

        res.status(201).json({
            success: true,
            count: created.count
        });
    } catch (error) {
        console.error('Error initializing default lithologies:', error);
        res.status(500).json({ error: '無法初始化預設岩性' });
    }
});

export default router;
