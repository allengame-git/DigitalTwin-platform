/**
 * Lithology API Routes
 * @module routes/lithology
 * 
 * 專案岩性管理 CRUD API
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

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
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, moduleId } = req.query;

        if (!projectId && !moduleId) {
            return res.status(400).json({ error: '缺少 projectId 或 moduleId 參數' });
        }

        const where: any = {};
        if (moduleId) where.moduleId = moduleId as string;
        else if (projectId) where.projectId = projectId as string;

        const lithologies = await prisma.projectLithology.findMany({
            where,
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
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, moduleId, lithId, code, name, color } = req.body;

        if (!projectId || !moduleId || !lithId || !code || !name || !color) {
            return res.status(400).json({ error: '缺少必填欄位（需提供 projectId、moduleId、lithId、code、name、color）' });
        }

        const lithology = await prisma.projectLithology.create({
            data: {
                projectId,
                moduleId,
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
router.put('/:id', authenticate, async (req: Request, res: Response) => {
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
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // 1. 檢查岩性是否存在並取得代碼
        const lithology = await prisma.projectLithology.findUnique({
            where: { id: id as string }
        });

        if (!lithology) {
            return res.status(404).json({ error: '找不到岩性資料' });
        }

        // 2. 檢查是否有地層資料使用此岩性代碼
        // 注意：這裡是跨專案檢查還是單一專案？ BoreholeLayer 沒有 projectId，是跟隨 Borehole
        // 但 lithology code 在專案內是唯一的。
        // 若要精確檢查，需 join Borehole -> Project，確認是同一個專案下的使用
        // 簡化作法：若 BoreholeLayer 有此 lithologyCode 且其所屬 Borehole 的 projectId 與此 lithology 的 projectId 相同

        const usageCount = await prisma.boreholeLayer.count({
            where: {
                lithologyCode: lithology.code,
                borehole: {
                    projectId: lithology.projectId
                }
            }
        });

        if (usageCount > 0) {
            return res.status(400).json({
                error: `無法刪除：此岩性已被 ${usageCount} 筆地層資料使用中，請先修改或刪除相關資料`
            });
        }

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
router.post('/init-defaults', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, moduleId } = req.body;

        if (!projectId || !moduleId) {
            return res.status(400).json({ error: '缺少 projectId 或 moduleId 參數' });
        }

        // 檢查是否已有岩性資料
        const existing = await prisma.projectLithology.count({
            where: { projectId, moduleId }
        });

        if (existing > 0) {
            return res.status(400).json({ error: '專案已有岩性資料，請先清除後再初始化' });
        }

        // 批次建立預設岩性
        const created = await prisma.projectLithology.createMany({
            data: DEFAULT_LITHOLOGIES.map(l => ({
                projectId,
                moduleId,
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

/**
 * POST /api/lithology/batch
 * 批次匯入岩性 (CSV)
 */
router.post('/batch', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, moduleId, lithologies } = req.body;

        if (!projectId || !moduleId || !Array.isArray(lithologies) || lithologies.length === 0) {
            return res.status(400).json({ error: '無效的請求資料（需提供 projectId、moduleId 及 lithologies）' });
        }

        // 檢查 projectId
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({ error: '找不到專案' });
        }

        // 檢查是否已有重複的 lithId 或 code (僅在這次 batch 內檢查)
        // 實際寫入時由 database constraint把關
        // 使用 transaction 確保全部成功或全部失敗
        const result = await prisma.$transaction(async (tx) => {
            let count = 0;
            for (const item of lithologies) {
                // 檢查是否存在，若存在則忽略或更新？
                // 這裡選用 upsert 或者先 check
                // 簡單起見，直接 create，若失敗則整批失敗 (符合一般 CSV import 邏輯)
                // 但為了使用者體驗，我們可以先檢查

                await tx.projectLithology.create({
                    data: {
                        projectId,
                        moduleId,
                        lithId: parseInt(item.lithId),
                        code: item.code.trim().toUpperCase(),
                        name: item.name.trim(),
                        color: item.color.trim()
                    }
                });
                count++;
            }
            return count;
        });

        res.status(201).json({ success: true, count: result });

    } catch (error: any) {
        console.error('Error batch importing lithologies:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: '部分岩性代碼或 ID 已存在，請檢查資料' });
        }
        res.status(500).json({ error: '無法匯入岩性資料' });
    }
});

export default router;
