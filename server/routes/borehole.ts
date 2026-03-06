/**
 * Borehole API Routes
 * @module routes/borehole
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { safeResolvePath } from '../lib/safePath';

import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// === 照片上傳設定 ===
const PHOTO_UPLOAD_DIR = path.join(__dirname, '../uploads/borehole-photos');
if (!fs.existsSync(PHOTO_UPLOAD_DIR)) {
    fs.mkdirSync(PHOTO_UPLOAD_DIR, { recursive: true });
}

const photoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PHOTO_UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `photo-${uniqueSuffix}${ext}`);
    },
});

const photoUpload = multer({
    storage: photoStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('不支援的圖片格式。只接受 JPG, PNG, WebP'));
        }
    },
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

/**
 * GET /api/borehole
 * 取得專案所有鑽孔 (含 layers)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;

        const boreholes = await prisma.borehole.findMany({
            where: projectId ? { projectId: projectId as string } : undefined,
            include: {
                layers: {
                    orderBy: { topDepth: 'asc' }
                },
                properties: {
                    orderBy: { depth: 'asc' }
                }
            },
            orderBy: { boreholeNo: 'asc' }
        });

        res.json(boreholes);
    } catch (error) {
        console.error('Error fetching boreholes:', error);
        res.status(500).json({ error: '無法取得鑽孔資料' });
    }
});

/**
 * GET /api/borehole/:id
 * 取得單一鑽孔詳細資料
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const borehole = await prisma.borehole.findUnique({
            where: { id: id as string },
            include: {
                layers: { orderBy: { topDepth: 'asc' } },
                properties: { orderBy: { depth: 'asc' } },
                photos: { orderBy: { depth: 'asc' } }
            }
        });

        if (!borehole) {
            return res.status(404).json({ error: '找不到鑽孔' });
        }

        res.json(borehole);
    } catch (error) {
        console.error('Error fetching borehole:', error);
        res.status(500).json({ error: '無法取得鑽孔詳細資料' });
    }
});

/**
 * POST /api/borehole
 * 新增鑽孔 (含 layers, properties)
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const {
            projectId,
            boreholeNo,
            name,
            x,
            y,
            elevation,
            totalDepth,
            drilledDate,
            contractor,
            area,
            description,
            layers,
            properties
        } = req.body;

        // 驗證必填欄位
        if (!boreholeNo || x === undefined || y === undefined || elevation === undefined || totalDepth === undefined) {
            return res.status(400).json({ error: '缺少必填欄位 (boreholeNo, x, y, elevation, totalDepth)' });
        }

        const borehole = await prisma.borehole.create({
            data: {
                projectId,
                boreholeNo,
                name,
                x: parseFloat(x),
                y: parseFloat(y),
                elevation: parseFloat(elevation),
                totalDepth: parseFloat(totalDepth),
                drilledDate: drilledDate ? new Date(drilledDate) : null,
                contractor,
                area,
                description,
                layers: layers ? {
                    create: layers.map((layer: any) => ({
                        topDepth: parseFloat(layer.topDepth),
                        bottomDepth: parseFloat(layer.bottomDepth),
                        lithologyCode: layer.lithologyCode,
                        lithologyName: layer.lithologyName,
                        description: layer.description
                    }))
                } : undefined,
                properties: properties ? {
                    create: properties.map((prop: any) => ({
                        depth: parseFloat(prop.depth),
                        nValue: prop.nValue ? parseInt(prop.nValue) : null,
                        rqd: prop.rqd ? parseFloat(prop.rqd) : null
                    }))
                } : undefined
            },
            include: {
                layers: true,
                properties: true
            }
        });

        res.status(201).json(borehole);
    } catch (error: any) {
        console.error('Error creating borehole:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: '鑽孔編號已存在' });
        }
        res.status(500).json({ error: '無法新增鑽孔' });
    }
});

/**
 * POST /api/borehole/batch
 * 批次匯入鑽孔 (JSON array)
 */
router.post('/batch', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, boreholes } = req.body;

        if (!Array.isArray(boreholes) || boreholes.length === 0) {
            return res.status(400).json({ error: '請提供鑽孔資料陣列' });
        }

        const results = [];
        const errors = [];

        for (const bh of boreholes) {
            try {
                const created = await prisma.borehole.create({
                    data: {
                        projectId,
                        boreholeNo: bh.boreholeNo,
                        name: bh.name,
                        x: parseFloat(bh.x),
                        y: parseFloat(bh.y),
                        elevation: parseFloat(bh.elevation),
                        totalDepth: parseFloat(bh.totalDepth),
                        drilledDate: bh.drilledDate ? new Date(bh.drilledDate) : null,
                        contractor: bh.contractor,
                        area: bh.area,
                        description: bh.description,
                        layers: bh.layers ? {
                            create: bh.layers.map((layer: any) => ({
                                topDepth: parseFloat(layer.topDepth),
                                bottomDepth: parseFloat(layer.bottomDepth),
                                lithologyCode: layer.lithologyCode,
                                lithologyName: layer.lithologyName,
                                description: layer.description
                            }))
                        } : undefined
                    }
                });
                results.push(created);
            } catch (err: any) {
                errors.push({
                    boreholeNo: bh.boreholeNo,
                    error: err.code === 'P2002' ? '鑽孔編號已存在' : err.message
                });
            }
        }

        res.status(201).json({
            success: results.length,
            failed: errors.length,
            errors
        });
    } catch (error) {
        console.error('Error batch importing boreholes:', error);
        res.status(500).json({ error: '批次匯入失敗' });
    }
});

