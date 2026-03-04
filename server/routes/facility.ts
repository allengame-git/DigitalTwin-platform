import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import prisma from '../lib/prisma';
import { FacilityInfoType, Prisma } from '@prisma/client';
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
                    select: { id: true, name: true }
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
        const { projectId, parentSceneId, parentModelId, name, description, sortOrder, sceneType } = req.body;
        if (!projectId || !name) {
            return res.status(400).json({ error: 'projectId 和 name 為必填' });
        }

        const scene = await prisma.facilityScene.create({
            data: {
                projectId,
                parentSceneId: parentSceneId || null,
                parentModelId: parentModelId || null,
                name,
                description: description || null,
                sortOrder: sortOrder ?? 0,
                sceneType: sceneType || (parentSceneId ? 'normal' : 'lobby'),
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
        const { name, description, cameraPosition, cameraTarget, coordShiftX, coordShiftY, coordShiftZ, coordRotation, sortOrder, parentModelId, sceneType } = req.body;

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
                ...('parentModelId' in req.body && { parentModelId: parentModelId || null }),
                ...(sceneType !== undefined && { sceneType }),
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

// ===== Model Upload =====
const modelStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, MODELS_DIR),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `facility-model-${uniqueSuffix}${ext}`);
    },
});

const modelUpload = multer({
    storage: modelStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['.glb', '.gltf', '.bin'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('只支援 .glb, .gltf 檔案') as any, false);
        }
    },
    limits: { fileSize: 100 * 1024 * 1024 },
});

// GET /models?sceneId=xxx
router.get('/models', async (req: Request, res: Response) => {
    try {
        const { sceneId } = req.query;
        if (!sceneId) return res.status(400).json({ error: 'sceneId required' });

        const models = await prisma.facilityModel.findMany({
            where: { sceneId: sceneId as string },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            include: {
                infos: { orderBy: { sortOrder: 'asc' } },
            },
        });

        res.json(models);
    } catch (error) {
        console.error('[Facility] Fetch models error:', error);
        res.status(500).json({ error: '取得模型失敗' });
    }
});

// POST /models — upload GLB
router.post('/models', authenticate, modelUpload.single('file'), async (req: Request, res: Response) => {
    let modelDir: string | undefined;
    try {
        const file = req.file;
        const { sceneId, name, sortOrder } = req.body;

        if (!file) return res.status(400).json({ error: '請選擇模型檔案' });
        if (!sceneId || !name) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: 'sceneId 和 name 為必填' });
        }

        const scene = await prisma.facilityScene.findUnique({ where: { id: sceneId } });
        if (!scene) {
            fs.unlinkSync(file.path);
            return res.status(404).json({ error: '場景不存在' });
        }

        // Move to a modelId-named subdirectory
        const modelId: string = randomUUID();
        modelDir = path.join(MODELS_DIR, modelId);
        fs.mkdirSync(modelDir, { recursive: true });

        const ext = path.extname(file.originalname).toLowerCase();
        const destFilename = `model${ext}`;
        const destPath = path.join(modelDir, destFilename);
        fs.renameSync(file.path, destPath);

        const modelUrl = `/uploads/facility/models/${modelId}/${destFilename}`;

        const model = await prisma.facilityModel.create({
            data: {
                id: modelId,
                sceneId,
                name,
                modelUrl,
                fileSize: file.size,
                sortOrder: sortOrder ? parseInt(sortOrder) : 0,
            },
            include: {
                infos: true,
            },
        });

        res.status(201).json(model);
    } catch (error) {
        // cleanup orphaned model directory if file was already moved
        if (modelDir && fs.existsSync(modelDir)) {
            try { fs.rmSync(modelDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
        }
        console.error('[Facility] Upload model error:', error);
        res.status(500).json({ error: '上傳模型失敗' });
    }
});

