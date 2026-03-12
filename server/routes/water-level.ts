/**
 * Water Level API Routes (地下水位面)
 * @module routes/water-level
 *
 * POST   /api/water-level       - 上傳 CSV/DAT/TXT 並插值生成水位面
 * GET    /api/water-level       - 取得專案水位面列表
 * DELETE /api/water-level/:id   - 刪除水位面
 */

import { Router, Request, Response } from 'express';
import { safeResolvePath } from '../lib/safePath';
import { getPythonExecutable } from '../lib/pythonPath';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// Upload directories
const UPLOAD_DIR = path.join(__dirname, '../uploads/water-level');
const PROCESSED_DIR = path.join(__dirname, '../uploads/water-level/processed');

// Ensure directories exist
[UPLOAD_DIR, PROCESSED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['.csv', '.dat', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('只支援 .csv, .dat, .txt 檔案'));
        }
    },
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

/**
 * POST /api/water-level
 * 上傳並處理地下水位資料
 */
router.post('/', authenticate, upload.single('file'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const { projectId, moduleId, name, sourceType = 'well', width = '512', method = 'linear', bounds } = req.body;

        if (!file) return res.status(400).json({ error: '請選擇檔案' });
        if (!projectId) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: '缺少 Project ID' });
        }

        // Python script
        const pythonScript = path.join(__dirname, '../scripts/water_level_processor.py');
        const pythonExecutable = getPythonExecutable();

        const pythonArgs = [
            pythonScript,
            '--input', file.path,
            '--output-dir', PROCESSED_DIR,
            '--source-type', sourceType,
            '--width', width.toString(),
            '--method', method,
        ];

        if (bounds && sourceType === 'well') {
            pythonArgs.push('--bounds', bounds);
        }

        const pythonProcess = spawn(pythonExecutable, pythonArgs);

        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data: Buffer) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data: Buffer) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', async (code: number) => {
            if (code !== 0) {
                console.error('[Water Level Processor Error]:', errorData);
                try {
                    const errorJson = JSON.parse(outputData.trim().split('\n').pop() || '{}');
                    return res.status(500).json({ error: errorJson.error || '處理失敗' });
                } catch {
                    return res.status(500).json({ error: '處理失敗', details: errorData });
                }
            }

            try {
                // Parse last line (result JSON)
                const lines = outputData.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                const { result: meta } = JSON.parse(lastLine);

                if (!meta || !meta.heightmap) {
                    return res.status(500).json({ error: '處理結果異常' });
                }

                const waterLevel = await prisma.waterLevel.create({
                    data: {
                        projectId,
                        ...(moduleId && { moduleId }),
                        name: name || file.originalname,
                        sourceType,
                        filename: file.filename,
                        originalName: file.originalname,
                        path: `/uploads/water-level/${file.filename}`,
                        heightmap: `/uploads/water-level/processed/${meta.heightmap}`,
                        minX: meta.minX,
                        maxX: meta.maxX,
                        minY: meta.minY,
                        maxY: meta.maxY,
                        minZ: meta.minZ,
                        maxZ: meta.maxZ,
                        width: meta.width,
                        height: meta.height,
                        pointCount: meta.pointCount,
                    }
                });

                res.status(201).json(waterLevel);

            } catch (err: any) {
                console.error('[Water Level API Error]:', err);
                res.status(500).json({ error: '系統錯誤', details: err.message });
            }
        });

    } catch (err: any) {
        console.error('[Water Level Upload Error]:', err);
        res.status(500).json({ error: '上傳失敗', details: err.message });
    }
});

/**
 * GET /api/water-level
 * 取得專案水位面列表
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, moduleId } = req.query;
        if (!projectId && !moduleId) return res.status(400).json({ error: '缺少 projectId 或 moduleId' });

        const where: any = {};
        if (moduleId) where.moduleId = moduleId as string;
        else if (projectId) where.projectId = projectId as string;

        const waterLevels = await prisma.waterLevel.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        res.json(waterLevels);
    } catch (err: any) {
        res.status(500).json({ error: '查詢失敗', details: err.message });
    }
});

/**
 * DELETE /api/water-level/:id
 * 刪除水位面
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const waterLevel = await prisma.waterLevel.findUnique({ where: { id } });
        if (!waterLevel) return res.status(404).json({ error: '找不到水位面資料' });

        await prisma.waterLevel.delete({ where: { id } });

        // Delete files (with path traversal protection)
        for (const url of [waterLevel.path, waterLevel.heightmap]) {
            const safe = safeResolvePath(url);
            if (safe) {
                try {
                    if (fs.existsSync(safe)) fs.unlinkSync(safe);
                } catch (e) {
                    console.warn(`[Water Level] Failed to delete: ${safe}`);
                }
            }
        }

        res.json({ message: '已刪除', id });
    } catch (err: any) {
        res.status(500).json({ error: '刪除失敗', details: err.message });
    }
});

export default router;