/**
 * PUT /api/borehole/:id
 * 更新鑽孔資料
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            boreholeNo,
            name,
            x,
            y,
            elevation,
            totalDepth,
            drilledDate,
            contractor,
            area,
            description,
            layers,
            properties
        } = req.body;

        const borehole = await prisma.$transaction(async (tx) => {
            // 1. Update basic info
            const updated = await tx.borehole.update({
                where: { id: id as string },
                data: {
                    boreholeNo,
                    name,
                    x: x !== undefined ? parseFloat(x) : undefined,
                    y: y !== undefined ? parseFloat(y) : undefined,
                    elevation: elevation !== undefined ? parseFloat(elevation) : undefined,
                    totalDepth: totalDepth !== undefined ? parseFloat(totalDepth) : undefined,
                    drilledDate: drilledDate ? new Date(drilledDate) : undefined,
                    contractor,
                    area,
                    description
                },
                include: {
                    layers: true,
                    properties: true
                }
            });

            // 2. Update Layers if provided (Replace all)
            if (layers && Array.isArray(layers)) {
                await tx.boreholeLayer.deleteMany({ where: { boreholeId: id as string } });
                if (layers.length > 0) {
                    await tx.boreholeLayer.createMany({
                        data: layers.map((l: any) => ({
                            boreholeId: id as string,
                            topDepth: parseFloat(l.topDepth),
                            bottomDepth: parseFloat(l.bottomDepth),
                            lithologyCode: l.lithologyCode,
                            lithologyName: l.lithologyName,
                            description: l.description
                        }))
                    });
                }
            }

            // 3. Update Properties if provided (Replace all)
            if (properties && Array.isArray(properties)) {
                await tx.boreholeProperty.deleteMany({ where: { boreholeId: id as string } });
                if (properties.length > 0) {
                    await tx.boreholeProperty.createMany({
                        data: properties.map((p: any) => ({
                            boreholeId: id as string,
                            depth: parseFloat(p.depth),
                            nValue: p.nValue ? parseInt(p.nValue) : null,
                            rqd: p.rqd ? parseFloat(p.rqd) : null
                        }))
                    });
                }
            }



            // Return the final state with all relations
            return await tx.borehole.findUnique({
                where: { id: id as string },
                include: {
                    layers: { orderBy: { topDepth: 'asc' } },
                    properties: { orderBy: { depth: 'asc' } }
                }
            });
        });

        res.json(borehole);
    } catch (error) {
        console.error('Error updating borehole:', error);
        res.status(500).json({ error: '無法更新鑽孔' });
    }
});

/**
 * DELETE /api/borehole/:id
 * 刪除鑽孔
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.borehole.delete({
            where: { id: id as string }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting borehole:', error);
        res.status(500).json({ error: '無法刪除鑽孔' });
    }
});

/**
 * POST /api/borehole/batch-layers
 * 批次匯入地層資料
 * CSV 格式: boreholeNo, topDepth, bottomDepth, lithologyCode, description
 */
router.post('/batch-layers', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, layers } = req.body;

        if (!Array.isArray(layers) || layers.length === 0) {
            return res.status(400).json({ error: '請提供地層資料陣列' });
        }

        // Group layers by boreholeNo
        const layersByBorehole: Record<string, any[]> = {};
        for (const layer of layers) {
            if (!layersByBorehole[layer.boreholeNo]) {
                layersByBorehole[layer.boreholeNo] = [];
            }
            layersByBorehole[layer.boreholeNo].push(layer);
        }

        const results: string[] = [];
        const errors: { boreholeNo: string; error: string }[] = [];

        for (const [boreholeNo, boreholeNo_layers] of Object.entries(layersByBorehole)) {
            try {
                // Find borehole by boreholeNo and projectId
                const borehole = await prisma.borehole.findFirst({
                    where: { boreholeNo, projectId }
                });

                if (!borehole) {
                    errors.push({ boreholeNo, error: '找不到此鑽孔' });
                    continue;
                }

                // Create layers for this borehole
                await prisma.boreholeLayer.createMany({
                    data: boreholeNo_layers.map((l: any) => ({
                        boreholeId: borehole.id,
                        topDepth: parseFloat(l.topDepth),
                        bottomDepth: parseFloat(l.bottomDepth),
                        lithologyCode: l.lithologyCode,
                        lithologyName: l.lithologyName || null,
                        description: l.description || null
                    }))
                });

                results.push(boreholeNo);
            } catch (err: any) {
                errors.push({ boreholeNo, error: err.message });
            }
        }

        res.status(201).json({
            success: results.length,
            failed: errors.length,
            results,
            errors
        });
    } catch (error) {
        console.error('Error batch importing layers:', error);
        res.status(500).json({ error: '批次匯入地層資料失敗' });
    }
});

