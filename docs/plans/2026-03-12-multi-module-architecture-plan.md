# Multi-Module Instance Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow each project to have N instances of each module type (geology, facility, etc.), each with independent data, custom name/description, and sortable order.

**Architecture:** New `Module` DB entity links project ↔ data. All existing `projectId` scoping in data tables migrates to `moduleId`. Routes change from `/project/:code/geology` to `/project/:code/module/:moduleId`. A code-level `MODULE_TYPES` registry maps type strings to page components.

**Tech Stack:** Prisma 7 (PostgreSQL), Express 5, React 19, Zustand 5, React Router 7

**No test suite configured** — verification via `npx tsc --noEmit` (backend) + `npx vite build` (frontend).

---

## Dependency Graph

```
Task 1 (DB Schema)
  ├─→ Task 2 (Module CRUD API)  ──→ Task 4 (moduleStore)  ──→ Task 5 (Dashboard UI)
  ├─→ Task 3 (Migration Script)                            ──→ Task 6 (Routes + Page Loader)
  │                                                        ──→ Task 7 (Data Pages moduleId)
  └─→ Task 8 (Viewer Permissions)  ──→ Task 9 (Admin UI)
                                                            ──→ Task 10 (Domain Stores moduleId)
```

**Parallelizable groups:**
- After Task 1: Tasks 2, 3, 8 can run in parallel
- After Task 4: Tasks 5, 6, 7, 9, 10 can run in parallel

---

## Task 1: DB Schema — Add Module Model

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add Module model to schema.prisma**

After the `WaterLevel` model (~line 310), add:

```prisma
model Module {
  id          String   @id @default(uuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  type        String   // 'geology' | 'facility' | 'engineering' | 'simulation'
  name        String
  description String?
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?

  // Data relations
  boreholes       Borehole[]
  geologyModels   GeologyModel[]
  faultPlanes     FaultPlane[]
  attitudes       Attitude[]
  terrains        Terrain[]
  waterLevels     WaterLevel[]
  imageries       Imagery[]
  geophysics      Geophysics[]
  lithologies     ProjectLithology[]
  facilityScenes  FacilityScene[]

  // Viewer permissions
  userAccess  UserProjectModule[]

  @@index([projectId])
  @@index([projectId, type])
}
```

**Step 2: Add `moduleId` to all data models**

For each of these models, add an optional `moduleId` field (optional during migration transition):

```prisma
// In each data model (Borehole, GeologyModel, FaultPlane, Attitude, Terrain,
// WaterLevel, Imagery, Geophysics, ProjectLithology, FacilityScene):

moduleId    String?
module      Module?  @relation(fields: [moduleId], references: [id], onDelete: Cascade)
```

Add `@@index([moduleId])` to each.

**Step 3: Update Project model**

Add relation to Project model:

```prisma
// In Project model, add:
modules     Module[]
```

**Step 4: Update UserProjectModule**

Change from `moduleKey` string to FK reference:

```prisma
model UserProjectModule {
  id              String       @id @default(uuid())
  userProjectId   String
  userProject     UserProject  @relation(fields: [userProjectId], references: [id], onDelete: Cascade)
  moduleId        String
  module          Module       @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@unique([userProjectId, moduleId])
}
```

Remove the old `moduleKey` field.

**Step 5: Sync DB and regenerate client**

```bash
cd server && npx prisma db push && npx prisma generate
```

**Step 6: Verify**

```bash
cd server && npx tsc --noEmit
```

Expected: TypeScript errors in files that reference `moduleKey` — these are fixed in subsequent tasks.

**Step 7: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(db): add Module entity for multi-module instance architecture"
```

---

## Task 2: Module CRUD API

**Files:**
- Create: `server/routes/module.ts`
- Modify: `server/index.ts` (register route)

**Depends on:** Task 1

**Step 1: Create `server/routes/module.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// GET /api/module?projectId=xxx — list all modules for a project
router.get('/', authenticate, async (req: Request, res: Response) => {
    const projectId = req.query.projectId as string;
    if (!projectId) {
        res.status(400).json({ success: false, message: 'projectId required' });
        return;
    }

    const modules = await prisma.module.findMany({
        where: { projectId },
        orderBy: { sortOrder: 'asc' },
    });

    res.json({ success: true, data: modules });
});

// GET /api/module/:id — get single module
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const mod = await prisma.module.findUnique({ where: { id } });
    if (!mod) {
        res.status(404).json({ success: false, message: 'Module not found' });
        return;
    }
    res.json({ success: true, data: mod });
});

