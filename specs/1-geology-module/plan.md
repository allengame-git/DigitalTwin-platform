# Implementation Plan: 地質資料展示模組 (Geology Module)

**Status**: DRAFT  
**Spec**: [specs/1-geology-module/spec.md](./spec.md)

## Technical Context

- **Feature Branch**: `1-geology-module`
- **Core Technologies**:
  - Frontend: React 18 + TypeScript + Vite
  - State: Zustand
  - UI: Tailwind CSS + Shadcn/ui
  - 3D Engine: @react-three/fiber (Three.js) + @react-three/drei
  - Large Models: 3d-tiles-renderer (NASA/Google)
  - Massive Data: InstancedMesh (GPU Instancing, 800+ 鑽孔)
  - Charts: ECharts-for-React
- **Coordinate System**: TWD97 Local Cartesian (EPSG:3826)
- **Key Dependencies**:
  - Backend API (NestJS)
  - PostgreSQL + PostGIS (空間查詢)
  - 預處理的 glTF/3D Tiles 地質模型

## Constitution Check

- [x] Aligns with Principle 1: 程式碼品質與架構 (Code Quality)
  - 所有地質實體 (Borehole, Layer) 定義 TypeScript Interface
  - 3D Scene 與 UI Overlay 分離架構
  - Zustand stores: `useBoreholeStore`, `useLayerStore`, `useViewerStore`
- [x] Aligns with Principle 2: 效能至上 (Performance)
  - 統一使用 @react-three/fiber (Three.js)
  - InstancedMesh 處理 800+ 鑽孔 (單一 Draw Call)
  - 3d-tiles-renderer 漸進式載入大型地質模型
  - React.memo 優化重渲染
- [x] Aligns with Principle 3: 測試標準 (Testing)
  - TWD97 座標轉換單元測試
  - LOD 切換邏輯測試
- [x] Aligns with Principle 4: 一致的使用者體驗 (UX Consistency)
  - 載入進度條 (Suspense + 自訂進度)
  - 統一互動標準 (左鍵選取、右鍵旋轉)
  - Tooltip 於所有互動元素

## Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐│
│  │ LayerPanel  │   │ DetailPanel │   │      GuidedTour         ││
│  │ (HTML Overlay)│   │ (HTML Overlay)│   │      (Overlay)          ││
│  └──────┬──────┘   └──────┬──────┘   └───────────┬─────────────┘│
│         │                 │                       │              │
│         ▼                 ▼                       ▼              │
│  ┌──────────────────────────────────────────────────────────────┤
│  │                    Zustand Stores                             │
│  │  useBoreholeStore | useLayerStore | useViewerStore           │
│  └──────────────────────────────────────────────────────────────┤
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┤
│  │             @react-three/fiber Canvas                        │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │
│  │  │ 3d-tiles- │  │InstancedMesh│  │  @react-three/drei     │  │
│  │  │ renderer  │  │  800孔位    │  │  MapControls/Html/Env │  │
│  │  │ 地質模型  │  │  LOD Icons │  │                        │  │
│  │  └────────────┘  └────────────┘  └────────────────────────┘  │
│  └──────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (NestJS)                        │
│  GET /api/boreholes       → 鑽孔列表 (分頁/bbox)                  │
│  GET /api/boreholes/:id   → 鑽孔詳細 + 地層 + 照片                │
│  GET /api/geology-model   → 3D 地質模型 URL                      │
│  GET /api/structures      → 地質構造 GeoJSON                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                PostgreSQL + PostGIS                              │
│  boreholes | layers | structures | photos                        │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 0: Research & Discovery

- [x] Resolve: @react-three/fiber + InstancedMesh 800 孔位效能驗證
  - **Decision**: 使用 InstancedMesh + GPU Instancing，單一 Draw Call 渲染 800+ 圓柱體
- [x] Resolve: LOD 切換觸發機制
  - **Decision**: 監聽 R3F useFrame 中的 camera distance，動態更新 InstancedMesh 屬性
- [x] Resolve: 3D Tiles 在 R3F 中載入方式
  - **Decision**: 使用 3d-tiles-renderer 的 TilesRenderer 整合至 R3F scene

## Phase 1: Core Implementation

**Goal**: Functional MVP — 顯示鑽孔點位與基本互動

### 1.1 Data Model & Types

- [ ] 建立 `src/types/geology.ts` 定義 Borehole, Layer, GeologicalStructure interfaces
- [ ] 建立 `src/types/viewer.ts` 定義 CameraState, ViewerConfig interfaces

### 1.2 Zustand Stores

- [ ] 建立 `src/stores/boreholeStore.ts` — 鑽孔資料與選取狀態
- [ ] 建立 `src/stores/layerStore.ts` — 圖層可見性與透明度
- [ ] 建立 `src/stores/viewerStore.ts` — 相機狀態與 LOD 等級

### 1.3 API Layer

- [ ] 建立 `src/api/geology.ts` — 鑽孔、地層、構造 API 呼叫
- [ ] 實作分頁與 bbox 過濾

### 1.4 3D Scene Components

- [ ] 建立 `src/components/scene/GeologyCanvas.tsx` — R3F Canvas 封裝
- [ ] 建立 `src/components/scene/BoreholeInstances.tsx` — InstancedMesh 800 孔位
- [ ] 建立 `src/components/scene/GeologyTiles.tsx` — 3d-tiles-renderer 地質模型
- [ ] 實作 LOD 切換邏輯 (基於 camera distance)

### 1.5 UI Overlay Components

- [ ] 建立 `src/components/overlay/LayerPanel.tsx` — 圖層控制
- [ ] 建立 `src/components/overlay/BoreholeDetail.tsx` — 鑽孔詳細面板
- [ ] 建立 `src/components/overlay/PropertyChart.tsx` — ECharts 物性曲線

## Phase 2: Integration & Polish

**Goal**: Production Ready — 完整功能與錯誤處理

### 2.1 Advanced Features

- [ ] 實作切片工具 (Clipping Plane)
- [ ] 實作透明度控制
- [ ] 實作爆炸圖模式
- [ ] 實作地質構造顯示 (斷層線、位態符號)

### 2.2 Guided Tour

- [ ] 建立 `src/components/tour/GuidedTour.tsx`
- [ ] 實作 JSON 配置載入 (`/public/tours/geology-tour.json`)
- [ ] 實作相機動畫與說明文字

### 2.3 Error Handling & Fallback

- [ ] 實作 3D 載入失敗的友善錯誤提示
- [ ] 實作 2D 地圖降級顯示
- [ ] 實作重試機制

### 2.4 Loading States

- [ ] 實作全局載入進度條
- [ ] 實作鑽孔詳情 Skeleton

## Verification Plan

### Unit Tests

- [ ] `geology.ts` types — 驗證 interface 完整性
- [ ] `coordinateUtils.ts` — TWD97 座標處理正確性
- [ ] `lodCalculator.ts` — LOD 等級判斷邏輯

### Integration Tests

- [ ] 鑽孔選取 → 詳細面板顯示流程
- [ ] LOD 切換 → 圖示/柱狀圖切換
- [ ] 圖層控制 → 3D 場景同步更新

### Manual Test Scenarios

- [ ] 載入 800 孔位，確認 >30 FPS
- [ ] 測試網路斷線後的降級顯示
- [ ] 測試導覽模式完整播放

## Generated Artifacts

- `data-model.md` — 資料模型設計
- `contracts/geology-api.yaml` — OpenAPI 規格
- `quickstart.md` — 開發環境設置