// PUT /models/:id — update metadata
router.put('/models/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, sortOrder, introduction } = req.body;

        const existing = await prisma.facilityModel.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: '模型不存在' });

        const model = await prisma.facilityModel.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(sortOrder !== undefined && { sortOrder }),
                ...(introduction !== undefined && { introduction }),
            },
            include: {
                infos: { orderBy: { sortOrder: 'asc' } },
            },
        });

        res.json(model);
    } catch (error) {
        console.error('[Facility] Update model error:', error);
        res.status(500).json({ error: '更新模型失敗' });
    }
});

// PUT /models/:id/transform
router.put('/models/:id/transform', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { position, rotation, scale } = req.body;

        const existing = await prisma.facilityModel.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: '模型不存在' });

        const model = await prisma.facilityModel.update({
            where: { id },
            data: {
                ...(position !== undefined && { position }),
                ...(rotation !== undefined && { rotation }),
                ...(scale !== undefined && { scale }),
            },
        });

        res.json(model);
    } catch (error) {
        console.error('[Facility] Update transform error:', error);
        res.status(500).json({ error: '更新 transform 失敗' });
    }
});

// DELETE /models/:id
router.delete('/models/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const model = await prisma.facilityModel.findUnique({
            where: { id },
            include: { infos: true },
        });

        if (!model) return res.status(404).json({ error: '模型不存在' });

        // Delete model directory
        const modelDir = path.join(MODELS_DIR, id);
        if (fs.existsSync(modelDir)) {
            fs.rmSync(modelDir, { recursive: true, force: true });
        }

        // Delete info attachment directories
        for (const info of model.infos) {
            if (info.type === 'IMAGE' || info.type === 'DOCUMENT') {
                const infoDir = path.join(INFO_DIR, info.id);
                if (fs.existsSync(infoDir)) {
                    fs.rmSync(infoDir, { recursive: true, force: true });
                }
            }
        }

        await prisma.facilityModel.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('[Facility] Delete model error:', error);
        res.status(500).json({ error: '刪除模型失敗' });
    }
});

// ===== Rich Content (Info) =====
const infoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, INFO_DIR),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `info-${uniqueSuffix}${ext}`);
    },
});

const infoUpload = multer({
    storage: infoStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
});

// GET /models/:id/info
router.get('/models/:id/info', async (req: Request, res: Response) => {
    try {
        const modelId = req.params.id as string;
        const infos = await prisma.facilityModelInfo.findMany({
            where: { modelId },
            orderBy: { sortOrder: 'asc' },
        });
        res.json(infos);
    } catch (error) {
        res.status(500).json({ error: '取得模型資訊失敗' });
    }
});

// POST /models/:id/info
router.post('/models/:id/info', authenticate, infoUpload.single('file'), async (req: Request, res: Response) => {
    let infoDir: string | undefined;
    try {
        const modelId = req.params.id as string;
        const { type, label, content, sortOrder } = req.body;
        const file = req.file;

        if (!type || !label) {
            if (file) fs.unlinkSync(file.path);
            return res.status(400).json({ error: 'type 和 label 為必填' });
        }

        if (!Object.values(FacilityInfoType).includes(type as FacilityInfoType)) {
            if (file) fs.unlinkSync(file.path);
            return res.status(400).json({ error: '無效的 type，必須是 TEXT、IMAGE、DOCUMENT 或 LINK' });
        }

        const model = await prisma.facilityModel.findUnique({ where: { id: modelId } });
        if (!model) {
            if (file) fs.unlinkSync(file.path);
            return res.status(404).json({ error: '模型不存在' });
        }

        if ((type === 'IMAGE' || type === 'DOCUMENT') && file) {
            const infoId: string = randomUUID();
            infoDir = path.join(INFO_DIR, infoId);
            fs.mkdirSync(infoDir, { recursive: true });

            const destPath = path.join(infoDir, file.originalname);
            fs.renameSync(file.path, destPath);

            const finalContent = `/uploads/facility/info/${infoId}/${file.originalname}`;

            const info = await prisma.facilityModelInfo.create({
                data: {
                    id: infoId,
                    modelId,
                    type: type as FacilityInfoType,
                    label,
                    content: finalContent,
                    sortOrder: sortOrder ? parseInt(sortOrder) : 0,
                },
            });

            return res.status(201).json(info);
        }

        // TEXT or LINK
        const info = await prisma.facilityModelInfo.create({
            data: {
                modelId,
                type: type as FacilityInfoType,
                label,
                content: content || '',
                sortOrder: sortOrder ? parseInt(sortOrder) : 0,
            },
        });

        res.status(201).json(info);
    } catch (error) {
        // cleanup orphaned info directory if file was already moved but DB write failed
        if (infoDir && fs.existsSync(infoDir)) {
            try { fs.rmSync(infoDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
        }
        console.error('[Facility] Create info error:', error);
        res.status(500).json({ error: '新增資訊失敗' });
    }
});

// PUT /info/:id
router.put('/info/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { label, content, sortOrder } = req.body;

        const existing = await prisma.facilityModelInfo.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: '資訊不存在' });

        const info = await prisma.facilityModelInfo.update({
            where: { id },
            data: {
                ...(label !== undefined && { label }),
                ...(content !== undefined && { content }),
                ...(sortOrder !== undefined && { sortOrder }),
            },
        });

        res.json(info);
    } catch (error) {
        console.error('[Facility] Update info error:', error);
        res.status(500).json({ error: '更新資訊失敗' });
    }
});

