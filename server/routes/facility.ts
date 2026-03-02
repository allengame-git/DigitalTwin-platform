import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// ===== Upload directories =====
const FACILITY_DIR = path.join(__dirname, '../uploads/facility');
const MODELS_DIR = path.join(FACILITY_DIR, 'models');
const INFO_DIR = path.join(FACILITY_DIR, 'info');
const PLANS_DIR = path.join(FACILITY_DIR, 'plans');
const TERRAIN_DIR = path.join(FACILITY_DIR, 'terrain');

[FACILITY_DIR, MODELS_DIR, INFO_DIR, PLANS_DIR, TERRAIN_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ===== Scene CRUD =====

// GET /scenes?projectId=xxx
router.get('/scenes', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;
        if (!projectId) return res.status(400).json({ error: 'projectId required' });

        const scenes = await prisma.facilityScene.findMany({
            where: { projectId: projectId as string },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            include: {
                models: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, name: true, childSceneId: true }
                }
            }
        });

        res.json(scenes);
    } catch (error) {
        console.error('[Facility] Fetch scenes error:', error);
        res.status(500).json({ error: '取得場景失敗' });
    }
});

// POST /scenes
router.post('/scenes', authenticate, async (req: Request, res: Response) => {
    try {
        const { projectId, parentSceneId, name, description, sortOrder } = req.body;
        if (!projectId || !name) {
            return res.status(400).json({ error: 'projectId 和 name 為必填' });
        }

        const scene = await prisma.facilityScene.create({
            data: {
                projectId,
                parentSceneId: parentSceneId || null,
                name,
                description: description || null,
                sortOrder: sortOrder ?? 0,
            }
        });

        res.status(201).json(scene);
    } catch (error) {
        console.error('[Facility] Create scene error:', error);
        res.status(500).json({ error: '建立場景失敗' });
    }
});

// PUT /scenes/:id
router.put('/scenes/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, description, cameraPosition, cameraTarget, coordShiftX, coordShiftY, coordShiftZ, coordRotation, sortOrder } = req.body;

        const existing = await prisma.facilityScene.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: '場景不存在' });

        const scene = await prisma.facilityScene.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(cameraPosition !== undefined && { cameraPosition }),
                ...(cameraTarget !== undefined && { cameraTarget }),
                ...(coordShiftX !== undefined && { coordShiftX }),
                ...(coordShiftY !== undefined && { coordShiftY }),
                ...(coordShiftZ !== undefined && { coordShiftZ }),
                ...(coordRotation !== undefined && { coordRotation }),
                ...(sortOrder !== undefined && { sortOrder }),
            }
        });

        res.json(scene);
    } catch (error) {
        console.error('[Facility] Update scene error:', error);
        res.status(500).json({ error: '更新場景失敗' });
    }
});

// DELETE /scenes/:id
router.delete('/scenes/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const scene = await prisma.facilityScene.findUnique({
            where: { id },
            include: {
                models: { include: { infos: true } },
                childScenes: {
                    include: {
                        models: { include: { infos: true } }
                    }
                }
            }
        });

        if (!scene) return res.status(404).json({ error: '場景不存在' });

        const filesToDelete: string[] = [];

        const collectFiles = (s: {
            planImageUrl?: string | null;
            autoPlanImageUrl?: string | null;
            terrainCsvUrl?: string | null;
            terrainHeightmapUrl?: string | null;
            terrainTextureUrl?: string | null;
            models?: Array<{
                id: string;
                infos?: Array<{ id: string; type: string }>;
            }>;
        }) => {
            if (s.planImageUrl) filesToDelete.push(path.join(__dirname, '..', s.planImageUrl));
            if (s.autoPlanImageUrl) filesToDelete.push(path.join(__dirname, '..', s.autoPlanImageUrl));
            if (s.terrainCsvUrl) filesToDelete.push(path.join(__dirname, '..', s.terrainCsvUrl));
            if (s.terrainHeightmapUrl) filesToDelete.push(path.join(__dirname, '..', s.terrainHeightmapUrl));
            if (s.terrainTextureUrl) filesToDelete.push(path.join(__dirname, '..', s.terrainTextureUrl));

            for (const model of s.models || []) {
                const modelDir = path.join(MODELS_DIR, model.id);
                if (fs.existsSync(modelDir)) {
                    filesToDelete.push(modelDir);
                }
                for (const info of model.infos || []) {
                    if (info.type === 'IMAGE' || info.type === 'DOCUMENT') {
                        const infoDir = path.join(INFO_DIR, info.id);
                        if (fs.existsSync(infoDir)) {
                            filesToDelete.push(infoDir);
                        }
                    }
                }
            }
        };

        // Recursively collect all descendant scenes for file cleanup
        const allSceneIds: string[] = [id];
        const gatherDescendantIds = async (parentId: string) => {
            const children = await prisma.facilityScene.findMany({
                where: { parentSceneId: parentId },
                include: { models: { include: { infos: true } } }
            });
            for (const child of children) {
                allSceneIds.push(child.id);
                collectFiles(child);
                await gatherDescendantIds(child.id);
            }
        };

        collectFiles(scene);
        await gatherDescendantIds(id);

        // Cleanup scene-level dirs for all descendants
        const allSceneDirs = allSceneIds.flatMap(sid => [
            path.join(PLANS_DIR, sid),
            path.join(TERRAIN_DIR, sid)
        ]);

        // Cascade delete via Prisma
        await prisma.facilityScene.delete({ where: { id } });

        // Cleanup files
        for (const f of filesToDelete) {
            try {
                if (fs.existsSync(f)) {
                    const stat = fs.statSync(f);
                    if (stat.isDirectory()) {
                        fs.rmSync(f, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(f);
                    }
                }
            } catch (e) {
                console.warn('[Facility] File cleanup warning:', f, e);
            }
        }

        // Cleanup scene-level dirs
        for (const dir of allSceneDirs) {
            try {
                if (fs.existsSync(dir)) {
                    fs.rmSync(dir, { recursive: true, force: true });
                }
            } catch (e) { /* ignore */ }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[Facility] Delete scene error:', error);
        res.status(500).json({ error: '刪除場景失敗' });
    }
});

export default router;
