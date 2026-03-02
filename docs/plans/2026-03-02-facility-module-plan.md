# 設施導覽模組實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增獨立設施 3D 導覽模組，支援 GLB/glTF 模型上傳、多層巢狀場景切換、Rich Content 資訊面板、地形與衛星影像疊加。

**Architecture:** 單一 Canvas + 動態載入架構。FacilityScene 自我參照形成巢狀樹，FacilityModel 綁定場景，FacilityModelInfo 存放 Rich Content。前端獨立頁面 FacilityPage，後端 facility.ts 路由模組。

**Tech Stack:** React 19, Three.js 0.182, R3F 9.5, drei, Zustand 5, Express 5.2, Prisma 7, PostgreSQL, Python (SciPy/NumPy for terrain)

**Design Doc:** `docs/plans/2026-03-02-facility-module-design.md`

---

### Task 1: Prisma Schema — 新增三個資料模型

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: 在 schema.prisma 末尾新增三個 model**

在 `WaterLevel` model 之後加入：

```prisma
/// 設施場景資訊類型
enum FacilityInfoType {
  TEXT
  IMAGE
  DOCUMENT
  LINK
}

/// 設施導覽場景 (可巢狀)
model FacilityScene {
  id                String           @id @default(uuid())
  projectId         String
  parentSceneId     String?
  name              String
  description       String?
  planImageUrl      String?
  autoPlanImageUrl  String?
  cameraPosition    Json?
  cameraTarget      Json?
  terrainCsvUrl     String?
  terrainHeightmapUrl String?
  terrainTextureUrl String?
  terrainTextureMode String?
  terrainBounds     Json?
  coordShiftX       Float            @default(0)
  coordShiftY       Float            @default(0)
  coordShiftZ       Float            @default(0)
  coordRotation     Float            @default(0)
  sortOrder         Int              @default(0)
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  project           Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parentScene       FacilityScene?   @relation("SceneHierarchy", fields: [parentSceneId], references: [id], onDelete: Cascade)
  childScenes       FacilityScene[]  @relation("SceneHierarchy")
  models            FacilityModel[]

  @@map("facility_scenes")
}

/// 設施 3D 模型
model FacilityModel {
  id            String              @id @default(uuid())
  sceneId       String
  name          String
  modelUrl      String
  fileSize      Int
  position      Json                @default("{\"x\":0,\"y\":0,\"z\":0}")
  rotation      Json                @default("{\"x\":0,\"y\":0,\"z\":0}")
  scale         Json                @default("{\"x\":1,\"y\":1,\"z\":1}")
  childSceneId  String?
  sortOrder     Int                 @default(0)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  scene         FacilityScene       @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  childScene    FacilityScene?      @relation("ModelToChildScene", fields: [childSceneId], references: [id], onDelete: SetNull)
  infos         FacilityModelInfo[]

  @@map("facility_models")
}

/// 設施模型資訊 (Rich Content)
model FacilityModelInfo {
  id        String           @id @default(uuid())
  modelId   String
  type      FacilityInfoType
  label     String
  content   String
  sortOrder Int              @default(0)
  createdAt DateTime         @default(now())
  model     FacilityModel    @relation(fields: [modelId], references: [id], onDelete: Cascade)

  @@map("facility_model_infos")
}
```

同時在 `Project` model 中加入 relation：

```prisma
// 在 Project model 的 waterLevels 下一行加入：
facilityScenes FacilityScene[]
```

以及 `FacilityScene` 需要額外的反向 relation（被 FacilityModel.childScene 參照）：

```prisma
// 在 FacilityScene model 中加入：
linkedModels  FacilityModel[] @relation("ModelToChildScene")
```

**Step 2: 推送 schema 到資料庫**

Run: `cd server && npx prisma db push`
Expected: Schema synced, 3 new tables created

**Step 3: 重新產生 Prisma client**

Run: `cd server && npx prisma generate`
Expected: Prisma Client generated

**Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat: 新增 FacilityScene/FacilityModel/FacilityModelInfo schema"
```

---

### Task 2: 後端路由 — 場景 CRUD

**Files:**
- Create: `server/routes/facility.ts`
- Modify: `server/index.ts`

**Step 1: 建立 facility.ts 路由 — 場景 CRUD 部分**

```typescript
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// ===== 上傳目錄 =====
const FACILITY_DIR = path.join(__dirname, '../uploads/facility');
const MODELS_DIR = path.join(FACILITY_DIR, 'models');
const INFO_DIR = path.join(FACILITY_DIR, 'info');
const PLANS_DIR = path.join(FACILITY_DIR, 'plans');
const TERRAIN_DIR = path.join(FACILITY_DIR, 'terrain');

[FACILITY_DIR, MODELS_DIR, INFO_DIR, PLANS_DIR, TERRAIN_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ===== 場景 CRUD =====

// GET /scenes?projectId=xxx — 取得專案所有場景 (樹狀)
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

// POST /scenes — 建立場景
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

// PUT /scenes/:id — 更新場景
router.put('/scenes/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, cameraPosition, cameraTarget, coordShiftX, coordShiftY, coordShiftZ, coordRotation, sortOrder } = req.body;

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

// DELETE /scenes/:id — 刪除場景 (級聯)
router.delete('/scenes/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // 先收集所有要刪除的檔案路徑
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

        // 收集所有需要刪除的檔案
        const filesToDelete: string[] = [];

        const collectFiles = (s: any) => {
            if (s.planImageUrl) filesToDelete.push(path.join(__dirname, '..', s.planImageUrl));
            if (s.autoPlanImageUrl) filesToDelete.push(path.join(__dirname, '..', s.autoPlanImageUrl));
            if (s.terrainCsvUrl) filesToDelete.push(path.join(__dirname, '..', s.terrainCsvUrl));
            if (s.terrainHeightmapUrl) filesToDelete.push(path.join(__dirname, '..', s.terrainHeightmapUrl));
            if (s.terrainTextureUrl) filesToDelete.push(path.join(__dirname, '..', s.terrainTextureUrl));

            for (const model of s.models || []) {
                if (model.modelUrl) filesToDelete.push(path.join(__dirname, '..', model.modelUrl));
                for (const info of model.infos || []) {
                    if (info.type === 'IMAGE' || info.type === 'DOCUMENT') {
                        filesToDelete.push(path.join(__dirname, '..', info.content));
                    }
                }
            }
        };

        collectFiles(scene);
        for (const child of scene.childScenes || []) {
            collectFiles(child);
        }

        // Prisma cascade 刪除
        await prisma.facilityScene.delete({ where: { id } });

        // 清理檔案
        for (const f of filesToDelete) {
            try {
                if (f && fs.existsSync(f) && fs.statSync(f).isFile()) {
                    fs.unlinkSync(f);
                }
            } catch (e) {
                console.warn('[Facility] File cleanup warning:', f, e);
            }
        }

        // 清理空目錄
        const dirsToCheck = [
            path.join(MODELS_DIR),
            path.join(INFO_DIR),
            path.join(PLANS_DIR, id),
            path.join(TERRAIN_DIR, id),
        ];
        for (const dir of dirsToCheck) {
            try {
                if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
                    fs.rmdirSync(dir);
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
```

**Step 2: 在 index.ts 註冊路由**

在 `server/index.ts` 中：
- import 行（第 27 行附近加入）：`import facilityRoutes from './routes/facility';`
- app.use 行（第 70 行附近加入）：`app.use('/api/facility', facilityRoutes);`

**Step 3: 驗證 — 啟動 server 確認無錯誤**

Run: `cd server && npx ts-node index.ts`
Expected: Server starts without errors on port 3001

**Step 4: Commit**

```bash
git add server/routes/facility.ts server/index.ts
git commit -m "feat: 新增設施導覽場景 CRUD API"
```

---

### Task 3: 後端路由 — 模型上傳/CRUD + Rich Content

**Files:**
- Modify: `server/routes/facility.ts`

**Step 1: 在 facility.ts 中加入 Multer 設定和模型路由**

在 `export default router` 之前加入：

```typescript
// ===== 模型 Multer 設定 =====
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
            cb(new Error('只支援 .glb, .gltf 檔案'));
        }
    },
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ===== 模型 CRUD =====

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
                childScene: { select: { id: true, name: true } }
            }
        });

        res.json(models);
    } catch (error) {
        console.error('[Facility] Fetch models error:', error);
        res.status(500).json({ error: '取得模型失敗' });
    }
});

