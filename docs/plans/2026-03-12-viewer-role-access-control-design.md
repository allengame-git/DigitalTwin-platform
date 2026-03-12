# Viewer 角色權限控制設計文件

**日期**: 2026-03-12
**狀態**: 已核准

---

## 目標

新增 `viewer` 角色（取代原 `reviewer`），實作 per-project + per-module 的存取控制。viewer 只能瀏覽被指派的專案及該專案中被允許的模組。

## 角色定義

| 角色 | 專案存取 | 模組存取 | 資料管理 | 使用者管理 |
|------|---------|---------|---------|-----------|
| admin | 全部 | 全部 | 全部 | 全部 |
| engineer | 全部 | 全部 | 全部 | 可指派 viewer 權限 |
| viewer | 僅被指派的專案 | 僅被允許的模組 | 無 | 無 |
| public | 公開導覽 | 無 | 無 | 無 |

### 可控制的模組（檢視類）

| moduleKey | 路由 | 說明 |
|-----------|------|------|
| `geology` | `/project/:code/geology` | 3D 地質場景 |
| `facility` | `/project/:code/facility` | 設施 3D 導覽 |
| `engineering` | `/project/:code/engineering` | 工程設計（placeholder） |
| `simulation` | `/project/:code/simulation` | 模擬分析（placeholder） |

資料管理路由（`/data`、`/facility-data`）永遠不開放給 viewer。

---

## DB Schema

### 新增 enum 值變更

```prisma
enum UserRole {
  engineer
  viewer    // 取代原 reviewer
  public
  admin
}
```

### 新增 Model

```prisma
model UserProject {
  id        String   @id @default(uuid())
  userId    String
  projectId String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  createdBy String?  // 指派者的 userId

  modules   UserProjectModule[]

  @@unique([userId, projectId])
  @@map("user_projects")
}

model UserProjectModule {
  id            String      @id @default(uuid())
  userProjectId String
  moduleKey     String      // "geology" | "facility" | "engineering" | "simulation"
  userProject   UserProject @relation(fields: [userProjectId], references: [id], onDelete: Cascade)

  @@unique([userProjectId, moduleKey])
  @@map("user_project_modules")
}
```

**設計決策**：
- `moduleKey` 用 String 不用 enum，方便未來新增模組不需要 DB migration
- Cascade delete：刪除 User/Project → 自動清理關聯權限
- 雙 junction table（而非 JSON 欄位），因為未來模組數量會持續增加

---

## API 設計

### 端點

```
GET    /api/user-access/:userId/projects
PUT    /api/user-access/:userId/projects/:projectId   { modules: string[] }
DELETE /api/user-access/:userId/projects/:projectId
GET    /api/user-access/project/:projectId/viewers
PUT    /api/user-access/:userId/batch                  { assignments: [{ projectId, modules }] }
```

### 權限控制

- 所有 `/api/user-access` 路由：`authenticate` + `authorize('admin', 'engineer')`
- 只能管理 `viewer` 角色的使用者，不可修改 admin/engineer

### 後端 middleware

新增 `enforceProjectAccess` middleware，掛載在所有帶 `projectId` 的路由：
- admin/engineer → 直接放行
- viewer → 檢查 `UserProject` 是否存在
- 模組級檢查在前端路由層做（後端 API 以 project 為粒度即可）

---

## 前端改動

### 專案列表篩選

後端 `GET /api/project` 根據角色篩選回傳：
- admin/engineer：全部專案
- viewer：只回傳有 UserProject 記錄的專案，附帶 `allowedModules: string[]`

### 模組入口控制

| 檔案 | 改動 |
|------|------|
| `ProtectedRoute.tsx` | 加 `requiredModule?: string` prop，viewer 檢查模組權限 |
| `AppRoutes.tsx` | 模組路由加 `requiredModule` 標記 |
| `permissions.ts` | `viewer` 取代 `reviewer`，模組權限改由 DB 驅動 |
| `ProjectDashboardPage` | 模組卡片根據 `allowedModules` 條件渲染 |
| `projectStore.ts` | 專案資料增加 `allowedModules` 欄位 |

### 不需改動

- 地質/設施模組內部功能（進得了模組 = 全功能）
- admin/engineer 的所有既有流程

---

## 權限管理 UI

在 Admin Users 頁面（`/admin/users`）擴充，不開新頁面。

### 互動流程

1. 使用者列表點擊 viewer → 展開權限設定面板
2. 所有專案列表，每個專案 checkbox（勾選 = 可存取）
3. 勾選專案後展開模組 checkbox（geology/facility/engineering/simulation）
4. 儲存 → `PUT /api/user-access/:userId/batch`

### 顯示條件

- 只有 viewer 角色顯示「權限設定」按鈕
- admin/engineer 也能進入管理介面（路由 `authorize('admin', 'engineer')`）

---

## Migration 策略

### reviewer → viewer 遷移

1. Prisma enum：`reviewer` → `viewer`
2. DB：`ALTER TYPE "UserRole" RENAME VALUE 'reviewer' TO 'viewer'`
3. 自動指派：migration script 為所有現有 viewer 使用者建立：
   - 每個專案一筆 `UserProject`
   - 每個 `UserProject` 建立全部 4 個模組的 `UserProjectModule`
   - 確保既有使用者零斷線

### 前端代碼替換

全域 `reviewer` → `viewer`：
- `permissions.ts`
- `RoleBasedUI.tsx`（`<ReviewerOnly>` → `<ViewerOnly>`）
- `AppRoutes.tsx` 的 `allowedRoles`
- `invite.ts` 預設角色

### 風險控制

- Migration 可回滾
- 自動指派「全部權限」確保零斷線
- admin 事後在 UI 收窄權限