// POST /api/module — create module (admin/engineer)
router.post('/', authenticate, authorize('admin', 'engineer'), async (req: Request, res: Response) => {
    const { projectId, type, name, description } = req.body;
    if (!projectId || !type || !name) {
        res.status(400).json({ success: false, message: 'projectId, type, name required' });
        return;
    }

    // Get max sortOrder for this project
    const maxSort = await prisma.module.aggregate({
        where: { projectId },
        _max: { sortOrder: true },
    });

    const mod = await prisma.module.create({
        data: {
            projectId,
            type,
            name,
            description: description || null,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            createdBy: (req as any).user?.userId || null,
        },
    });

    res.status(201).json({ success: true, data: mod });
});

// PUT /api/module/:id — update module name/description (admin/engineer)
router.put('/:id', authenticate, authorize('admin', 'engineer'), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, description } = req.body;

    const mod = await prisma.module.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
        },
    });

    res.json({ success: true, data: mod });
});

// PUT /api/module/reorder — update sortOrder for multiple modules (admin)
router.put('/reorder', authenticate, authorize('admin'), async (req: Request, res: Response) => {
    const { orders } = req.body as { orders: { id: string; sortOrder: number }[] };
    if (!Array.isArray(orders)) {
        res.status(400).json({ success: false, message: 'orders array required' });
        return;
    }

    await prisma.$transaction(
        orders.map(({ id, sortOrder }) =>
            prisma.module.update({ where: { id }, data: { sortOrder } })
        )
    );

    res.json({ success: true });
});

// GET /api/module/:id/stats — data statistics before delete
router.get('/:id/stats', authenticate, authorize('admin'), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const mod = await prisma.module.findUnique({ where: { id } });
    if (!mod) {
        res.status(404).json({ success: false, message: 'Module not found' });
        return;
    }

    const [boreholes, geologyModels, faultPlanes, attitudes, terrains, waterLevels, imageries, geophysics, facilityScenes] = await Promise.all([
        prisma.borehole.count({ where: { moduleId: id } }),
        prisma.geologyModel.count({ where: { moduleId: id } }),
        prisma.faultPlane.count({ where: { moduleId: id } }),
        prisma.attitude.count({ where: { moduleId: id } }),
        prisma.terrain.count({ where: { moduleId: id } }),
        prisma.waterLevel.count({ where: { moduleId: id } }),
        prisma.imagery.count({ where: { moduleId: id } }),
        prisma.geophysics.count({ where: { moduleId: id } }),
        prisma.facilityScene.count({ where: { moduleId: id } }),
    ]);

    res.json({
        success: true,
        data: {
            moduleType: mod.type,
            moduleName: mod.name,
            counts: { boreholes, geologyModels, faultPlanes, attitudes, terrains, waterLevels, imageries, geophysics, facilityScenes },
        },
    });
});

// DELETE /api/module/:id — delete module + cascade data (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { confirmName } = req.body;

    const mod = await prisma.module.findUnique({ where: { id } });
    if (!mod) {
        res.status(404).json({ success: false, message: 'Module not found' });
        return;
    }

    if (confirmName !== mod.name) {
        res.status(400).json({ success: false, message: '請輸入模組名稱確認刪除' });
        return;
    }

    // Cascade delete handled by Prisma onDelete: Cascade
    await prisma.module.delete({ where: { id } });

    res.json({ success: true });
});

export default router;
```

**Step 2: Register route in `server/index.ts`**

Find where other routes are imported and registered. Add:

```typescript
import moduleRoutes from './routes/module';
// ...
app.use('/api/module', moduleRoutes);
```

**Note:** Place the `/reorder` route BEFORE `/:id` in the router to avoid Express matching `reorder` as an `:id` param. Alternatively, restructure:
- Move the `router.put('/reorder', ...)` declaration ABOVE `router.put('/:id', ...)` in the file.

**Step 3: Verify**

```bash
cd server && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add server/routes/module.ts server/index.ts
git commit -m "feat(api): add Module CRUD + stats + reorder endpoints"
```

---

## Task 3: Data Migration Script

**Files:**
- Create: `server/prisma/migrate-to-modules.ts`

**Depends on:** Task 1

This script creates Module instances for existing projects and migrates `projectId`-scoped data to `moduleId`.

**Step 1: Create migration script**

```typescript
// server/prisma/migrate-to-modules.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MODULE_TYPE_LABELS: Record<string, string> = {
    geology: '地質資料',
    facility: '設施導覽',
    engineering: '工程設計',
    simulation: '模擬分析',
};

