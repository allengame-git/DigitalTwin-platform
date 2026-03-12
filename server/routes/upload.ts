/**
 * Upload Routes
 * @module server/routes/upload
 * 
 * 資料上傳 API (MVP: 航照圖)
 * 整合 Prisma + PostgreSQL + GeoTIFF 解析
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import * as GeoTIFF from 'geotiff';

import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// 上傳目錄
const UPLOAD_DIR = path.join(__dirname, '../uploads/imagery');

// 確保目錄存在
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer 設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `imagery-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('不支援的檔案格式。只接受 JPG, PNG, TIF'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
    },
});

/**
 * 解析 GeoTIFF 邊界資訊
 * @param filePath 檔案路徑
 * @returns { minX, minY, maxX, maxY } | null
 */
async function parseGeoTiffBounds(filePath: string) {
    try {
        const buffer = fs.readFileSync(filePath);
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();

        const width = image.getWidth();
        const height = image.getHeight();
        const origin = image.getOrigin();
        const resolution = image.getResolution();
        const bbox = image.getBoundingBox();

        // 簡單驗證是否為有效的 GeoTIFF
        if (!origin || !resolution) {
            return null;
        }

        // bbox: [minX, minY, maxX, maxY]
        return {
            minX: bbox[0],
            minY: bbox[1],
            maxX: bbox[2],
            maxY: bbox[3],
        };
    } catch (error) {
        console.warn('GeoTIFF parse warning:', error);
        return null;
    }
}

// 上傳航照圖
router.post('/imagery', authenticate, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '未收到檔案' });
        }

        // 驗證必填 metadata
        const { projectId, moduleId, year, name, source, description, minX, maxX, minY, maxY } = req.body;

        if (!projectId || !year || !name) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                message: '缺少必填欄位',
                errors: {
                    projectId: !projectId ? '專案 ID 為必填' : null,
                    year: !year ? '資料年份為必填' : null,
                    name: !name ? '資料名稱為必填' : null,
                },
            });
        }

        const yearNum = parseInt(year, 10);
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: '資料年份格式錯誤（1900-2100）' });
        }

        const originalPath = req.file.path;
        const ext = path.extname(req.file.originalname).toLowerCase();
        let finalPath = originalPath;
        let finalFilename = req.file.filename;

        // 座標處理邏輯：
        // 1. 初始化為手動輸入值 (如果有的話)
        let bounds = {
            minX: minX ? parseFloat(minX) : null,
            maxX: maxX ? parseFloat(maxX) : null,
            minY: minY ? parseFloat(minY) : null,
            maxY: maxY ? parseFloat(maxY) : null,
        };

        // 2. 如果是 TIF 且手動欄位有缺，嘗試自動解析
        if ((ext === '.tif' || ext === '.tiff') &&
            (!bounds.minX || !bounds.maxX || !bounds.minY || !bounds.maxY)) {

            console.log('Attempting to parse GeoTIFF bounds...');
            const geoBounds = await parseGeoTiffBounds(originalPath);

            if (geoBounds) {
                console.log('GeoTIFF bounds found:', geoBounds);
                // 優先使用手動輸入值 (override)，若無則填入自動解析值
                bounds.minX = bounds.minX ?? geoBounds.minX;
                bounds.maxX = bounds.maxX ?? geoBounds.maxX;
                bounds.minY = bounds.minY ?? geoBounds.minY;
                bounds.maxY = bounds.maxY ?? geoBounds.maxY;
            }
        }

        // TIF 轉換為 PNG (用於顯示)
        if (ext === '.tif' || ext === '.tiff') {
            const pngFilename = req.file.filename.replace(/\.(tif|tiff)$/i, '.png');
            const pngPath = path.join(UPLOAD_DIR, pngFilename);

            await sharp(originalPath)
                .png({ quality: 90 })
                .toFile(pngPath);

            // 注意：我們保留原始 TIF 嗎？如果空間允許，保留原始檔通常較好以便未來重算
            // 但依據前次邏輯是刪除。這裡維持原邏輯：刪除原始 TIF，只留 PNG 供顯示。
            // *修正*：若要保留 GeoTIFF 的地理資訊供下載，應保留原檔。
            // 但作為 MVP 顯示用，先維持轉換邏輯。
            fs.unlinkSync(originalPath);
            finalPath = pngPath;
            finalFilename = pngFilename;
        }

        // 產生縮圖
        const thumbFilename = `thumb-${finalFilename}`;
        const thumbPath = path.join(UPLOAD_DIR, thumbFilename);
        await sharp(finalPath)
            .resize(256, 256, { fit: 'cover' })
            .toFile(thumbPath);

        // 儲存到資料庫
        const imagery = await prisma.imagery.create({
            data: {
                projectId,
                ...(moduleId && { moduleId }),
                filename: finalFilename,
                originalName: req.file.originalname,
                year: yearNum,
                name: name.trim(),
                source: source?.trim() || null,
                description: description?.trim() || null,
                // 寫入座標 (Prisma Float? 接受 null)
                minX: bounds.minX,
                maxX: bounds.maxX,
                minY: bounds.minY,
                maxY: bounds.maxY,

                size: fs.statSync(finalPath).size,
                url: `/uploads/imagery/${finalFilename}`,
                thumbnailUrl: `/uploads/imagery/${thumbFilename}`,
            },
        });

        res.json({
            success: true,
            data: imagery,
        });
    } catch (error) {
        console.error('Imagery upload error:', error);
        res.status(500).json({ message: '上傳失敗', error: (error as Error).message });
    }
});

