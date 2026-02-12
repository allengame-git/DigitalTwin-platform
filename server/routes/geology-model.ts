/**
 * Geology Model Routes
 * @module server/routes/geology-model
 * 
 * 3D 地質模型版本管理 API
 * 支援 Voxel CSV 上傳 → 自動轉換 3D Tiles
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// 上傳目錄
const GEOLOGY_DIR = path.join(__dirname, '../uploads/geology');
const TILES_DIR = path.join(__dirname, '../uploads/geology-tiles');

// 確保目錄存在
[GEOLOGY_DIR, TILES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Multer 設定 - 接受 CSV 檔案
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, GEOLOGY_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `voxel-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExts = ['.dat'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('不支援的檔案格式。只接受 Tecplot DAT'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB
    },
});

// 單一 Tecplot DAT 檔案
const uploadFields = upload.fields([
    { name: 'file', maxCount: 1 },
]);

/**
 * GET /api/geology-model
 * 取得所有地質模型版本
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;
        if (!projectId) {
            return res.status(400).json({ message: 'Missing projectId' });
        }

        const models = await prisma.geologyModel.findMany({
            where: { projectId: projectId as string },
            orderBy: [
                { isActive: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        res.json({ success: true, data: models });
    } catch (error) {
        console.error('Fetch geology models error:', error);
        res.status(500).json({ message: '讀取失敗', error: (error as Error).message });
    }
});

/**
 * GET /api/geology-model/:id
 * 取得單一模型詳情
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const model = await prisma.geologyModel.findUnique({
            where: { id: req.params.id as string },
        });

        if (!model) {
            return res.status(404).json({ message: '找不到此模型' });
        }

        res.json({ success: true, data: model });
    } catch (error) {
        res.status(500).json({ message: '讀取失敗', error: (error as Error).message });
    }
});

/**
 * GET /api/geology-model/:id/status
 * 查詢轉換狀態
 */
router.get('/:id/status', async (req: Request, res: Response) => {
    try {
        const model = await prisma.geologyModel.findUnique({
            where: { id: req.params.id as string },
            select: {
                id: true,
                conversionStatus: true,
                conversionProgress: true,
                conversionError: true,
                tilesetUrl: true,
            },
        });

        if (!model) {
            return res.status(404).json({ message: '找不到此模型' });
        }

        res.json({ success: true, data: model });
    } catch (error) {
        res.status(500).json({ message: '讀取失敗', error: (error as Error).message });
    }
});

/**
 * POST /api/geology-model
 * 上傳 Tecplot DAT，自動轉換為 GLB
 */
router.post('/', authenticate, uploadFields, async (req: Request, res: Response) => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const geoFile = files?.file?.[0];

        if (!geoFile) {
            return res.status(400).json({ message: '未收到 Tecplot DAT 檔案' });
        }

        const {
            projectId,
            version, year, name, description, sourceData,
        } = req.body;

        // 驗證必填欄位
        const errors: Record<string, string> = {};
        if (!projectId) errors.projectId = '專案 ID 為必填';
        if (!version) errors.version = '版本號為必填';
        if (!year) errors.year = '資料年份為必填';
        if (!name) errors.name = '模型名稱為必填';

        if (Object.keys(errors).length > 0) {
            fs.unlinkSync(geoFile.path);
            return res.status(400).json({ message: '缺少必填欄位', errors });
        }

        const yearNum = parseInt(year, 10);
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
            fs.unlinkSync(geoFile.path);
            return res.status(400).json({ message: '資料年份格式錯誤（1900-2100）' });
        }

        // 建立資料庫記錄 (狀態: pending)
        const model = await prisma.geologyModel.create({
            data: {
                projectId,
                filename: geoFile.filename,
                originalName: geoFile.originalname,
                version: version.trim(),
                year: yearNum,
                name: name.trim(),
                description: description?.trim() || null,
                sourceData: sourceData?.trim() || null,
                size: fs.statSync(geoFile.path).size,
                conversionStatus: 'pending',
            },
        });

        // 非同步啟動轉換 (不阻塞回應)
        startConversion(model.id, projectId, geoFile.path);

        res.json({
            success: true,
            data: model,
            message: '上傳成功，轉換中...',
        });
    } catch (error) {
        console.error('Geology model upload error:', error);
        res.status(500).json({ message: '上傳失敗', error: (error as Error).message });
    }
});

/**
 * POST /api/geology-model/:id/activate
 * 設為當前使用版本
 */