async function migrate() {
    const projects = await prisma.project.findMany();
    console.log(`Found ${projects.length} projects to migrate`);

    for (const project of projects) {
        console.log(`\nMigrating project: ${project.name} (${project.id})`);

        // Check which module types have data
        const [boreholeCount, geologyModelCount, faultCount, attitudeCount, terrainCount, waterLevelCount, imageryCount, geophysicsCount, facilitySceneCount] = await Promise.all([
            prisma.borehole.count({ where: { projectId: project.id, moduleId: null } }),
            prisma.geologyModel.count({ where: { projectId: project.id, moduleId: null } }),
            prisma.faultPlane.count({ where: { projectId: project.id, moduleId: null } }),
            prisma.attitude.count({ where: { projectId: project.id, moduleId: null } }),
            prisma.terrain.count({ where: { projectId: project.id, moduleId: null } }),
            prisma.waterLevel.count({ where: { projectId: project.id, moduleId: null } }),
            prisma.imagery.count({ where: { projectId: project.id, moduleId: null } }),
            prisma.geophysics.count({ where: { projectId: project.id, moduleId: null } }),
            prisma.facilityScene.count({ where: { projectId: project.id, moduleId: null } }),
        ]);

        const geologyHasData = boreholeCount + geologyModelCount + faultCount + attitudeCount + terrainCount + waterLevelCount + imageryCount + geophysicsCount > 0;
        const facilityHasData = facilitySceneCount > 0;

        // Create modules for types that have data (or all 4 types for completeness)
        const typesToCreate = Object.keys(MODULE_TYPE_LABELS);
        let sortOrder = 0;

        for (const type of typesToCreate) {
            // Check if module already exists (idempotent)
            const existing = await prisma.module.findFirst({
                where: { projectId: project.id, type },
            });
            if (existing) {
                console.log(`  Module ${type} already exists, skipping creation`);
                continue;
            }

            const mod = await prisma.module.create({
                data: {
                    projectId: project.id,
                    type,
                    name: MODULE_TYPE_LABELS[type],
                    sortOrder: sortOrder++,
                },
            });
            console.log(`  Created module: ${mod.name} (${mod.id})`);

            // Migrate data based on type
            if (type === 'geology') {
                const updates = await Promise.all([
                    prisma.borehole.updateMany({ where: { projectId: project.id, moduleId: null }, data: { moduleId: mod.id } }),
                    prisma.geologyModel.updateMany({ where: { projectId: project.id, moduleId: null }, data: { moduleId: mod.id } }),
                    prisma.faultPlane.updateMany({ where: { projectId: project.id, moduleId: null }, data: { moduleId: mod.id } }),
                    prisma.attitude.updateMany({ where: { projectId: project.id, moduleId: null }, data: { moduleId: mod.id } }),
                    prisma.terrain.updateMany({ where: { projectId: project.id, moduleId: null }, data: { moduleId: mod.id } }),
                    prisma.waterLevel.updateMany({ where: { projectId: project.id, moduleId: null }, data: { moduleId: mod.id } }),
                    prisma.imagery.updateMany({ where: { projectId: project.id, moduleId: null }, data: { moduleId: mod.id } }),
                    prisma.geophysics.updateMany({ where: { projectId: project.id, moduleId: null }, data: { moduleId: mod.id } }),
                ]);
                const total = updates.reduce((sum, u) => sum + u.count, 0);
                console.log(`    Migrated ${total} geology records`);
            }

            if (type === 'facility') {
                const update = await prisma.facilityScene.updateMany({
                    where: { projectId: project.id, moduleId: null },
                    data: { moduleId: mod.id },
                });
                console.log(`    Migrated ${update.count} facility scenes`);
            }
        }

        // Migrate UserProjectModule: moduleKey → moduleId
        const userProjects = await prisma.userProject.findMany({
            where: { projectId: project.id },
            include: { modules: true },
        });

        for (const up of userProjects) {
            for (const upm of up.modules) {
                // Find the module instance for this type
                const mod = await prisma.module.findFirst({
                    where: { projectId: project.id, type: (upm as any).moduleKey },
                });
                if (mod) {
                    // Update moduleKey → moduleId (handled by schema change)
                    // If schema already changed, create new record
                    try {
                        await prisma.userProjectModule.update({
                            where: { id: upm.id },
                            data: { moduleId: mod.id },
                        });
                        console.log(`    Migrated viewer access: ${(upm as any).moduleKey} → ${mod.id}`);
                    } catch (e) {
                        console.log(`    Skipped viewer access migration for ${upm.id}: ${e}`);
                    }
                }
            }
        }
    }

    // Migrate ProjectLithology (geology-scoped)
    const lithologies = await prisma.projectLithology.findMany({ where: { moduleId: null } });
    for (const lith of lithologies) {
        const mod = await prisma.module.findFirst({
            where: { projectId: lith.projectId, type: 'geology' },
        });
        if (mod) {
            await prisma.projectLithology.update({
                where: { id: lith.id },
                data: { moduleId: mod.id },
            });
        }
    }
    console.log(`\nMigrated ${lithologies.length} lithology records`);

    console.log('\nMigration complete!');
}

