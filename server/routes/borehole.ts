/**
 * Borehole API Routes
 * @module routes/borehole
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

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
router.post('/', async (req: Request, res: Response) => {
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
router.post('/batch', async (req: Request, res: Response) => {
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
router.put('/:id', async (req: Request, res: Response) => {
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
            description
        } = req.body;

        const borehole = await prisma.borehole.update({
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
            }
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
router.delete('/:id', async (req: Request, res: Response) => {
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
router.post('/batch-layers', async (req: Request, res: Response) => {
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
router.post('/batch-properties', async (req: Request, res: Response) => {
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

export default router;
