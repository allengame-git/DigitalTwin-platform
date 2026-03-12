# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

DO NOT GIVE ME HIGH LEVEL SHIT, IF I ASK FOR FIX OR EXPLANATION, I WANT ACTUAL CODE OR EXPLANATION!!! I DON'T WANT "Here's how you can blablabla"

- 檔案刪除功能，只限制在專案管理專案資料夾內。
- 本機是mac os系統進行開發，開發時需提高通用性，同時考慮不同系統之間的泛用性。
- Always response in Traditional Chinese
- Be casual unless otherwise specified
- Be terse
- Suggest solutions that I didn't think about—anticipate my needs
- Treat me as an expert
- Be accurate and thorough
- Give the answer immediately. Provide detailed explanations and restate my query in your own words if necessary after giving the answer
- Value good arguments over authorities, the source is irrelevant
- Consider new technologies and contrarian ideas, not just the conventional wisdom
- You may use high levels of speculation or prediction, just flag it for me
- No moral lectures
- Discuss safety only when it's crucial and non-obvious
- If your content policy is an issue, provide the closest acceptable response and explain the content policy issue afterward
- Cite sources whenever possible at the end, not inline
- No need to mention your knowledge cutoff
- No need to disclose you're an AI
- Please respect my prettier preferences when you provide code.
- Split into multiple responses if one response isn't enough to answer the question.
- Does not use emoji to design UI

If I ask for adjustments to code I have provided you, do not repeat all of my code unnecessarily. Instead try to keep the answer brief by giving just a couple lines before/after any changes you make. Multiple code blocks are ok.

## Project Overview

LLRWD DigitalTwin Platform — a web-based 3D geological visualization system for low-level radioactive waste disposal site analysis. Visualizes boreholes, 3D geology models, terrain/DEM, satellite imagery, fault structures, geophysics surveys, and groundwater surfaces using WebGL.

## Development Commands

```bash
# Frontend (from project root)
npm run dev          # Vite dev server on :5173
npm run build        # tsc && vite build
npm run preview      # Preview production build

# Backend (from server/)
cd server
npm run dev          # nodemon + ts-node on :3001
npm run start        # ts-node index.ts (production)

# Database
docker start llrwd-postgres                    # PostgreSQL on port 5433
cd server && npx prisma db push                # Sync schema to DB
cd server && npx prisma generate               # Regenerate Prisma client
cd server && npx prisma db seed                # Seed initial admin account
cd server && npx prisma studio                 # DB admin UI

# Python processing (from server/)
source venv/bin/activate                       # Activate Python venv
pip install pyvista numpy trimesh rasterio scipy Pillow pandas
```

No test suite is configured yet.

## Architecture

```
Frontend (React 19 + Vite 7)  →  API proxy (/api, /uploads)  →  Backend (Express 5 + Prisma 7)
     ↓                                                              ↓              ↓
Three.js / R3F / Zustand                                      PostgreSQL    Python scripts
```

**Frontend** (`src/`): React 19, TypeScript 5.9, Three.js 0.182 + React Three Fiber 9.5, Zustand 5 for state, ECharts for charts, Lucide icons. Path alias `@/*` → `src/*`.

**Backend** (`server/`): Express 5.2, TypeScript (CommonJS), Prisma 7 ORM with PostgreSQL (port 5433, DB name `llrwddb`). Multer for uploads, Sharp for image processing, JWT auth.

**Python scripts** (`server/scripts/`): Heavy computation offloaded via `child_process.spawn`:

- `geology_mesh_builder.py` — Voxel CSV → GLB mesh (Marching Cubes isosurface via PyVista)
- `terrain_processor.py` — GeoTIFF/CSV → 16-bit heightmap PNG + hillshade + satellite fusion
- `water_level_processor.py` — CSV/DAT/TXT → interpolated heightmap (SciPy griddata)

## Key Architecture Patterns

### State Management