migrate()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
```

**Step 2: Run migration**

```bash
cd server && npx ts-node prisma/migrate-to-modules.ts
```

**Step 3: Verify data**

```bash
cd server && npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.module.findMany().then(m => { console.log('Modules:', m.length); m.forEach(x => console.log(x.type, x.name, x.projectId)); }).finally(() => p.\$disconnect());
"
```

**Step 4: Commit**

```bash
git add server/prisma/migrate-to-modules.ts
git commit -m "feat(migration): add script to migrate existing data to Module instances"
```

---

## Task 4: Frontend Module Store

**Files:**
- Create: `src/stores/moduleStore.ts`
- Create: `src/config/moduleRegistry.ts`

**Depends on:** Task 2

**Step 1: Create `src/config/moduleRegistry.ts`**

```typescript
import { Layers, Building2, Ruler, Activity, type LucideIcon } from 'lucide-react';

export interface ModuleTypeConfig {
    label: string;
    icon: LucideIcon;
    description: string;
}

export const MODULE_TYPES: Record<string, ModuleTypeConfig> = {
    geology: { label: '地質資料', icon: Layers, description: '鑽孔、地質模型、斷層、地球物理等地質資料' },
    facility: { label: '設施導覽', icon: Building2, description: '3D 設施模型、場景與動畫導覽' },
    engineering: { label: '工程設計', icon: Ruler, description: '工程設計圖與 BIM 模型' },
    simulation: { label: '模擬分析', icon: Activity, description: '模擬分析與數據視覺化' },
} as const;

export const getModuleTypeConfig = (type: string): ModuleTypeConfig | undefined =>
    MODULE_TYPES[type];

export const getAvailableModuleTypes = (): { type: string; config: ModuleTypeConfig }[] =>
    Object.entries(MODULE_TYPES).map(([type, config]) => ({ type, config }));
```

**Step 2: Create `src/stores/moduleStore.ts`**

```typescript
import { create } from 'zustand';
import { useAuthStore } from './authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface Module {
    id: string;
    projectId: string;
    type: string;
    name: string;
    description: string | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
}

export interface ModuleStats {
    moduleType: string;
    moduleName: string;
    counts: Record<string, number>;
}

interface ModuleStore {
    modules: Module[];
    loading: boolean;
    error: string | null;
    activeModuleId: string | null;

    fetchModules: (projectId: string) => Promise<void>;
    getModule: (moduleId: string) => Module | undefined;
    createModule: (projectId: string, type: string, name: string, description?: string) => Promise<Module>;
    updateModule: (moduleId: string, data: { name?: string; description?: string }) => Promise<void>;
    deleteModule: (moduleId: string, confirmName: string) => Promise<void>;
    getModuleStats: (moduleId: string) => Promise<ModuleStats>;
    reorderModules: (orders: { id: string; sortOrder: number }[]) => Promise<void>;
    setActiveModuleId: (id: string | null) => void;
}

