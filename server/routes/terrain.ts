
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// Storage config
const UPLOAD_DIR = path.join(__dirname, '../uploads/terrain');
const PROCESSED_DIR = path.join(__dirname, '../uploads/terrain/processed');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `terrain-${uniqueSuffix}${ext}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['.tif', '.tiff', '.csv', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('只支援 .tif, .tiff, .csv, .jpg, .png 檔案'));
        }
    },
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const terrainUpload = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'satellite', maxCount: 1 }
]);

/**
 * POST /api/terrain
 * 上傳並處理 DEM 檔案
 */
router.post('/', authenticate, terrainUpload, async (req: Request, res: Response) => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const file = files?.file?.[0];
        const satelliteFile = files?.satellite?.[0];
        const { projectId, name, width = '2048', method = 'linear' } = req.body;

        if (!file) return res.status(400).json({ error: '請選擇檔案' });
        if (!projectId) {
            fs.unlinkSync(file.path);
            if (satelliteFile) fs.unlinkSync(satelliteFile.path);
            return res.status(400).json({ error: '缺少 Project ID' });
        }

        // 執行 Python 處理腳本
        const pythonScript = path.join(__dirname, '../scripts/terrain_processor.py');
        const venvPython = path.join(__dirname, '../scripts/.venv/bin/python3');

        // 優先使用虛擬環境，若不存在則退回系統 python3
        const pythonExecutable = fs.existsSync(venvPython) ? venvPython : 'python3';

        const pythonArgs = [
            pythonScript,
            '--input', file.path,
            '--output-dir', PROCESSED_DIR,
            '--width', width.toString(),
            '--method', method
        ];

        // 如果有衛星影像，傳遞給 Python 腳本
        if (satelliteFile) {
            pythonArgs.push('--satellite', satelliteFile.path);
        }

        const pythonProcess = spawn(pythonExecutable, pythonArgs);

        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            const str = data.toString();
            outputData += str;

            // 嘗試從當前輸出中找進度資訊 (僅為了 log)
            const lines = str.split('\n');
            for (const line of lines) {
                if (line.includes('"progress"')) {
                    try {
                        const json = JSON.parse(line.trim());
                        if (json.progress) console.log(`[Terrain] ${json.progress}%: ${json.message}`);
                    } catch (e) { }
                }
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
            console.error(`[Terrain Error] ${data}`);
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error(`[Terrain] Python process error: ${errorData}`);
                return res.status(500).json({ error: '地形處理失敗', details: errorData });
            }

            try {
                const lines = outputData.split('\n');
                let result = null;

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    try {
                        const obj = JSON.parse(trimmed);
                        if (obj.status === 'completed' || obj.status === 'error') {
                            result = obj;
                        }
                    } catch (e) {
                        // Ignore partially parsed or plain text lines
                    }
                }

                if (!result) {
                    throw new Error('Python 腳本未返回有效結果');
                }

                if (result.status === 'error') {
                    throw new Error(result.error || '未知腳本錯誤');
                }

                const meta = result.meta;

                // 儲存至資料庫
                const terrain = await prisma.terrain.create({
                    data: {
                        projectId,
                        name: name || file.originalname,
                        filename: file.filename,
                        originalName: file.originalname,
                        path: `/uploads/terrain/${file.filename}`,
                        heightmap: `/uploads/terrain/processed/${meta.heightmap}`,
                        texture: `/uploads/terrain/processed/${meta.texture}`,
                        satelliteTexture: meta.satellite ? `/uploads/terrain/processed/${meta.satellite}` : null,
                        minX: meta.minX,
                        maxX: meta.maxX,
                        minY: meta.minY,
                        maxY: meta.maxY,
                        minZ: meta.minZ,
                        maxZ: meta.maxZ,
                        width: meta.width,
                        height: meta.height
                    }
                });

                res.status(201).json(terrain);

                // 清理衛星影像原始檔 (已處理為 JPEG)
                if (satelliteFile && fs.existsSync(satelliteFile.path)) {
                    fs.unlinkSync(satelliteFile.path);
                }

            } catch (err: any) {
                console.error('[Terrain API Error]:', err);
                res.status(500).json({ error: '系統錯誤', details: err.message });
            }
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

/**
 * GET /api/terrain
 * List terrains for a project
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;
        if (!projectId) return res.status(400).json({ error: 'ProjectId required' });

        const terrains = await prisma.terrain.findMany({
            where: { projectId: projectId as string, isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json(terrains);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch terrains' });
    }
});

/**
 * DELETE /api/terrain/:id
 * Delete terrain
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const terrain = await prisma.terrain.findUnique({ where: { id } });

        if (!terrain) return res.status(404).json({ error: 'Not found' });

        // Delete files
        const filesToDelete = [
            path.join(__dirname, '..', terrain.path),
            path.join(__dirname, '..', terrain.heightmap),
            path.join(__dirname, '..', terrain.texture || ''),
            path.join(__dirname, '..', terrain.satelliteTexture || '')
        ];

        for (const f of filesToDelete) {
            if (f && fs.existsSync(f) && fs.statSync(f).isFile()) {
                fs.unlinkSync(f);
            }
        }

        await prisma.terrain.delete({ where: { id } });
        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: 'Failed to delete terrain' });
    }
});

export default router;