~17 Zustand stores in `src/stores/`, one per domain (boreholeStore, layerStore, terrainStore, authStore, adminStore, etc.). Each follows the pattern: state fields + async action methods. Layer visibility persisted to localStorage.

### 3D Rendering

- **InstancedMesh** for 800+ boreholes (single draw call)
- **LOD** switching by camera distance (icon → column chart → detailed texture), configured in `src/config/three.ts`
- **Clipping Plane** for real-time cross-sections synced to terrain bounds
- Logarithmic depth buffer to prevent z-fighting

### Coordinate System

TWD97 (Taiwan local, meters). Each project has configurable origin (originX/originY) and northAngle. Conversion utilities in `src/utils/coordinates.ts`.

### Multi-Project Data Isolation

All data is project-scoped via `projectId`. API calls must include project context. Routes in `server/routes/` (13 modules).

### File Upload Pipeline

Express route (Multer) → save temp file → spawn Python subprocess → monitor stdout JSON progress → store metadata in Prisma → cleanup temps.

### Auth

JWT (HS256) with refresh tokens in HTTP-only cookies. Prisma-persisted users/sessions/audit logs.

- **Routes**: `server/routes/auth.ts` (login/logout/refresh/me/change-password), `server/routes/admin.ts` (users CRUD/sessions/audit)
- **Middleware**: `server/middleware/auth.ts` (JWT verify + `authorize(role)`), `rateLimit.ts` (3 tiers), `csrf.ts` (Double Submit Cookie)
- **Login**: 支援 email 或使用者名稱（自動判斷 `@`）；帳號鎖定 5 次失敗 → 15 分鐘；Session 併發控制 max 3
- **Frontend**: `useAuthStore` (Zustand) 統一管理認證狀態，`useAdminStore` 管理 admin 操作
- **Seed**: `npx prisma db seed` → `admin@llrwd.tw` / `Admin@2026` (mustChangePassword)
- **CSRF**: admin routes 掛載 `verifyCsrf`，前端 `fetchApi` 自動從 cookie 讀取 csrf-token 注入 header

### 資料管理頁面架構（共用設計系統）

所有 `dm-` CSS class 定義在 `src/styles/data-management.css`（獨立 CSS 檔），DataManagementPage 與 FacilityDataPage 共同 import。字體：DM Sans + JetBrains Mono（Google Fonts，`index.html` 引入）。

- **DataManagementPage**（地質）：左側 DataPageTOC（200px sticky scroll spy）+ 右側 content。10 個 section 分 4 群組色帶（slate/amber/cyan/violet），航照圖/地質模型/地球物理抽為獨立 sub-component。
- **FacilityDataPage**（設施）：左側 `dm-toc` sidebar（5 Tab：場景管理/模型上傳/模型資訊/場景地形/模型管理）+ 右側 `FacilityUploadSection`。Tab 狀態由頁面持有，透過 `activeTab` prop 傳入。

## Project Structure (key directories)

```
src/
├── components/scene/     # 3D scene: GeologyCanvas, BoreholeInstances, TerrainMesh, WaterLevelSurface, ClippingPlane
├── components/overlay/   # UI panels over 3D: LayerPanel, BoreholeDetailPanel, ClippingToolPanel
├── components/controls/  # Interactive controls
├── components/data/      # Data upload sections (ImageryUploadSection, GeologyModelSection, GeophysicsUploadSection, DataPageTOC, etc.)
├── stores/               # Zustand stores (~17)
├── api/                  # API clients (auth.ts, admin.ts + domain-specific)
├── pages/                # Route pages (GeologyPage, DataManagementPage, ProjectDashboard)
├── types/                # TypeScript interfaces
├── config/               # three.ts (LOD/rendering), lithologyConfig.ts, permissions.ts
└── utils/                # coordinates.ts, lod.ts, colorRamps.ts

server/
├── routes/               # 13 Express route modules
├── scripts/              # Python processors (geology, terrain, water level)
├── prisma/schema.prisma  # Full database schema
├── middleware/            # auth.ts, rateLimit.ts, csrf.ts, errorLogger.ts
├── lib/                  # prisma.ts, auditLog.ts, passwordPolicy.ts, safePath.ts
└── uploads/              # File storage (geology-models/, terrain/, imagery/, etc.)
```

