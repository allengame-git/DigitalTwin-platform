# Viewer 角色權限控制 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增 `viewer` 角色（取代 `reviewer`），實作 per-project + per-module 的存取控制

**Architecture:** 雙 junction table（`UserProject` + `UserProjectModule`）實作細粒度權限。後端 `enforceProjectAccess` middleware 擋專案層級，前端 `ProtectedRoute` + `requiredModule` 擋模組層級。`reviewer` enum 值 rename 為 `viewer`，migration 自動指派全部權限確保零斷線。

**Tech Stack:** Prisma 7 + PostgreSQL, Express 5, React 19 + Zustand 5

---

### Task 1: Prisma Schema — UserRole enum rename + 新增 Models

**Files:**
- Modify: `server/prisma/schema.prisma:424-456`

**Step 1: 修改 UserRole enum**

把 `reviewer` 改為 `viewer`：

```prisma
enum UserRole {
  engineer
  viewer
  public
  admin
}
```

**Step 2: 在 User model 加 relation**

在 `server/prisma/schema.prisma` 的 `User` model（line 438-456），`auditLogs` 之後加：

```prisma
  userProjects   UserProject[]
```

**Step 3: 在 Project model 加 relation**

在 `server/prisma/schema.prisma` 的 `Project` model（line 10-33），`facilityScenes` 之後加：

```prisma
  userProjects   UserProject[]
```

**Step 4: 新增 UserProject + UserProjectModule models**

在 schema 檔尾（`User` model 之後）新增：

```prisma
model UserProject {
  id        String   @id @default(uuid())
  userId    String
  projectId String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  createdBy String?

  modules   UserProjectModule[]

  @@unique([userId, projectId])
  @@map("user_projects")
}

model UserProjectModule {
  id            String      @id @default(uuid())
  userProjectId String
  moduleKey     String
  userProject   UserProject @relation(fields: [userProjectId], references: [id], onDelete: Cascade)

  @@unique([userProjectId, moduleKey])
  @@map("user_project_modules")
}
```

**Step 5: 推送 schema 到 DB**

Run: `cd server && npx prisma db push && npx prisma generate`

注意：如果 DB 中已有 `reviewer` 值的使用者，`db push` 可能無法直接 rename enum。此時需要手動 SQL：

```sql
ALTER TYPE "UserRole" RENAME VALUE 'reviewer' TO 'viewer';
```

然後再 `npx prisma db push && npx prisma generate`。

**Step 6: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(schema): rename reviewer→viewer + add UserProject/UserProjectModule tables"
```

---

### Task 2: Migration Script — 既有 reviewer→viewer 自動指派全部權限

**Files:**
- Create: `server/prisma/seed-viewer-migration.ts`

**Step 1: 寫 migration script**

```typescript
/**
 * Migration: 為所有 viewer 使用者自動指派全部專案 + 全部模組
 * 確保 reviewer→viewer 遷移零斷線
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ALL_MODULES = ['geology', 'facility', 'engineering', 'simulation'];

async function main() {
    const viewers = await prisma.user.findMany({ where: { role: 'viewer' } });
    const projects = await prisma.project.findMany();

    console.log(`Found ${viewers.length} viewer(s), ${projects.length} project(s)`);

    for (const viewer of viewers) {
        for (const project of projects) {
            const userProject = await prisma.userProject.upsert({
                where: {
                    userId_projectId: {
                        userId: viewer.id,
                        projectId: project.id,
                    },
                },
                create: {
                    userId: viewer.id,
                    projectId: project.id,
                    createdBy: 'migration',
                },
                update: {},
            });

            for (const moduleKey of ALL_MODULES) {
                await prisma.userProjectModule.upsert({
                    where: {
                        userProjectId_moduleKey: {
                            userProjectId: userProject.id,
                            moduleKey,
                        },
                    },
                    create: {
                        userProjectId: userProject.id,
                        moduleKey,
                    },
                    update: {},
                });
            }
        }
        console.log(`  ✓ ${viewer.name} (${viewer.email}): ${projects.length} projects × ${ALL_MODULES.length} modules`);
    }

    console.log('Migration complete.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
```

**Step 2: 執行 migration**

Run: `cd server && npx ts-node prisma/seed-viewer-migration.ts`

**Step 3: Commit**

```bash
git add server/prisma/seed-viewer-migration.ts
git commit -m "feat(migration): auto-assign all projects+modules to existing viewers"
```

---

### Task 3: 後端 API — `/api/user-access` 路由

**Files:**
- Create: `server/routes/user-access.ts`
- Modify: `server/index.ts:61-76`（加掛路由）

**Step 1: 建立 user-access 路由**

```typescript
/**
 * User Access Routes
 * @module server/routes/user-access
 *
 * Viewer 角色的專案/模組權限管理 API
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// 所有路由：authenticate + authorize('admin', 'engineer')
router.use(authenticate);
router.use(authorize('admin', 'engineer'));

/**
 * GET /api/user-access/:userId/projects
 * 取得某個 viewer 的所有專案權限
 */
