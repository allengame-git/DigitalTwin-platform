# LLRWD DigitalTwin Platform

LLRWD (Low-Level Radioactive Waste Disposal) DigitalTwin Platform 是一個基於網頁的數位孿生平台，旨在視覺化並管理地質資料、鑽孔資訊、地下環境模型，以及設施 3D 導覽。

## 🎯 Project Overview

本專案利用現代 WebGL 技術 (Three.js / React Three Fiber) 實現高效能的 3D 地質資料展示與設施導覽，並結合響應式 UI 提供沉浸式的使用者體驗。目前包含兩大模組：**地質模組** 與 **設施導覽模組**。

### Core Capabilities

#### 地質模組 (Geology Module)

- **3D 地質視覺化**: 支援 800+ 鑽孔點位的高效渲染 (InstancedMesh)。
- **3D 地質模型**: Voxel CSV / Tecplot .dat 轉換為 Isosurface Mesh (GLB)，使用 Marching Cubes 演算法。
- **LOD (Level of Detail)**: 自動根據相機距離在圖示、柱狀圖與詳細紋理間切換。
- **互動式查詢**: 點擊鑽孔檢視地層分層 (Layers)、物理性質 (N 值、RQD) 與現場照片。
- **資料分層管理**: 支援鑽孔、3D 地質模型、斷層線、地形、航照圖、地下水位面及地球物理探查的開關與透明度控制。
- **地下水位面 (Water Level Surface)**:
  - **資料上傳**: 支援 CSV/DAT/TXT 格式的水井觀測資料或數值模擬結果 (TWD97 座標 + 水位高程)。
  - **自動插值**: 使用 SciPy `griddata` 進行 Linear/Nearest/Cubic 插值，生成 16-bit Heightmap。
  - **範圍控制**: 水井觀測可手動指定邊界 (xmin/xmax/ymin/ymax)，數值模擬自動取資料涵蓋範圍。
  - **3D 渲染**: 半透明藍色曲面 (Displacement Map)，支援透明度調整與 Clipping Plane。
- **地形視覺化 (Terrain)**:
  - **DEM 整合**: 支援上傳 GeoTIFF 與 CSV 點雲，自動生成 16-bit Heightmap 與 Hillshade Texture。
  - **衛星影像融合**: 上傳 DEM 時可同時附帶衛星影像 TIFF，後端自動對齊 (reproject/resample) 後貼合於 3D 地形上。
  - **三種紋理模式**: 衛星影像 / 山影圖 (Hillshade) / 色階 (Color Ramp)，可即時切換。
  - **動態著色**: 支援多種 Color Ramp (Rainbow, Viridis等) 與高度反轉 (Reverse)。
  - **互動圖例**: 可自訂 Z-axis 範圍 (Min/Max) 或自動偵測。
  - **設定持久化**: 自動儲存使用者的圖例與圖層設定。
- **進階地質工具**:
  - **剖面切片 (Clipping)**: 可沿 X/Y/Z 軸進行即時剖面分析 (自動同步模型邊界)。
  - **地質構造**: 視覺化斷層線與位態符號 (Strike/Dip)。
  - **Inspector Panel**: 動態調整大小的資訊面板，優化長列表資料閱讀體驗。
  - **導覽模式**: 提供自動化的場景導覽體驗。

#### 設施導覽模組 (Facility Navigation Module) — 2026-03-06

獨立的 3D 設施導覽系統，含瀏覽頁面與獨立資料管理頁面。

**座標系統**：水平面 = X-Z 平面（Y 軸朝上）。Three.js X = 東、Y = 高程、Z = 北（對應 TWD97-Y）。UI 軸標籤已依此對應工程語義。

- **多層巢狀場景**: 場區 → 建築 → 樓層 → 房間等多層級，fly-to 動畫切換。
- **GLB/glTF 模型上傳**: 拖拉上傳，單檔最大 100MB。
- **模型互動**: Hover 高亮（emissive）、點擊選取、Tooltip 名稱顯示、標籤點擊可選取模型。
- **模型資訊面板**: 點擊模型後右下角浮動面板（340px，60vh），分三區塊顯示：
  - 設施介紹：WYSIWYG HTML 渲染（TipTap 編輯器產出）
  - 設施圖說：IMAGE 縮圖陣列（點擊 Lightbox 預覽）+ DOCUMENT 下載連結
  - 自訂欄位：TEXT/LINK key-value 顯示
  - 無資料的區塊自動隱藏
- **截圖功能**: 底部右下角截圖按鈕，使用 File System Access API（`showSaveFilePicker`）彈出 OS 原生存檔對話框，不支援時 fallback 自動下載。當 InfoPanel 開啟時自動左移避免重疊，動畫模式下自動上移避免被時間軸遮蓋。
- **編輯模式**: 側邊欄底部切換，點擊模型顯示 TransformInputPanel（移動/旋轉/縮放精確輸入），debounce 存後端，與「模型管理」Tab 資料天然同步。
- **動畫系統** (2026-03-05~06):
  - **混合動畫架構**: 支援 GLB 內嵌動畫（AnimationClip，如機械臂動作）+ 關鍵幀動畫（position/rotation/scale 插值，如車輛路徑移動），兩層可同時疊加。
  - **關鍵幀引擎**: 支援 4 種 easing（linear/easeIn/easeOut/easeInOut），position lerp + rotation slerp (quaternion) + scale lerp。
  - **曲線路徑插值** (2026-03-06): Catmull-Rom centripetal 樣條曲線，弧長等速參數化（`getPointAt` + `getLengths`），每段 keyframe 可獨立設定直線或曲線（per-segment pathMode）。
  - **自動朝向** (autoOrient): 模型沿路徑切線方向自動旋轉（Y 軸 yaw），適用車輛/人物沿路線行走。
  - **3D 路徑控制點編輯器** (Phase 2, 2026-03-06): 動畫模式下路徑節點球可點擊選取 keyframe，選中的節點掛 TransformControls 可直接拖曳平移，拖曳完成 debounce 300ms 寫入 API。
  - **時間軸 keyframe 拖曳**: 菱形標記可拖曳移動時間位置，clamp 不超過前後 keyframe（最小間距 0.05s），捨入到 0.1s。
  - **動畫選擇記憶**: 切換焦點模型時自動恢復上次選取的動畫（`selectedAnimPerModel` Map）。
  - **GLB 動畫偵測**: 自動掃描 GLB 檔案中的 AnimationClip，使用 AnimationMixer 驅動播放。
  - **觸發模式**: 每個動畫可獨立設定「自動循環」或「手動觸發」。
  - **時間軸編輯器**: 底部面板，含動畫清單、播放控制（播放/暫停/停止）、時間軸軌道（關鍵幀菱形標記可拖曳 + 紅色播放指示線）、屬性編輯（名稱/時長/觸發方式/循環/緩動曲線/路徑模式/自動朝向）。
  - **多模型選取**: Cmd/Ctrl+Click 多選模型，支援批次顯示/隱藏、批次刪除。Checkbox + 焦點/選取雙層 UI。
- **多軌動畫時間軸**: 每個選取的模型各自一條軌道，焦點模型（藍色高亮）可編輯關鍵幀，非焦點軌道半透明顯示。
- **全域播放控制**: 模型清單標題列旁的播放/暫停按鈕，控制所有模型動畫同時播放或暫停。進入動畫編輯模式時自動暫停所有動畫。
- **動畫模式**: 側邊欄底部「進入動畫模式」按鈕（紫色主題），與編輯模式互斥。進入時所有動畫凍結，退出時恢復自動播放。
- **動畫編輯 Transform 控制**: 動畫模式下 sidebar 提供 Transform 數值輸入面板（移動/旋轉/縮放），200ms 即時同步 3D groupRef，支援 Enter/blur 精確設值。
- **場景切換過渡動畫** (2026-03-06, N1):
  - **狀態機架構**: `idle → flyToModel → fadeOut → loading → fadeIn → idle`，Zustand 管理五狀態
  - **飛向模型**: 點擊進入子場景前先 fly-to 該模型（300ms），增強空間感
  - **黑幕淡出淡入**: CSS `opacity` transition（200ms），黑幕遮蓋時瞬間切換場景 + 設定相機位置
  - **支援 Lobby**: sidebar 進入子場景、Lobby 頂部按鈕進入均走同一 transition 流程
  - **返回不過渡**: `goBack` / `goToRoot` 仍為直接切換（不走 transition）