## Environment Variables

**Frontend** (`.env`): `VITE_API_BASE_URL`, `VITE_SENTRY_DSN`

**Backend** (`server/.env`):

- `DATABASE_URL` — PostgreSQL connection (default: `postgresql://postgres:postgres@localhost:5433/llrwddb?sslmode=disable`)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — **production 必填**, `NODE_ENV=production` 時缺失會 throw 啟動錯誤
- `FRONTEND_URL` (CORS origin, default `http://localhost:5173`)
- `PORT` (default 3001)

## 3D 渲染注意事項（CRITICAL）

這是 Three.js / React Three Fiber 數位孿生平台，以下子系統緊密耦合，修改任一個都必須檢查其他系統：

- **陰影系統**：DirectionalLight position/target、shadow camera bounds、shadow map size、bias/normalBias
- **燈光系統**：自適應燈光（`FacilityEnvironment.tsx` 的 `useSceneLighting`），所有參數由 `range = max(width, depth)` 驅動
- **相機系統**：`FacilityCameraController.tsx` 的 auto-fit、flyTo、cameraPosition/cameraTarget
- **地面/格線**：跟隨場景中心 `[cx, cz]`，不是固定在原點
- **地形貼圖**：載入器生命週期、場景重入時的狀態清理

### 已知陷阱

1. **DirectionalLight target 必須跟隨場景中心** — 預設 target 是 (0,0,0)，模型若遠離原點，陰影方向會完全錯誤。必須用 `lightRef.current.target.position.set(cx, cy, cz)` + `updateMatrixWorld()`。
2. **不要加 fog** — 設施導覽模組的場景範圍變化大（10m~10km），fog 的 near/far 很難適配所有場景，會導致模型完全不可見。
3. **陰影相機範圍不能隨便縮小** — 減小 shadow camera 的 left/right/top/bottom 會讓陰影跳到錯誤位置或消失。調整時必須同時驗證陰影在模型下方的位置。
4. **useLoader 替換為 useState+useEffect 要注意重入** — 場景切換再切回時，如果沒有正確清理/重新載入，地形會渲染為灰/白色。
5. **DB 記錄刪除要檢查相依功能** — 例如清理衛星影像記錄會同時清掉圖例設定，因為它們存在同一張表或有 FK 關聯。
6. **`safeResolvePath()` 的路徑問題** — DB 中的 URL 以 `/uploads/...` 開頭（絕對路徑），`path.resolve(__dirname, '..', url)` 會忽略前面的 segments，必須先 strip 前導 `/`。
7. **Express 5 的 `req.params` 型別是 `string | string[]`** — 不能直接 destructure `const { id } = req.params`，TypeScript 會報錯。必須用 `const id = req.params.id as string`。
8. **Prisma 7 的 `Json` 欄位型別** — `Record<string, unknown>` 不能直接賦值給 Prisma 的 `InputJsonValue`，需要 cast：`(details as Prisma.InputJsonValue) ?? undefined`。
9. **GeoTIFF 不能直接給前端** — Three.js TextureLoader 只支援 PNG/JPEG/WebP，衛星影像（.tif）必須在 Python 處理階段轉為 JPEG。地質模組的 `terrain_processor.py` 有完整的 `process_satellite()` 可參考。
10. **`onBeforeCompile` 與材質快取** — Three.js 快取 shader program，若材質的 `map` 從有值變 null（或反之），shader 需重新編譯。用 `key` 強制 remount mesh 或手動 `material.dispose()` 清除快取。hillshade URL 可從 `heightmapUrl.replace('heightmap.png', 'texture.png')` 推導。
11. **React hooks 順序 — 不可在 hooks 之前 early return** — `TerrainSettingsSection` 曾在 `useEffect` 之前 `return null`，切換到無地形場景時 hooks 數量改變觸發 "Rendered fewer hooks than expected" crash。修法：將所有 `return null` 移到 hooks 之後，用 boolean flag guard effect 邏輯。
12. **所有 store fetch 都要帶 `Authorization: Bearer` header** — 安全修復統一加 `authenticate` middleware 後，`credentials: 'include'` 無效（middleware 讀的是 `Authorization` header 不是 cookie）。已修過的 store：`projectStore`、`lithologyStore`、`attitudeStore`、`boreholeStore`、`faultPlaneStore`。新增 store 或新增 fetch 時，一律用 `useAuthStore.getState().accessToken` 取 token。
13. **ShaderMaterial uniforms 與 useMemo 脫鉤** — `GeologyTiles.tsx` 的 `capMaterial` 用 `useMemo` 建立 ShaderMaterial，但依賴沒有 `palette`。當岩性顏色編輯後，palette 重算但 cap uniforms 不會更新。修法：加 `useEffect` 在 `palette` 變化時手動同步 `capMaterial.uniforms.uLithColors/uLithIds/uLithCount`。