// POST /models — 上傳模型
router.post('/models', authenticate, modelUpload.single('file'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const { sceneId, name, childSceneId, sortOrder } = req.body;

        if (!file) return res.status(400).json({ error: '請選擇模型檔案' });
        if (!sceneId || !name) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: 'sceneId 和 name 為必填' });
        }

        // 驗證場景存在
        const scene = await prisma.facilityScene.findUnique({ where: { id: sceneId } });
        if (!scene) {
            fs.unlinkSync(file.path);
            return res.status(404).json({ error: '場景不存在' });
        }

        // 搬到以 model id 為名的子目錄
        const modelId = require('crypto').randomUUID();
        const modelDir = path.join(MODELS_DIR, modelId);
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
                childSceneId: childSceneId || null,
                sortOrder: sortOrder ? parseInt(sortOrder) : 0,
            },
            include: {
                childScene: { select: { id: true, name: true } }
            }
        });

        res.status(201).json(model);
    } catch (error) {
        console.error('[Facility] Upload model error:', error);
        res.status(500).json({ error: '上傳模型失敗' });
    }
});

// PUT /models/:id — 更新模型 metadata
router.put('/models/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, childSceneId, sortOrder } = req.body;

        const model = await prisma.facilityModel.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(childSceneId !== undefined && { childSceneId: childSceneId || null }),
                ...(sortOrder !== undefined && { sortOrder }),
            },
            include: {
                childScene: { select: { id: true, name: true } }
            }
        });

        res.json(model);
    } catch (error) {
        console.error('[Facility] Update model error:', error);
        res.status(500).json({ error: '更新模型失敗' });
    }
});

// PUT /models/:id/transform — 更新位置/旋轉/縮放
router.put('/models/:id/transform', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { position, rotation, scale } = req.body;

        const model = await prisma.facilityModel.update({
            where: { id },
            data: {
                ...(position !== undefined && { position }),
                ...(rotation !== undefined && { rotation }),
                ...(scale !== undefined && { scale }),
            }
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
        const { id } = req.params;
        const model = await prisma.facilityModel.findUnique({
            where: { id },
            include: { infos: true }
        });

        if (!model) return res.status(404).json({ error: '模型不存在' });

        // 刪除模型檔案
        const modelDir = path.join(MODELS_DIR, id);
        if (fs.existsSync(modelDir)) {
            fs.rmSync(modelDir, { recursive: true, force: true });
        }

        // 刪除 info 附件檔案
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
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// GET /models/:id/info
router.get('/models/:id/info', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const infos = await prisma.facilityModelInfo.findMany({
            where: { modelId: id },
            orderBy: { sortOrder: 'asc' }
        });
        res.json(infos);
    } catch (error) {
        res.status(500).json({ error: '取得模型資訊失敗' });
    }
});

// POST /models/:id/info — 新增 info (支援檔案上傳)
router.post('/models/:id/info', authenticate, infoUpload.single('file'), async (req: Request, res: Response) => {
    try {
        const modelId = req.params.id;
        const { type, label, content, sortOrder } = req.body;
        const file = req.file;

        if (!type || !label) {
            if (file) fs.unlinkSync(file.path);
            return res.status(400).json({ error: 'type 和 label 為必填' });
        }

        let finalContent = content || '';

        // 對 IMAGE / DOCUMENT 類型，使用上傳檔案的路徑
        if ((type === 'IMAGE' || type === 'DOCUMENT') && file) {
            const infoId = require('crypto').randomUUID();
            const infoDir = path.join(INFO_DIR, infoId);
            fs.mkdirSync(infoDir, { recursive: true });

            const destPath = path.join(infoDir, file.originalname);
            fs.renameSync(file.path, destPath);

            finalContent = `/uploads/facility/info/${infoId}/${file.originalname}`;

            const info = await prisma.facilityModelInfo.create({
                data: {
                    id: infoId,
                    modelId,
                    type: type as any,
                    label,
                    content: finalContent,
                    sortOrder: sortOrder ? parseInt(sortOrder) : 0,
                }
            });

            return res.status(201).json(info);
        }

        // TEXT / LINK 類型
        const info = await prisma.facilityModelInfo.create({
            data: {
                modelId,
                type: type as any,
                label,
                content: finalContent,
                sortOrder: sortOrder ? parseInt(sortOrder) : 0,
            }
        });

        res.status(201).json(info);
    } catch (error) {
        console.error('[Facility] Create info error:', error);
        res.status(500).json({ error: '新增資訊失敗' });
    }
});

// PUT /info/:id
router.put('/info/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { label, content, sortOrder } = req.body;

        const info = await prisma.facilityModelInfo.update({
            where: { id },
            data: {
                ...(label !== undefined && { label }),
                ...(content !== undefined && { content }),
                ...(sortOrder !== undefined && { sortOrder }),
            }
        });

        res.json(info);
    } catch (error) {
        res.status(500).json({ error: '更新資訊失敗' });
    }
});