router.post('/:id/activate', authenticate, async (req: Request, res: Response) => {
    try {
        const targetId = req.params.id;

        // 確認目標存在且轉換完成
        const target = await prisma.geologyModel.findUnique({
            where: { id: targetId as string },
        });

        if (!target) {
            return res.status(404).json({ message: '找不到此模型' });
        }

        if (target.conversionStatus !== 'completed') {
            return res.status(400).json({ message: '此模型尚未轉換完成' });
        }

        // 先將所有該專案的模型設為非使用中
        await prisma.geologyModel.updateMany({
            where: {
                projectId: target.projectId,
                isActive: true
            },
            data: { isActive: false },
        });

        // 設定目標為使用中
        const updated = await prisma.geologyModel.update({
            where: { id: targetId as string },
            data: { isActive: true },
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Activate geology model error:', error);
        res.status(500).json({ message: '設定失敗', error: (error as Error).message });
    }
});

/**
 * DELETE /api/geology-model/:id
 * 刪除模型
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const model = await prisma.geologyModel.findUnique({
            where: { id: req.params.id as string },
        });

        if (!model) {
            return res.status(404).json({ message: '找不到此模型' });
        }

        // 刪除原始 CSV 檔案
        const csvPath = path.join(GEOLOGY_DIR, model.filename);
        if (fs.existsSync(csvPath)) {
            fs.unlinkSync(csvPath);
        }

        // 刪除轉換後的 tiles 目錄
        if (model.tilesetUrl) {
            const tilesDir = path.join(__dirname, '..', model.tilesetUrl.replace('/uploads/', 'uploads/'));
            const parentDir = path.dirname(tilesDir);
            if (fs.existsSync(parentDir)) {
                fs.rmSync(parentDir, { recursive: true, force: true });
            }
        }

        // 從資料庫刪除
        await prisma.geologyModel.delete({
            where: { id: req.params.id as string },
        });

        res.json({ success: true, message: '已刪除' });
    } catch (error) {
        console.error('Delete geology model error:', error);
        res.status(500).json({ message: '刪除失敗', error: (error as Error).message });
    }
});

/**
 * 非同步轉換流程 (Python PyVista Mesh Builder — Tecplot Only)
 */
async function startConversion(
    modelId: string,
    projectId: string,
    datPath: string,
) {
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE = 2000;

    try {
        // 取得專案設定的原點
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { originX: true, originY: true },
        });

        const origin = {
            x: project?.originX ?? 224000,
            y: project?.originY ?? 2429000,
        };

        // 取得專案岩性顏色定義
        const lithDefs = await prisma.projectLithology.findMany({
            where: { projectId },
            select: { lithId: true, color: true, name: true },
        });

        const lithColors: Record<string, number[]> = {};
        for (const def of lithDefs) {
            // color 格式: "#8b4513" → [139, 69, 19]
            const hex = def.color.replace('#', '');
            lithColors[String(def.lithId)] = [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16),
            ];
        }

        console.log(`🎨 [${modelId}] Lithology colors:`, lithColors);
        console.log(`🎨 [${modelId}] Lithology definitions:`, lithDefs.map(d => `${d.lithId}: ${d.name} (${d.color})`));

        // 更新狀態為 processing
        await prisma.geologyModel.update({
            where: { id: modelId },
            data: { conversionStatus: 'processing', conversionProgress: 0 },
        });

        // 準備輸出路徑
        const outputDir = path.join(TILES_DIR, modelId);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputGlb = path.join(outputDir, 'model.glb');

        // Python 虛擬環境路徑
        const venvPython = path.join(__dirname, '../scripts/.venv/bin/python3');
        const scriptPath = path.join(__dirname, '../scripts/geology_mesh_builder.py');

        // 建構 Python 參數
        const args = [
            scriptPath,
            '--geology', datPath,
            '--output', outputGlb,
            '--origin', JSON.stringify(origin),
            '--colors', JSON.stringify(lithColors),
            '--volume-resolution', '160',
            '--decimate', '0.2',
        ];

        console.log(`🐍 Starting Python conversion for model ${modelId}`);
        console.log(`   Command: ${venvPython} ${args.join(' ')}`);

        // Spawn Python process
        await new Promise<void>((resolve, reject) => {
            const proc = spawn(venvPython, args, {
                cwd: path.dirname(scriptPath),
                env: { ...process.env, PYTHONUNBUFFERED: '1' },
            });

            let stderr = '';
            let settled = false;

            const safeReject = (err: Error) => {
                if (!settled) { settled = true; reject(err); }
            };
            const safeResolve = () => {
                if (!settled) { settled = true; resolve(); }
            };

            proc.stdout.on('data', (data: Buffer) => {
                const lines = data.toString().trim().split('\n');
                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.progress !== undefined) {
                            const now = Date.now();
                            if ((now - lastProgressUpdate > PROGRESS_THROTTLE) || msg.progress >= 100) {
                                // Fire-and-forget: 不 await，避免 async 事件 handler race condition
                                prisma.geologyModel.update({
                                    where: { id: modelId },
                                    data: { conversionProgress: Math.round(msg.progress) },
                                }).catch(() => {/* model 可能已被刪除 */ });
                                lastProgressUpdate = now;
                            }
                            console.log(`   [${modelId}] ${msg.progress}% - ${msg.message || ''}`);
                        }
                        if (msg.status === 'error') {
                            safeReject(new Error(msg.error));
                        }
                    } catch {
                        // Non-JSON output (e.g. PyVista warnings), ignore
                        console.log(`   [Python] ${line}`);
                    }
                }
            });

            proc.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    safeResolve();
                } else {
                    safeReject(new Error(`Python exited with code ${code}: ${stderr.slice(-500)}`));
                }
            });

            proc.on('error', (err) => {
                safeReject(new Error(`Failed to start Python: ${err.message}`));
            });
        });

        // 確認 GLB 產生
        if (!fs.existsSync(outputGlb)) {
            throw new Error('Python 腳本完成但未產生 GLB 檔案');
        }

        // 更新為 completed
        const meshUrl = `/uploads/geology-tiles/${modelId}/model.glb`;
        await prisma.geologyModel.update({
            where: { id: modelId },
            data: {
                conversionStatus: 'completed',
                conversionProgress: 100,
                meshUrl,
                meshFormat: 'glb',
            },
        });

        console.log(`✅ Geology model ${modelId} PyVista conversion completed`);
    } catch (error) {
        console.error(`❌ Geology model ${modelId} conversion failed:`, error);

        try {
            await prisma.geologyModel.update({
                where: { id: modelId },
                data: {
                    conversionStatus: 'failed',
                    conversionProgress: 0,
                    conversionError: (error as Error).message,
                },
            });
        } catch (dbError) {
            // Model 可能已被使用者刪除
            console.error(`   DB update also failed (model may have been deleted):`, dbError);
        }
    }
}