## Bug 修復指南

- 修復前，先追蹤所有被變更程式碼路徑的副作用（共享狀態、DB 記錄、重新渲染循環）
- 優先做最小範圍的修改，不要順便重構周邊程式碼
- 3D 渲染相關修復後，心裡檢查：陰影位置對嗎？霧會擋住模型嗎？場景切換再切回正常嗎？
- 修改 DB 記錄或清理快取時，檢查從相同記錄讀取的相依功能

## Facility 模組架構

- `FacilityEnvironment.tsx`：自適應燈光，`useSceneLighting()` 從 `sceneBounds` 或 `modelBboxCenters` 計算所有燈光參數
- `FacilityCameraController.tsx`：相機控制，子場景 auto-fit（當 `cameraPosition` 為 null 時自動飛到模型中心）
- `FacilityPage`：sidebar + canvas，編輯模式在 sidebar 底部切換
- `TransformInputPanel`：右下角的移動/旋轉/縮放面板，Enter 或 blur 時呼叫 API 同步
- `useFacilityStore`：Zustand store，`updateModelTransform` → `PUT /api/facility/models/:id/transform`
- `FacilityTerrain.tsx`：地形渲染，支援衛星影像/山影圖/色階三種紋理模式，色階用 `onBeforeCompile` 注入 GLSL shader
- `FacilitySidebar.tsx`：側邊欄包含地形設定（TerrainSettingsSection），可開關地形顯示、切換紋理模式
- `PlanViewFloating.tsx`：浮動平面圖，含編輯模式（拖曳標記位置 + 眼睛可見性 toggle），`planX`/`planY`/`planVisible` 獨立於 3D position
- `FacilityCanvas.tsx`：R3F Canvas 容器，外層包裹 `ErrorBoundary`（WebGL 錯誤不白屏）
- `AnimationTimeline.tsx`：動畫時間軸編輯器，含匯出/匯入功能（JSON 格式 v1，position offset 自動對齊）
- `FacilityUploadSection.tsx`：場景管理用遞迴 `SceneTreeNode` 支援 N 級巢狀，每層載入父場景模型供 ModelSelect
- `facility_terrain_processor.py`：CSV→heightmap+hillshade+satellite(JPEG)，衛星影像用 rasterio reproject 對齊 DEM
- `server/lib/pythonPath.ts`：跨平台 Python venv 路徑解析（macOS/Linux/Windows），`facility.ts` 和 `water-level.ts` 共用

## Conventions

- Commit messages: `feat:`, `fix:`, `docs:`, `refactor:` prefixes. Messages may be in English or Chinese.
- Database changes: edit `server/prisma/schema.prisma`, then `npx prisma db push && npx prisma generate`.
- Vite proxies `/api/*` and `/uploads/*` to the backend in dev mode.
- Frontend uses strict TypeScript; backend uses CommonJS module system.
- All uploaded files go to `server/uploads/` organized by type subdirectory.