// DELETE /info/:id
router.delete('/info/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const info = await prisma.facilityModelInfo.findUnique({ where: { id } });
        if (!info) return res.status(404).json({ error: '資訊不存在' });

        if (info.type === 'IMAGE' || info.type === 'DOCUMENT') {
            const infoDir = path.join(INFO_DIR, id);
            if (fs.existsSync(infoDir)) {
                fs.rmSync(infoDir, { recursive: true, force: true });
            }
        }

        await prisma.facilityModelInfo.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('[Facility] Delete info error:', error);
        res.status(500).json({ error: '刪除資訊失敗' });
    }
});

// ===== Plan Image =====
const planStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const sceneId = req.params.id as string;
        const dir = path.join(PLANS_DIR, sceneId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, _file, cb) => cb(null, 'plan.png'),
});

const planUpload = multer({
    storage: planStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    },
    limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /scenes/:id/plan-image
router.post('/scenes/:id/plan-image', authenticate, planUpload.single('file'), async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const file = req.file;

        const scene = await prisma.facilityScene.findUnique({ where: { id } });
        if (!scene) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: '場景不存在' });
        }

        if (!file) return res.status(400).json({ error: '請選擇圖片' });

        const planImageUrl = `/uploads/facility/plans/${id}/plan.png`;
        const updatedScene = await prisma.facilityScene.update({
            where: { id },
            data: { planImageUrl },
        });

        res.json(updatedScene);
    } catch (error) {
        console.error('[Facility] Upload plan image error:', error);
        res.status(500).json({ error: '上傳平面圖失敗' });
    }
});

// PUT /scenes/:id/auto-plan-image (base64)
router.put('/scenes/:id/auto-plan-image', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { imageData } = req.body;
        if (!imageData) return res.status(400).json({ error: '缺少 imageData' });

        const dir = path.join(PLANS_DIR, id);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(path.join(dir, 'auto-plan.png'), buffer);

        const autoPlanImageUrl = `/uploads/facility/plans/${id}/auto-plan.png`;
        const scene = await prisma.facilityScene.update({
            where: { id },
            data: { autoPlanImageUrl },
        });

        res.json(scene);
    } catch (error) {
        res.status(500).json({ error: '儲存自動平面圖失敗' });
    }
});

// ===== Scene Terrain =====
const terrainStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const sceneId = req.params.id as string;
        const dir = path.join(TERRAIN_DIR, sceneId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (file.fieldname === 'satellite') {
            cb(null, `satellite${ext}`);
        } else {
            cb(null, `terrain${ext}`);
        }
    },
});

const facilityTerrainUpload = multer({
    storage: terrainStorage,
    limits: { fileSize: 500 * 1024 * 1024 },
}).fields([
    { name: 'file', maxCount: 1 },
    { name: 'satellite', maxCount: 1 },
]);