// DELETE /info/:id
router.delete('/info/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const info = await prisma.facilityModelInfo.findUnique({ where: { id } });

        if (!info) return res.status(404).json({ error: '資訊不存在' });

        // 清理檔案
        if (info.type === 'IMAGE' || info.type === 'DOCUMENT') {
            const infoDir = path.join(INFO_DIR, id);
            if (fs.existsSync(infoDir)) {
                fs.rmSync(infoDir, { recursive: true, force: true });
            }
        }

        await prisma.facilityModelInfo.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '刪除資訊失敗' });
    }
});

// ===== 平面圖上傳 =====

const planStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const sceneId = req.params.id;
        const dir = path.join(PLANS_DIR, sceneId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, _file, cb) => {
        cb(null, 'plan.png');
    },
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
        const { id } = req.params;
        const file = req.file;
        if (!file) return res.status(400).json({ error: '請選擇圖片' });

        const planImageUrl = `/uploads/facility/plans/${id}/plan.png`;

        const scene = await prisma.facilityScene.update({
            where: { id },
            data: { planImageUrl }
        });

        res.json(scene);
    } catch (error) {
        res.status(500).json({ error: '上傳平面圖失敗' });
    }
});

// PUT /scenes/:id/auto-plan-image (接收 base64 或 blob)
router.put('/scenes/:id/auto-plan-image', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { imageData } = req.body; // base64 data URL

        if (!imageData) return res.status(400).json({ error: '缺少 imageData' });

        const dir = path.join(PLANS_DIR, id);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(dir, 'auto-plan.png');
        fs.writeFileSync(filePath, buffer);

        const autoPlanImageUrl = `/uploads/facility/plans/${id}/auto-plan.png`;

        const scene = await prisma.facilityScene.update({
            where: { id },
            data: { autoPlanImageUrl }
        });

        res.json(scene);
    } catch (error) {
        res.status(500).json({ error: '儲存自動平面圖失敗' });
    }
});
```

**Step 2: 驗證 server 啟動正常**

Run: `cd server && npx ts-node index.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add server/routes/facility.ts
git commit -m "feat: 新增設施模型 CRUD、Rich Content、平面圖 API"
```

---

### Task 4: 後端路由 — 場景地形上傳

**Files:**
- Modify: `server/routes/facility.ts`
- Create: `server/scripts/facility_terrain_processor.py`

**Step 1: 在 facility.ts 加入地形上傳路由**

在 `export default router` 之前加入：

```typescript
// ===== 場景地形 =====

const terrainStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const sceneId = req.params.id;
        const dir = path.join(TERRAIN_DIR, sceneId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        // 根據 fieldname 決定檔名
        if (file.fieldname === 'satellite') {
            cb(null, `satellite${ext}`);
        } else {
            cb(null, `terrain${ext}`);
        }
    },
});

const terrainUpload = multer({
    storage: terrainStorage,
    limits: { fileSize: 500 * 1024 * 1024 },
});

const facilityTerrainUpload = terrainUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'satellite', maxCount: 1 }
]);

// POST /scenes/:id/terrain
router.post('/scenes/:id/terrain', authenticate, facilityTerrainUpload, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const file = files?.file?.[0];
        const satelliteFile = files?.satellite?.[0];

        if (!file) return res.status(400).json({ error: '請選擇地形 CSV 檔案' });

        const { spawn } = require('child_process');
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
            outputData += data.toString();
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
                // 解析 Python 輸出
                const lines = outputData.split('\n');
                let result = null;
                for (const line of lines) {
                    try {
                        const obj = JSON.parse(line.trim());
                        if (obj.status === 'completed') result = obj;
                    } catch (e) { /* skip non-JSON lines */ }
                }

                if (!result) throw new Error('Python 腳本未返回有效結果');

                const meta = result.meta;
                const terrainCsvUrl = `/uploads/facility/terrain/${id}/terrain.csv`;
                const terrainHeightmapUrl = `/uploads/facility/terrain/${id}/${meta.heightmap}`;
                const terrainTextureUrl = meta.satellite
                    ? `/uploads/facility/terrain/${id}/${meta.satellite}`
                    : null;

                const scene = await prisma.facilityScene.update({
                    where: { id },
                    data: {
                        terrainCsvUrl,
                        terrainHeightmapUrl,
                        terrainTextureUrl,
                        terrainTextureMode: terrainTextureUrl ? 'satellite' : 'colorRamp',
                        terrainBounds: {
                            minX: meta.minX, maxX: meta.maxX,
                            minY: meta.minY, maxY: meta.maxY,
                            minZ: meta.minZ, maxZ: meta.maxZ,
                        },
                    }
                });

                res.json(scene);
            } catch (err: any) {
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
        const { id } = req.params;

        const scene = await prisma.facilityScene.update({
            where: { id },
            data: {
                terrainCsvUrl: null,
                terrainHeightmapUrl: null,
                terrainTextureUrl: null,
                terrainTextureMode: null,
                terrainBounds: null,
            }
        });

        // 清理檔案
        const terrainDir = path.join(TERRAIN_DIR, id);
        if (fs.existsSync(terrainDir)) {
            fs.rmSync(terrainDir, { recursive: true, force: true });
        }

        res.json(scene);
    } catch (error) {
        res.status(500).json({ error: '刪除地形失敗' });
    }
});
```

**Step 2: 建立 Python 地形處理腳本**

```python
#!/usr/bin/env python3
"""
facility_terrain_processor.py
CSV (x, y, elevation) → heightmap PNG + optional satellite texture copy
"""

import argparse
import json
import sys
import os
import numpy as np
from scipy.interpolate import griddata
from PIL import Image
import shutil


def log_progress(progress: int, message: str):
    print(json.dumps({"progress": progress, "message": message}), flush=True)


