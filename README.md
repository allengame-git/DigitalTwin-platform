# LLRWD DigitalTwin Platform

LLRWD (Low-Level Radioactive Waste Disposal) DigitalTwin Platform 是一個基於網頁的數位孿生平台，旨在視覺化並管理地質資料、鑽孔資訊及地下環境模型。

## 🎯 Project Overview

本專案利用現代 WebGL 技術 (Three.js / React Three Fiber) 實現高效能的 3D 地質資料展示，並結合響應式 UI 提供沉浸式的使用者體驗。

### Core Capabilities

- **3D 地質視覺化**: 支援 800+ 鑽孔點位的高效渲染 (InstancedMesh)。
- **3D 地質模型**: Voxel CSV 轉換為 Isosurface Mesh (GLB)，使用 Marching Cubes 演算法。
- **LOD (Level of Detail)**: 自動根據相機距離在圖示、柱狀圖與詳細紋理間切換。
- **互動式查詢**: 點擊鑽孔檢視地層分層 (Layers)、物理性質 (Properties) 與現場照片。
- **資料分層管理**: 支援鑽孔、3D 地質模型、斷層線、地形、航照圖及地球物理探查的開關與透明度控制。
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

```
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

```
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

## 🧩 Current Status

### ✅ Completed Features

- [x] **Core**: 專案基礎建設、TypeScript 設定、3D 場景初始化
- [x] **Data**: 鑽孔資料 Store (Mock)、TWD97 座標轉換
- [x] **Visualization**: 800+ 鑽孔 InstancedMesh 渲染、LOD 機制
- [x] **Interaction**: 點選鑽孔/斷層，檢視詳細資訊面板
- [x] **Layer Control**: 圖層開關與透明度控制 (Boreholes, Structures, Terrain, Imagery, Geophysics)
- [x] **Tools**: 剖面切片工具 (Clipping Plane)、斷層線與位態顯示
- [x] **Auth**: 完整的身分驗證流程 (JWT Token 持久化與背景驗證)
- [x] **Features**: 導覽模式架構 (Guided Tour)、WebGL 錯誤降級 (Fallback 2D)
- [x] **Data Management**:
  - 航照圖上傳、檢視、刪除
  - 地球物理探查資料上傳 (含 TWD97 座標與探查方法)
  - 3D 場景中以垂直平面顯示探查剖面圖
  - **3D 地質模型上傳 (New)**: CSV Voxel 自動轉換為 GLB Isosurface Mesh
- [x] **Multi-Project Architecture (New)**:
  - 支援建立、**編輯、刪除**多個獨立專案
  - 專案 Dashboard 頁面 (`/project/:code`)
  - Project-scoped 路由設計
  - 支援自定義 TWD97 座標原點 (每專案)
  - **Project Safeguards**: 刪除專案確認機制 (Admin Only)
- [x] **UI/UX**:
  - Sidebar 分頁設計 (圖層頁 + 設定頁)
  - **設定頁優化**: 整合「3D 地質模型版本」選擇器至控制面板
  - 設定頁權限控制 (admin/engineer 專屬)

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

### Imagery (航照圖)

| Method | Endpoint               | Description         |
|--------|------------------------|---------------------|
| GET    | /api/upload/imagery    | 取得所有航照圖      |
| POST   | /api/upload/imagery    | 上傳航照圖          |
| DELETE | /api/upload/imagery/:id| 刪除航照圖          |

### Geophysics (地球物理探查)

| Method | Endpoint                  | Description            |
|--------|---------------------------|------------------------|
| GET    | /api/upload/geophysics    | 取得所有探查資料       |
| GET    | /api/upload/geophysics/:id| 取得單筆探查資料       |
| POST   | /api/upload/geophysics    | 上傳探查資料           |
| DELETE | /api/upload/geophysics/:id| 刪除探查資料           |
