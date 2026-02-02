# Implementation Tasks: 模擬分析展示模組 (Simulation Module)

**Feature Branch**: `3-simulation-module`  
**Status**: NOT_STARTED  
**Total Tasks**: 48  
**Estimated Effort**: 3 sprints

---

## Phase 1: Setup & Configuration

- [ ] T001 Create feature branch `3-simulation-module` from main
- [ ] T002 Install Three.js volume rendering deps: `three`, `@react-three/fiber`, `@react-three/drei` in `package.json`
- [ ] T003 Install data grid: `ag-grid-react`, `ag-grid-community` in `package.json`
- [ ] T004 Verify ECharts deps installed (from geology module)

---

## Phase 2: Foundational Components (Blocking)

### Types & Interfaces

- [ ] T005 [P] Create simulation types: SimulationScenario, TimeStep, Parameter in `src/types/simulation.ts`
- [ ] T006 [P] Create observation types: ObservationPoint, TimeSeries in `src/types/observation.ts`
- [ ] T007 [P] Create volume types: VolumeData, ColorMap in `src/types/volume.ts`

### Zustand Stores

- [ ] T008 [P] Create scenarioStore with actions: loadScenarios, selectScenario, compareScenarios in `src/stores/scenarioStore.ts`
- [ ] T009 [P] Create timeStepStore with actions: setTimeStep, play, pause, setPlaybackSpeed in `src/stores/timeStepStore.ts`
- [ ] T010 [P] Create dashboardStore with actions: selectObservationPoint, updateChartData in `src/stores/dashboardStore.ts`

### API Layer

- [ ] T011 Create simulation API: getScenarios, getScenarioDetail, getVolumeData, getTimeSeries in `src/api/simulation.ts`

### Utility Functions

- [ ] T012 [P] Create color scale utils: valueToColor, generateColorMap in `src/utils/colorScale.ts`
- [ ] T013 [P] Create volume data loader: loadVolumeTexture, decodeVolumeData in `src/utils/volumeLoader.ts`

---

## Phase 3: User Story [US1] - 情境選擇與基本顯示

**Goal**: 使用者能選擇 20 種情境之一並查看參數

- [ ] T014 [US1] Create scenario selector dropdown in `src/components/dashboard/ScenarioSelector.tsx`
- [ ] T015 [US1] Create parameter table using Ag-Grid in `src/components/dashboard/ParameterTable.tsx`
- [ ] T016 [US1] Connect selector to scenarioStore
- [ ] T017 [US1] Display scenario loading indicator during fetch

**Independent Test Criteria**: 下拉選單顯示 20 種情境，選擇後顯示參數表

---

## Phase 4: User Story [US2] - 體積渲染顯示

**Goal**: 以 3D 體積渲染顯示地下水位/污染物分布

- [ ] T018 [US2] Create R3F Canvas container for volume rendering in `src/components/scene/VolumeCanvas.tsx`
- [ ] T019 [US2] Create volume rendering shader in `src/shaders/volumeRaymarching.glsl`
- [ ] T020 [US2] Create VolumeRenderer component in `src/components/scene/VolumeRenderer.tsx`
- [ ] T021 [US2] Implement transfer function UI in `src/components/overlay/TransferFunctionEditor.tsx`
- [ ] T022 [US2] Create color legend component in `src/components/overlay/ColorLegend.tsx`
- [ ] T023 [US2] Connect volume to scenarioStore selected scenario

**Independent Test Criteria**: 選擇情境後顯示 3D 體積渲染圖與色彩圖例

---

## Phase 5: User Story [US3] - 等值面顯示

**Goal**: 顯示特定閾值的等值面

- [ ] T024 [US3] Implement marching cubes algorithm in `src/utils/marchingCubes.ts`
- [ ] T025 [US3] Create isosurface renderer component in `src/components/scene/IsosurfaceRenderer.tsx`
- [ ] T026 [US3] Create threshold slider UI in `src/components/overlay/ThresholdSlider.tsx`
- [ ] T027 [US3] Connect threshold to isosurface update

**Independent Test Criteria**: 調整閾值滑桿即時更新等值面

---

## Phase 6: User Story [US4] - 時間序列動畫