def process_terrain(input_path: str, output_dir: str, satellite_path: str = None):
    log_progress(10, "讀取 CSV 資料...")

    # 讀取 CSV
    try:
        data = np.genfromtxt(input_path, delimiter=',', skip_header=1)
        if data.ndim == 1:
            data = data.reshape(1, -1)
    except Exception:
        # 嘗試空格分隔
        data = np.genfromtxt(input_path, skip_header=1)
        if data.ndim == 1:
            data = data.reshape(1, -1)

    x = data[:, 0]
    y = data[:, 1]
    z = data[:, 2]

    min_x, max_x = float(x.min()), float(x.max())
    min_y, max_y = float(y.min()), float(y.max())
    min_z, max_z = float(z.min()), float(z.max())

    log_progress(30, f"資料範圍: X[{min_x:.1f}, {max_x:.1f}] Y[{min_y:.1f}, {max_y:.1f}] Z[{min_z:.1f}, {max_z:.1f}]")

    # 建立網格
    resolution = 512
    xi = np.linspace(min_x, max_x, resolution)
    yi = np.linspace(min_y, max_y, resolution)
    xi_grid, yi_grid = np.meshgrid(xi, yi)

    log_progress(50, "插值處理中...")

    zi_grid = griddata(
        (x, y), z,
        (xi_grid, yi_grid),
        method='linear',
        fill_value=min_z
    )

    log_progress(70, "產生 heightmap...")

    # 正規化到 0-65535 (16-bit)
    z_range = max_z - min_z
    if z_range == 0:
        z_range = 1.0

    zi_normalized = ((zi_grid - min_z) / z_range * 65535).astype(np.uint16)

    # 翻轉 Y 軸 (影像座標系 vs 地理座標系)
    zi_normalized = np.flipud(zi_normalized)

    # 存為 16-bit PNG
    heightmap_filename = 'heightmap.png'
    heightmap_path = os.path.join(output_dir, heightmap_filename)
    img = Image.fromarray(zi_normalized, mode='I;16')
    img.save(heightmap_path)

    log_progress(80, "產生山影圖...")

    # 產生 hillshade 作為預設紋理
    dx = (max_x - min_x) / resolution
    dy = (max_y - min_y) / resolution
    grad_x, grad_y = np.gradient(np.flipud(zi_grid), dx, dy)
    slope = np.sqrt(grad_x**2 + grad_y**2)
    aspect = np.arctan2(-grad_x, grad_y)

    azimuth = np.radians(315)
    altitude = np.radians(45)

    hillshade = (
        np.cos(altitude) * np.cos(np.arctan(slope)) +
        np.sin(altitude) * np.sin(np.arctan(slope)) * np.cos(azimuth - aspect)
    )
    hillshade = np.clip(hillshade * 255, 0, 255).astype(np.uint8)

    texture_filename = 'texture.png'
    texture_path = os.path.join(output_dir, texture_filename)
    Image.fromarray(hillshade, mode='L').convert('RGB').save(texture_path)

    # 處理衛星影像
    satellite_filename = None
    if satellite_path and os.path.exists(satellite_path):
        log_progress(90, "處理衛星影像...")
        ext = os.path.splitext(satellite_path)[1].lower()
        satellite_filename = f'satellite{ext}'
        dest = os.path.join(output_dir, satellite_filename)
        shutil.copy2(satellite_path, dest)

    log_progress(100, "完成")

    result = {
        "status": "completed",
        "meta": {
            "heightmap": heightmap_filename,
            "texture": texture_filename,
            "satellite": satellite_filename,
            "minX": min_x,
            "maxX": max_x,
            "minY": min_y,
            "maxY": max_y,
            "minZ": min_z,
            "maxZ": max_z,
            "width": resolution,
            "height": resolution,
            "pointCount": len(x),
        }
    }

    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--satellite', default=None)
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    try:
        process_terrain(args.input, args.output_dir, args.satellite)
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}), flush=True)
        sys.exit(1)
```

**Step 3: Commit**

```bash
git add server/routes/facility.ts server/scripts/facility_terrain_processor.py
git commit -m "feat: 新增設施地形上傳 API 及 Python 處理腳本"
```

---

### Task 5: 前端 — TypeScript 型別定義

**Files:**
- Create: `src/types/facility.ts`

**Step 1: 建立型別檔案**

```typescript
export interface FacilityScene {
    id: string;
    projectId: string;
    parentSceneId: string | null;
    name: string;
    description: string | null;
    planImageUrl: string | null;
    autoPlanImageUrl: string | null;
    cameraPosition: { x: number; y: number; z: number } | null;
    cameraTarget: { x: number; y: number; z: number } | null;
    terrainCsvUrl: string | null;
    terrainHeightmapUrl: string | null;
    terrainTextureUrl: string | null;
    terrainTextureMode: 'satellite' | 'colorRamp' | null;
    terrainBounds: {
        minX: number; maxX: number;
        minY: number; maxY: number;
        minZ: number; maxZ: number;
    } | null;
    coordShiftX: number;
    coordShiftY: number;
    coordShiftZ: number;
    coordRotation: number;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    // 伺服器 include 的欄位
    models?: FacilityModelSummary[];
}

export interface FacilityModelSummary {
    id: string;
    name: string;
    childSceneId: string | null;
}

export interface FacilityModel {
    id: string;
    sceneId: string;
    name: string;
    modelUrl: string;
    fileSize: number;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    childSceneId: string | null;
    childScene: { id: string; name: string } | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    infos: FacilityModelInfo[];
}

export interface FacilityModelInfo {
    id: string;
    modelId: string;
    type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'LINK';
    label: string;
    content: string;
    sortOrder: number;
    createdAt: string;
}

export interface Transform {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
}
```

**Step 2: Commit**

```bash
git add src/types/facility.ts
git commit -m "feat: 新增設施模組 TypeScript 型別定義"
```

---

### Task 6: 前端 — Zustand Store

**Files:**
- Create: `src/stores/facilityStore.ts`

**Step 1: 建立 store**

```typescript
import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';
import type { FacilityScene, FacilityModel, Transform } from '../types/facility';

interface FacilityState {
    // 場景
    scenes: FacilityScene[];
    currentSceneId: string | null;
    sceneStack: string[];

    // 模型
    models: FacilityModel[];
    selectedModelId: string | null;
    hoveredModelId: string | null;

    // 編輯
    editMode: boolean;
    editingModelId: string | null;
    transformMode: 'translate' | 'rotate' | 'scale';

    // 狀態
    isLoading: boolean;
    error: string | null;

    // Scene actions
    fetchScenes: (projectId: string) => Promise<void>;
    createScene: (data: { projectId: string; parentSceneId?: string; name: string; description?: string }) => Promise<FacilityScene>;
    updateScene: (id: string, data: Partial<FacilityScene>) => Promise<void>;
    deleteScene: (id: string) => Promise<void>;

    // Navigation
    enterScene: (sceneId: string) => Promise<void>;
    goBack: () => Promise<void>;
    goToRoot: () => Promise<void>;
    getCurrentScene: () => FacilityScene | undefined;
    getRootScene: () => FacilityScene | undefined;
    getBreadcrumbs: () => FacilityScene[];

