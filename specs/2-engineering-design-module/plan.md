# Implementation Plan: 工程設計展示模組 (Engineering Design Module)

**Status**: DRAFT  
**Spec**: [specs/2-engineering-design-module/spec.md](./spec.md)

## Technical Context

- **Feature Branch**: `2-engineering-design-module`
- **Core Technologies**:
  - Frontend: React 18 + TypeScript + Vite
  - State: Zustand
  - UI: Tailwind CSS + Shadcn/ui
  - 3D Engine: @react-three/fiber (Three.js) + @react-three/drei
  - Large Models: 3d-tiles-renderer (大型工區 3D Tiles)
  - Charts: ECharts-for-React (施工進度甘特圖)
- **Coordinate System**: TWD97 Local Cartesian (EPSG:3826)
- **Key Dependencies**:
  - Backend API (NestJS)
  - glTF/3D Tiles 工程模型
  - 施工階段 JSON 配置
  - PDF.js 或外部連結開啟設計圖說

## Constitution Check

- [x] Aligns with Principle 1: 程式碼品質與架構 (Code Quality)
  - EngineeringModel, Component, ConstructionPhase interfaces
  - Scene (3D Canvas) 與 Overlay (Timeline, InfoPanel) 分離
  - Zustand: `useModelStore`, `useTimelineStore`
- [x] Aligns with Principle 2: 效能至上 (Performance)
  - 3d-tiles-renderer 漸進式載入大型 3D Tiles
  - React.memo 避免 Timeline 滑動時重渲染 3D 場景
- [x] Aligns with Principle 3: 測試標準 (Testing)
  - Timeline 時間計算邏輯測試
  - 構件過濾邏輯測試
- [x] Aligns with Principle 4: 一致的使用者體驗 (UX Consistency)
  - 載入進度百分比
  - 點擊構件 → InfoPanel 彈出

## Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐│
│  │  Timeline   │   │  InfoPanel  │   │      GuidedTour         ││
│  │  Slider     │   │  (構件資訊) │   │      (Overlay)          ││
│  └──────┬──────┘   └──────┬──────┘   └───────────┬─────────────┘│
│         │                 │                       │              │
│         ▼                 ▼                       ▼              │
│  ┌──────────────────────────────────────────────────────────────┤
│  │                    Zustand Stores                             │
│  │       useModelStore | useTimelineStore | useViewerStore      │
│  └──────────────────────────────────────────────────────────────┤
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┤
│  │                @react-three/fiber Canvas                      │
│  │  ┌────────────────────────────────────────────────────────┐  │
│  │  │  3d-tiles-renderer + glTF Loader                          │  │
│  │  │  - 工程模型 (壩體/廠房/隧道)                             │  │
│  │  │  - Raycaster Picking + 高亮                              │  │
│  │  │  - 時序顯示/隱藏控制                                    │  │
│  │  └────────────────────────────────────────────────────────┘  │
│  └──────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (NestJS)                        │
│  GET /api/models              → 工程模型列表                      │
│  GET /api/models/:id          → 模型詳細 + 構件 + 階段            │
│  GET /api/models/:id/phases   → 施工階段 JSON                    │
│  GET /api/documents/:id       → 設計圖說 URL                     │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 0: Research & Discovery

- [x] Resolve: glTF 構件 Picking 機制
  - **Decision**: 使用 R3F raycaster + mesh.name 辨識構件
- [x] Resolve: Timeline 與 3D 模型顯示同步
  - **Decision**: 透過 Zustand store 控制 mesh.visible 屬性
- [x] Resolve: 地形吳合方式
  - **Decision**: 使用 raycasting 對地形 mesh 求取高度，設定模型 Y 座標

## Phase 1: Core Implementation

**Goal**: Functional MVP — 顯示工程模型與構件資訊

### 1.1 Data Model & Types

- [ ] 建立 `src/types/engineering.ts` 定義 EngineeringModel, Component, ConstructionPhase interfaces

### 1.2 Zustand Stores

- [ ] 建立 `src/stores/modelStore.ts` — 模型資料與選取狀態
- [ ] 建立 `src/stores/timelineStore.ts` — 當前時間與播放狀態

### 1.3 API Layer

- [ ] 建立 `src/api/engineering.ts` — 模型、構件、階段 API 呼叫

### 1.4 3D Scene Components

- [ ] 建立 `src/components/scene/EngineeringCanvas.tsx` — R3F Canvas 封裝
- [ ] 建立 `src/components/scene/ModelLoader.tsx` — 3d-tiles-renderer/glTF 載入
- [ ] 實作構件 Picking 與高亮 (raycaster)
- [ ] 實作地形吳合 (terrain raycasting)

### 1.5 UI Overlay Components

- [ ] 建立 `src/components/overlay/TimelineSlider.tsx` — 時間軸滑桿
- [ ] 建立 `src/components/overlay/ComponentInfo.tsx` — 構件資訊面板
- [ ] 建立 `src/components/overlay/DocumentViewer.tsx` — PDF/圖片檢視

## Phase 2: Integration & Polish

**Goal**: Production Ready

### 2.1 4D Simulation

- [ ] 實作時間軸播放 (Play/Pause/Step)
- [ ] 實作構件顯示/隱藏動態切換
- [ ] 實作施工狀態顏色標示 (規劃中/進行中/完成)

### 2.2 Guided Tour

- [ ] 建立 `src/components/tour/EngineeringTour.tsx`
- [ ] 實作 JSON 配置載入

### 2.3 Error Handling & Fallback

- [ ] 實作 3D 載入失敗提示與重試
- [ ] 實作 2D 平面圖降級顯示

### 2.4 Loading States

- [ ] 實作模型載入進度百分比

## Verification Plan

### Unit Tests

- [ ] `engineering.ts` types 驗證
- [ ] `timelineUtils.ts` — 日期/階段計算
- [ ] `phaseFilter.ts` — 構件過濾邏輯

### Integration Tests

- [ ] 點擊構件 → InfoPanel 顯示
- [ ] Timeline 滑動 → 構件顯示更新
- [ ] 開啟圖說 → 新視窗/Modal 顯示

### Manual Test Scenarios

- [ ] 載入 50MB glTF，確認 <10 秒
- [ ] 播放完整施工動畫無卡頓
- [ ] 測試降級顯示

## Generated Artifacts

- `data-model.md` — 資料模型設計
- `contracts/engineering-api.yaml` — OpenAPI 規格