// 取得已上傳列表
router.get('/imagery', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, moduleId } = req.query;
        if (!projectId && !moduleId) {
            return res.status(400).json({ message: 'Missing projectId or moduleId' });
        }

        const where: any = {};
        if (moduleId) where.moduleId = moduleId as string;
        else if (projectId) where.projectId = projectId as string;

        const images = await prisma.imagery.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: images });
    } catch (error) {
        res.status(500).json({ message: '讀取失敗', error: (error as Error).message });
    }
});

// 取得單一圖資
router.get('/imagery/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const imagery = await prisma.imagery.findUnique({
            where: { id },
        });

        if (!imagery) {
            return res.status(404).json({ message: '找不到此圖資' });
        }

        res.json({ success: true, data: imagery });
    } catch (error) {
        console.error('Imagery fetch error:', error);
        res.status(500).json({ message: '讀取失敗', error: (error as Error).message });
    }
});

// 刪除檔案
router.delete('/imagery/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        // 先從資料庫取得資訊
        const imagery = await prisma.imagery.findUnique({
            where: { id },
        });

        if (!imagery) {
            return res.status(404).json({ message: '找不到此圖資' });
        }

        // 刪除實體檔案
        const filePath = path.join(UPLOAD_DIR, imagery.filename);
        const thumbPath = path.join(UPLOAD_DIR, `thumb-${imagery.filename}`);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath);
        }

        // 從資料庫刪除
        await prisma.imagery.delete({
            where: { id: id as string },
        });

        res.json({ success: true, message: '已刪除' });
    } catch (error) {
        console.error('Imagery delete error:', error);
        res.status(500).json({ message: '刪除失敗', error: (error as Error).message });
    }
});

// ===============================
// 地球物理探查資料 API
// ===============================

// 上傳目錄 (Geophysics)
const GEOPHYSICS_DIR = path.join(__dirname, '../uploads/geophysics');
if (!fs.existsSync(GEOPHYSICS_DIR)) {
    fs.mkdirSync(GEOPHYSICS_DIR, { recursive: true });
}

// Multer 設定 (Geophysics)
const geophysicsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, GEOPHYSICS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `geophysics-${uniqueSuffix}${ext}`);
    },
});

const geophysicsUpload = multer({
    storage: geophysicsStorage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
});

