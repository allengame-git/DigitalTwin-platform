# 多模組實例架構設計

**日期**: 2026-03-12
**狀態**: 已核准

## 背景

目前每個專案的每種模組類型（地質、設施、工程、模擬）只有一個實例。需要改為每種類型可建立多個實例，各自獨立資料，並可自訂名稱與說明。

## 核心設計

### DB Schema — 新增 Module entity

```prisma
model Module {
  id          String   @id @default(uuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  type        String   // 'geology' | 'facility' | 'engineering' | 'simulation' | 未來新增
  name        String   // 使用者自訂名稱
  description String?  // 使用者自訂說明
  sortOrder   Int      @default(0)  // admin 排序
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?

  userAccess  UserProjectModule[]
  @@index([projectId])
}
```

- 現有資料表（Borehole、GeologyModel、FacilityScene 等）新增 `moduleId` 欄位取代 `projectId` 作為資料 scope
- 每個模組實例的資料完全獨立

### Viewer 權限

- `UserProjectModule.moduleKey` → `moduleId`（FK 指向 Module.id）
- `allowedModules` 從類型字串改為模組實例 ID 列表
- `ProtectedRoute` 檢查 `moduleId` 是否在允許列表中

### 路由結構

```
/project/:code                        → Dashboard（模組實例列表）
/project/:code/module/:moduleId       → 3D 場景
/project/:code/module/:moduleId/data  → 資料管理
```

頁面元件根據 `module.type` 動態載入：

| module.type   | 3D 場景          | 資料管理             |
|---------------|------------------|---------------------|
| geology       | GeologyPage      | DataManagementPage  |
| facility      | FacilityPage     | FacilityDataPage    |
| engineering   | EngineeringPage  | (待開發)            |
| simulation    | SimulationPage   | (待開發)            |

### Module Type Registry（code-level）

```typescript
// src/config/moduleRegistry.ts
export const MODULE_TYPES = {
  geology:     { label: '地質資料', icon: Layers,    scene: GeologyPage,    data: DataManagementPage },
  facility:    { label: '設施導覽', icon: Building2, scene: FacilityPage,   data: FacilityDataPage },
  engineering: { label: '工程設計', icon: Ruler,     scene: EngineeringPage, data: null },
  simulation:  { label: '模擬分析', icon: Activity,  scene: SimulationPage,  data: null },
} as const;
```

新增模組類型 = 開發完 Page 後在 registry 加一筆。使用者只能從已開發的類型中選擇建立實例。

### Dashboard 呈現

- 扁平卡片列表，依 `sortOrder` 排序
- 同類型自然聚在一起（admin 排序時維護）
- 卡片：類型 icon + 自訂名稱 + 說明
- Admin/Engineer：「+ 新增模組」按鈕（選類型 → 填名稱/說明）、拖曳排序
- Admin/Engineer 可刪除模組，Engineer 不可刪除

### 刪除流程

1. 前端呼叫 API 取得模組資料統計（鑽孔數、模型數、檔案大小等）
2. 確認對話框列出即將刪除的資料量
3. 使用者確認後硬刪除（Cascade）

### 權限

- 建立模組：admin、engineer
- 刪除模組：admin
- 編輯名稱/說明/排序：admin
- 使用模組：admin、engineer、viewer（viewer 需被指派）

### Migration 策略

1. 為每個專案的每種已使用類型自動建立一個 Module 實例（名稱 = 類型 label）
2. 現有資料的 `projectId` scope 映射到對應的 `moduleId`
3. `UserProjectModule.moduleKey` 轉為 `moduleId`
4. 舊路由 `/project/:code/geology` 等重導到新路由

## 影響範圍

### 需修改的檔案

- `server/prisma/schema.prisma` — 新增 Module model，修改關聯表
- `server/routes/` — 新增 module.ts，修改 project.ts、user-access.ts 及各資料 route
- `src/routes/AppRoutes.tsx` — 新路由結構
- `src/pages/ProjectDashboardPage.tsx` — 動態模組列表
- `src/stores/` — 新增 moduleStore，修改各 domain store 加 moduleId
- `src/components/auth/ProtectedRoute.tsx` — moduleId 檢查
- `src/pages/AdminUsersPage.tsx` — 模組實例選擇（非硬編碼類型）
- `src/config/moduleRegistry.ts` — 新檔案，集中定義模組類型
- 各 Page 元件 — 接收 moduleId prop，scope 資料查詢
