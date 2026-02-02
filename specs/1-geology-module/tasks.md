# Implementation Tasks: 地質資料展示模組 (Geology Module)

**Feature Branch**: `1-geology-module`  
**Status**: NOT_STARTED  
**Total Tasks**: 52  
**Estimated Effort**: 3 sprints

---

## Phase 1: Setup & Configuration

- [ ] T001 Initialize feature branch `1-geology-module` from main
- [ ] T002 Install core dependencies: `resium`, `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/carto` in `package.json`
- [ ] T003 Install chart dependencies: `echarts-for-react`, `echarts` in `package.json`
- [ ] T004 Configure Cesium Ion token in `.env` as `VITE_CESIUM_ION_TOKEN`
- [ ] T005 Copy Cesium static assets to `public/cesium/` via vite plugin config in `vite.config.ts`

---

## Phase 2: Foundational Components (Blocking)

### Types & Interfaces

- [ ] T006 [P] Create geology types: Borehole, Layer, Photo interfaces in `src/types/geology.ts`
- [ ] T007 [P] Create viewer types: CameraState, ViewerConfig, LODLevel interfaces in `src/types/viewer.ts`
- [ ] T008 [P] Create API response types: PaginatedResponse, GeoJSONResponse in `src/types/api.ts`

### Zustand Stores

- [ ] T009 [P] Create boreholeStore with actions: fetchBoreholes, selectBorehole, clearSelection in `src/stores/boreholeStore.ts`
- [ ] T010 [P] Create layerStore with actions: toggleLayer, setOpacity, setUndergroundTransparency in `src/stores/layerStore.ts`
- [ ] T011 [P] Create viewerStore with actions: setCameraState, setLODLevel, setClippingPlane in `src/stores/viewerStore.ts`

### API Layer

- [ ] T012 Create API client base with error handling in `src/api/client.ts`
- [ ] T013 Create geology API functions: getBoreholes, getBoreholeDetail, getStructures in `src/api/geology.ts`

### Utility Functions

- [ ] T014 [P] Create coordinate conversion utils: wgs84ToCartesian, cartesianToWgs84 in `src/utils/coordinates.ts`
- [ ] T015 [P] Create LOD calculation utils: calculateLODLevel, shouldUpdateLOD in `src/utils/lod.ts`

---

## Phase 3: User Story [US1] - 鑽孔點位地圖展示

**Goal**: 工程師能在 GIS 地圖上查看所有 800 個鑽孔點位，點擊後顯示基本資訊

### Scene Components

- [ ] T016 [US1] Create base Cesium viewer wrapper with terrain in `src/components/scene/CesiumViewer.tsx`
- [ ] T017 [US1] Create Deck.gl integration layer for Cesium in `src/components/scene/DeckGLOverlay.tsx`
- [ ] T018 [US1] Create borehole icon layer using Deck.gl IconLayer in `src/components/scene/BoreholeLayer.tsx`
- [ ] T019 [US1] Implement borehole picking and highlight on click in `src/components/scene/BoreholeLayer.tsx`

### Overlay Components

- [ ] T020 [P] [US1] Create borehole popup with basic info in `src/components/overlay/BoreholePopup.tsx`
- [ ] T021 [P] [US1] Create loading progress bar component in `src/components/overlay/LoadingProgress.tsx`

### Integration

- [ ] T022 [US1] Integrate BoreholeLayer with boreholeStore selection state
- [ ] T023 [US1] Add loading state during initial borehole fetch

**Independent Test Criteria**: 地圖顯示 800 鑽孔圖示，點擊任一圖示顯示名稱與座標

---

## Phase 4: User Story [US2] - 鑽孔 LOD 切換

**Goal**: 依相機距離自動切換鑽孔顯示方式 (遠→圖示，近→柱狀圖)

- [ ] T024 [US2] Add camera change listener in CesiumViewer to update LOD level in `src/components/scene/CesiumViewer.tsx`
- [ ] T025 [US2] Create borehole column layer for close-up view in `src/components/scene/BoreholeColumnLayer.tsx`
- [ ] T026 [US2] Implement conditional rendering based on LOD level in `src/components/scene/BoreholeLayer.tsx`
- [ ] T027 [US2] Add smooth transition animation between LOD levels

**Independent Test Criteria**: 縮放地圖時，鑽孔自動從圖示變為柱狀圖

---

## Phase 5: User Story [US3] - 鑽孔詳細資訊面板

**Goal**: 使用者能查看完整鑽孔資料 (地層、物性、照片)

- [ ] T028 [P] [US3] Create detail panel container with tabs in `src/components/overlay/BoreholeDetail.tsx`
- [ ] T029 [P] [US3] Create layer table with lithology colors in `src/components/overlay/LayerTable.tsx`
- [ ] T030 [P] [US3] Create property chart using ECharts in `src/components/overlay/PropertyChart.tsx`
- [ ] T031 [P] [US3] Create photo gallery with depth labels in `src/components/overlay/PhotoGallery.tsx`
- [ ] T032 [US3] Integrate detail panel with boreholeStore, fetch layers/photos on selection

