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

#### 設施導覽模組 (Facility Navigation Module) — 2026-03-03

獨立的 3D 設施導覽系統，含瀏覽頁面與獨立資料管理頁面。

**座標系統**：水平面 = X-Z 平面（Y 軸朝上）。Three.js X = 東、Y = 高程、Z = 北（對應 TWD97-Y）。UI 軸標籤已依此對應工程語義。

- **多層巢狀場景**: 場區 → 建築 → 樓層 → 房間等多層級，fly-to 動畫切換。
- **GLB/glTF 模型上傳**: 拖拉上傳，單檔最大 100MB。
- **模型互動**: Hover 高亮（emissive）、點擊選取、Tooltip 名稱顯示。
- **Rich Content 資訊面板**: 點擊模型彈出右側 InfoPanel，支援 TEXT / IMAGE（Lightbox）/ DOCUMENT（下載）/ LINK。
- **編輯模式**: 側邊欄底部切換，點擊模型顯示 TransformInputPanel（移動/旋轉/縮放精確輸入），debounce 存後端，與「模型管理」Tab 資料天然同步。
- **側邊欄**: 白色亮色主題，含返回儀表板連結、可收合切換、BreadcrumbNav、SceneTree、模型清單、2D PlanView。
- **2D 平面圖**: 手動上傳，模型位置映射為可點擊標記。
- **地形支援**: CSV → Python 插值 → heightmap + hillshade，可疊加衛星影像紋理。
- **獨立資料管理頁面** (`/project/:code/facility-data`)：5 個 Tab
  - 場景管理：CRUD 場景樹、設定相機預設位置
  - 模型上傳：GLB 上傳、SceneSelect 指定場景
  - 模型資訊：Rich Content（TEXT/IMAGE/DOCUMENT/LINK）編輯
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
- **Visualization**: [ECharts](https://echarts.apache.org/) (Charts & Graphs)

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
│   │   ├── facility/           # 設施導覽 3D 場景 (14 元件)
│   │   │   ├── FacilityCanvas.tsx         # R3F Canvas 容器
│   │   │   ├── FacilityEnvironment.tsx    # 燈光、天空、網格
│   │   │   ├── FacilityCameraController.tsx # Fly-to 動畫
│   │   │   ├── FacilityModels.tsx         # 模型群管理
│   │   │   ├── FacilityModelItem.tsx      # 單一 GLB (hover/click/transform)
│   │   │   ├── FacilityTerrain.tsx        # 地形 heightmap + 紋理
│   │   │   ├── FacilitySidebar.tsx        # 側邊欄整合
│   │   │   ├── BreadcrumbNav.tsx          # 麵包屑導覽
│   │   │   ├── SceneTree.tsx              # 子場景樹
│   │   │   ├── PlanView.tsx               # 2D 平面圖 + 模型標記
│   │   │   ├── FacilityInfoPanel.tsx      # Rich Content 面板
│   │   │   ├── FacilityToolbar.tsx        # 工具列（已從 FacilityPage 移除，元件保留）
│   │   │   ├── TransformInputPanel.tsx    # 精確數值輸入（座標軸已對應工程語義）
│   │   │   └── CoordShiftPanel.tsx        # 場景座標偏移（已從 FacilityPage 移除，元件保留）
│   │   ├── overlay/            # UI 疊加層 (LayerPanel, ClippingTool, BoreholeDetail)
│   │   ├── data/               # 資料上傳元件
│   │   │   ├── FacilityUploadSection.tsx  # 設施上傳管理 (5 Tab，含模型管理)
│   │   │   ├── TerrainUploadSection.tsx   # DEM + 衛星影像上傳
│   │   │   ├── WaterLevelUploadSection.tsx # 地下水位面上傳
│   │   │   └── ...                        # 其他上傳元件
│   │   ├── tour/               # 導覽模式元件
│   │   ├── controls/           # 控制元件
│   │   └── layout/             # 版面配置 (MainLayout, GeologySidebar)
│   ├── stores/                 # Zustand 狀態管理 (~16 stores)
│   │   ├── facilityStore.ts    # 設施導覽 (場景/模型/編輯)
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
│   │   ├── auth.ts             # 身分驗證 API
│   │   ├── terrain.ts          # DEM 地形 API
│   │   ├── water-level.ts      # 地下水位面 API
│   │   ├── geology-model.ts    # 地質模型 API
│   │   └── ...                 # 其他路由 (borehole, attitude, fault-plane, etc.)
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
| position     | Json    | 位置 {x, y, z}                     |
| rotation     | Json    | 旋轉 {x, y, z} (euler degrees)    |
| scale        | Json    | 縮放 {x, y, z}                     |
| childSceneId | FK?     | 可進入的子場景                     |
| sortOrder    | Int     | 排序                               |

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
- [x] **Auth**: 完整的身分驗證流程 (JWT Token 持久化與背景驗證)
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
  - **Rich Content**: InfoPanel — TEXT/IMAGE（Lightbox）/DOCUMENT（下載）/LINK
  - **上傳管理**: FacilityUploadSection（5 Tab：場景管理/模型上傳/資訊編輯/地形上傳/模型管理）
  - **模型管理 Tab**: 可刪除、改名、修改 position/rotation/scale、換子場景；與 3D 視窗共享 API，資料天然同步
  - **儀表板**: ProjectDashboardPage 拆為「地質資料管理」與「設施資料管理」兩個獨立卡片
  - **TypeScript**: 全模組 0 型別錯誤

### 🔄 Pending Features

詳細的後續開發指引、座標系統說明與技術交接事項，請參閱專案根目錄下的 `NextSteps.md`。

**設施模組優先待辦**：
1. 場景切換淡出淡入動畫（N1）
2. GLB 載入 Error Boundary（N2）
3. 自動俯視截圖功能（N3）
4. PlanView 標記位置修正（考慮 coordShift）（N4）

## 📝 API Endpoints

### Authentication

| Method | Endpoint            | Description      |
|--------|---------------------|------------------|
| POST   | /api/auth/login     | 使用者登入       |
| POST   | /api/auth/refresh   | Token 更新       |

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