const authHeaders = (): HeadersInit => {
    const token = useAuthStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

export const useModuleStore = create<ModuleStore>((set, get) => ({
    modules: [],
    loading: false,
    error: null,
    activeModuleId: null,

    fetchModules: async (projectId: string) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`${API_BASE}/api/module?projectId=${projectId}`, { headers: authHeaders() });
            const json = await res.json();
            if (json.success) {
                set({ modules: json.data, loading: false });
            } else {
                set({ error: json.message, loading: false });
            }
        } catch (e) {
            set({ error: (e as Error).message, loading: false });
        }
    },

    getModule: (moduleId: string) => get().modules.find(m => m.id === moduleId),

    createModule: async (projectId, type, name, description) => {
        const res = await fetch(`${API_BASE}/api/module`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ projectId, type, name, description }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        set(state => ({ modules: [...state.modules, json.data] }));
        return json.data;
    },

    updateModule: async (moduleId, data) => {
        const res = await fetch(`${API_BASE}/api/module/${moduleId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        set(state => ({
            modules: state.modules.map(m => m.id === moduleId ? { ...m, ...json.data } : m),
        }));
    },

    deleteModule: async (moduleId, confirmName) => {
        const res = await fetch(`${API_BASE}/api/module/${moduleId}`, {
            method: 'DELETE',
            headers: authHeaders(),
            body: JSON.stringify({ confirmName }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        set(state => ({
            modules: state.modules.filter(m => m.id !== moduleId),
        }));
    },

    getModuleStats: async (moduleId) => {
        const res = await fetch(`${API_BASE}/api/module/${moduleId}/stats`, { headers: authHeaders() });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return json.data;
    },

    reorderModules: async (orders) => {
        const res = await fetch(`${API_BASE}/api/module/reorder`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ orders }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        set(state => ({
            modules: state.modules.map(m => {
                const order = orders.find(o => o.id === m.id);
                return order ? { ...m, sortOrder: order.sortOrder } : m;
            }).sort((a, b) => a.sortOrder - b.sortOrder),
        }));
    },

    setActiveModuleId: (id) => set({ activeModuleId: id }),
}));
```

**Step 3: Verify**

```bash
npx tsc --noEmit  # from project root (frontend)
```

**Step 4: Commit**

```bash
git add src/stores/moduleStore.ts src/config/moduleRegistry.ts
git commit -m "feat: add moduleStore and moduleRegistry for multi-module architecture"
```

---

## Task 5: Project Dashboard — Dynamic Module Cards

**Files:**
- Modify: `src/pages/ProjectDashboardPage.tsx`

**Depends on:** Task 4

**Step 1: Replace hardcoded module cards with dynamic list**

Key changes:
- Import `useModuleStore` and `MODULE_TYPES` / `getModuleTypeConfig`
- On mount (when `project` is set), call `fetchModules(project.id)`
- Replace the 4 hardcoded module cards with a `.map()` over `modules`
- Each card: icon from `MODULE_TYPES[module.type]`, display `module.name` + `module.description`
- Click navigates to `/project/${projectCode}/module/${module.id}`
- Admin/Engineer: show "+ 新增模組" button → modal (select type → enter name/description)
- Admin: show drag handles for reorder, delete button on each card
- Delete button: fetch stats → confirm dialog → delete

**Viewer access check changes:**
- Old: `canAccessModule('geology')` checks `allowedModules.includes('geology')`
- New: `canAccessModule(moduleId)` checks `allowedModules.includes(moduleId)`
- `allowedModules` now contains module instance IDs instead of type strings

**Step 2: Add "New Module" modal**

Simple modal with:
- Dropdown: select from `getAvailableModuleTypes()` (shows label + description)
- Text input: name (pre-filled with type label)
- Textarea: description (optional)
- Submit → `createModule(projectId, type, name, description)`

**Step 3: Add delete confirmation dialog**

- Trigger: click delete icon on module card
- Fetch `getModuleStats(moduleId)` → display counts
- Text input: type module name to confirm
- Submit → `deleteModule(moduleId, confirmName)`

**Step 4: Data management links**

- Old: separate `/project/:code/data` and `/project/:code/facility-data` links
- New: each module card has a "資料管理" sub-link → `/project/${code}/module/${moduleId}/data`
- Only show for module types that have data pages (check `MODULE_TYPES` registry or hardcode: geology + facility)

**Step 5: Verify**

```bash
npx vite build
```

**Step 6: Commit**

```bash
git add src/pages/ProjectDashboardPage.tsx
git commit -m "feat(dashboard): dynamic module cards with create/delete/reorder"
```

---

## Task 6: Routes + Dynamic Page Loader

**Files:**
- Modify: `src/routes/AppRoutes.tsx`
- Create: `src/pages/ModulePageLoader.tsx`
- Create: `src/pages/ModuleDataPageLoader.tsx`

**Depends on:** Task 4

**Step 1: Create `src/pages/ModulePageLoader.tsx`**

Dynamic page loader that reads `moduleId` from URL, fetches module info, and renders the correct Page component:

```typescript
import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useModuleStore } from '../stores/moduleStore';
import { useProjectStore } from '../stores/projectStore';

// Lazy load page components
const GeologyPage = React.lazy(() => import('./GeologyPage'));
const FacilityPage = React.lazy(() => import('./FacilityPage'));
const EngineeringPage = React.lazy(() => import('./EngineeringPage'));
const SimulationPage = React.lazy(() => import('./SimulationPage'));

const PAGE_MAP: Record<string, React.LazyExoticComponent<any>> = {
    geology: GeologyPage,
    facility: FacilityPage,
    engineering: EngineeringPage,
    simulation: SimulationPage,
};

export const ModulePageLoader: React.FC = () => {
    const { projectCode, moduleId } = useParams<{ projectCode: string; moduleId: string }>();
    const { modules, fetchModules, setActiveModuleId } = useModuleStore();
    const { projects, activeProjectId, setActiveProject } = useProjectStore();

    const project = projects.find(p => p.code === projectCode);
    const mod = modules.find(m => m.id === moduleId);

    useEffect(() => {
        if (project && project.id !== activeProjectId) {
            setActiveProject(project.id);
        }
    }, [project?.id]);

    useEffect(() => {
        if (project && modules.length === 0) {
            fetchModules(project.id);
        }
    }, [project?.id]);

    useEffect(() => {
        if (moduleId) setActiveModuleId(moduleId);
        return () => setActiveModuleId(null);
    }, [moduleId]);

    if (!mod) {
        return <div>Loading module...</div>;
    }

    const PageComponent = PAGE_MAP[mod.type];
    if (!PageComponent) {
        return <Navigate to={`/project/${projectCode}`} replace />;
    }

    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <PageComponent moduleId={mod.id} />
        </React.Suspense>
    );
};
```

**Step 2: Create `src/pages/ModuleDataPageLoader.tsx`**

Same pattern but loads data management pages:

```typescript
const DataManagementPage = React.lazy(() => import('./DataManagementPage'));
const FacilityDataPage = React.lazy(() => import('./FacilityDataPage'));

const DATA_PAGE_MAP: Record<string, React.LazyExoticComponent<any>> = {
    geology: DataManagementPage,
    facility: FacilityDataPage,
};
```

**Step 3: Update `src/routes/AppRoutes.tsx`**

Replace the 4 individual module routes with 2 dynamic routes:

```tsx
// Remove these:
// /project/:projectCode/geology
// /project/:projectCode/facility
// /project/:projectCode/engineering
// /project/:projectCode/simulation
// /project/:projectCode/data
// /project/:projectCode/facility-data

// Add these:
<Route path="/project/:projectCode/module/:moduleId" element={
    <ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']} requiredModuleId>
        <ModulePageLoader />
    </ProtectedRoute>
} />
<Route path="/project/:projectCode/module/:moduleId/data" element={
    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
        <ModuleDataPageLoader />
    </ProtectedRoute>
} />
```

**Step 4: Add redirect routes for backward compatibility**

```tsx
// Redirect old routes to dashboard (users will pick the module from there)
<Route path="/project/:projectCode/geology" element={<Navigate to={`../`} replace />} />
<Route path="/project/:projectCode/facility" element={<Navigate to={`../`} replace />} />
// etc.
```

**Step 5: Verify**

```bash
npx vite build
```

**Step 6: Commit**

```bash
git add src/pages/ModulePageLoader.tsx src/pages/ModuleDataPageLoader.tsx src/routes/AppRoutes.tsx
git commit -m "feat(routes): dynamic module page loader with lazy loading"
```

---

## Task 7: Page Components — Accept moduleId Prop

**Files:**
- Modify: `src/pages/GeologyPage.tsx`
- Modify: `src/pages/FacilityPage.tsx`
- Modify: `src/pages/DataManagementPage.tsx`
- Modify: `src/pages/FacilityDataPage.tsx`
- Modify: `src/pages/EngineeringPage.tsx`
- Modify: `src/pages/SimulationPage.tsx`

**Depends on:** Task 4

**Step 1: Add `moduleId` prop to each Page component**

Each page currently reads `activeProjectId` from `useProjectStore`. They need to also accept and use `moduleId`:

```typescript
interface GeologyPageProps {
    moduleId?: string;
}

export const GeologyPage: React.FC<GeologyPageProps> = ({ moduleId }) => {
    // Use moduleId to scope all data fetches
    // Pass moduleId to stores: fetchBoreholes(moduleId), etc.
};
```

**Important:** During transition, `moduleId` is optional. If not provided (legacy routes), fall back to existing `activeProjectId` behavior.

**Step 2: Thread `moduleId` through to child components and stores**

Each page passes `moduleId` to its data-fetching calls. For example, `GeologyPage` calls:
- `boreholeStore.fetchBoreholes(moduleId)` instead of `fetchBoreholes(projectId)`
- Similar for all other geology stores

This is a large change that affects many components. Do it incrementally:
1. First, add the prop and pass it down
2. In Task 10, update the stores to accept `moduleId`

**Step 3: Verify**

```bash
npx vite build
```

**Step 4: Commit**

```bash
git add src/pages/*.tsx
git commit -m "feat(pages): accept moduleId prop for multi-module scoping"
```

---

## Task 8: Viewer Permissions — moduleId-based

**Files:**
- Modify: `server/routes/user-access.ts`
- Modify: `server/routes/project.ts`
- Modify: `server/middleware/auth.ts`

**Depends on:** Task 1

**Step 1: Update `server/routes/user-access.ts`**

- Remove `VALID_MODULES` hardcoded array
- Change all `moduleKey` references to `moduleId`
- Validate `moduleId` against actual `Module` records in DB instead of hardcoded list
- `PUT /:userId/projects/:projectId` body changes from `{ modules: ['geology', 'facility'] }` to `{ moduleIds: ['uuid1', 'uuid2'] }`
- `PUT /:userId/batch` body changes similarly

```typescript
// Old validation:
// const invalidModules = modules.filter(m => !VALID_MODULES.includes(m));

// New validation:
const existingModules = await prisma.module.findMany({
    where: { id: { in: moduleIds }, projectId },
});
if (existingModules.length !== moduleIds.length) {
    res.status(400).json({ success: false, message: '包含無效的模組 ID' });
    return;
}
```

**Step 2: Update `server/routes/project.ts`**

`GET /api/project` for viewer — change `allowedModules` from type strings to module IDs:

```typescript
// Old:
allowedModules: up.modules.map(m => m.moduleKey)
// New:
allowedModules: up.modules.map(m => m.moduleId)
```

**Step 3: Update `ProtectedRoute.tsx`**

Change `requiredModule` (type string) to check against module instance IDs:

- Old: `requiredModule="geology"` → checks `allowedModules.includes('geology')`
- New: `requiredModuleId` flag → reads `moduleId` from URL params → checks `allowedModules.includes(moduleId)`

**Step 4: Verify**

```bash
cd server && npx tsc --noEmit
npx vite build  # from root
```

**Step 5: Commit**

```bash
git add server/routes/user-access.ts server/routes/project.ts server/middleware/auth.ts src/components/auth/ProtectedRoute.tsx
git commit -m "feat(auth): viewer permissions use moduleId instead of moduleKey"
```

---

## Task 9: Admin Users Page — Module Instance Selection

**Files:**
- Modify: `src/pages/AdminUsersPage.tsx`

**Depends on:** Task 4, Task 8

**Step 1: Replace hardcoded module checkboxes with dynamic list**

- Remove `ALL_MODULES` and `MODULE_LABELS` constants
- Import `useModuleStore` and `getModuleTypeConfig`
- When opening viewer access modal, fetch modules for each assigned project
- Show actual module instances as checkboxes (with name + type icon)
- `handleSaveAccess` sends module IDs instead of type strings

```typescript
// Old: modules per project = ['geology', 'facility']
// New: modules per project = ['uuid-1', 'uuid-2']
```

**Step 2: Update access state shape**

```typescript
// Old:
type AccessState = Record<string, string[]>;  // projectId → moduleKey[]

// New:
type AccessState = Record<string, string[]>;  // projectId → moduleId[]
```

The shape is the same, but values change from type strings to UUIDs.

**Step 3: Verify**

```bash
npx vite build
```

**Step 4: Commit**

```bash
git add src/pages/AdminUsersPage.tsx
git commit -m "feat(admin): viewer module selection uses module instances"
```

---

## Task 10: Domain Stores — moduleId Scoping

**Files:**
- Modify: `src/stores/boreholeStore.ts`
- Modify: `src/stores/facilityStore.ts`
- Modify: `src/stores/lithologyStore.ts`
- Modify: `src/stores/attitudeStore.ts`
- Modify: `src/stores/faultPlaneStore.ts`
- Modify: `src/stores/terrainStore.ts`
- Modify: `src/stores/waterLevelStore.ts`
- Modify: `src/stores/uploadStore.ts` (if it handles imagery/geophysics)
- Modify: `server/routes/borehole.ts`
- Modify: `server/routes/facility.ts`
- Modify: `server/routes/geology-model.ts`
- Modify: `server/routes/terrain.ts`
- Modify: `server/routes/water-level.ts`
- Modify: `server/routes/fault-plane.ts`
- Modify: `server/routes/attitude.ts`
- Modify: `server/routes/imagery.ts`
- Modify: `server/routes/geophysics.ts`
- Modify: `server/routes/lithology.ts`

**Depends on:** Task 4

This is the largest task. It changes all data queries from `projectId` scoping to `moduleId` scoping.

**Step 1: Backend routes — add `moduleId` query/body param**

For each backend route file, add `moduleId` as a filter parameter alongside (or replacing) `projectId`:

```typescript
// Example: server/routes/borehole.ts GET /
// Old:
const { projectId } = req.query;
where: projectId ? { projectId } : undefined

// New:
const { projectId, moduleId } = req.query;
where: moduleId ? { moduleId: moduleId as string }
     : projectId ? { projectId: projectId as string }
     : undefined
```

Keep `projectId` as fallback for backward compatibility during transition.

For POST/batch endpoints, accept `moduleId` in the body:

```typescript
// Old: data: { projectId, boreholeNo, ... }
// New: data: { projectId, moduleId, boreholeNo, ... }
```

**Step 2: Frontend stores — pass `moduleId` to API calls**

For each store's fetch function, add `moduleId` parameter:

```typescript
// Old:
fetchBoreholes: async (projectId?: string) => {
    const url = `${API_BASE}/api/borehole?projectId=${projectId}`;

// New:
fetchBoreholes: async (params: { projectId?: string; moduleId?: string }) => {
    const query = params.moduleId ? `moduleId=${params.moduleId}` : `projectId=${params.projectId}`;
    const url = `${API_BASE}/api/borehole?${query}`;
```

**Step 3: Update all callers**

Find every place that calls `fetchBoreholes(projectId)` and change to `fetchBoreholes({ moduleId })`.

Same for all other stores: `fetchFaultPlanes`, `fetchAttitudes`, `fetchTerrains`, `fetchWaterLevels`, `fetchScenes`, etc.

**Step 4: Verify**

```bash
cd server && npx tsc --noEmit
npx vite build
```

**Step 5: Commit**

```bash
git add src/stores/*.ts server/routes/*.ts
git commit -m "feat: scope all data queries by moduleId instead of projectId"
```

---

## Task 11: Final Schema Cleanup + Verification

**Files:**
- Modify: `server/prisma/schema.prisma` (make `moduleId` required)
- Modify: `src/config/permissions.ts` (update if needed)

**Depends on:** Tasks 5-10

**Step 1: Make `moduleId` required**

After migration is confirmed successful, change `moduleId` from optional to required in all data models:

```prisma
// Change from:
moduleId    String?
module      Module?  @relation(...)

// To:
moduleId    String
module      Module   @relation(...)
```

**Step 2: Sync DB**

```bash
cd server && npx prisma db push && npx prisma generate
```

**Step 3: Full verification**

```bash
cd server && npx tsc --noEmit
npx vite build  # from root
```

**Step 4: Remove legacy routes**

In `AppRoutes.tsx`, remove old `/geology`, `/facility`, `/engineering`, `/simulation` legacy routes (they were already admin/engineer only and will be replaced by module-scoped routes).

**Step 5: Update CLAUDE.md, README.md, NextSteps.md**

Use the `milestone-handoff` skill to document:
- New Module entity and moduleId scoping
- New `/api/module` endpoints
- New route structure `/project/:code/module/:moduleId`
- Migration notes
- Updated pitfalls (e.g., "new data must include moduleId")

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete multi-module instance architecture migration"
```

---

## Parallel Execution Strategy

```
Phase 1 (sequential):
  Task 1 → DB Schema

Phase 2 (parallel, 3 agents):
  Agent A: Task 2 (Module CRUD API)
  Agent B: Task 3 (Migration Script)
  Agent C: Task 8 (Viewer Permissions backend)

Phase 3 (sequential):
  Task 4 → Frontend Store + Registry

Phase 4 (parallel, 5 agents):
  Agent A: Task 5 (Dashboard UI)
  Agent B: Task 6 (Routes + Page Loader)
  Agent C: Task 7 (Page Components moduleId prop)
  Agent D: Task 9 (Admin UI)
  Agent E: Task 10 (Domain Stores — can split into backend + frontend sub-agents)

Phase 5 (sequential):
  Task 11 → Cleanup + Verification + Docs
```