    // Model actions
    fetchModels: (sceneId: string) => Promise<void>;
    selectModel: (modelId: string | null) => void;
    setHoveredModel: (modelId: string | null) => void;
    updateModelTransform: (modelId: string, transform: Transform) => Promise<void>;

    // Edit mode
    setEditMode: (enabled: boolean) => void;
    setEditingModel: (modelId: string | null) => void;
    setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getHeaders = () => {
    const token = useAuthStore.getState().accessToken;
    return {
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

export const useFacilityStore = create<FacilityState>((set, get) => ({
    scenes: [],
    currentSceneId: null,
    sceneStack: [],
    models: [],
    selectedModelId: null,
    hoveredModelId: null,
    editMode: false,
    editingModelId: null,
    transformMode: 'translate',
    isLoading: false,
    error: null,

    // ===== Scene Actions =====
    fetchScenes: async (projectId: string) => {
        try {
            const res = await axios.get<FacilityScene[]>(`${API_BASE}/api/facility/scenes`, {
                params: { projectId },
                headers: getHeaders(),
                withCredentials: true,
            });
            set({ scenes: res.data });
        } catch (err: any) {
            console.error('[FacilityStore] fetchScenes error:', err);
            set({ error: err.message });
        }
    },

    createScene: async (data) => {
        const res = await axios.post<FacilityScene>(`${API_BASE}/api/facility/scenes`, data, {
            headers: getHeaders(),
            withCredentials: true,
        });
        set(state => ({ scenes: [...state.scenes, res.data] }));
        return res.data;
    },

    updateScene: async (id, data) => {
        const res = await axios.put<FacilityScene>(`${API_BASE}/api/facility/scenes/${id}`, data, {
            headers: getHeaders(),
            withCredentials: true,
        });
        set(state => ({
            scenes: state.scenes.map(s => s.id === id ? { ...s, ...res.data } : s),
        }));
    },

    deleteScene: async (id) => {
        await axios.delete(`${API_BASE}/api/facility/scenes/${id}`, {
            headers: getHeaders(),
            withCredentials: true,
        });
        set(state => ({
            scenes: state.scenes.filter(s => s.id !== id),
            currentSceneId: state.currentSceneId === id ? null : state.currentSceneId,
        }));
    },

    // ===== Navigation =====
    enterScene: async (sceneId: string) => {
        const { currentSceneId, fetchModels } = get();
        set(state => ({
            currentSceneId: sceneId,
            sceneStack: currentSceneId
                ? [...state.sceneStack, currentSceneId]
                : state.sceneStack,
            selectedModelId: null,
            hoveredModelId: null,
            editingModelId: null,
        }));
        await fetchModels(sceneId);
    },

    goBack: async () => {
        const { sceneStack, fetchModels } = get();
        if (sceneStack.length === 0) return;

        const newStack = [...sceneStack];
        const prevSceneId = newStack.pop()!;

        set({
            currentSceneId: prevSceneId,
            sceneStack: newStack,
            selectedModelId: null,
            hoveredModelId: null,
            editingModelId: null,
        });
        await fetchModels(prevSceneId);
    },

    goToRoot: async () => {
        const { scenes, fetchModels } = get();
        const root = scenes.find(s => s.parentSceneId === null);
        if (!root) return;

        set({
            currentSceneId: root.id,
            sceneStack: [],
            selectedModelId: null,
            hoveredModelId: null,
            editingModelId: null,
        });
        await fetchModels(root.id);
    },

    getCurrentScene: () => {
        const { scenes, currentSceneId } = get();
        return scenes.find(s => s.id === currentSceneId);
    },

    getRootScene: () => {
        const { scenes } = get();
        return scenes.find(s => s.parentSceneId === null);
    },

    getBreadcrumbs: () => {
        const { scenes, sceneStack, currentSceneId } = get();
        const ids = [...sceneStack, currentSceneId].filter(Boolean) as string[];
        return ids.map(id => scenes.find(s => s.id === id)).filter(Boolean) as FacilityScene[];
    },

    // ===== Model Actions =====
    fetchModels: async (sceneId: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await axios.get<FacilityModel[]>(`${API_BASE}/api/facility/models`, {
                params: { sceneId },
                headers: getHeaders(),
                withCredentials: true,
            });
            set({ models: res.data, isLoading: false });
        } catch (err: any) {
            console.error('[FacilityStore] fetchModels error:', err);
            set({ error: err.message, isLoading: false, models: [] });
        }
    },

    selectModel: (modelId) => set({ selectedModelId: modelId }),
    setHoveredModel: (modelId) => set({ hoveredModelId: modelId }),

    updateModelTransform: async (modelId, transform) => {
        try {
            await axios.put(`${API_BASE}/api/facility/models/${modelId}/transform`, transform, {
                headers: getHeaders(),
                withCredentials: true,
            });
            set(state => ({
                models: state.models.map(m =>
                    m.id === modelId
                        ? {
                            ...m,
                            ...(transform.position && { position: transform.position }),
                            ...(transform.rotation && { rotation: transform.rotation }),
                            ...(transform.scale && { scale: transform.scale }),
                        }
                        : m
                ),
            }));
        } catch (err: any) {
            console.error('[FacilityStore] updateTransform error:', err);
        }
    },

    // ===== Edit Mode =====
    setEditMode: (enabled) => set({
        editMode: enabled,
        editingModelId: enabled ? get().editingModelId : null,
    }),
    setEditingModel: (modelId) => set({ editingModelId: modelId }),
    setTransformMode: (mode) => set({ transformMode: mode }),
}));
```

**Step 2: Commit**

```bash
git add src/stores/facilityStore.ts
git commit -m "feat: 新增 facilityStore (場景導覽、模型管理、編輯模式)"
```

---

### Task 7: 前端 — 頁面與路由

**Files:**
- Create: `src/pages/FacilityPage.tsx`
- Modify: `src/routes/AppRoutes.tsx`

**Step 1: 建立 FacilityPage 骨架**

```typescript
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useFacilityStore } from '../stores/facilityStore';
import { FacilityCanvas } from '../components/facility/FacilityCanvas';
import { FacilitySidebar } from '../components/facility/FacilitySidebar';
import { FacilityInfoPanel } from '../components/facility/FacilityInfoPanel';
import { FacilityToolbar } from '../components/facility/FacilityToolbar';

export const FacilityPage: React.FC = () => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const { projects, setActiveProject } = useProjectStore();
    const { fetchScenes, enterScene, getRootScene, scenes } = useFacilityStore();

