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
import prisma from '../lib/prisma';
import { generateIsosurface, IsosurfaceResult } from '../services/isosurface-generator';

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
    const allowedExts = ['.csv', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('不支援的檔案格式。只接受 CSV 或 JSON'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
    },
});

/**
 * GET /api/geology-model
 * 取得所有地質模型版本
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const models = await prisma.geologyModel.findMany({
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
 * 上傳 voxel CSV，自動轉換為 3D Tiles
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '未收到檔案' });
        }

        const {
            version, year, name, description, sourceData,
            cellSizeX, cellSizeY, cellSizeZ
        } = req.body;

        // 驗證必填欄位
        const errors: Record<string, string> = {};
        if (!version) errors.version = '版本號為必填';
        if (!year) errors.year = '資料年份為必填';
        if (!name) errors.name = '模型名稱為必填';

        if (Object.keys(errors).length > 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: '缺少必填欄位', errors });
        }

        const yearNum = parseInt(year, 10);
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: '資料年份格式錯誤（1900-2100）' });
        }

        // 建立資料庫記錄 (狀態: pending)
        const model = await prisma.geologyModel.create({
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                version: version.trim(),
                year: yearNum,
                name: name.trim(),
                description: description?.trim() || null,
                sourceData: sourceData?.trim() || null,
                cellSizeX: cellSizeX ? parseFloat(cellSizeX) : null,
                cellSizeY: cellSizeY ? parseFloat(cellSizeY) : null,
                cellSizeZ: cellSizeZ ? parseFloat(cellSizeZ) : null,
                size: fs.statSync(req.file.path).size,
                conversionStatus: 'pending',
            },
        });

        // 非同步啟動轉換 (不阻塞回應)
        startConversion(model.id, req.file.path);

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
router.post('/:id/activate', async (req: Request, res: Response) => {
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

        // 先將所有模型設為非使用中
        await prisma.geologyModel.updateMany({
            where: { isActive: true },
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
router.delete('/:id', async (req: Request, res: Response) => {
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
 * 非同步轉換流程 (Isosurface GLB)
 */
async function startConversion(modelId: string, csvPath: string, cellSize: number = 20) {
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE = 2000;

    try {
        // 更新狀態為 processing
        await prisma.geologyModel.update({
            where: { id: modelId },
            data: { conversionStatus: 'processing', conversionProgress: 0 },
        });

        // 執行 Isosurface 轉換
        const outputDir = path.join(TILES_DIR, modelId);
        const result: IsosurfaceResult = await generateIsosurface(csvPath, outputDir, cellSize, async (percent: number) => {
            const now = Date.now();
            if ((now - lastProgressUpdate > PROGRESS_THROTTLE) || percent === 100) {
                await prisma.geologyModel.update({
                    where: { id: modelId },
                    data: { conversionProgress: percent },
                });
                lastProgressUpdate = now;
            }
        });

        // 更新為 completed
        await prisma.geologyModel.update({
            where: { id: modelId },
            data: {
                conversionStatus: 'completed',
                conversionProgress: 100,
                meshUrl: result.meshUrl,
                meshFormat: 'glb',
                minX: result.bounds.minX,
                maxX: result.bounds.maxX,
                minY: result.bounds.minY,
                maxY: result.bounds.maxY,
                minZ: result.bounds.minZ,
                maxZ: result.bounds.maxZ,
            },
        });

        console.log(`✅ Geology model ${modelId} isosurface generation completed (${result.layerCount} layers)`);
    } catch (error) {
        console.error(`❌ Geology model ${modelId} conversion failed:`, error);

        await prisma.geologyModel.update({
            where: { id: modelId },
            data: {
                conversionStatus: 'failed',
                conversionProgress: 0,
                conversionError: (error as Error).message,
            },
        });
    }
}

export default router;
