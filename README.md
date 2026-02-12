# LLRWD DigitalTwin Platform

LLRWD (Low-Level Radioactive Waste Disposal) DigitalTwin Platform 是一個基於網頁的數位孿生平台，旨在視覺化並管理地質資料、鑽孔資訊及地下環境模型。

## 🎯 Project Overview

本專案利用現代 WebGL 技術 (Three.js / React Three Fiber) 實現高效能的 3D 地質資料展示，並結合響應式 UI 提供沉浸式的使用者體驗。

### Core Capabilities

- **3D 地質視覺化**: 支援 800+ 鑽孔點位的高效渲染 (InstancedMesh)。
- **3D 地質模型**: Voxel CSV 轉換為 Isosurface Mesh (GLB)，使用 Marching Cubes 演算法。
- **LOD (Level of Detail)**: 自動根據相機距離在圖示、柱狀圖與詳細紋理間切換。
- **互動式查詢**: 點擊鑽孔檢視地層分層 (Layers)、物理性質 (N 值、RQD) 與現場照片。
- **資料分層管理**: 支援鑽孔、3D 地質模型、斷層線、地形、航照圖及地球物理探查的開關與透明度控制。
- **地形視覺化 (Terrain)**:
  - **動態著色**: 支援多種 Color Ramp (Rainbow, Viridis等) 與高度反轉 (Reverse)。
  - **互動圖例**: 可自訂 Z-axis 範圍 (Min/Max) 或自動偵測。
  - **設定持久化**: 自動儲存使用者的圖例與圖層設定。
- **進階地質工具**:
  - **剖面切片 (Clipping)**: 可沿 X/Y/Z 軸進行即時剖面分析。
  - **地質構造**: 視覺化斷層線與位態符號 (Strike/Dip)。
  - **導覽模式**: 提供自動化的場景導覽體驗。
- **資料管理**:
  - **地質模型上傳**: CSV Voxel 檔案自動轉換為 GLB Isosurface Mesh。
  - **航照圖上傳**: 支援 GeoTIFF 自動解析座標或手動輸入 TWD97 座標。
  - **地球物理探查資料**: 上傳 ERT/GPR/震測剖面圖，以垂直平面形式在 3D 場景中顯示。
- **UI/UX**:
  - **Sidebar 分頁設計**: 圖層頁 (所有使用者) + 設定頁 (admin/engineer)。

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

## 📂 Project Structure

```bash
/
├── src/                        # Frontend Source
│   ├── components/
│   │   ├── scene/              # 3D 場景元件 (GeologyCanvas, BoreholeInstances, GeophysicsPlane, etc.)
│   │   ├── overlay/            # UI 疊加層 (LayerPanel, ClippingTool, BoreholeDetail)
│   │   ├── tour/               # 導覽模式元件 (GuidedTour, TourOverlay)
│   │   ├── controls/           # 控制元件 (ImagerySelector, MultiSectionPanel)
│   │   └── layout/             # 版面配置 (MainLayout, GeologySidebar)
│   ├── stores/                 # Zustand 狀態管理
│   │   ├── boreholeStore.ts    # 鑽孔資料
│   │   ├── layerStore.ts       # 圖層控制
│   │   ├── uploadStore.ts      # 航照圖 & 地球物理探查資料
│   │   └── viewerStore.ts      # 3D 檢視器狀態
│   ├── pages/                  # 頁面入口 (DataManagementPage, GeologyPage, etc.)
│   ├── types/                  # TypeScript 型別定義
│   ├── utils/                  # 工具函式 (coordinates, lod, colors)
│   └── config/                 # 全域設定 (three.ts)
│
├── server/                     # Backend Source
│   ├── routes/
│   │   ├── auth.ts             # 身分驗證 API
│   │   └── upload.ts           # 航照圖 & 地球物理探查上傳 API
│   ├── prisma/
│   │   └── schema.prisma       # Prisma Schema (Imagery, Geophysics models)
│   ├── uploads/                # 上傳檔案存放目錄
│   │   ├── imagery/            # 航照圖
│   │   └── geophysics/         # 地球物理探查圖
│   ├── .env                    # 環境變數 (DATABASE_URL)
│   └── index.ts                # Express 伺服器入口
│
└── public/                     # 靜態資源
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Docker (for PostgreSQL database)

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

### 🔄 Pending Features

詳細的後續開發指引與技術交接事項，請參閱專案根目錄下的 `NextSteps.md`。

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
| POST   | /api/terrain           |上傳 DEM (GeoTIFF, CSV)|
| DELETE | /api/terrain/:id       | 刪除地形              |

### Lithology API (岩性定義)

| Method | Endpoint                | Description            |
|--------|-------------------------|------------------------|
| GET    | /api/lithology          | 取得專案岩性定義       |
| POST   | /api/lithology          | 新增/更新岩性定義      |
