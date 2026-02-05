# LLRWD DigitalTwin Platform

LLRWD (Low-Level Radioactive Waste Disposal) DigitalTwin Platform 是一個基於網頁的數位孿生平台，旨在視覺化並管理地質資料、鑽孔資訊及地下環境模型。

## 🎯 Project Overview

本專案利用現代 WebGL 技術 (Three.js / React Three Fiber) 實現高效能的 3D 地質資料展示，並結合響應式 UI 提供沉浸式的使用者體驗。

### Core Capabilities

- **3D 地質視覺化**: 支援 800+ 鑽孔點位的高效渲染 (InstancedMesh)。
- **LOD (Level of Detail)**: 自動根據相機距離在圖示、柱狀圖與詳細紋理間切換。
- **互動式查詢**: 點擊鑽孔檢視地層分層 (Layers)、物理性質 (Properties) 與現場照片。
- **資料分層管理 (Updated)**: 支援鑽孔、3D 地質模型、斷層線、地形與航照圖的開關與透明度控制。
- **進階地質工具 (New)**:
  - **剖面切片 (Clipping)**: 可沿 X/Y/Z 軸進行即時剖面分析。
  - **地質構造**: 視覺化斷層線與位態符號 (Strike/Dip)。
  - **導覽模式**: 提供自動化的場景導覽體驗。

## 🛠 Tech Stack

- **Frontend Core**: [React 19](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 7](https://vitejs.dev/)
- **3D Engine**:
  - [Three.js](https://threejs.org/) (Standard 3D Library)
  - [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) (React renderer for Three.js)
  - [Drei](https://github.com/pmndrs/drei) (Helpers for R3F)
  - [3d-tiles-renderer](https://github.com/NASA-AMMOS/3DTilesRendererJS) (For OGC 3D Tiles)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Visualization**: [ECharts](https://echarts.apache.org/) (Charts & Graphs)
- **Styling**: Inline Styles / CSS Modules (Planned substitution with Tailwind if requested)
- **API Communication**: Axios / Fetch (Integration pending)

## 📂 Project Structure

```
src/
├── components/
│   ├── scene/          # 3D 場景元件 (e.g., GeologyCanvas, BoreholeInstances, GeologyTiles)
│   ├── overlay/        # UI 疊加層 (e.g., LayerPanel, ClippingTool, BoreholeDetail)
│   ├── tour/           # 導覽模式元件 (e.g., GuidedTour, TourOverlay)
│   ├── common/         # 共用元件 (e.g., GeologyErrorBoundary, LoadingProgress)
│   └── layout/         # 版面配置 (e.g., MainLayout)
├── stores/             # Zustand 狀態管理 (e.g., boreholeStore, layerStore)
├── types/              # TypeScript 型別定義
├── utils/              # 工具函式 (e.g., coordinates, lod, colors)
├── config/             # 全域設定 (e.g., three.ts)
├── pages/              # 頁面入口 (e.g., GeologyPage)
└── assets/             # 靜態資源
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository_url>

# Install dependencies
npm install
```

### Development

```bash
# Start local development server
npm run dev
```

Access the app at `http://localhost:5173`.

### Build

```bash
# Type check and build for production
npm run build
```

## 🧩 Current Status (Geology Module)

### Done (Modules Phase 1-10 Completed)

- [x] **Core**: 專案基礎建設、TypeScript 設定、3D 場景初始化。
- [x] **Data**: 鑽孔資料 Store (Mock)、TWD97 座標轉換。
- [x] **Visualization**: 800+ 鑽孔 InstancedMesh 渲染、LOD 機制。
- [x] **Interaction**: 點選鑽孔/斷層，檢視詳細資訊面板 (支援自適應 UI)。
- [x] **Layer Control**: 圖層開關 (Boreholes, Structures, Terrain) 與透明度控制。
- [x] **Tools**: 剖面切片工具 (Clipping Plane)、斷層線與位態顯示。
- [x] **Auth**: 完整的身分驗證流程，包含 Token 持久化與背景驗證。
- [x] **Features**: 導覽模式架構 (Guided Tour)、WebGL 錯誤降級 (Fallback 2D)。

### Pending Features (Next Steps)

- [ ] **Integration**: 串接真實後端 API (取代 Mock Data)。
- [ ] **Assets**: 替換 Placeholder (航照圖、3D Tiles 模型)。
- [ ] **Next Module**: 開始工程設計模組 (Engineering Design) 開發。

詳細的後續開發指引與技術交接事項，請參閱專案根目錄下的 `NextSteps.md`。