// 上傳地球物理探查資料 (需登入)
router.post('/geophysics', authenticate, geophysicsUpload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '未收到檔案' });
        }

        const {
            projectId, moduleId,
            year, name, lineId, method, description,
            x1, y1, z1, x2, y2, z2,
            depthTop, depthBottom
        } = req.body;

        // 驗證必填欄位
        const errors: Record<string, string | null> = {};
        if (!projectId) errors.projectId = '專案 ID 為必填';
        if (!year) errors.year = '資料年份為必填';
        if (!name) errors.name = '資料名稱為必填';
        if (!method) errors.method = '探查方法為必填';
        if (!x1 || !y1 || !z1) errors.leftPoint = '左端點座標為必填';
        if (!x2 || !y2 || !z2) errors.rightPoint = '右端點座標為必填';

        if (Object.keys(errors).length > 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: '缺少必填欄位', errors });
        }

        const yearNum = parseInt(year, 10);
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: '資料年份格式錯誤（1900-2100）' });
        }

        const originalPath = req.file.path;
        const ext = path.extname(req.file.originalname).toLowerCase();
        let finalPath = originalPath;
        let finalFilename = req.file.filename;

        // TIF 轉換為 PNG
        if (ext === '.tif' || ext === '.tiff') {
            const pngFilename = req.file.filename.replace(/\.(tif|tiff)$/i, '.png');
            const pngPath = path.join(GEOPHYSICS_DIR, pngFilename);

            await sharp(originalPath)
                .png({ quality: 90 })
                .toFile(pngPath);

            fs.unlinkSync(originalPath);
            finalPath = pngPath;
            finalFilename = pngFilename;
        }

        // 產生縮圖
        const thumbFilename = `thumb-${finalFilename}`;
        const thumbPath = path.join(GEOPHYSICS_DIR, thumbFilename);
        await sharp(finalPath)
            .resize(256, 256, { fit: 'cover' })
            .toFile(thumbPath);

        // 儲存到資料庫
        const geophysics = await prisma.geophysics.create({
            data: {
                projectId,
                ...(moduleId && { moduleId }),
                filename: finalFilename,
                originalName: req.file.originalname,
                year: yearNum,
                name: name.trim(),
                lineId: lineId?.trim() || null,
                method: method.trim(),
                description: description?.trim() || null,
                x1: parseFloat(x1),
                y1: parseFloat(y1),
                z1: parseFloat(z1),
                x2: parseFloat(x2),
                y2: parseFloat(y2),
                z2: parseFloat(z2),
                depthTop: depthTop ? parseFloat(depthTop) : null,
                depthBottom: depthBottom ? parseFloat(depthBottom) : null,
                size: fs.statSync(finalPath).size,
                url: `/uploads/geophysics/${finalFilename}`,
                thumbnailUrl: `/uploads/geophysics/${thumbFilename}`,
            },
        });

        res.json({ success: true, data: geophysics });
    } catch (error) {
        console.error('Geophysics upload error:', error);
        res.status(500).json({ message: '上傳失敗', error: (error as Error).message });
    }
});

// 取得地球物理探查資料列表
router.get('/geophysics', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, moduleId } = req.query;
        if (!projectId && !moduleId) {
            return res.status(400).json({ message: 'Missing projectId or moduleId' });
        }

        const where: any = {};
        if (moduleId) where.moduleId = moduleId as string;
        else if (projectId) where.projectId = projectId as string;

        const data = await prisma.geophysics.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ message: '讀取失敗', error: (error as Error).message });
    }
});

// 取得單筆地球物理探查資料
router.get('/geophysics/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const geophysics = await prisma.geophysics.findUnique({
            where: { id: req.params.id as string },
        });

        if (!geophysics) {
            return res.status(404).json({ message: '找不到此資料' });
        }

        res.json({ success: true, data: geophysics });
    } catch (error) {
        res.status(500).json({ message: '讀取失敗', error: (error as Error).message });
    }
});

// 刪除地球物理探查資料
router.delete('/geophysics/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const geophysics = await prisma.geophysics.findUnique({
            where: { id: req.params.id as string },
        });

        if (!geophysics) {
            return res.status(404).json({ message: '找不到此資料' });
        }

        // 刪除實體檔案
        const filePath = path.join(GEOPHYSICS_DIR, geophysics.filename);
        const thumbPath = path.join(GEOPHYSICS_DIR, `thumb-${geophysics.filename}`);

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);

        // 從資料庫刪除
        await prisma.geophysics.delete({
            where: { id: req.params.id as string },
        });

        res.json({ success: true, message: '已刪除' });
    } catch (error) {
        console.error('Geophysics delete error:', error);
        res.status(500).json({ message: '刪除失敗', error: (error as Error).message });
    }
});

export default router;