    useEffect(() => {
        if (projectCode) {
            const project = projects.find(p => p.code === projectCode);
            if (project) {
                setActiveProject(project.id);
                fetchScenes(project.id);
            }
        }
    }, [projectCode, projects, setActiveProject, fetchScenes]);

    // 場景載入後自動進入根場景
    useEffect(() => {
        if (scenes.length > 0) {
            const root = scenes.find(s => s.parentSceneId === null);
            if (root) {
                enterScene(root.id);
            }
        }
    }, [scenes, enterScene]);

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
            <FacilitySidebar />
            <div style={{ flex: 1, position: 'relative' }}>
                <FacilityToolbar />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    <FacilityCanvas />
                </div>
                <FacilityInfoPanel />
            </div>
        </div>
    );
};

export default FacilityPage;
```

**Step 2: 在 AppRoutes.tsx 新增路由**

在現有 project-scoped routes 區塊加入：

```typescript
// import
const FacilityPage = React.lazy(() => import('../pages/FacilityPage'));

// route
{
    path: '/project/:projectCode/facility',
    element: (
        <ProtectedRoute allowedRoles={['admin', 'engineer', 'reviewer']}>
            <React.Suspense fallback={<div>Loading...</div>}>
                <FacilityPage />
            </React.Suspense>
        </ProtectedRoute>
    ),
},
```

**Step 3: Commit**

```bash
git add src/pages/FacilityPage.tsx src/routes/AppRoutes.tsx
git commit -m "feat: 新增 FacilityPage 頁面與路由"
```

---

### Task 8: 前端 — 3D Canvas 與環境

**Files:**
- Create: `src/components/facility/FacilityCanvas.tsx`
- Create: `src/components/facility/FacilityEnvironment.tsx`
- Create: `src/components/facility/FacilityCameraController.tsx`

**Step 1: FacilityCanvas.tsx**

```typescript
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { FacilityEnvironment } from './FacilityEnvironment';
import { FacilityModels } from './FacilityModels';
import { FacilityTerrain } from './FacilityTerrain';
import { FacilityCameraController } from './FacilityCameraController';
import { useFacilityStore } from '../../stores/facilityStore';

export function FacilityCanvas() {
    const { isLoading } = useFacilityStore();

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Canvas
                camera={{
                    fov: 45,
                    near: 0.1,
                    far: 50000,
                    position: [0, 200, 400],
                }}
                gl={{
                    antialias: true,
                    alpha: false,
                    logarithmicDepthBuffer: true,
                    powerPreference: 'high-performance',
                }}
                shadows
            >
                <Suspense fallback={null}>
                    <FacilityEnvironment />
                    <FacilityTerrain />
                    <FacilityModels />
                </Suspense>

                <MapControls
                    enableRotate={true}
                    enablePan={true}
                    enableZoom={true}
                    enableDamping={true}
                    dampingFactor={0.1}
                    maxPolarAngle={Math.PI / 2.1}
                    minDistance={1}
                    maxDistance={5000}
                />

                <FacilityCameraController />
            </Canvas>

            {isLoading && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    padding: '12px 24px', borderRadius: '8px', fontSize: '14px',
                }}>
                    載入中...
                </div>
            )}
        </div>
    );
}
```

**Step 2: FacilityEnvironment.tsx**

```typescript
import React from 'react';
import * as THREE from 'three';

export function FacilityEnvironment() {
    return (
        <>
            <color attach="background" args={['#e8ecf1']} />
            <fog attach="fog" args={['#e8ecf1', 2000, 10000]} />

            <ambientLight intensity={0.6} />
            <directionalLight
                position={[200, 400, 200]}
                intensity={1.0}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={2000}
                shadow-camera-left={-500}
                shadow-camera-right={500}
                shadow-camera-top={500}
                shadow-camera-bottom={-500}
            />
            <hemisphereLight
                args={['#b1e1ff', '#b97a20', 0.3]}
            />

            {/* 地面格線 */}
            <gridHelper
                args={[2000, 100, '#ccc', '#e0e0e0']}
                position={[0, -0.01, 0]}
            />
        </>
    );
}
```

**Step 3: FacilityCameraController.tsx**

```typescript
import React, { useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFacilityStore } from '../../stores/facilityStore';

interface FlyToTarget {
    position: THREE.Vector3;
    target: THREE.Vector3;
    duration: number;
    startTime: number;
    startPosition: THREE.Vector3;
    startTarget: THREE.Vector3;
}

export function FacilityCameraController() {
    const { camera } = useThree();
    const flyToRef = useRef<FlyToTarget | null>(null);
    const currentScene = useFacilityStore(state => state.getCurrentScene());

    // 場景切換時 fly-to 預設視角
    React.useEffect(() => {
        if (!currentScene) return;

        const camPos = currentScene.cameraPosition;
        const camTarget = currentScene.cameraTarget;

        if (camPos && camTarget) {
            flyToRef.current = {
                position: new THREE.Vector3(camPos.x, camPos.y, camPos.z),
                target: new THREE.Vector3(camTarget.x, camTarget.y, camTarget.z),
                duration: 800,
                startTime: performance.now(),
                startPosition: camera.position.clone(),
                startTarget: new THREE.Vector3(0, 0, 0), // 會被 controls 更新
            };
        }
    }, [currentScene?.id]);

    useFrame(() => {
        const fly = flyToRef.current;
        if (!fly) return;

        const elapsed = performance.now() - fly.startTime;
        const t = Math.min(elapsed / fly.duration, 1);
        // cubic ease-out
        const ease = 1 - Math.pow(1 - t, 3);

        camera.position.lerpVectors(fly.startPosition, fly.position, ease);

        if (t >= 1) {
            flyToRef.current = null;
        }
    });

    return null;
}
```

**Step 4: Commit**

```bash
git add src/components/facility/FacilityCanvas.tsx src/components/facility/FacilityEnvironment.tsx src/components/facility/FacilityCameraController.tsx
git commit -m "feat: 新增設施導覽 3D Canvas、環境燈光、相機控制器"
```

---

### Task 9: 前端 — 模型載入與互動

**Files:**
- Create: `src/components/facility/FacilityModels.tsx`
- Create: `src/components/facility/FacilityModelItem.tsx`

**Step 1: FacilityModels.tsx**

```typescript
import React from 'react';
import { useFacilityStore } from '../../stores/facilityStore';
import { FacilityModelItem } from './FacilityModelItem';

