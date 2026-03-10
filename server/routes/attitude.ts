/**
 * Attitude API Routes
 * @module routes/attitude
 *
 * 位態資料 CRUD + 批次匯入 API
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/attitude
 * 取得專案所有位態資料
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({ success: false, error: 'projectId is required' });
        }

        const attitudes = await prisma.attitude.findMany({
            where: { projectId: projectId as string },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: attitudes });
    } catch (error) {
        console.error('Error fetching attitudes:', error);
        res.status(500).json({ success: false, error: '無法取得位態資料' });
    }
});

/**
 * POST /api/attitude
 * 新增單筆位態 (需登入)
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, x, y, z, strike, dip, dipDirection, description } = req.body;

        if (!projectId || x === undefined || y === undefined || z === undefined ||
            strike === undefined || dip === undefined) {
            return res.status(400).json({
                success: false,
                error: '缺少必填欄位 (projectId, x, y, z, strike, dip)',
            });
        }

        // 驗證數值範圍
        const strikeVal = parseFloat(strike);
        const dipVal = parseFloat(dip);

        if (strikeVal < 0 || strikeVal > 360) {
            return res.status(400).json({ success: false, error: '走向角度需介於 0-360' });
        }
        if (dipVal < 0 || dipVal > 90) {
            return res.status(400).json({ success: false, error: '傾角需介於 0-90' });
        }

        const attitude = await prisma.attitude.create({
            data: {
                projectId,
                x: parseFloat(x),
                y: parseFloat(y),
                z: parseFloat(z),
                strike: strikeVal,
                dip: dipVal,
                dipDirection: dipDirection || null,
                description: description || null,
            },
        });

        res.status(201).json({ success: true, data: attitude });
    } catch (error) {
        console.error('Error creating attitude:', error);
        res.status(500).json({ success: false, error: '無法新增位態資料' });
    }
});

/**
 * PUT /api/attitude/:id
 * 更新位態 (需登入)
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { x, y, z, strike, dip, dipDirection, description } = req.body;

        const existing = await prisma.attitude.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: '找不到位態資料' });
        }

        // 驗證數值範圍
        if (strike !== undefined) {
            const strikeVal = parseFloat(strike);
            if (strikeVal < 0 || strikeVal > 360) {
                return res.status(400).json({ success: false, error: '走向角度需介於 0-360' });
            }
        }
        if (dip !== undefined) {
            const dipVal = parseFloat(dip);
            if (dipVal < 0 || dipVal > 90) {
                return res.status(400).json({ success: false, error: '傾角需介於 0-90' });
            }
        }

        const attitude = await prisma.attitude.update({
            where: { id },
            data: {
                ...(x !== undefined && { x: parseFloat(x) }),
                ...(y !== undefined && { y: parseFloat(y) }),
                ...(z !== undefined && { z: parseFloat(z) }),
                ...(strike !== undefined && { strike: parseFloat(strike) }),
                ...(dip !== undefined && { dip: parseFloat(dip) }),
                ...(dipDirection !== undefined && { dipDirection: dipDirection || null }),
                ...(description !== undefined && { description: description || null }),
            },
        });

        res.json({ success: true, data: attitude });
    } catch (error) {
        console.error('Error updating attitude:', error);
        res.status(500).json({ success: false, error: '無法更新位態資料' });
    }
});

/**
 * DELETE /api/attitude/:id
 * 刪除位態 (需登入)
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.attitude.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: '找不到位態資料' });
        }

        await prisma.attitude.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting attitude:', error);
        res.status(500).json({ success: false, error: '無法刪除位態資料' });
    }
});

/**
 * POST /api/attitude/batch-import
 * CSV 批次匯入位態 (需登入)
 */
router.post('/batch-import', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, attitudes } = req.body;

        if (!projectId) {
            return res.status(400).json({ success: false, error: 'projectId is required' });
        }

        if (!attitudes || !Array.isArray(attitudes) || attitudes.length === 0) {
            return res.status(400).json({ success: false, error: 'attitudes array is required' });
        }

        // 取得專案現有資料以進行重複檢查
        const existingAttitudes = await prisma.attitude.findMany({
            where: { projectId },
            select: { x: true, y: true, z: true, strike: true, dip: true },
        });

        const existingSet = new Set(
            existingAttitudes.map(a => `${a.x},${a.y},${a.z},${a.strike},${a.dip}`)
        );

        let success = 0;
        let failed = 0;
        let duplicates = 0;
        const errors: string[] = [];

        // 使用 transaction 批次寫入以提升效能
        const createPromises = [];

        for (let i = 0; i < attitudes.length; i++) {
            const att = attitudes[i];
            try {
                const x = parseFloat(att.x);
                const y = parseFloat(att.y);
                const z = parseFloat(att.z);
                const strike = parseFloat(att.strike);
                const dip = parseFloat(att.dip);

                if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(strike) || isNaN(dip)) {
                    throw new Error('x, y, z, strike, dip 為必填數值');
                }
                if (strike < 0 || strike > 360) {
                    throw new Error('走向角度需介於 0-360');
                }
                if (dip < 0 || dip > 90) {
                    throw new Error('傾角需介於 0-90');
                }

                // 重複檢查
                const key = `${x},${y},${z},${strike},${dip}`;
                if (existingSet.has(key)) {
                    duplicates++;
                    continue;
                }

                existingSet.add(key); // 避免同批次內的重複

                createPromises.push(
                    prisma.attitude.create({
                        data: {
                            projectId,
                            x,
                            y,
                            z,
                            strike,
                            dip,
                            dipDirection: att.dipDirection || null,
                            description: att.description || null,
                        },
                    })
                );

                success++;
            } catch (err) {
                failed++;
                errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }

        // 執行所有寫入
        if (createPromises.length > 0) {
            await prisma.$transaction(createPromises);
        }

        res.status(201).json({
            success: true,
            data: { success, failed, duplicates, errors },
        });
    } catch (error) {
        console.error('Error batch importing attitudes:', error);
        res.status(500).json({ success: false, error: '批次匯入失敗' });
    }
});

export default router;