- **模型載入錯誤處理** (2026-03-06, N2):
  - **React Error Boundary**: class component 包裹每個 `FacilityModelItem`，`getDerivedStateFromError` 捕獲 `useGLTF` 載入失敗
  - **佔位方塊**: 紅色半透明方塊 + 線框 + Html 標籤（模型名稱 + 錯誤訊息 + 重試按鈕）
  - **重試機制**: 點擊重試按鈕 `setState({ hasError: false })` 重新 mount 子元件，觸發 `useGLTF` 重新載入
- **視角快速切換** (2026-03-06):
  - sidebar 模型清單上方 3 個按鈕：俯視 / 預設 / 重置
  - **俯視**: 從正上方 `radius * 1.5` 高度俯看場景中心（自動計算模型分布半徑）
  - **預設**: 飛回場景 `cameraPosition`（有設定時）；無設定則斜 45° 俯視
  - **重置**: 根據模型分布計算 fit-all 斜 45° 視角（不依賴場景設定）
  - 場景中心優先順序：`cameraTarget` > bbox centers 平均 > model positions 平均 > 原點
  - 800ms cubic ease-out fly 動畫
- **側邊欄**: 白色亮色主題，含返回儀表板連結、可收合切換、BreadcrumbNav、SceneTree、視角快速切換按鈕、模型清單（含多選 checkbox + 全域播放按鈕）、2D PlanView。
- **2D 平面圖**: 手動上傳，模型位置映射為可點擊標記。
- **地形支援**: CSV → Python 插值 → heightmap + hillshade，可疊加衛星影像紋理。
- **獨立資料管理頁面** (`/project/:code/facility-data`)：5 個 Tab
  - 場景管理：CRUD 場景樹、設定相機預設位置、場景範圍設定（自適應燈光用）
  - 模型上傳：GLB 上傳、SceneSelect 指定場景
  - **模型資訊**（Dashboard 卡片牆）：選擇場景後列出所有模型卡片，點擊開啟全螢幕 Modal：
    - 設施介紹：TipTap WYSIWYG 編輯器（Bold/Italic/Heading/BulletList/Link），2 秒 debounce 自動儲存
    - 設施圖說：拖拉上傳區（JPG/PNG/PDF/CAD/DWG），以卡片顯示縮圖或檔名
    - 自訂欄位：新增/刪除 TEXT/LINK 條目
  - 場景地形：CSV + 衛星影像上傳
  - **模型管理**：列出場景內所有模型，可刪除、改名、修改 position/rotation/scale（X東/Z高程/Y北）、更換子場景

#### 共通功能

- **資料管理**:
  - **地質模型上傳**: CSV Voxel 檔案自動轉換為 GLB Isosurface Mesh。
  - **航照圖上傳**: 支援 GeoTIFF 自動解析座標或手動輸入 TWD97 座標。
  - **地球物理探查資料**: 上傳 ERT/GPR/震測剖面圖，以垂直平面形式在 3D 場景中顯示。
  - **地下水位面上傳**: 上傳水井觀測或數值模擬資料 (CSV/DAT/TXT)，自動插值並顯示於 3D 場景。
  - **設施模型上傳**: GLB/glTF 檔案上傳、Rich Content 管理、場景地形上傳。
- **UI/UX**:
  - **Sidebar 分頁設計**: 圖層頁 (所有使用者) + 設定頁 (admin/engineer)。
  - **設施導覽入口**: 地質場景 Sidebar 提供一鍵跳轉設施導覽頁面。

## 🛠 Tech Stack

### Frontend