export function FacilityModels() {
    const models = useFacilityStore(state => state.models);
    const editMode = useFacilityStore(state => state.editMode);

    return (
        <group>
            {models.map(model => (
                <FacilityModelItem key={model.id} model={model} editMode={editMode} />
            ))}
        </group>
    );
}
```

**Step 2: FacilityModelItem.tsx**

```typescript
import React, { useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF, TransformControls, Html } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { useFacilityStore } from '../../stores/facilityStore';
import type { FacilityModel } from '../../types/facility';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Props {
    model: FacilityModel;
    editMode: boolean;
}

export function FacilityModelItem({ model, editMode }: Props) {
    const groupRef = useRef<THREE.Group>(null);
    const { scene: gltfScene } = useGLTF(`${API_BASE}${model.modelUrl}`);
    const clonedScene = React.useMemo(() => gltfScene.clone(), [gltfScene]);

    const selectedModelId = useFacilityStore(state => state.selectedModelId);
    const hoveredModelId = useFacilityStore(state => state.hoveredModelId);
    const editingModelId = useFacilityStore(state => state.editingModelId);
    const transformMode = useFacilityStore(state => state.transformMode);
    const selectModel = useFacilityStore(state => state.selectModel);
    const setHoveredModel = useFacilityStore(state => state.setHoveredModel);
    const setEditingModel = useFacilityStore(state => state.setEditingModel);
    const updateModelTransform = useFacilityStore(state => state.updateModelTransform);

    const isSelected = selectedModelId === model.id;
    const isHovered = hoveredModelId === model.id;
    const isEditing = editingModelId === model.id;

    const [showTooltip, setShowTooltip] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // hover 高亮
    useEffect(() => {
        if (!clonedScene) return;
        clonedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const material = mesh.material as THREE.MeshStandardMaterial;
                if (material.emissive) {
                    material.emissive.setHex(isHovered || isSelected ? 0x333333 : 0x000000);
                }
            }
        });
    }, [clonedScene, isHovered, isSelected]);

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (editMode) {
            setEditingModel(model.id);
        } else {
            selectModel(model.id);
        }
    }, [editMode, model.id, selectModel, setEditingModel]);

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredModel(model.id);
        setShowTooltip(true);
        document.body.style.cursor = 'pointer';
    }, [model.id, setHoveredModel]);

    const handlePointerOut = useCallback(() => {
        setHoveredModel(null);
        setShowTooltip(false);
        document.body.style.cursor = 'auto';
    }, [setHoveredModel]);

    // Transform gizmo change handler
    const handleTransformChange = useCallback(() => {
        if (!groupRef.current) return;

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (!groupRef.current) return;
            const pos = groupRef.current.position;
            const rot = groupRef.current.rotation;
            const scl = groupRef.current.scale;

            updateModelTransform(model.id, {
                position: { x: pos.x, y: pos.y, z: pos.z },
                rotation: {
                    x: THREE.MathUtils.radToDeg(rot.x),
                    y: THREE.MathUtils.radToDeg(rot.y),
                    z: THREE.MathUtils.radToDeg(rot.z),
                },
                scale: { x: scl.x, y: scl.y, z: scl.z },
            });
        }, 300);
    }, [model.id, updateModelTransform]);

    const pos = model.position;
    const rot = model.rotation;
    const scl = model.scale;

    return (
        <>
            <group
                ref={groupRef}
                position={[pos.x, pos.y, pos.z]}
                rotation={[
                    THREE.MathUtils.degToRad(rot.x),
                    THREE.MathUtils.degToRad(rot.y),
                    THREE.MathUtils.degToRad(rot.z),
                ]}
                scale={[scl.x, scl.y, scl.z]}
                onClick={handleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <primitive object={clonedScene} />

                {showTooltip && !editMode && (
                    <Html center style={{ pointerEvents: 'none' }}>
                        <div style={{
                            background: 'rgba(0,0,0,0.75)', color: '#fff',
                            padding: '4px 8px', borderRadius: '4px',
                            fontSize: '12px', whiteSpace: 'nowrap',
                        }}>
                            {model.name}
                            {model.childSceneId && ' (可進入)'}
                        </div>
                    </Html>
                )}
            </group>

            {editMode && isEditing && groupRef.current && (
                <TransformControls
                    object={groupRef.current}
                    mode={transformMode}
                    onObjectChange={handleTransformChange}
                />
            )}
        </>
    );
}
```

**Step 3: Commit**

```bash
git add src/components/facility/FacilityModels.tsx src/components/facility/FacilityModelItem.tsx
git commit -m "feat: 新增設施模型 3D 載入、hover 高亮、點擊選取、Transform 編輯"
```

---

### Task 10: 前端 — 地形元件

**Files:**
- Create: `src/components/facility/FacilityTerrain.tsx`

**Step 1: 建立 FacilityTerrain**

依循現有 `TerrainMesh.tsx` 模式，用 PlaneGeometry + displacementMap + 衛星影像紋理。加入 coordShift 偏移邏輯。由於程式碼較長（約 120 行），實作時參考 `src/components/scene/TerrainMesh.tsx` 的 shader / displacement 模式，關鍵差異：

- 從 `facilityStore.getCurrentScene()` 取得 terrain 資料而非 terrainStore
- 套用 `coordShiftX/Y/Z` 偏移到 mesh position
- 套用 `coordRotation` 旋轉到 mesh rotation.y
- 不需要 clipping plane

**Step 2: Commit**

```bash
git add src/components/facility/FacilityTerrain.tsx
git commit -m "feat: 新增設施場景地形渲染元件 (含座標偏移)"
```

---

### Task 11: 前端 — 側邊欄 (Sidebar + SceneTree + BreadcrumbNav)

**Files:**
- Create: `src/components/facility/FacilitySidebar.tsx`
- Create: `src/components/facility/BreadcrumbNav.tsx`
- Create: `src/components/facility/SceneTree.tsx`

**Step 1: FacilitySidebar.tsx**

主容器，包含 BreadcrumbNav、SceneTree、PlanView（Task 12）。
- 寬度 280px，左側固定
- 底色 `#f8f9fa`，overflow-y auto
- 依循 GeologySidebar 的 CSS 模式

**Step 2: BreadcrumbNav.tsx**

- 用 `getBreadcrumbs()` 取得路徑
- 每個 breadcrumb 可點擊跳轉（清空 stack 到該層）
- 樣式：`場區總覽 > A棟 > 1F`，當前層級加粗

**Step 3: SceneTree.tsx**

- 遞迴渲染 scenes 樹（parentSceneId 建立父子關係）
- 每個節點顯示名稱 + 模型數量 badge
- 點擊節點 → `enterScene(sceneId)`
- 有子場景的節點可展開/收合
- 目前所在場景高亮