// POST /scenes/:id/terrain
router.post('/scenes/:id/terrain', authenticate, facilityTerrainUpload, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.facilityScene.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: '場景不存在' });

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const file = files?.file?.[0];
        const satelliteFile = files?.satellite?.[0];

        if (!file) return res.status(400).json({ error: '請選擇地形 CSV 檔案' });

        const pythonScript = path.join(__dirname, '../scripts/facility_terrain_processor.py');
        const venvPython = path.join(__dirname, '../scripts/.venv/bin/python3');
        const pythonExecutable = fs.existsSync(venvPython) ? venvPython : 'python3';

        const outputDir = path.join(TERRAIN_DIR, id);

        const pythonArgs = [
            pythonScript,
            '--input', file.path,
            '--output-dir', outputDir,
        ];

        if (satelliteFile) {
            pythonArgs.push('--satellite', satelliteFile.path);
        }

        const pythonProcess = spawn(pythonExecutable, pythonArgs);

        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data: Buffer) => {
            const str = data.toString();
            outputData += str;
            // Log progress
            str.split('\n').forEach((line: string) => {
                if (line.includes('"progress"')) {
                    try {
                        const json = JSON.parse(line.trim());
                        if (json.progress !== undefined) {
                            console.log(`[FacilityTerrain] ${json.progress}%: ${json.message}`);
                        }
                    } catch (e) { /* skip non-JSON */ }
                }
            });
        });

        pythonProcess.stderr.on('data', (data: Buffer) => {
            errorData += data.toString();
            console.error(`[FacilityTerrain] ${data}`);
        });

        pythonProcess.on('close', async (code: number) => {
            if (code !== 0) {
                return res.status(500).json({ error: '地形處理失敗', details: errorData });
            }

            try {
                let result: any = null;
                for (const line of outputData.split('\n')) {
                    try {
                        const obj = JSON.parse(line.trim());
                        if (obj.status === 'completed' || obj.status === 'error') {
                            result = obj;
                        }
                    } catch (e) { /* skip */ }
                }

                if (!result) throw new Error('Python 腳本未返回有效結果');
                if (result.status === 'error') throw new Error(result.error || '未知腳本錯誤');

                const meta = result.meta;

                const scene = await prisma.facilityScene.update({
                    where: { id },
                    data: {
                        terrainCsvUrl: `/uploads/facility/terrain/${id}/${path.basename(file.path)}`,
                        terrainHeightmapUrl: `/uploads/facility/terrain/${id}/${meta.heightmap}`,
                        terrainTextureUrl: meta.satellite
                            ? `/uploads/facility/terrain/${id}/${meta.satellite}`
                            : null,
                        terrainTextureMode: meta.satellite ? 'satellite' : 'colorRamp',
                        terrainBounds: {
                            minX: meta.minX, maxX: meta.maxX,
                            minY: meta.minY, maxY: meta.maxY,
                            minZ: meta.minZ, maxZ: meta.maxZ,
                        },
                    },
                });

                res.json(scene);
            } catch (err: any) {
                console.error('[FacilityTerrain] Processing error:', err);
                res.status(500).json({ error: '系統錯誤', details: err.message });
            }
        });
    } catch (error) {
        console.error('[FacilityTerrain] Upload error:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// DELETE /scenes/:id/terrain
router.delete('/scenes/:id/terrain', authenticate, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.facilityScene.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: '場景不存在' });

        const scene = await prisma.facilityScene.update({
            where: { id },
            data: {
                terrainCsvUrl: null,
                terrainHeightmapUrl: null,
                terrainTextureUrl: null,
                terrainTextureMode: null,
                terrainBounds: Prisma.DbNull,
            },
        });

        const terrainDir = path.join(TERRAIN_DIR, id);
        if (fs.existsSync(terrainDir)) {
            fs.rmSync(terrainDir, { recursive: true, force: true });
        }

        res.json(scene);
    } catch (error) {
        console.error('[FacilityTerrain] Delete terrain error:', error);
        res.status(500).json({ error: '刪除地形失敗' });
    }
});

export default router;