router.get('/:userId/projects', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;

        // 確認目標使用者是 viewer
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return res.status(404).json({ success: false, error: '使用者不存在' });
        }
        if (targetUser.role !== 'viewer') {
            return res.status(400).json({ success: false, error: '只能管理 viewer 角色的權限' });
        }

        const userProjects = await prisma.userProject.findMany({
            where: { userId },
            include: {
                project: { select: { id: true, name: true, code: true } },
                modules: { select: { moduleKey: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const data = userProjects.map(up => ({
            projectId: up.projectId,
            project: up.project,
            modules: up.modules.map(m => m.moduleKey),
            createdAt: up.createdAt,
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching user access:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch user access' });
    }
});

/**
 * PUT /api/user-access/:userId/projects/:projectId
 * 設定某個 viewer 對某個專案的模組權限
 * Body: { modules: string[] }
 */
router.put('/:userId/projects/:projectId', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const projectId = req.params.projectId as string;
        const { modules } = req.body as { modules: string[] };
        const authReq = req as AuthenticatedRequest;

        // 驗證
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser || targetUser.role !== 'viewer') {
            return res.status(400).json({ success: false, error: '只能管理 viewer 角色的權限' });
        }

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            return res.status(404).json({ success: false, error: '專案不存在' });
        }

        const validModules = ['geology', 'facility', 'engineering', 'simulation'];
        const invalidModules = (modules || []).filter(m => !validModules.includes(m));
        if (invalidModules.length > 0) {
            return res.status(400).json({ success: false, error: `無效的模組: ${invalidModules.join(', ')}` });
        }

        // Upsert UserProject
        const userProject = await prisma.userProject.upsert({
            where: {
                userId_projectId: { userId, projectId },
            },
            create: {
                userId,
                projectId,
                createdBy: authReq.user?.userId,
            },
            update: {},
        });

        // 刪除舊模組，重建新模組
        await prisma.userProjectModule.deleteMany({
            where: { userProjectId: userProject.id },
        });

        if (modules && modules.length > 0) {
            await prisma.userProjectModule.createMany({
                data: modules.map(moduleKey => ({
                    userProjectId: userProject.id,
                    moduleKey,
                })),
            });
        }

        res.json({ success: true, data: { projectId, modules: modules || [] } });
    } catch (error) {
        console.error('Error updating user access:', error);
        res.status(500).json({ success: false, error: 'Failed to update user access' });
    }
});

/**
 * DELETE /api/user-access/:userId/projects/:projectId
 * 移除某個 viewer 對某個專案的存取權限
 */
router.delete('/:userId/projects/:projectId', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const projectId = req.params.projectId as string;

        await prisma.userProject.deleteMany({
            where: { userId, projectId },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user access:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user access' });
    }
});

/**
 * GET /api/user-access/project/:projectId/viewers
 * 取得某個專案的所有 viewer 及其模組權限
 */
router.get('/project/:projectId/viewers', async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId as string;

        const userProjects = await prisma.userProject.findMany({
            where: { projectId },
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
                modules: { select: { moduleKey: true } },
            },
        });

        const data = userProjects.map(up => ({
            userId: up.userId,
            user: up.user,
            modules: up.modules.map(m => m.moduleKey),
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching project viewers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch project viewers' });
    }
});

/**
 * PUT /api/user-access/:userId/batch
 * 批次設定 viewer 的專案+模組權限
 * Body: { assignments: [{ projectId: string, modules: string[] }] }
 */
router.put('/:userId/batch', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const { assignments } = req.body as {
            assignments: { projectId: string; modules: string[] }[];
        };
        const authReq = req as AuthenticatedRequest;

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser || targetUser.role !== 'viewer') {
            return res.status(400).json({ success: false, error: '只能管理 viewer 角色的權限' });
        }

        const validModules = ['geology', 'facility', 'engineering', 'simulation'];

        // 驗證所有 assignments
        for (const a of assignments) {
            const invalid = a.modules.filter(m => !validModules.includes(m));
            if (invalid.length > 0) {
                return res.status(400).json({ success: false, error: `無效的模組: ${invalid.join(', ')}` });
            }
        }

        // 取得所有專案 ID 列表
        const assignedProjectIds = assignments.map(a => a.projectId);

        // 在 transaction 中執行
        await prisma.$transaction(async (tx) => {
            // 刪除不在 assignments 中的 UserProject（= 取消勾選的專案）
            await tx.userProject.deleteMany({
                where: {
                    userId,
                    projectId: { notIn: assignedProjectIds },
                },
            });

            // 逐一 upsert
            for (const a of assignments) {
                const userProject = await tx.userProject.upsert({
                    where: {
                        userId_projectId: { userId, projectId: a.projectId },
                    },
                    create: {
                        userId,
                        projectId: a.projectId,
                        createdBy: authReq.user?.userId,
                    },
                    update: {},
                });

                // 重建模組
                await tx.userProjectModule.deleteMany({
                    where: { userProjectId: userProject.id },
                });

                if (a.modules.length > 0) {
                    await tx.userProjectModule.createMany({
                        data: a.modules.map(moduleKey => ({
                            userProjectId: userProject.id,
                            moduleKey,
                        })),
                    });
                }
            }
        });

        res.json({ success: true, data: { assignments } });
    } catch (error) {
        console.error('Error batch updating user access:', error);
        res.status(500).json({ success: false, error: 'Failed to batch update user access' });
    }
});

