# Implementation Plan: 模擬分析展示模組 (Simulation Module)

**Status**: DRAFT  
**Spec**: [specs/3-simulation-module/spec.md](./spec.md)

## Technical Context

- **Feature Branch**: `3-simulation-module`
- **Core Technologies**:
  - Frontend: React 18 + TypeScript + Vite
  - State: Zustand
  - UI: Tailwind CSS + Shadcn/ui
  - 3D: @react-three/fiber (體積渲染), Resium (地圖底圖)
  - Charts: ECharts-for-React (時間歷線、統計圖)
  - Volume Rendering: three.js VolumeRenderShader1 或 vtk.js
- **Key Dependencies**:
  - Backend API (Node.js + Express/NestJS)
  - 預處理的模擬資料 (抽稀後的 3D Texture / JSON)
  - 情境配置 JSON

## Constitution Check

- [x] Aligns with Principle 1: 程式碼品質與架構 (Code Quality)
  - SimulationScenario, TimeStep, ObservationPoint interfaces
  - Scene (Volume/Heatmap) 與 Overlay (Dashboard, ScenarioSelector) 分離
  - Zustand: `useScenarioStore`, `useTimeStepStore`, `useDashboardStore`
- [x] Aligns with Principle 2: 效能至上 (Performance)
  - 體積渲染使用 GPU Shader
  - 分級載入 (LOD) 模擬資料
  - React.memo 優化圖表重繪
- [x] Aligns with Principle 3: 測試標準 (Testing)
  - 情境切換邏輯測試
  - 時間步插值計算測試
- [x] Aligns with Principle 4: 一致的使用者體驗 (UX Consistency)
  - 情境切換載入指示器
  - 3D ↔ ECharts 雙向連動 <500ms

## Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐│
│  │ Scenario    │   │ Dashboard   │   │      GuidedTour         ││
│  │ Selector    │   │ (表格+圖表) │   │      (Overlay)          ││
│  └──────┬──────┘   └──────┬──────┘   └───────────┬─────────────┘│
│         │                 │                       │              │
│         ▼                 ▼                       ▼              │
│  ┌──────────────────────────────────────────────────────────────┤
│  │                    Zustand Stores                             │
│  │  useScenarioStore | useTimeStepStore | useDashboardStore     │
│  └──────────────────────────────────────────────────────────────┤
│         │                 ▲                                      │
│         │                 │ 雙向連動                              │
│         ▼                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┤
│  │   3D Scene                        Dashboard Panel            │
│  │  ┌────────────────────────┐   ┌────────────────────────────┐ │
│  │  │ R3F Canvas             │   │  ECharts 時間歷線           │ │
│  │  │ - Volume Rendering     │   │  Ag-Grid 參數表格          │ │
│  │  │ - Isosurface           │   │  統計圖表                   │ │
│  │  │ - Heatmap (Cesium)     │   │                            │ │
│  │  └────────────────────────┘   └────────────────────────────┘ │
│  └──────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (REST)                          │
│  GET /api/scenarios           → 情境列表 (20 種)                 │
│  GET /api/scenarios/:id       → 情境詳細 + 參數 + 時間步         │
│  GET /api/scenarios/:id/volume/:step → 該時間步的體積資料       │
│  GET /api/observations/:id/timeseries → 觀測點時間歷線         │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 0: Research & Discovery

- [x] Resolve: 體積渲染技術選型
  - **Decision**: 使用 three.js VolumeRenderShader1，資料格式為 3D Texture (抽稀後)
  - **Alternatives**: vtk.js (功能強但 bundle size 大), Deck.gl PointCloudLayer (適合點雲但非體積)
- [x] Resolve: 等值面提取方式
  - **Decision**: 使用 Marching Cubes (three.js MarchingCubes 或預計算後傳輸網格)
- [x] Resolve: 3D ↔ 2D 雙向連動架構
  - **Decision**: 透過 Zustand store 中介，點擊 3D → 更新 `selectedPoint` → ECharts 訂閱更新

## Phase 1: Core Implementation

**Goal**: Functional MVP — 顯示單一情境的體積渲染與基本儀表板

### 1.1 Data Model & Types

- [ ] 建立 `src/types/simulation.ts` 定義 SimulationScenario, TimeStep, ObservationPoint interfaces

### 1.2 Zustand Stores

- [ ] 建立 `src/stores/scenarioStore.ts` — 情境資料與選取狀態
- [ ] 建立 `src/stores/timeStepStore.ts` — 當前時間步與播放控制
- [ ] 建立 `src/stores/dashboardStore.ts` — 選取的觀測點與圖表資料

### 1.3 API Layer

- [ ] 建立 `src/api/simulation.ts` — 情境、時間步、觀測點 API 呼叫

### 1.4 3D Scene Components

- [ ] 建立 `src/components/scene/VolumeRenderer.tsx` — 體積渲染 R3F 封裝
- [ ] 建立 `src/components/scene/IsosurfaceRenderer.tsx` — 等值面顯示
- [ ] 建立 `src/components/scene/HeatmapLayer.tsx` — Cesium/Deck.gl 熱圖

### 1.5 UI Components

- [ ] 建立 `src/components/dashboard/ScenarioSelector.tsx` — 情境下拉選單
- [ ] 建立 `src/components/dashboard/ParameterTable.tsx` — Ag-Grid 參數表
- [ ] 建立 `src/components/dashboard/TimeSeriesChart.tsx` — ECharts 時間歷線

## Phase 2: Integration & Polish

**Goal**: Production Ready

### 2.1 Advanced Visualization

- [ ] 實作等值面閾值調整 UI
- [ ] 實作流線圖 (Streamlines)
- [ ] 實作色彩圖例 (Color Legend)

### 2.2 Time Animation

- [ ] 實作時間序列播放 (Play/Pause/Step)
- [ ] 實作時間步預載入 (Prefetch)

### 2.3 Bi-directional Linking

- [ ] 實作點擊 3D → 更新 ECharts
- [ ] 實作點擊 ECharts 數據點 → 3D 高亮位置

### 2.4 Guided Tour

- [ ] 建立 `src/components/tour/SimulationTour.tsx`
- [ ] 實作比較動畫 (有/無整治)

### 2.5 Error Handling & Fallback

- [ ] 實作體積渲染失敗 → 2D 熱圖降級
- [ ] 實作重試機制

## Verification Plan

### Unit Tests

- [ ] `simulation.ts` types 驗證
- [ ] `volumeDataLoader.ts` — 3D Texture 解析
- [ ] `colorScale.ts` — 數值到顏色映射

### Integration Tests

- [ ] 情境切換 → 場景與儀表板同步更新
- [ ] 點擊 3D → ECharts 更新
- [ ] 時間播放 → 場景更新

### Manual Test Scenarios

- [ ] 體積渲染維持 30 FPS
- [ ] 情境切換 <2 秒
- [ ] 20 種情境切換無異常

## Generated Artifacts

- `data-model.md` — 資料模型設計
- `contracts/simulation-api.yaml` — OpenAPI 規格