/**
 * POST /api/borehole/batch-properties
 * 批次匯入物性資料 (N值/RQD)
 * CSV 格式: boreholeNo, depth, nValue, rqd
 */
router.post('/batch-properties', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, properties } = req.body;

        if (!Array.isArray(properties) || properties.length === 0) {
            return res.status(400).json({ error: '請提供物性資料陣列' });
        }

        // Group properties by boreholeNo
        const propsByBorehole: Record<string, any[]> = {};
        for (const prop of properties) {
            if (!propsByBorehole[prop.boreholeNo]) {
                propsByBorehole[prop.boreholeNo] = [];
            }
            propsByBorehole[prop.boreholeNo].push(prop);
        }

        const results: string[] = [];
        const errors: { boreholeNo: string; error: string }[] = [];

        for (const [boreholeNo, boreholeNo_props] of Object.entries(propsByBorehole)) {
            try {
                // Find borehole by boreholeNo and projectId
                const borehole = await prisma.borehole.findFirst({
                    where: { boreholeNo, projectId }
                });

                if (!borehole) {
                    errors.push({ boreholeNo, error: '找不到此鑽孔' });
                    continue;
                }

                // Create properties for this borehole
                await prisma.boreholeProperty.createMany({
                    data: boreholeNo_props.map((p: any) => ({
                        boreholeId: borehole.id,
                        depth: parseFloat(p.depth),
                        nValue: p.nValue ? parseInt(p.nValue) : null,
                        rqd: p.rqd ? parseFloat(p.rqd) : null
                    }))
                });

                results.push(boreholeNo);
            } catch (err: any) {
                errors.push({ boreholeNo, error: err.message });
            }
        }

        res.status(201).json({
            success: results.length,
            failed: errors.length,
            results,
            errors
        });
    } catch (error) {
        console.error('Error batch importing properties:', error);
        res.status(500).json({ error: '批次匯入物性資料失敗' });
    }
});

// =============================================
// 照片上傳 / 刪除 API
// =============================================

/**
 * POST /api/borehole/:id/photos
 * 上傳岩心照片 (需登入)
 */
router.post('/:id/photos', authenticate, photoUpload.single('file'), async (req: Request, res: Response) => {
    try {
        const boreholeId = req.params.id as string;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: '請選擇圖片檔案' });
        }

        const depth = parseFloat(req.body.depth);
        if (isNaN(depth)) {
            // Clean up uploaded file
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: '請填入有效的深度值' });
        }

        // Verify borehole exists
        const borehole = await prisma.borehole.findUnique({ where: { id: boreholeId } });
        if (!borehole) {
            fs.unlinkSync(file.path);
            return res.status(404).json({ error: '找不到指定鑽孔' });
        }

        // Generate thumbnail
        const thumbFilename = `thumb-${file.filename}`;
        const thumbPath = path.join(PHOTO_UPLOAD_DIR, thumbFilename);
        await sharp(file.path)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(thumbPath);

        const caption = req.body.caption?.trim() || null;

        const photo = await prisma.boreholePhoto.create({
            data: {
                boreholeId,
                depth,
                url: `/uploads/borehole-photos/${file.filename}`,
                thumbnailUrl: `/uploads/borehole-photos/${thumbFilename}`,
                caption,
            },
        });

        res.status(201).json(photo);
    } catch (error) {
        console.error('Error uploading borehole photo:', error);
        res.status(500).json({ error: '上傳照片失敗' });
    }
});

/**
 * DELETE /api/borehole/:id/photos/:photoId
 * 刪除岩心照片 (需登入)
 */
router.delete('/:id/photos/:photoId', authenticate, async (req: Request, res: Response) => {
    try {
        const photoId = req.params.photoId as string;

        const photo = await prisma.boreholePhoto.findUnique({ where: { id: photoId } });
        if (!photo) {
            return res.status(404).json({ error: '找不到照片' });
        }

        // Delete physical files (with path traversal protection)
        for (const url of [photo.url, photo.thumbnailUrl]) {
            const safe = safeResolvePath(url);
            if (safe && fs.existsSync(safe)) fs.unlinkSync(safe);
        }

        // Delete DB record
        await prisma.boreholePhoto.delete({ where: { id: photoId } });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting borehole photo:', error);
        res.status(500).json({ error: '刪除照片失敗' });
    }
});

export default router;