/**
 * Server 啟動時恢復卡住的轉換記錄
 * 當 nodemon 重啟或 server crash 時，正在 processing 的記錄會永遠卡住
 */
async function recoverStuckConversions() {
    try {
        const stuckModels = await prisma.geologyModel.findMany({
            where: {
                conversionStatus: { in: ['pending', 'processing'] },
            },
            select: { id: true, conversionStatus: true, filename: true },
        });

        if (stuckModels.length === 0) return;

        console.log(`🔧 Found ${stuckModels.length} stuck geology model(s), recovering...`);

        for (const model of stuckModels) {
            // 檢查 GLB 是否已經產生（Python 可能在 DB 更新前就完成了）
            const glbPath = path.join(TILES_DIR, model.id, 'model.glb');
            if (fs.existsSync(glbPath)) {
                // GLB 已產生，標記為 completed
                await prisma.geologyModel.update({
                    where: { id: model.id },
                    data: {
                        conversionStatus: 'completed',
                        conversionProgress: 100,
                        meshUrl: `/uploads/geology-tiles/${model.id}/model.glb`,
                        meshFormat: 'glb',
                    },
                });
                console.log(`   ✅ ${model.id} recovered as completed (GLB exists)`);
            } else {
                // GLB 不存在，標記為 failed
                await prisma.geologyModel.update({
                    where: { id: model.id },
                    data: {
                        conversionStatus: 'failed',
                        conversionProgress: 0,
                        conversionError: 'Server 重啟導致轉換中斷，請重新上傳',
                    },
                });
                console.log(`   ❌ ${model.id} marked as failed (no GLB)`);
            }
        }
    } catch (error) {
        console.error('Recover stuck conversions error:', error);
    }
}

// Server 啟動時執行恢復 (延遲 3 秒確保 DB 連線穩定)
setTimeout(() => {
    recoverStuckConversions().catch(err => {
        console.error('⚠️ [GeologyModel] Recovery failed on startup:', err);
    });
}, 3000);

export default router;