**Goal**: 播放模擬結果的時間變化動畫

- [ ] T028 [US4] Create time step slider with date labels in `src/components/overlay/TimeStepSlider.tsx`
- [ ] T029 [US4] Create playback controls (play/pause/speed) in `src/components/overlay/PlaybackControls.tsx`
- [ ] T030 [US4] Implement volume data prefetching for smooth playback in `src/utils/volumePrefetcher.ts`
- [ ] T031 [US4] Update volume texture on time step change
- [ ] T032 [US4] Connect playback to timeStepStore

**Independent Test Criteria**: 點擊播放後體積渲染隨時間步進更新

---

## Phase 7: User Story [US5] - 儀表板雙向連動

**Goal**: 3D 與 ECharts 圖表雙向互動

- [ ] T033 [P] [US5] Create observation point layer (clickable markers) in `src/components/scene/ObservationPoints.tsx`
- [ ] T034 [P] [US5] Create time series chart using ECharts in `src/components/dashboard/TimeSeriesChart.tsx`
- [ ] T035 [US5] Implement 3D click → chart highlight in dashboardStore
- [ ] T036 [US5] Implement chart click → 3D highlight in scene
- [ ] T037 [US5] Verify linking latency <500ms

**Independent Test Criteria**: 點擊 3D 觀測點，圖表高亮對應曲線；反之亦然

---

## Phase 8: User Story [US6] - 熱圖與流線圖

**Goal**: 提供替代視覺化方式 (2D 熱圖、流線)

- [ ] T038 [P] [US6] Create 2D heatmap layer using Deck.gl HeatmapLayer in `src/components/scene/HeatmapLayer.tsx`
- [ ] T039 [P] [US6] Create streamline visualization in `src/components/scene/StreamlineRenderer.tsx`
- [ ] T040 [US6] Add visualization mode toggle (volume/isosurface/heatmap/streamline)
- [ ] T041 [US6] Use heatmap as fallback when volume rendering fails

**Independent Test Criteria**: 切換視覺化模式顯示不同效果

---

## Phase 9: User Story [US7] - 民眾導覽模式

**Goal**: 民眾透過導覽了解模擬結果意義

- [ ] T042 [US7] Create simulation tour component in `src/components/tour/SimulationTour.tsx`
- [ ] T043 [US7] Create tour config JSON in `public/tours/simulation-tour.json`
- [ ] T044 [US7] Implement scenario comparison animation (有/無整治)
- [ ] T045 [US7] Create simplified legend for public audience

**Independent Test Criteria**: 導覽模式自動切換情境並解說差異

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T046 Create SimulationFallback2D using shared `FallbackMap2D` with fallbackType='simulation' in `src/components/scene/SimulationFallback2D.tsx`
- [ ] T047 Integrate `SceneErrorBoundary` wrapper in simulation viewer entry point
- [ ] T048 Add WebGL 2.0 capability detection and warning

---

## Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
Phase 3 (US1: 情境選擇) ←────────────────────────────────┐
    ↓                                                    │
Phase 4 (US2: 體積渲染) ←── depends on US1               │
    ↓                                                    │
Phase 5 (US3: 等值面) ←── depends on US2                 │
    ↓                                                    │
Phase 6 (US4: 時間動畫) ←── depends on US2               │
    ↓                                                    │
Phase 7 (US5: 雙向連動) ←── depends on US2 + US4         │
    ↓                                                    │
Phase 8 (US6: 熱圖流線) ←── depends on US1               │
    ↓                                                    │
Phase 9 (US7: 導覽) ←── depends on US1 + US2             │
    ↓                                                    │
Phase 10 (Polish) ←──────────────────────────────────────┘
```

## Parallel Execution Opportunities

| Phase | Parallelizable Tasks |
|-------|---------------------|
| Phase 2 | T005-T007 (types), T008-T010 (stores), T012-T013 (utils) |
| Phase 7 | T033-T034 (observation layer + chart) |
| Phase 8 | T038-T039 (heatmap + streamline) |

## MVP Scope

**Recommended MVP**: Phase 1-6 (US1-US4)

- 情境選擇 + 體積渲染 + 等值面 + 時間動畫
- 預估工時: 2 sprints