export default router;
```

**Step 2: 在 `server/index.ts` 掛載路由**

在 `import facilityRoutes` 附近加 import：

```typescript
import userAccessRoutes from './routes/user-access';
```

在 `app.use('/api/facility', facilityRoutes);`（line 74）之後加：

```typescript
app.use('/api/user-access', userAccessRoutes);
```

**Step 3: Commit**

```bash
git add server/routes/user-access.ts server/index.ts
git commit -m "feat(api): add /api/user-access routes for viewer permission management"
```

---

### Task 4: 後端 — `enforceProjectAccess` middleware

**Files:**
- Modify: `server/middleware/auth.ts:85` 之後新增
- Modify: `server/routes/project.ts:19`（GET /api/project 加 viewer 篩選）

**Step 1: 在 `server/middleware/auth.ts` 尾部新增 `enforceProjectAccess`**

在 `verifyRefreshToken` 函式之後（file 尾部）新增：

```typescript
/**
 * Enforce project-level access for viewer role
 * admin/engineer → pass through
 * viewer → check UserProject exists
 */
export function enforceProjectAccess(projectIdParam: string = 'projectId') {
    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        if (!req.user) {
            res.status(401).json({ message: '未認證' });
            return;
        }

        // admin/engineer 直接放行
        if (req.user.role === 'admin' || req.user.role === 'engineer') {
            next();
            return;
        }

        // viewer: 檢查是否有 UserProject 記錄
        const projectId = req.params[projectIdParam] as string;
        if (!projectId) {
            next();
            return;
        }

        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        try {
            const access = await prisma.userProject.findUnique({
                where: {
                    userId_projectId: {
                        userId: req.user.userId,
                        projectId,
                    },
                },
            });

            if (!access) {
                res.status(403).json({ message: '您沒有此專案的存取權限' });
                return;
            }

            next();
        } catch (error) {
            console.error('Error checking project access:', error);
            res.status(500).json({ message: '權限檢查失敗' });
        } finally {
            await prisma.$disconnect();
        }
    };
}
```

注意：上方用了動態 import + new PrismaClient，這不理想。更好的做法是 import 既有的 `prisma` singleton：

```typescript
import prisma from '../lib/prisma';
```

但因為 `auth.ts` 是 middleware，為避免循環依賴，改用以下寫法：

在 `server/middleware/auth.ts` 頂部加 import：
```typescript
import prisma from '../lib/prisma';
```

然後 `enforceProjectAccess` 內直接用 `prisma`，不需要動態 import。確認 `server/lib/prisma.ts` 和 `server/middleware/auth.ts` 之間沒有循環依賴。

**Step 2: 修改 `GET /api/project` 為 viewer 篩選專案**

在 `server/routes/project.ts` 的 `GET /` handler（line 19-39），修改為：

```typescript
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userRole = authReq.user?.role;
        const userId = authReq.user?.userId;

        let projects;

        if (userRole === 'viewer' && userId) {
            // viewer: 只回傳有 UserProject 記錄的專案，附帶 allowedModules
            const userProjects = await prisma.userProject.findMany({
                where: { userId },
                include: {
                    project: {
                        include: {
                            _count: {
                                select: {
                                    geologyModels: true,
                                    imagery: true,
                                    geophysics: true,
                                    boreholes: true,
                                }
                            }
                        }
                    },
                    modules: { select: { moduleKey: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            projects = userProjects.map(up => ({
                ...up.project,
                allowedModules: up.modules.map(m => m.moduleKey),
            }));
        } else {
            // admin/engineer: 全部專案
            projects = await prisma.project.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            geologyModels: true,
                            imagery: true,
                            geophysics: true,
                            boreholes: true,
                        }
                    }
                }
            });
        }

        res.json({ success: true, data: projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
});
```

需要在 `server/routes/project.ts` 頂部加 import `AuthenticatedRequest`：

```typescript
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
```

**Step 3: Commit**

```bash
git add server/middleware/auth.ts server/routes/project.ts
git commit -m "feat(auth): add enforceProjectAccess middleware + viewer project filtering"
```

---

### Task 5: 前端 — `reviewer` → `viewer` 全域替換

**Files:**（共 12 檔，全部是 `reviewer` → `viewer` 字串替換）
- Modify: `src/types/auth.ts:8,108-111`
- Modify: `src/config/permissions.ts:65-73,85-94`
- Modify: `src/components/auth/RoleBasedUI.tsx:80-87,147`
- Modify: `src/components/auth/ProtectedRoute.tsx`（無直接 reviewer 字串）
- Modify: `src/routes/AppRoutes.tsx:114,126,134,150,158,182,202,210,218,226`
- Modify: `src/pages/DashboardPage.tsx:17,175,234,473,488,496`
- Modify: `src/pages/ProjectDashboardPage.tsx:17`
- Modify: `src/pages/AdminUsersPage.tsx:18,234,338,528`
- Modify: `src/pages/AdminSettingsPage.tsx`（如有 reviewer 字串）
- Modify: `src/pages/AnnotationsPage.tsx`
- Modify: `src/pages/UnauthorizedPage.tsx`
- Modify: `src/stores/authStore.ts`
- Modify: `src/components/auth/LoginForm.tsx`

**Step 1: 逐檔替換 `reviewer` → `viewer`**

1. **`src/types/auth.ts`**
   - Line 8: `'reviewer'` → `'viewer'`
   - Line 110: `reviewer:` → `viewer:` (SESSION_TIMEOUT key)

2. **`src/config/permissions.ts`**
   - Line 65-73: `reviewer:` → `viewer:` (ROLE_PERMISSIONS)
   - Line 86-94: `reviewer:` → `viewer:` (HIDDEN_FEATURES)

3. **`src/components/auth/RoleBasedUI.tsx`**
   - Line 80-87: `ReviewerOnly` → `ViewerOnly`，`'reviewer'` → `'viewer'`
   - Line 96: `AuthenticatedOnly` 裡的 `'reviewer'` → `'viewer'`
   - Line 147: `isReviewer` → `isViewer`，`'reviewer'` → `'viewer'`

4. **`src/routes/AppRoutes.tsx`**
   - 全部 `'reviewer'` → `'viewer'`（約 10 處）

5. **`src/pages/DashboardPage.tsx`**
   - `reviewer: '審查委員'` → `viewer: '一般使用者'`（ROLE_LABELS）
   - `.role-reviewer` CSS → `.role-viewer`
   - `'reviewer'` → `'viewer'`（RoleBasedUI allowedRoles）

6. **`src/pages/ProjectDashboardPage.tsx`**
   - `reviewer: '審查委員'` → `viewer: '一般使用者'`

7. **`src/pages/AdminUsersPage.tsx`**
   - `reviewer: '審查委員'` → `viewer: '一般使用者'`
   - `.role-reviewer` CSS → `.role-viewer`
   - `<option value="reviewer">審查委員</option>` → `<option value="viewer">一般使用者</option>`

8. **其餘檔案**：搜尋所有 `reviewer` 字串，全部替換為 `viewer`。

**Step 2: 驗證**

Run: `npx tsc --noEmit`
Expected: 零新增錯誤（只有原有的 pre-existing errors）

**Step 3: Commit**

```bash
git add src/
git commit -m "refactor: rename reviewer→viewer across all frontend files"
```

---

### Task 6: 前端 — projectStore 增加 `allowedModules`

**Files:**
- Modify: `src/stores/projectStore.ts:12-29`

**Step 1: Project interface 加 `allowedModules`**

在 `src/stores/projectStore.ts` 的 `Project` interface（line 12-29），`_count` 之後加：

```typescript
    allowedModules?: string[];  // viewer 角色：被允許的模組 key 列表