**Independent Test Criteria**: 點擊鑽孔後顯示地層表、物性曲線、岩芯照片

---

## Phase 6: User Story [US4] - 圖層控制與透明度

**Goal**: 使用者能控制各圖層的顯示與透明度

- [ ] T033 [P] [US4] Create layer panel with toggle switches in `src/components/overlay/LayerPanel.tsx`
- [ ] T034 [P] [US4] Create underground transparency slider in `src/components/overlay/LayerPanel.tsx`
- [ ] T035 [US4] Connect layer panel to layerStore actions
- [ ] T036 [US4] Apply transparency to all subsurface entities in scene

**Independent Test Criteria**: 開關圖層、拉動透明度滑桿後場景即時更新

---

## Phase 7: User Story [US5] - 3D 地質模型與切片工具

**Goal**: 載入 3D Tiles 地質模型並提供切片功能

- [ ] T037 [US5] Create 3D Tiles loader for geology model in `src/components/scene/GeologyModelLayer.tsx`
- [ ] T038 [US5] Create clipping plane controller UI in `src/components/overlay/ClippingTool.tsx`
- [ ] T039 [US5] Implement clipping plane visualization and dragging in `src/components/scene/ClippingPlane.tsx`
- [ ] T040 [US5] Create explosion view toggle and animation in `src/components/scene/GeologyModelLayer.tsx`

**Independent Test Criteria**: 載入地質模型，拖曳切片面可顯示剖面

---

## Phase 8: User Story [US6] - 地質構造顯示

**Goal**: 顯示斷層線、摺皺軸、位態符號

- [ ] T041 [P] [US6] Create fault line layer using Deck.gl PathLayer in `src/components/scene/StructureLayer.tsx`
- [ ] T042 [P] [US6] Create strike-dip symbol renderer in `src/components/scene/StrikeDipSymbol.tsx`
- [ ] T043 [US6] Add structure layer toggle to LayerPanel

**Independent Test Criteria**: 地圖顯示斷層線與位態符號

---

## Phase 8.5: User Story [US6b] - 航照圖與 DEM 地形 (FR-09, FR-10)

**Goal**: 載入高解析度航照圖與 DEM 地形資料

- [ ] T043b [P] [US6b] Create imagery layer for aerial photo in `src/components/scene/ImageryLayer.tsx`
- [ ] T043c [P] [US6b] Create terrain provider configuration for DEM in `src/components/scene/TerrainProvider.tsx`
- [ ] T043d [US6b] Add imagery/terrain toggle to LayerPanel

**Independent Test Criteria**: 地圖顯示航照圖，地形有高低起伏

---

## Phase 9: User Story [US7] - 民眾導覽模式

**Goal**: 民眾能透過自動導覽了解地質資訊

- [ ] T044 [US7] Create tour config loader from JSON in `src/components/tour/tourLoader.ts`
- [ ] T045 [US7] Create guided tour component with controls in `src/components/tour/GuidedTour.tsx`
- [ ] T046 [US7] Implement camera animation between tour stops
- [ ] T047 [US7] Create tour step overlay with title/description in `src/components/tour/TourOverlay.tsx`
- [ ] T048 [US7] Create sample tour config JSON in `public/tours/geology-tour.json`

**Independent Test Criteria**: 點擊「開始導覽」後相機自動飛行並顯示說明

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T049 Create GeologyFallback2D using shared `FallbackMap2D` in `src/components/scene/GeologyFallback2D.tsx`
- [ ] T050 Integrate `SceneErrorBoundary` wrapper in geology viewer entry point
- [ ] T051 Accessibility review: keyboard navigation for layer panel
- [ ] T052 Performance profiling: confirm 800 boreholes render at >30 FPS

---

## Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ──────────────────────────────────┐
    ↓                                                    │
Phase 3 (US1: 點位展示) ←────────────────────────────────┤
    ↓                                                    │
Phase 4 (US2: LOD) ←── depends on US1                    │
    ↓                                                    │
Phase 5 (US3: 詳細面板) ←── depends on US1               │
    │                                                    │
Phase 6 (US4: 圖層控制) ←────────────────────────────────┤
    │                                                    │
Phase 7 (US5: 地質模型) ←────────────────────────────────┤
    │                                                    │
Phase 8 (US6: 地質構造) ←────────────────────────────────┤
    │                                                    │
Phase 9 (US7: 導覽模式) ←── depends on US1               │
    ↓                                                    │
Phase 10 (Polish) ←──────────────────────────────────────┘
```

## Parallel Execution Opportunities

| Phase | Parallelizable Tasks |
|-------|---------------------|
| Phase 2 | T006-T008 (types), T009-T011 (stores), T014-T015 (utils) |
| Phase 3 | T020-T021 (overlay) |
| Phase 5 | T028-T031 (detail panel tabs) |
| Phase 6 | T033-T034 (layer panel) |
| Phase 8 | T041-T042 (structure layers) |

## MVP Scope

**Recommended MVP**: Phase 1-5 (US1-US3)

- 鑽孔點位顯示 + LOD 切換 + 詳細資訊面板
- 預估工時: 1 sprint