- **Core**: [React 19](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 7](https://vitejs.dev/)
- **3D Engine**:
  - [Three.js](https://threejs.org/) (Standard 3D Library)
  - [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) (React renderer for Three.js)
  - [Drei](https://github.com/pmndrs/drei) (Helpers for R3F)
  - [3d-tiles-renderer](https://github.com/NASA-AMMOS/3DTilesRendererJS) (For OGC 3D Tiles)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **WYSIWYG Editor**: [TipTap 2.x](https://tiptap.dev/) (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-table`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`)
- **Visualization**: [ECharts](https://echarts.apache.org/) (Charts & Graphs)
- **Security**: [DOMPurify](https://github.com/cure53/DOMPurify) (HTML sanitization for XSS prevention)

### Backend

- **Runtime**: Node.js + Express.js
- **Language**: TypeScript (ts-node / nodemon)
- **ORM**: [Prisma 7](https://www.prisma.io/) (PostgreSQL adapter)
- **Database**: PostgreSQL (Docker container: `llrwd-postgres` on port `5433`)
- **File Upload**: Multer + Sharp (image processing)
- **3D Geology Processing** (Python):
  - [PyVista](https://docs.pyvista.org/) (VTK-based 3D mesh processing)
  - [NumPy](https://numpy.org/) (Numerical computing)
  - [trimesh](https://trimsh.org/) (GLB mesh export)
- **Terrain Processing** (Python):
  - [rasterio](https://rasterio.readthedocs.io/) (GeoTIFF 讀取、CRS 轉換與重新投影)
- **Water Level Processing** (Python):
  - [SciPy](https://scipy.org/) (`griddata` 地下水位插值)
  - [NumPy](https://numpy.org/) (網格建立與數值運算)
  - [Pillow](https://python-pillow.org/) (16-bit Heightmap PNG 輸出)
  - [Pandas](https://pandas.pydata.org/) (CSV/DAT/TXT 資料讀取)
- **Facility Terrain Processing** (Python):
  - [SciPy](https://scipy.org/) (`griddata` 設施地形插值)
  - [Pillow](https://python-pillow.org/) (16-bit Heightmap PNG 輸出)

## 📂 Project Structure

```bash
/
├── src/                        # Frontend Source
│   ├── components/
│   │   ├── scene/              # 地質 3D 場景 (GeologyCanvas, BoreholeInstances, TerrainMesh, etc.)
│   │   ├── facility/           # 設施導覽 3D 場景 (18 元件)
│   │   │   ├── FacilityCanvas.tsx         # R3F Canvas 容器
│   │   │   ├── FacilityEnvironment.tsx    # 自適應燈光（場景範圍驅動）、IBL 環境光、網格、光源 target 追蹤場景中心
│   │   │   ├── FacilityCameraController.tsx # Fly-to 動畫 + 視角快速切換 + 場景切換相機瞬移 + 子場景 auto-fit
│   │   │   ├── FacilityModels.tsx         # 模型群管理 + Error Boundary (N2)
│   │   │   ├── FacilityModelItem.tsx      # 單一 GLB (hover/click/transform)
│   │   │   ├── FacilityTerrain.tsx        # 地形 heightmap + 紋理
│   │   │   ├── FacilitySidebar.tsx        # 側邊欄整合 + 視角快速切換按鈕
│   │   │   ├── BreadcrumbNav.tsx          # 麵包屑導覽
│   │   │   ├── SceneTree.tsx              # 子場景樹
│   │   │   ├── PlanView.tsx               # 2D 平面圖 + 模型標記
│   │   │   ├── FacilityInfoPanel.tsx      # 右下角浮動資訊面板（介紹/圖說/自訂欄位）
│   │   │   ├── FacilityCaptureHandler.tsx # 暴露 Canvas DOM 給截圖功能
│   │   │   ├── FacilityNorthArrow.tsx     # 動態指北針 (north = -Z)
│   │   │   ├── PlanViewFloating.tsx       # 浮動平面圖
│   │   │   ├── AnimationTimeline.tsx      # 動畫時間軸面板（播放控制/關鍵幀編輯）
│   │   │   ├── FacilityToolbar.tsx        # 工具列（已從 FacilityPage 移除，元件保留）
│   │   │   ├── TransformInputPanel.tsx    # 精確數值輸入（座標軸已對應工程語義）
│   │   │   └── CoordShiftPanel.tsx        # 場景座標偏移（已從 FacilityPage 移除，元件保留）
│   │   ├── common/              # 共用元件
│   │   │   ├── RichTextEditor.tsx         # TipTap WYSIWYG 編輯器
│   │   │   └── RichTextView.tsx           # WYSIWYG HTML 唯讀渲染 (DOMPurify 消毒)
│   │   ├── overlay/            # UI 疊加層 (LayerPanel, ClippingTool, BoreholeDetail)
│   │   ├── data/               # 資料上傳元件
│   │   │   ├── FacilityUploadSection.tsx  # 設施上傳管理 (5 Tab，含模型管理)
│   │   │   ├── TerrainUploadSection.tsx   # DEM + 衛星影像上傳
│   │   │   ├── WaterLevelUploadSection.tsx # 地下水位面上傳
│   │   │   └── ...                        # 其他上傳元件
│   │   ├── tour/               # 導覽模式元件
│   │   ├── controls/           # 控制元件
│   │   └── layout/             # 版面配置 (MainLayout, GeologySidebar)
│   ├── stores/                 # Zustand 狀態管理 (~17 stores)
│   │   ├── facilityStore.ts    # 設施導覽 (場景/模型/多選/批次操作/編輯/動畫播放控制/場景轉場/視角切換)
│   │   ├── authStore.ts        # 認證狀態 (JWT/登入/登出/changePassword/mustChangePassword)
│   │   ├── adminStore.ts       # 管理員操作 (使用者 CRUD/稽核日誌/session 管理)
│   │   ├── boreholeStore.ts    # 鑽孔資料
│   │   ├── layerStore.ts       # 圖層控制
│   │   ├── waterLevelStore.ts  # 地下水位面資料
│   │   ├── uploadStore.ts      # 航照圖 & 地球物理探查資料
│   │   └── viewerStore.ts      # 3D 檢視器狀態
│   ├── pages/                  # 頁面入口
│   │   ├── FacilityPage.tsx    # 設施導覽 3D 場景頁面
│   │   ├── FacilityDataPage.tsx # 設施資料管理頁面 (5 Tab)
│   │   ├── GeologyPage.tsx     # 地質場景頁面
│   │   ├── DataManagementPage.tsx # 地質資料管理頁面（不含設施）
│   │   ├── AdminUsersPage.tsx  # 使用者管理頁面 (admin)
│   │   ├── AdminSettingsPage.tsx # 安全設定 + 稽核日誌 (admin)
│   │   ├── ChangePasswordPage.tsx # 變更密碼頁面 (含首次登入強制)
│   │   └── ...
│   ├── types/
│   │   ├── facility.ts         # 設施模組型別
│   │   └── ...
│   ├── utils/                  # 工具函式 (coordinates, lod, colors)
│   └── config/                 # 全域設定 (three.ts)
│
├── server/                     # Backend Source
│   ├── routes/
│   │   ├── facility.ts         # 設施導覽 API (場景/模型/Rich Content/地形)
│   │   ├── auth.ts             # 認證 API (login/logout/refresh/me/change-password)
│   │   ├── admin.ts            # 管理員 API (使用者 CRUD/session/audit-log)
│   │   ├── terrain.ts          # DEM 地形 API
│   │   ├── water-level.ts      # 地下水位面 API
│   │   ├── geology-model.ts    # 地質模型 API
│   │   └── ...                 # 其他路由 (borehole, attitude, fault-plane, etc.)
│   ├── middleware/
│   │   ├── auth.ts             # JWT 驗證 + authorize(role) middleware
│   │   ├── rateLimit.ts        # Rate limiting (3 tiers: login/password/admin)
│   │   ├── csrf.ts             # CSRF Double Submit Cookie
│   │   └── errorLogger.ts      # 錯誤日誌
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── auditLog.ts         # 稽核日誌寫入工具
│   │   ├── passwordPolicy.ts   # 密碼強度驗證 + 臨時密碼產生
│   │   └── safePath.ts         # 路徑穿越防護
│   ├── scripts/
│   │   ├── geology_mesh_builder.py        # Voxel CSV / Tecplot → GLB
│   │   ├── terrain_processor.py           # DEM 地形處理
│   │   ├── water_level_processor.py       # 地下水位面插值
│   │   └── facility_terrain_processor.py  # 設施地形 CSV → heightmap
│   ├── prisma/
│   │   └── schema.prisma       # Prisma Schema (所有 Model)
│   ├── uploads/                # 上傳檔案存放目錄
│   │   ├── facility/           # 設施模型、資訊、平面圖、地形
│   │   ├── imagery/            # 航照圖
│   │   ├── terrain/            # DEM 地形
│   │   └── ...
│   ├── .env                    # 環境變數 (DATABASE_URL, JWT_SECRET)
│   └── index.ts                # Express 伺服器入口
│
├── docs/plans/                 # 設計文件與實作計畫
└── public/                     # 靜態資源
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Docker (for PostgreSQL database)
- Python 3.10+ (for geology mesh processing)

### Database Setup (Docker)

```bash
# 啟動 PostgreSQL 容器 (首次)
docker run --name llrwd-postgres -e POSTGRES_PASSWORD=postgres -p 5433:5432 -d postgres:latest

# 日後重啟
docker start llrwd-postgres
```

### Installation

```bash
# Clone the repository
git clone <repository_url>

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install
```

### Python Dependencies (地質模型處理)

```bash
# 建立 Python 虛擬環境 (建議)
python3 -m venv server/venv
source server/venv/bin/activate

# 安裝 3D 處理套件
pip install pyvista numpy trimesh

# 安裝地形處理套件
pip install rasterio scipy Pillow pandas
```

> 地質模型上傳時，後端會呼叫 `server/scripts/geology_mesh_builder.py`
> 將 Tecplot FETetrahedron (.dat) 轉換為 GLB isosurface mesh。
> 此腳本需要 PyVista (VTK)、NumPy、trimesh 三個套件。

### Environment Variables

Backend `.env` file (`server/.env`):

```env
DATABASE_URL="postgres://postgres:postgres@localhost:5433/llrwddb?sslmode=disable"
```

### Database Migration

```bash
cd server
npx prisma db push       # 同步 Schema 到資料庫
npx prisma generate      # 產生 Prisma Client
```

### Development

```bash
# Terminal 1: Start backend server
cd server && npm run dev

# Terminal 2: Start frontend dev server
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`

### Build

```bash
# Type check and build for production
npm run build
```

## 🗄️ Database Schema

### Imagery (航照圖)

| Field        | Type    | Description                |
|--------------|---------|----------------------------|
| id           | UUID    | Primary Key                |
| filename     | String  | 儲存檔名                   |
| year         | Int     | 資料年份 (必填)            |
| name         | String  | 資料名稱 (必填)            |
| source       | String? | 資料來源                   |
| description  | String? | 資料說明                   |
| minX/maxX    | Float?  | TWD97 X 座標範圍           |
| minY/maxY    | Float?  | TWD97 Y 座標範圍           |
| url          | String  | 圖片 URL                   |
| thumbnailUrl | String  | 縮圖 URL                   |

### Geophysics (地球物理探查)

| Field       | Type    | Description                     |
|-------------|---------|---------------------------------|
| id          | UUID    | Primary Key                     |
| filename    | String  | 儲存檔名                        |
| year        | Int     | 資料年份 (必填)                 |
| name        | String  | 資料名稱 (必填)                 |
| lineId      | String? | 測線編號                        |
| method      | String  | 探查方法 (必填: ERT/GPR/Seismic)|
| x1/y1/z1    | Float   | 左端點座標 (TWD97, 公尺)        |
| x2/y2/z2    | Float   | 右端點座標 (TWD97, 公尺)        |
| depthTop    | Float?  | 頂部深度 (預設 0)               |
| depthBottom | Float?  | 底部深度 (依圖片比例計算)       |
| url         | String  | 圖片 URL                        |
| thumbnailUrl| String  | 縮圖 URL                        |

### GeologyModel (3D 地質模型)

| Field            | Type    | Description                        |
|------------------|---------|---------------------------------|
| id               | UUID    | Primary Key                        |
| filename         | String  | 上傳檔名                           |
| version          | String  | 版本號                             |
| description      | String? | 版本說明                           |
| meshUrl          | String? | GLB Mesh 路徑                      |
| meshFormat       | String? | Mesh 格式 (glb)                    |
| conversionStatus | String  | 轉換狀態 (pending/processing/completed/failed) |
| conversionProgress | Int   | 轉換進度 (0-100)                   |
| minX/maxX/minY/maxY/minZ/maxZ | Float? | 模型邊界 (TWD97)       |

### FaultPlane (斷層面)

| Field        | Type    | Description                |
|--------------|---------|----------------------------|
| id           | UUID    | Primary Key                |
| name         | String  | 斷層名稱                   |
| type         | String  | normal / reverse / strike-slip |
| dipAngle     | Float   | 傾角 (度)                   |
| dipDirection | Float   | 傾向 (度)                   |
| depth        | Float   | 延伸深度 (公尺)             |
| color        | String  | Hex 顏色 (預設 #ff4444)     |
| coordinates  | Array   | [FaultCoordinate] 座標點序列 |

### WaterLevel (地下水位面)

| Field       | Type    | Description                     |
|-------------|---------|---------------------------------|
| id          | UUID    | Primary Key                     |
| projectId   | UUID    | 關聯專案 ID                     |
| name        | String  | 水位面名稱                      |
| sourceType  | String  | 資料來源 (well / simulation)    |
| filename    | String  | 儲存檔名                        |
| originalName| String  | 原始檔名                        |
| path        | String  | 原始資料路徑                    |
| heightmap   | String  | 處理後 heightmap 路徑           |
| minX/maxX   | Float   | TWD97 X 座標範圍               |
| minY/maxY   | Float   | TWD97 Y 座標範圍               |
| minZ/maxZ   | Float   | 水位高程範圍 (公尺)            |
| width/height| Int     | Heightmap 網格維度             |
| pointCount  | Int     | 原始資料點數                    |

### FacilityScene (設施場景)

| Field            | Type    | Description                        |
|------------------|---------|------------------------------------|
| id               | UUID    | Primary Key                        |
| projectId        | FK      | 關聯專案 ID                        |
| parentSceneId    | FK?     | 父場景 (null = 根場景)             |
| name             | String  | 場景名稱                           |
| description      | String? | 描述                               |
| planImageUrl     | String? | 手動上傳 2D 平面圖                 |
| autoPlanImageUrl | String? | 自動俯視截圖                       |
| cameraPosition   | Json?   | 預設相機位置 {x,y,z}               |
| cameraTarget     | Json?   | 預設相機注視點 {x,y,z}             |
| terrainCsvUrl    | String? | 地形 CSV 路徑                      |
| terrainHeightmapUrl | String? | 處理後 heightmap 路徑           |
| terrainTextureUrl | String? | 衛星影像紋理路徑                   |
| terrainBounds    | Json?   | {minX, maxX, minY, maxY, minZ, maxZ} |
| sceneBounds      | Json?   | 場景範圍 {width, depth, height} 米; null=自動 |
| coordShiftX/Y/Z  | Float  | 座標偏移 (預設 0)                  |
| coordRotation    | Float   | 旋轉偏移 (degrees, 預設 0)         |
| sortOrder        | Int     | 同層級排序                         |

### FacilityModel (設施 3D 模型)

| Field        | Type    | Description                        |
|--------------|---------|------------------------------------|
| id           | UUID    | Primary Key                        |
| sceneId      | FK      | 所屬場景                           |
| name         | String  | 模型名稱                           |
| modelUrl     | String  | GLB/glTF 檔案路徑                  |
| fileSize     | Int     | 檔案大小 (bytes)                   |
| introduction | String? | 設施介紹 (WYSIWYG HTML)            |
| position     | Json    | 位置 {x, y, z}                     |
| rotation     | Json    | 旋轉 {x, y, z} (euler degrees)    |
| scale        | Json    | 縮放 {x, y, z}                     |
| modelType    | String  | "primary" (一般) / "decorative" (裝飾) |
| sortOrder    | Int     | 排序                               |

### FacilityAnimation (模型動畫)

| Field        | Type    | Description                              |
|--------------|---------|------------------------------------------|
| id           | UUID    | Primary Key                              |
| modelId      | FK      | 所屬模型                                 |
| name         | String  | 動畫名稱                                 |
| type         | String  | "keyframe" (關鍵幀) / "gltf" (GLB 內嵌)  |
| trigger      | String  | "auto" (自動播放) / "manual" (手動觸發)   |
| loop         | Boolean | 是否循環播放                              |
| duration     | Float   | 動畫時長 (秒)                             |
| easing       | String  | "linear" / "easeIn" / "easeOut" / "easeInOut" |
| pathMode     | String  | "linear" (直線) / "catmullrom" (曲線)     |
| autoOrient   | Boolean | 自動沿路徑切線方向旋轉                     |
| gltfClipName | String? | GLB 內嵌動畫名稱 (type=gltf 時使用)       |
| keyframes    | Json    | 關鍵幀陣列 [{time, position, rotation, scale, pathMode?}] |
| sortOrder    | Int     | 排序                                      |

### FacilityModelInfo (Rich Content)

| Field    | Type    | Description                              |
|----------|---------|------------------------------------------|
| id       | UUID    | Primary Key                              |
| modelId  | FK      | 所屬模型                                 |
| type     | Enum    | TEXT / IMAGE / DOCUMENT / LINK           |
| label    | String  | 標籤名稱                                |
| content  | String  | 文字內容 / URL / 檔案路徑               |
| sortOrder| Int     | 排序                                     |

## 🧩 Current Status

### ✅ Completed Features

- [x] **Core**: 專案基礎建設、TypeScript 設定、3D 場景初始化
- [x] **Data**: 鑽孔資料正式串接 (Project-scoped)、TWD97 座標原點同步
- [x] **Visualization**: 800+ 鑽孔 InstancedMesh 渲染、LOD 機制
- [x] **Interaction**: 點選鑽孔/斷層，檢視詳細資訊面板
- [x] **Layer Control**: 圖層開關與透明度控制 (Boreholes, Structures, Terrain, Imagery, Geophysics)
- [x] **Tools**: 剖面切片工具 (Clipping Plane)、斷層面 3D 渲染與位態顯示
- [x] **Charts**: 更新物理性質圖表，支援 N 值與 RQD 顯示
- [x] **Auth**: 完整的身分驗證與帳號管理系統 (JWT + Prisma 持久化，詳見下方)
- [x] **Features**: 導覽模式架構 (Guided Tour)、WebGL 錯誤降級 (Fallback 2D)
- [x] **Data Management**:
  - 航照圖上傳、檢視、刪除
  - 地球物理探查資料上傳 (含 TWD97 座標與探查方法)
  - 3D 場景中以垂直平面顯示探查剖面圖
  - **3D 地質模型上傳**: CSV Voxel 自動轉換為 GLB Isosurface Mesh
  - **斷層面資料管理**: 支援單筆新增與 CSV 批次匯入斷層資料
  - **位態資料管理**: 支援單筆新增、編輯、刪除與 CSV 批次匯入 (含重複檢查)
  - **儲存空間管理**: 系統設定中提供掃描與清理孤兒上傳檔案機制 (`/api/cleanup`)
- [x] **Multi-Project Architecture**:
  - 支援建立、編輯、刪除多個獨立專案
  - 專案 Dashboard 頁面 (`/project/:code`)
  - Project-scoped 路由設計與資料隔離
  - 支援自定義 TWD97 座標原點 (每專案)
  - **Project Safeguards**: 刪除專案確認機制 (Admin Only)
- [x] **Navigation**: 自動解析 URL projectCode 並同步全域專案狀態
- [x] **UI/UX**:
  - Sidebar 分頁設計 (圖層頁 + 設定頁)
  - **資訊同步**: Dashboard 與 Sidebar 即時顯示各類資料總數 (鑽探、模型、航照)
  - 設定頁權限控制 (admin/engineer 專屬)
- [x] **場景環境優化 (2026-02-10)**:
  - 移除 fog 效果，確保所有距離的清晰視覺
  - 移除冗餘的綠色基礎地面，避免與 DEM 地形混淆
  - 重新設計相機重置邏輯 (Scene Traverse 策略 + Store Fallback)
  - 修復 `GeologyCanvas` 未呼叫 `fetchGeologyModels()` 的 Bug
  - 位態資料表格固定高度 (400px) + Sticky Header
- [x] **地形圖例與優化 (2026-02-12)**:
  - **地形圖例 (Legend)**: 新增 Color Ramp 選擇、反轉功能、Z 軸範圍設定
  - **即時渲染**: 使用 Custom Shader 實現 GPU 端動態著色
  - **設定持久化**: 圖層可見性與圖例設定自動儲存 (LocalStorage)
  - **預設視圖優化**: 首次進入僅顯示鑽孔與地形，減少資訊過載
- [x] **航照圖高程控制 (2026-02-12)**:
  - **Z-axis Offset**: 可手動調整航照圖高程 (-500m ~ 100m)，避免與地質模型或地形穿插
  - **UI 優化**: 控制項整合於圖層面板，獨立顯示不擁擠
  - **設定持久化**: 自動記憶使用者的高程設定
- [x] **指北針與相機控制 (2026-02-23)**:
  - **動態指北針 (NorthArrow)**: 根據相機旋轉即時更新方位，支援專案「真北方位角」偏移
  - **快速視角切換**: Top 俯視 / +X / +Y / 預設視角一鍵切換
  - **重置範圍過濾**: 全部 / 僅地質模型 / 僅鑽孔
  - **Gimbal Lock 修正**: Top 視角時手動設定 camera.up 避免方向錯誤，NorthArrowCalculator 加入 fallback 計算
- [x] **地下水位面 (2026-02-26)**:
  - **Python 處理器**: `water_level_processor.py` 支援 CSV/DAT/TXT 讀取，自動辨識 X/Y/Head 欄位
  - **插值引擎**: SciPy `griddata` 支援 linear/nearest/cubic 方法，輸出 16-bit heightmap PNG
  - **雙模式範圍**: 水井觀測 (user-defined bounds) vs 數值模擬 (auto-detect + 5% padding)
  - **API**: POST/GET/DELETE `/api/water-level`
  - **3D 渲染**: `WaterLevelSurface.tsx` 半透明藍色 Displacement Mesh，支援 Clipping Plane
  - **前端 Store**: `waterLevelStore.ts` (Zustand) 管理 fetch/upload/delete/active
  - **圖層控制**: LayerPanel 新增 💧 地下水位面圖層，支援透明度調整
  - **上傳 UI**: `WaterLevelUploadSection.tsx` 含資料類型/插值方法/手動範圍選項
  - **持久化修正**: layerStore persist `merge` function 確保新 layer key 不被舊 localStorage 覆蓋
- [x] **衛星影像 + DEM 3D 地形融合 (2026-02-26)**:
  - **衛星影像處理**: `terrain_processor.py` 新增 `process_satellite()` 函數，自動 reproject/resample 衛星影像至 DEM 範圍
  - **雙檔上傳**: API 支援同時上傳 DEM 與衛星影像 TIFF (`upload.fields`)
  - **三模式切換**: TerrainMesh 支援 satellite / hillshade / colorRamp 紋理模式
  - **WebGL 優化**: 衛星影像自動限縮至 4096px 以內 (WebGL texture 限制)
  - **DB Schema**: Terrain model 新增 `satelliteTexture` 欄位

- [x] **設施導覽模組 (2026-03-03)**:
  - **架構**: 3D 導覽頁（`/project/:code/facility`）+ 獨立資料管理頁（`/project/:code/facility-data`）
  - **後端**: `server/routes/facility.ts`，完整 CRUD — 場景/模型/Rich Content/平面圖/地形
  - **DB Schema**: `FacilityScene`（自我參照巢狀）+ `FacilityModel` + `FacilityModelInfo` + `FacilityInfoType` enum
  - **Python 地形處理**: `facility_terrain_processor.py` — CSV 插值 → 16-bit heightmap + hillshade
  - **前端 Store**: `facilityStore.ts`（Zustand）— 場景樹、模型管理、編輯模式、sceneStack 導覽歷史
  - **3D 場景**: FacilityCanvas（R3F）+ CameraController（fly-to）+ FacilityTerrain（heightmap displacement）
  - **側邊欄**: 白色亮色主題、可收合、返回儀表板連結、編輯模式切換按鈕
  - **模型互動**: hover emissive 高亮；非編輯模式 click → 進入子場景；編輯模式 click → 選取模型顯示 TransformInputPanel
  - **座標系統**: 水平面 X-Z，Y 軸朝上；UI 軸標籤已對應工程語義（X東 / Z高程 / Y北）
  - **上傳管理**: FacilityUploadSection（5 Tab：場景管理/模型上傳/資訊編輯/地形上傳/模型管理）
  - **模型管理 Tab**: 可刪除、改名、修改 position/rotation/scale、換子場景；與 3D 視窗共享 API，資料天然同步
  - **儀表板**: ProjectDashboardPage 拆為「地質資料管理」與「設施資料管理」兩個獨立卡片
  - **TypeScript**: 全模組 0 型別錯誤

- [x] **設施動畫系統 (2026-03-05)**:
  - **DB Schema**: `FacilityAnimation` 表（1:N from `FacilityModel`）
  - **後端 API**: GET/POST `/api/facility/models/:id/animations`, PUT/DELETE `/api/facility/animations/:animId`
  - **前端型別**: `FacilityAnimation`, `AnimationKeyframe` 介面
  - **Zustand Store**: 動畫 CRUD, 播放控制 (playing/paused/stopped), 關鍵幀 CRUD
  - **GLB 動畫偵測**: `AnimationMixer` 自動偵測 GLB AnimationClip，trigger=auto 時自動播放
  - **關鍵幀插值引擎**: `useFrame` 內 position lerp + rotation slerp + scale lerp，4 種 easing
  - **時間軸 UI**: `AnimationTimeline.tsx` — 動畫清單、屬性編輯、時間軸軌道、播放控制
  - **動畫模式**: sidebar 紫色按鈕切換，與編輯模式互斥

- [x] **多模型選取與批次操作 (2026-03-05)**:
  - **選取架構**: `selectedModelIds[]` + `focusedModelId` 雙層模型，Cmd/Ctrl+Click 多選
  - **批次操作**: 選取 2+ 模型時顯示批次工具列 — 批次顯示/隱藏、批次刪除（含確認）
  - **模型可見性**: `hiddenModelIds[]` 客戶端隱藏，隱藏模型半透明 + 刪除線樣式
  - **多軌時間軸**: `AnimationTimeline` 重寫為多軌模式，每個選取模型獨立軌道
  - **焦點編輯**: 單一焦點模型可編輯 TransformControls + 關鍵幀，非焦點模型凍結
  - **全域播放控制**: 模型清單標題列播放/暫停按鈕，控制場景內所有動畫
  - **動畫模式凍結**: 進入動畫編輯模式時自動暫停所有非編輯中的動畫
  - **動畫載入優化**: `fetchModels` 完成後自動 `fetchAnimationsForModels`，merge 策略保留既有動畫
  - **Sidebar Transform 輸入**: 動畫模式下提供 XYZ 數值輸入面板，200ms 同步 3D groupRef

- [x] **手動觸發動畫播放 UI (2026-03-06, A2)**:
  - **Store 層**: `manualPlayingModelIds: string[]` 追蹤正在播放手動動畫的模型 ID，`toggleManualPlay(modelId)` 切換播放/停止
  - **Keyframe 手動播放**: `FacilityModelItem.tsx` useFrame 新增 `trigger === 'manual' && isManualPlaying` 分支，獨立 `manualStartTimeRef` 計時，非循環動畫播完自動停止
  - **GLB 手動播放**: `manualGltfActionsRef` 預建 AnimationAction 但不播放，`isManualPlaying` useEffect 控制 play/stop
  - **Sidebar 按鈕**: 有 `trigger='manual'` 動畫的模型旁顯示 Play/Pause 按鈕（紫色 `#7c3aed`），動畫編輯模式下隱藏
  - **狀態隔離**: `manualPlayingModelIds` 獨立於全域 `playbackState`，場景切換與動畫模式進入時自動清空

- [x] **動畫預覽路徑可視化 + 3D 路徑編輯器 (2026-03-06, A4 + Phase 2)**:
  - **路徑線**: 動畫編輯模式下，per-segment 混合直線/曲線（Catmull-Rom centripetal）路徑視覺化
  - **3D 控制點編輯**: 節點球可點擊選取 keyframe + TransformControls 拖曳平移，debounce 300ms 寫 API
  - **hover 回饋**: 節點球 hover 時放大 + 亮色 + cursor pointer
  - **多模型支援**: 多選模型時各自獨立顯示各自動畫的路徑
  - **場景空間渲染**: 路徑線在場景空間中渲染（不掛在模型 group 下），避免被動畫 transform 影響

- [x] **曲線路徑動畫 (2026-03-06)**:
  - **Catmull-Rom centripetal**: 全域曲線插值，急轉彎不 overshoot
  - **弧長等速**: `getLengths(n)` + `getPointAt` 確保模型沿曲線等速移動
  - **Per-segment pathMode**: 每段 keyframe 可獨立設定直線/曲線（`AnimationKeyframe.pathMode`），覆蓋動畫預設
  - **autoOrient**: 自動沿路徑切線旋轉（Y 軸 yaw），適用車輛路線動畫
  - **時間軸 keyframe 拖曳**: 菱形可拖曳移動時間位置，clamp 前後 keyframe 範圍
  - **動畫選擇記憶**: `selectedAnimPerModel` Map 記住每模型上次選取的動畫
  - **中文輸入修正**: 動畫名稱 IME 輸入不再被打斷（local state buffer + onBlur sync）

- [x] **安全審計與修復 (2026-03-06)**:
  - **C1 路徑穿越修復**: `file.originalname` 改用 `path.basename()` 清除路徑穿越字元（`server/routes/facility.ts`）
  - **C2 XSS 修復**: `RichTextView` 新增 `DOMPurify.sanitize()` 消毒 HTML，防止注入攻擊（`src/components/common/RichTextView.tsx`）
  - **C3 敏感檔案清除**: `git rm --cached` 移除 `dev.db`、`__pycache__`、`server.log`、`cookies.txt`，更新 `.gitignore`
  - **I2 JWT production 保護**: `JWT_SECRET` / `JWT_REFRESH_SECRET` 在 production 環境缺失時直接 throw 啟動錯誤（`server/middleware/auth.ts`）
  - **I4 材質記憶體洩漏修復**: hover/select 高亮改為直接修改 `emissive` 屬性，不再 clone 材質（`FacilityModelItem.tsx`）
  - **I5 曲線快取隔離**: 全域曲線快取改為 `Map<key, {curve, arcLengths}>`，多模型同時播放不再互相覆蓋
  - **I6 fetchScenes 強制刷新**: `fetchScenes(projectId, force?)` 新增 `force` 參數支援跳過 `loadedProjectId` guard
  - **I1-NEW useFrame GC 壓力修復**: `interpolateKeyframes` 改用 14 個 module-level 可重用 THREE 物件（`_posA/_posB/_posResult/_q1/_q2/...`），消除每幀 6~12 次 `new Vector3/Quaternion/Euler` 分配
  - **I2-NEW 檔案刪除路徑穿越修復**: 新增 `server/lib/safePath.ts`，`safeResolvePath()` 驗證解析後路徑在 `uploads/` 目錄內，facility/borehole/water-level 統一使用
  - **I3-NEW 動畫 API 所有權驗證**: `PUT/DELETE /api/facility/animations/:animId` 新增 `verifyAnimationOwnership()` 檢查 animation→model→scene→project 鏈
  - **I4-NEW GET 路由認證**: facility 所有 GET 路由（scenes/models/info/animations）加入 `authenticate` middleware

- [x] **模型資訊面板 UX 改善 (2026-03-06, N8)**:
  - **錯誤回饋**: `modalError` state + 行內紅色錯誤條，3 個 silent catch 改為顯示錯誤訊息
  - **批次上傳錯誤**: 多檔上傳中失敗的檔名匯總顯示
  - **空內容防護**: FacilityInfoPanel `.filter(d => d.content)` 防止 `resolveUrl('')`

- [x] **場景切換過渡動畫 (2026-03-06, N1)**:
  - **5 狀態轉場機**: `idle → flyToModel → fadeOut → loading → fadeIn → idle`
  - **CSS 黑幕**: `FacilityPage` 覆蓋 `<div>`，`opacity` transition 200ms
  - **相機策略**: fly-to 目標模型（300ms）→ 黑幕遮蓋時瞬間設定新場景相機位置 → 淡入
  - **入口整合**: `startSceneTransition(sceneId, modelId)` 統一 sidebar + Lobby 按鈕

- [x] **模型載入 Error Boundary (2026-03-06, N2)**:
  - **React Class Component**: `ModelErrorBoundary` 包裹每個 `FacilityModelItem`
  - **Fallback UI**: 紅色半透明方塊 + 線框 + Html 標籤（模型名稱/錯誤訊息/重試按鈕）
  - **重試**: `setState({ hasError: false })` 重新 mount 子元件，觸發 GLB 重載

- [x] **視角快速切換 (2026-03-06)**:
  - **3 個按鈕**: 俯視 / 預設 / 重置，位於 sidebar 模型清單上方
  - **俯視**: 正上方 `radius * 1.5` 高度俯看，自動計算場景中心與模型分布半徑
  - **預設**: 飛回場景 `cameraPosition`（無設定時 fallback 斜 45° 俯視）
  - **重置**: fit-all 斜 45° 視角（始終根據模型分布計算，不依賴場景設定）
  - **Store**: `viewPreset` state + `setViewPreset` / `clearViewPreset` actions
  - **相機飛行**: 800ms cubic ease-out，與 fly-to 模型共用 `flyRef` 機制

- [x] **自適應燈光系統 (2026-03-06, 2026-03-08 修正)**:
  - **場景範圍驅動**: 光源位置、shadow camera、地面、grid 全部隨場景範圍（`range`）等比縮放
  - **DB Schema**: `FacilityScene` 新增 `sceneBounds Json?`（`{ width, depth, height }` 單位：米）
  - **自動計算 fallback**: `sceneBounds` 為 null 時，自動根據 `modelBboxCenters` 計算所有模型的 bounding box 最大跨距
  - **手動覆蓋**: 場景管理 UI（主場景/子場景編輯表單）新增「場景範圍」三個欄位（寬/深/高），空白=自動
  - **支援 10m~10km**: 光源位置 `[range*0.3, range*0.5, -range*0.2]`，shadow camera `+-range*0.7`
  - **shadow map 固定 4096**: 精度靠縮小 shadow camera 範圍提升，避免 GPU 過載
  - **[2026-03-08] 光源 target 場景中心追蹤**: DirectionalLight target 改為動態追蹤場景中心（`lightRef.current.target.position.set(cx, cy, cz)` + `updateMatrixWorld()`），修復模型遠離原點時陰影方向錯誤
  - **[2026-03-08] 地面/Grid 場景中心追蹤**: gridHelper 與 shadowMaterial 地面 position 改為 `[cx, -0.01, cz]`，跟隨模型分布中心
  - **[2026-03-08] 移除 fog**: 場景範圍跨度 10m~10km 導致 fog near/far 無法通用配置，fog 會在導覽時讓模型完全隱形，已移除

- [x] **子場景自動 fit-all 視角 (2026-03-06)**:
  - **問題**: 子場景通常沒有設定 `cameraPosition`，進入後相機停在原位
  - **修復**: `FacilityCameraController` 新增 auto-fit useEffect，監聽 `modelBboxCenters` 就緒後自動計算 fit-all 視角
  - **transition 模式**: 黑幕遮蓋中瞬間設定相機，一般場景切換 800ms 飛行動畫
  - **防重複**: `autoFitDoneForScene` ref 記錄已 fit 過的場景 ID

- [x] **ghostMode 路徑節點拖曳改善 (2026-03-06)**:
  - **問題**: 動畫模式下點擊路徑節點，模型移動到該處遮擋節點球，難以拖曳
  - **方案**: 編輯路徑節點時，模型半透明（opacity 0.3）+ 禁用 raycasting（`mesh.raycast = () => {}`）
  - **保存/恢復**: `userData._origOpacity` / `_origTransparent` 保存原始材質屬性，退出 ghostMode 時完整恢復

- [x] **上傳後自動刷新 3D 場景 (2026-03-06, N5)**:
  - **主動刷新**: `facilityStore.refreshCurrentScene()` — 繞過 `loadedProjectId` guard 直接 axios 重新抓取場景 + 模型
  - **被動刷新**: `FacilityPage` 監聽 `visibilitychange`，tab 切回來時自動重新載入
  - **觸發點**: FacilityUploadSection 的 5 個位置 — 模型上傳成功 / ModelManager 儲存 / ModelManager 刪除 / Dashboard 刪除 / 地形上傳成功
  - **跨頁同步**: 資料管理頁操作完切回 3D 頁時，場景自動更新無需手動重載

- [x] **GLB 載入進度條 (2026-03-06, N6)**:
  - **全域攔截**: Hook `THREE.DefaultLoadingManager` 的 `onStart/onProgress/onLoad`，追蹤所有 GLB/texture 載入進度
  - **UI**: 頁面頂部 3px 藍色進度條，`transition: width 0.3s ease-out`，載入完成後自動隱藏
  - **非侵入式**: 保留既有 manager callbacks（chain call），不需改動任何 loader 呼叫
  - **位置**: `FacilityPage.tsx`，Canvas 上方 `zIndex: 20`

- [x] **設施模型資訊系統 (2026-03-04)**:
  - **DB Schema 擴充**: `FacilityModel` 新增 `introduction String?`（WYSIWYG HTML 設施介紹）
  - **WYSIWYG 編輯器**: TipTap 2.x 共用元件 `RichTextEditor`（Bold/Italic/Underline/H1-H3/BulletList/OrderedList/TextAlign/Link/Image Upload/Table 工具列）
  - **HTML 渲染元件**: `RichTextView` 唯讀顯示 WYSIWYG 產出的 HTML（含空白 HTML 偵測）
  - **模型資訊 Dashboard 卡片牆**: 選擇場景後以 3 欄 responsive grid 顯示所有模型卡片（縮圖/名稱/摘要/badges）
  - **全螢幕 Modal 編輯**: 三區塊 — 設施介紹（TipTap + 2s debounce 自動儲存）/ 設施圖說（拖拉上傳 JPG/PNG/PDF/CAD/DWG）/ 自訂欄位（TEXT/LINK CRUD）
  - **FacilityInfoPanel 重新設計**: 從右側全高滑出面板改為右下角浮動面板（340px, 60vh），顯示 WYSIWYG HTML / 圖說縮圖 / 自訂欄位
  - **截圖功能**: `showSaveFilePicker` OS 原生存檔對話框 + fallback 自動下載
  - **FacilityModelInfo 語義分類**: IMAGE/DOCUMENT = 設施圖說、TEXT/LINK = 自訂欄位

- [x] **正式帳號管理系統 (2026-03-09)**:
  - **DB Schema**: Prisma `User`（bcrypt 密碼雜湊、角色、狀態、鎖定機制）+ `Session`（refresh token 持久化、併發控制）+ `AuditLog`（11 種事件）
  - **認證 API 改寫**: `server/routes/auth.ts` 從 in-memory Map 遷移至 Prisma，支援帳號鎖定（5 次失敗 → 15 分鐘鎖定）、Session 併發控制（最多 3 個）、自動解鎖
  - **登入支援**: 使用者名稱或電子郵件皆可登入（自動判斷 `@` 符號）
  - **Admin API**: `server/routes/admin.ts` — 使用者 CRUD、重設密碼（產生臨時密碼）、解鎖、停用、Session 管理、稽核日誌查詢（分頁+篩選）
  - **安全 Middleware**: Rate limiting（3 層級：login 10/min、password 5/min、admin 30/min）、CSRF 保護（Double Submit Cookie）
  - **密碼強度**: 至少 8 字元 + 大寫 + 小寫 + 數字，不可與 email 相同
  - **前端頁面**:
    - `ChangePasswordPage`: 密碼強度即時檢查清單、顯示/隱藏密碼切換、首次登入強制變更
    - `AdminUsersPage`: 使用者列表（搜尋/角色/狀態篩選）、新增/編輯/重設密碼/解鎖/停用操作、臨時密碼複製
    - `AdminSettingsPage`: 安全設定資訊卡片 + 稽核日誌檢視器（日期/事件篩選、分頁）
  - **前端架構**: 移除 `AuthContext`，統一使用 `useAuthStore`（Zustand）；新增 `adminStore`、`src/api/admin.ts`、`src/types/auth.ts`
  - **Seed**: `server/prisma/seed.ts` 建立初始 admin 帳號（`admin@llrwd.tw`，首次登入須變更密碼）
  - **已解決安全項**: V3-5（移除硬編碼預設帳號）、I1（認證系統遷移至 DB）

- [x] **第三輪安全審計發現 (2026-03-08, 尚未修復)**:
  - **V3-1 (High)**: `safeResolvePath` 對 DB 中以 `/uploads/...` 開頭的絕對路徑 URL 永遠 return null — `path.resolve(__dirname, '..', '/uploads/...')` 忽略前段路徑
  - **V3-2 (High)**: `terrain.ts` 檔案刪除路由無路徑邊界驗證（未使用 `safeResolvePath`）
  - **V3-3 (High)**: `geology-model.ts` 遞迴刪除無邊界檢查
  - **V3-4 (Medium)**: `lithology.ts` / `project.ts` 的 POST/PUT/DELETE 路由缺少 `authenticate` middleware
  - **V3-5 (Medium)**: `auth.ts` 硬編碼預設帳戶 `admin@example.com` / `admin123` 在所有環境下皆啟用
  - 詳細修復建議見 `NextSteps.md` 第三輪安全發現章節

### 🔄 Pending Features

詳細的後續開發指引、座標系統說明、安全修復清單與技術交接事項，請參閱專案根目錄下的 `NextSteps.md`。

## 📝 API Endpoints

### Authentication

| Method | Endpoint                 | Description                              |
|--------|--------------------------|------------------------------------------|
| POST   | /api/auth/login          | 使用者登入（支援 email 或使用者名稱）     |
| POST   | /api/auth/logout         | 登出並撤銷 refresh token                 |
| POST   | /api/auth/refresh        | 使用 httpOnly cookie 更新 access token   |
| GET    | /api/auth/me             | 取得當前使用者資訊                        |
| PUT    | /api/auth/change-password| 變更密碼（含密碼強度驗證）                |

### Admin (需 admin 角色)

| Method | Endpoint                              | Description                |
|--------|---------------------------------------|----------------------------|
| GET    | /api/admin/users                      | 使用者列表                  |
| POST   | /api/admin/users                      | 建立帳號（產生臨時密碼）     |
| PUT    | /api/admin/users/:id                  | 更新帳號（name/role/status） |
| POST   | /api/admin/users/:id/reset-password   | 重設密碼                    |
| POST   | /api/admin/users/:id/unlock           | 手動解鎖                    |
| DELETE | /api/admin/users/:id                  | 停用帳號（soft delete）      |
| GET    | /api/admin/users/:id/sessions         | 該使用者的 active sessions   |
| DELETE | /api/admin/users/:id/sessions         | 踢掉該使用者全部 session     |
| GET    | /api/admin/audit-logs                 | 稽核日誌（分頁+篩選）        |

### Project (專案管理)

| Method | Endpoint            | Description      |
|--------|---------------------|------------------|
| GET    | /api/project        | 取得所有專案     |
| POST   | /api/project        | 建立專案         |
| GET    | /api/project/:id    | 取得單一專案     |
| PUT    | /api/project/:id    | 更新專案         |
| DELETE | /api/project/:id    | 刪除專案         |

### Borehole API (鑽孔)

| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| GET    | /api/boreholes              | 取得專案所有鑽孔       |
| POST   | /api/boreholes              | 新增鑽孔              |
| DELETE | /api/boreholes/:id          | 刪除鑽孔              |
| POST   | /api/boreholes/batch-import | CSV 批次匯入鑽孔資料   |

### Attitude API (位態)

| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| GET    | /api/attitude               | 取得專案所有位態       |
| POST   | /api/attitude               | 新增位態              |
| PUT    | /api/attitude/:id           | 更新位態              |
| DELETE | /api/attitude/:id           | 刪除位態              |
| POST   | /api/attitude/batch-import  | CSV 批次匯入位態資料   |

### FaultPlane API (斷層面)

| Method | Endpoint                     | Description            |
|--------|------------------------------|------------------------|
| GET    | /api/fault-plane             | 取得專案的所有斷層面   |
| POST   | /api/fault-plane             | 新增斷層面             |
| PUT    | /api/fault-plane/:id         | 更新斷層面             |
| DELETE | /api/fault-plane/:id         | 刪除斷層面             |
| POST   | /api/fault-plane/batch-import| CSV 批次匯入斷層資料   |

### Imagery API (航照圖)

| Method | Endpoint               | Description         |
|--------|------------------------|---------------------|
| GET    | /api/upload/imagery    | 取得所有航照圖      |
| POST   | /api/upload/imagery    | 上傳航照圖          |
| DELETE | /api/upload/imagery/:id| 刪除航照圖          |

### Geophysics API (地球物理探查)

| Method | Endpoint                  | Description            |
|--------|---------------------------|------------------------|
| GET    | /api/upload/geophysics    | 取得所有探查資料       |
| GET    | /api/upload/geophysics/:id| 取得單筆探查資料       |
| POST   | /api/upload/geophysics    | 上傳探查資料           |
| DELETE | /api/upload/geophysics/:id| 刪除探查資料           |

### GeologyModel API (3D 地質模型)

| Method | Endpoint                          | Description           |
|--------|-----------------------------------|-----------------------|
| GET    | /api/geology-model                | 取得所有地質模型      |
| POST   | /api/geology-model/upload         | 上傳 CSV 並產生 GLB   |
| DELETE | /api/geology-model/:id            | 刪除地質模型          |

### Terrain API (DEM 地形)

| Method | Endpoint               | Description            |
|--------|------------------------|------------------------|
| GET    | /api/terrain           | 取得專案地形列表       |
| POST   | /api/terrain           | 上傳 DEM (GeoTIFF, CSV) + 選附衛星影像 |
| DELETE | /api/terrain/:id       | 刪除地形              |

### Water Level API (地下水位面)

| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | /api/water-level       | 取得專案水位面列表       |
| POST   | /api/water-level       | 上傳水位資料並插值處理   |
| DELETE | /api/water-level/:id   | 刪除水位面              |

### Facility API (設施導覽)

| Method | Endpoint                             | Description                |
|--------|--------------------------------------|----------------------------|
| GET    | /api/facility/scenes?projectId=xxx   | 取得專案所有場景           |
| POST   | /api/facility/scenes                 | 建立場景                   |
| PUT    | /api/facility/scenes/:id             | 更新場景                   |
| DELETE | /api/facility/scenes/:id             | 刪除場景 (級聯刪除)        |
| GET    | /api/facility/models?sceneId=xxx     | 取得場景模型列表           |
| POST   | /api/facility/models                 | 上傳模型 (multipart: GLB)  |
| PUT    | /api/facility/models/:id             | 更新模型                   |
| PUT    | /api/facility/models/:id/transform   | 更新位置/旋轉/縮放        |
| DELETE | /api/facility/models/:id             | 刪除模型                   |
| GET    | /api/facility/models/:id/info        | 取得 Rich Content 清單     |
| POST   | /api/facility/models/:id/info        | 新增 Rich Content          |
| PUT    | /api/facility/info/:id               | 更新 Rich Content          |
| DELETE | /api/facility/info/:id               | 刪除 Rich Content          |
| POST   | /api/facility/scenes/:id/plan-image  | 上傳 2D 平面圖             |
| POST   | /api/facility/scenes/:id/terrain     | 上傳地形 CSV + 衛星影像    |
| DELETE | /api/facility/scenes/:id/terrain     | 刪除場景地形               |
| GET    | /api/facility/models/:id/animations  | 取得模型所有動畫           |
| POST   | /api/facility/models/:id/animations  | 新增動畫                   |
| PUT    | /api/facility/animations/:animId     | 更新動畫（含關鍵幀）       |
| DELETE | /api/facility/animations/:animId     | 刪除動畫                   |

### Lithology API (岩性定義)

| Method | Endpoint                | Description            |
|--------|-------------------------|------------------------|
| GET    | /api/lithology          | 取得專案岩性定義       |
| POST   | /api/lithology          | 新增/更新岩性定義      |

### Cleanup API (儲存清理系統)

| Method | Endpoint                | Description              |
|--------|-------------------------|--------------------------|
| GET    | /api/cleanup/scan       | 掃描未關聯的孤兒檔案     |
| POST   | /api/cleanup/execute    | 將孤兒檔案移入 Trash Dir |
| GET    | /api/cleanup/trash      | 取得 Trash Dir 容量狀態  |
| POST   | /api/cleanup/purge      | 徹底清除所有垃圾桶檔案   |