```

不需要其他改動，後端 `GET /api/project` 已經會回傳 `allowedModules` 欄位。

**Step 2: Commit**

```bash
git add src/stores/projectStore.ts
git commit -m "feat(store): add allowedModules field to Project interface"
```

---

### Task 7: 前端 — ProtectedRoute + AppRoutes 模組級檢查

**Files:**
- Modify: `src/components/auth/ProtectedRoute.tsx:13-18,78-85`
- Modify: `src/routes/AppRoutes.tsx:131-161`

**Step 1: ProtectedRoute 加 `requiredModule` prop**

在 `src/components/auth/ProtectedRoute.tsx`：

```typescript
// 加 import
import { useProjectStore } from '../../stores/projectStore';
import { useParams } from 'react-router-dom';  // 已有 useLocation，加 useParams

// Interface 加 prop
interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: UserRole[];
    requiredModule?: string;  // ← 新增
    redirectTo?: string;
    fallback?: ReactNode;
}

// 解構加 requiredModule
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
    requiredModule,  // ← 新增
    redirectTo = '/login',
    fallback,
}) => {
```

在 role check（line 79-83）之後、`return <>{children}</>` 之前，加模組檢查：

```typescript
    // Check module permission for viewer
    if (requiredModule && user.role === 'viewer') {
        const { getProjectByCode } = useProjectStore.getState();
        const params = new URLSearchParams(location.search);
        // 從 URL 取 projectCode（react-router params 在 ProtectedRoute 不直接可用）
        const pathParts = location.pathname.split('/');
        const projectIdx = pathParts.indexOf('project');
        const projectCode = projectIdx >= 0 ? pathParts[projectIdx + 1] : undefined;

        if (projectCode) {
            const project = getProjectByCode(projectCode);
            if (project?.allowedModules && !project.allowedModules.includes(requiredModule)) {
                return <Navigate to={`/project/${projectCode}`} replace />;
            }
        }
    }
```

**Step 2: AppRoutes 模組路由加 `requiredModule`**

在 `src/routes/AppRoutes.tsx`，為 4 個模組路由加 `requiredModule`：

```tsx
// geology（line 132-138）
<ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']} requiredModule="geology">
    <GeologyPage />
</ProtectedRoute>

// facility（line 140-146）
<ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']} requiredModule="facility">
    <FacilityPage />
</ProtectedRoute>

// engineering（line 148-154）
<ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']} requiredModule="engineering">
    <EngineeringPage />
</ProtectedRoute>

// simulation（line 155-161）
<ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']} requiredModule="simulation">
    <SimulationPage />
</ProtectedRoute>
```

**Step 3: 驗證**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/components/auth/ProtectedRoute.tsx src/routes/AppRoutes.tsx
git commit -m "feat(auth): add requiredModule check to ProtectedRoute + tag module routes"
```

---

### Task 8: 前端 — ProjectDashboardPage 根據 allowedModules 條件渲染模組卡片

**Files:**
- Modify: `src/pages/ProjectDashboardPage.tsx:147-305`

**Step 1: 取得 user role 和 allowedModules**

在 `ProjectDashboardPage` 元件內，加：

```typescript
const userRole = user?.role;

// 判斷模組是否可存取
const canAccessModule = (moduleKey: string) => {
    if (userRole === 'admin' || userRole === 'engineer') return true;
    if (userRole === 'viewer' && project?.allowedModules) {
        return project.allowedModules.includes(moduleKey);
    }
    return false;
};
```

**Step 2: 用 `canAccessModule` 包裹 4 個模組卡片**

每個模組卡片外層加條件：

```tsx
{canAccessModule('geology') && (
    <div onClick={() => navigate(`/project/${projectCode}/geology`)} ...>
        {/* 地質資料卡片 */}
    </div>
)}

{canAccessModule('facility') && (
    <div onClick={() => navigate(`/project/${projectCode}/facility`)} ...>
        {/* 設施導覽卡片 */}
    </div>
)}

{canAccessModule('engineering') && (
    <div onClick={() => navigate(`/project/${projectCode}/engineering`)} ...>
        {/* 工程設計卡片 */}
    </div>
)}

{canAccessModule('simulation') && (
    <div onClick={() => navigate(`/project/${projectCode}/simulation`)} ...>
        {/* 模擬分析卡片 */}
    </div>
)}
```

「審查標註」卡片和「資料管理」卡片不用改（已有 RoleBasedUI 控制）。

**Step 3: Commit**

```bash
git add src/pages/ProjectDashboardPage.tsx
git commit -m "feat(ui): conditionally render module cards based on viewer allowedModules"
```

---

### Task 9: 前端 — AdminUsersPage 新增 Viewer 權限設定面板

**Files:**
- Modify: `src/pages/AdminUsersPage.tsx`
- Modify: `src/routes/AppRoutes.tsx:244-249`（admin users 路由改為 admin+engineer）

**Step 1: Admin Users 路由允許 engineer 進入**

在 `src/routes/AppRoutes.tsx` line 246，改：

```tsx
<ProtectedRoute allowedRoles={['admin', 'engineer']}>
    <AdminUsersPage />
</ProtectedRoute>
```

**Step 2: AdminUsersPage 新增權限設定 Modal**

在 `AdminUsersPage` 中加入狀態和 UI：

```typescript
// 新增 state
const [accessModalUserId, setAccessModalUserId] = useState<string | null>(null);
const [accessModalUserName, setAccessModalUserName] = useState('');
const [allProjects, setAllProjects] = useState<{ id: string; name: string; code: string }[]>([]);
const [assignments, setAssignments] = useState<Record<string, string[]>>({}); // projectId → modules[]
const [accessLoading, setAccessLoading] = useState(false);
const [accessSaving, setAccessSaving] = useState(false);
```

新增 fetch/save functions：

```typescript
const ALL_MODULES = ['geology', 'facility', 'engineering', 'simulation'];
const MODULE_LABELS: Record<string, string> = {
    geology: '地質資料',
    facility: '設施導覽',
    engineering: '工程設計',
    simulation: '模擬分析',
};

function authHeaders(): Record<string, string> {
    const token = useAuthStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

const handleOpenAccessModal = async (u: AdminUser) => {
    setAccessModalUserId(u.id);
    setAccessModalUserName(u.name);
    setAccessLoading(true);
    setOpenDropdownId(null);

    try {
        // 並行載入：所有專案 + 使用者權限
        const [projectsRes, accessRes] = await Promise.all([
            fetch('/api/project', { headers: authHeaders() }),
            fetch(`/api/user-access/${u.id}/projects`, { headers: authHeaders() }),
        ]);
        const projectsData = await projectsRes.json();
        const accessData = await accessRes.json();

        if (projectsData.success) {
            setAllProjects(projectsData.data.map((p: any) => ({ id: p.id, name: p.name, code: p.code })));
        }

        // 建立 assignments map
        const map: Record<string, string[]> = {};
        if (accessData.success) {
            for (const item of accessData.data) {
                map[item.projectId] = item.modules;
            }
        }
        setAssignments(map);
    } catch (err) {
        console.error('Failed to load access data:', err);
    } finally {
        setAccessLoading(false);
    }
};

const toggleProject = (projectId: string) => {
    setAssignments(prev => {
        const copy = { ...prev };
        if (copy[projectId]) {
            delete copy[projectId];
        } else {
            copy[projectId] = [...ALL_MODULES]; // 預設開啟全部模組
        }
        return copy;
    });
};

const toggleModule = (projectId: string, moduleKey: string) => {
    setAssignments(prev => {
        const copy = { ...prev };
        const modules = copy[projectId] || [];
        if (modules.includes(moduleKey)) {
            copy[projectId] = modules.filter(m => m !== moduleKey);
        } else {
            copy[projectId] = [...modules, moduleKey];
        }
        return copy;
    });
};

const handleSaveAccess = async () => {
    if (!accessModalUserId) return;
    setAccessSaving(true);

    try {
        const assignmentList = Object.entries(assignments)
            .filter(([_, modules]) => modules.length > 0)
            .map(([projectId, modules]) => ({ projectId, modules }));

        const res = await fetch(`/api/user-access/${accessModalUserId}/batch`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ assignments: assignmentList }),
        });

        const data = await res.json();
        if (data.success) {
            setAccessModalUserId(null);
        } else {
            alert(data.error || '儲存失敗');
        }
    } catch (err) {
        alert('儲存失敗');
    } finally {
        setAccessSaving(false);
    }
};
```

**Step 3: 在 action dropdown 為 viewer 使用者加「權限設定」按鈕**

在 `action-dropdown` 中（line 422-449），「編輯」按鈕之後加：

```tsx
{u.role === 'viewer' && (
    <button
        className="action-dropdown-item"
        onClick={() => handleOpenAccessModal(u)}
    >
        權限設定
    </button>
)}
```

**Step 4: 新增權限設定 Modal JSX**

在 `AdminUsersPage` return 的最後（`isEditModalOpen` modal 之後）加：

```tsx
{accessModalUserId && (
    <div className="modal-overlay" onClick={() => setAccessModalUserId(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '560px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3 className="modal-title">
                權限設定 — {accessModalUserName}
            </h3>

            {accessLoading ? (
                <div className="loading-container">
                    <div className="loading-spinner" />
                    載入中...
                </div>
            ) : (
                <>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                        勾選專案和模組來設定此使用者的存取權限
                    </div>

                    {allProjects.map(project => {
                        const isChecked = !!assignments[project.id];
                        const modules = assignments[project.id] || [];

                        return (
                            <div key={project.id} style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                marginBottom: '8px',
                                background: isChecked ? '#f8fafc' : '#fff',
                            }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    fontSize: '14px',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleProject(project.id)}
                                    />
                                    {project.name}
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>
                                        ({project.code})
                                    </span>
                                </label>

                                {isChecked && (
                                    <div style={{
                                        display: 'flex',
                                        gap: '12px',
                                        marginTop: '8px',
                                        marginLeft: '24px',
                                        flexWrap: 'wrap',
                                    }}>
                                        {ALL_MODULES.map(moduleKey => (
                                            <label key={moduleKey} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                color: '#475569',
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={modules.includes(moduleKey)}
                                                    onChange={() => toggleModule(project.id, moduleKey)}
                                                />
                                                {MODULE_LABELS[moduleKey]}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="action-btn"
                            onClick={() => setAccessModalUserId(null)}
                        >
                            取消
                        </button>
                        <button
                            className="admin-btn"
                            onClick={handleSaveAccess}
                            disabled={accessSaving}
                        >
                            {accessSaving ? '儲存中...' : '儲存'}
                        </button>
                    </div>
                </>
            )}
        </div>
    </div>
)}
```

**Step 5: 驗證**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add src/pages/AdminUsersPage.tsx src/routes/AppRoutes.tsx
git commit -m "feat(admin): add viewer permission management UI in AdminUsersPage"
```

---

### Task 10: 全域驗證 + Build 測試

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 零新增錯誤

**Step 2: Build**

Run: `npm run build`
Expected: Build 成功

**Step 3: 後端 TypeScript check**

Run: `cd server && npx tsc --noEmit`

**Step 4: Commit（如有修正）**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors from viewer role implementation"
```

---

## 驗證 Checklist

- [ ] DB: `UserRole` enum 中 `reviewer` 已改為 `viewer`
- [ ] DB: `user_projects` + `user_project_modules` 表已建立
- [ ] API: `GET /api/project` viewer 只看到被指派的專案
- [ ] API: `PUT /api/user-access/:userId/batch` 正確更新權限
- [ ] 前端: 所有 `reviewer` → `viewer`
- [ ] 前端: viewer 登入只看到被指派專案
- [ ] 前端: ProjectDashboard 只顯示被允許的模組卡片
- [ ] 前端: 直接訪問未被允許的模組路由 → 跳轉回 ProjectDashboard
- [ ] 前端: AdminUsersPage viewer 行有「權限設定」按鈕
- [ ] 前端: 權限設定 Modal 可勾選專案/模組並儲存
- [ ] 既有 admin/engineer 流程完全不受影響
- [ ] Build 成功