**Step 4: Commit**

```bash
git add src/components/facility/FacilitySidebar.tsx src/components/facility/BreadcrumbNav.tsx src/components/facility/SceneTree.tsx
git commit -m "feat: 新增設施導覽側邊欄 (麵包屑 + 場景樹)"
```

---

### Task 12: 前端 — PlanView (2D 平面圖)

**Files:**
- Create: `src/components/facility/PlanView.tsx`

**Step 1: 建立 PlanView**

- 顯示 `planImageUrl` 或 `autoPlanImageUrl`（優先手動上傳）
- 無圖時顯示「尚無平面圖」placeholder
- 將模型 position (x, z) 正規化映射到圖片上的標記點
- 標記：有 childSceneId 的用不同顏色圓點
- hover 標記 → `setHoveredModel(id)`
- click 標記 → `selectModel(id)`

**Step 2: Commit**

```bash
git add src/components/facility/PlanView.tsx
git commit -m "feat: 新增 2D 平面圖互動元件"
```

---

### Task 13: 前端 — InfoPanel (Rich Content)

**Files:**
- Create: `src/components/facility/FacilityInfoPanel.tsx`

**Step 1: 建立 FacilityInfoPanel**

- 右側滑出面板，selectedModelId 有值時顯示
- 頂部：模型名稱、描述
- 中間：Rich Content 列表
  - `TEXT` → 純文字段落
  - `IMAGE` → 圖片縮圖 + 點擊放大 (lightbox overlay)
  - `DOCUMENT` → 檔案圖示 + 下載連結
  - `LINK` → 超連結 (新分頁開啟)
- 底部按鈕：
  - 有 `childSceneId` → 「進入內部」按鈕，點擊 `enterScene(childSceneId)`
  - 編輯模式下 → 「編輯位置」按鈕
- 關閉按鈕 → `selectModel(null)`

**Step 2: Commit**

```bash
git add src/components/facility/FacilityInfoPanel.tsx
git commit -m "feat: 新增設施模型 Rich Content 資訊面板"
```

---

### Task 14: 前端 — 工具列 + Transform 輸入面板 + 座標偏移面板

**Files:**
- Create: `src/components/facility/FacilityToolbar.tsx`
- Create: `src/components/facility/TransformInputPanel.tsx`
- Create: `src/components/facility/CoordShiftPanel.tsx`

**Step 1: FacilityToolbar.tsx**

- 固定在畫面頂部，z-index 高於 Canvas
- 包含：EditModeToggle（開關 editMode）、ScreenshotButton（俯視截圖）、TerrainTextureToggle、BackToRoot

**Step 2: TransformInputPanel.tsx**

- 編輯模式 + editingModelId 有值時顯示
- 浮動面板，顯示 Position/Rotation/Scale 各 XYZ 數值輸入
- 修改值 → debounce → `updateModelTransform()`
- TransformMode 切換按鈕組 (移動/旋轉/縮放)

**Step 3: CoordShiftPanel.tsx**

- 在 sidebar 底部，編輯模式時顯示
- 顯示 coordShiftX/Y/Z + coordRotation 輸入框
- 「自動對齊」按鈕：計算地形 bbox 中心與模型 bbox 中心差值
- 「套用」按鈕 → `updateScene(id, { coordShiftX, ... })`
- 「重置」按鈕 → 歸零

**Step 4: Commit**

```bash
git add src/components/facility/FacilityToolbar.tsx src/components/facility/TransformInputPanel.tsx src/components/facility/CoordShiftPanel.tsx
git commit -m "feat: 新增工具列、Transform 輸入面板、座標偏移面板"
```

---

### Task 15: 前端 — 資料管理頁面上傳區塊

**Files:**
- Create: `src/components/data/FacilityUploadSection.tsx`
- Modify: `src/pages/DataManagementPage.tsx`

**Step 1: FacilityUploadSection.tsx**

依循 `TerrainUploadSection.tsx` 模式，包含四個子區塊：

1. **場景管理** — 建立/編輯/刪除場景（樹狀顯示）+ 上傳平面圖
2. **模型上傳** — 選擇目標場景 dropdown、拖拉上傳 GLB/glTF、名稱/描述表單、childSceneId dropdown（含「+ 新建場景」快捷按鈕）、未關聯子場景自動提示
3. **模型資訊編輯** — 選模型 → 顯示 info 列表 → 新增/編輯/刪除 Rich Content
4. **場景地形** — 選場景 → 上傳 CSV + 衛星影像 → 座標偏移設定

使用既有的 `dm-section`、`dm-upload-zone`、`dm-modal` 等 CSS class。

**Step 2: 在 DataManagementPage.tsx 加入 FacilityUploadSection**

在現有的 upload sections 區塊末尾（或合適位置）加入：

```typescript
import { FacilityUploadSection } from '../components/data/FacilityUploadSection';

// 在 JSX 中加入
<FacilityUploadSection />
```

**Step 3: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx src/pages/DataManagementPage.tsx
git commit -m "feat: 新增設施模組資料上傳管理介面"
```

---

### Task 16: 側邊導覽連結

**Files:**
- Modify: 側邊導覽選單元件（GeologySidebar 或全域 Layout 中的導覽列）

**Step 1: 確認導覽選單元件位置**

搜尋現有側邊欄中「地質」或其他模組的導覽連結，加入「設施導覽」項目：
- 圖示：Building2 (lucide-react)
- 文字：設施導覽
- 路徑：`/project/${projectCode}/facility`

**Step 2: Commit**

```bash
git add <modified-file>
git commit -m "feat: 在導覽選單新增設施導覽連結"
```

---

### Task 17: 整合驗證

**Step 1: 啟動 PostgreSQL**

Run: `docker start llrwd-postgres`

**Step 2: 推送 schema**

Run: `cd server && npx prisma db push && npx prisma generate`

**Step 3: 啟動後端**

Run: `cd server && npm run dev`
Expected: Server starts on :3001, no errors

**Step 4: 啟動前端**

Run: `npm run dev`
Expected: Vite dev server on :5173, no compile errors

**Step 5: 手動驗證**

1. 登入 → 進入專案
2. 資料管理頁面 → 看到設施上傳區塊
3. 建立場景 → 上傳 GLB 模型
4. 進入設施導覽頁面 → 看到 3D 模型
5. 點擊模型 → InfoPanel 彈出
6. 編輯模式 → Transform Gizmo 可拖拉

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: 設施導覽模組整合完成"
```
