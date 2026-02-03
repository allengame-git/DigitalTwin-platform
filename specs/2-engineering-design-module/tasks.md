# Implementation Tasks: 工程設計展示模組 (Engineering Design Module)

**Feature Branch**: `2-engineering-design-module`  
**Status**: NOT_STARTED  
**Total Tasks**: 42  
**Estimated Effort**: 2 sprints

---

## Phase 1: Setup & Configuration

- [ ] T001 Create feature branch `2-engineering-design-module` from main
- [ ] T002 Verify R3F and 3d-tiles-renderer dependencies are installed (from geology module)
- [ ] T003 Add PDF.js dependency for document viewing in `package.json`

---

## Phase 2: Foundational Components (Blocking)

### Types & Interfaces

- [ ] T004 [P] Create engineering types: EngineeringModel, Component, ConstructionPhase in `src/types/engineering.ts`
- [ ] T005 [P] Create timeline types: TimelineState, DateRange in `src/types/timeline.ts`

### Zustand Stores

- [ ] T006 [P] Create modelStore with actions: loadModel, selectComponent, highlightComponent in `src/stores/modelStore.ts`
- [ ] T007 [P] Create timelineStore with actions: setCurrentDate, play, pause, stepForward in `src/stores/timelineStore.ts`

### API Layer

- [ ] T008 Create engineering API: getModels, getModelDetail, getPhases, getDocument in `src/api/engineering.ts`

---

## Phase 3: User Story [US1] - 工程模型 3D 顯示

**Goal**: 載入並顯示工程模型 (壩體、廠房、隧道)

- [ ] T009 [US1] Create R3F Canvas with 3d-tiles-renderer for engineering models in `src/components/scene/EngineeringCanvas.tsx`
- [ ] T010 [US1] Implement terrain mesh and raycasting for model placement
- [ ] T011 [US1] Create model loading progress indicator in `src/components/overlay/ModelLoadingProgress.tsx`
- [ ] T012 [US1] Add model to scene with proper TWD97 positioning

**Independent Test Criteria**: 工程模型成功載入並顯示於地形上

---

## Phase 4: User Story [US2] - 構件點選與資訊顯示

**Goal**: 點擊構件顯示設計參數與相關資料

- [ ] T013 [US2] Implement component picking via R3F raycaster in `src/components/scene/EngineeringCanvas.tsx`
- [ ] T014 [US2] Create component highlight using emissive material effect
- [ ] T015 [P] [US2] Create component info panel with parameters in `src/components/overlay/ComponentInfo.tsx`
- [ ] T016 [P] [US2] Create document link component for design drawings in `src/components/overlay/DocumentLink.tsx`
- [ ] T017 [US2] Connect picking to modelStore selection state

**Independent Test Criteria**: 點擊構件顯示參數面板與圖說連結

---

## Phase 5: User Story [US3] - 4D 施工時間軸

**Goal**: 透過時間軸控制顯示不同施工階段

- [ ] T018 [US3] Create timeline slider UI in `src/components/overlay/TimelineSlider.tsx`
- [ ] T019 [US3] Create play/pause/step controls in `src/components/overlay/TimelineControls.tsx`
- [ ] T020 [US3] Create phase indicator with current stage name in `src/components/overlay/PhaseIndicator.tsx`
- [ ] T021 [US3] Implement date-to-phase mapping logic in `src/utils/phaseCalculator.ts`
- [ ] T022 [US3] Connect timeline to timelineStore

**Independent Test Criteria**: 拖曳時間軸顯示對應日期與施工階段名稱

---

## Phase 6: User Story [US4] - 施工進度動態顯示

**Goal**: 依時間顯示/隱藏構件，標示施工狀態

- [ ] T023 [US4] Implement component visibility based on timeline date in `src/components/scene/EngineeringViewer.tsx`
- [ ] T024 [US4] Create status color styling: planned (灰), in-progress (黃), completed (實色) in `src/utils/statusStyling.ts`
- [ ] T025 [US4] Apply 3D Tiles style conditions for status coloring
- [ ] T026 [US4] Add smooth fade animation for component visibility changes

**Independent Test Criteria**: 播放時間軸時構件依序出現並變色

---

## Phase 7: User Story [US5] - 設計圖說檢視

**Goal**: 點擊圖說連結開啟 PDF/圖片

- [ ] T027 [P] [US5] Create document viewer modal with PDF.js in `src/components/overlay/DocumentViewer.tsx`
- [ ] T028 [P] [US5] Create image viewer for non-PDF documents in `src/components/overlay/ImageViewer.tsx`
- [ ] T029 [US5] Implement document loading states and error handling
- [ ] T030 [US5] Add zoom/pan controls for document viewing

**Independent Test Criteria**: 點擊圖說連結可檢視 PDF 或圖片

---

## Phase 8: User Story [US6] - 民眾導覽模式

**Goal**: 民眾透過導覽了解工程設計

- [ ] T031 [US6] Create engineering tour component reusing tour framework in `src/components/tour/EngineeringTour.tsx`
- [ ] T032 [US6] Create tour config JSON in `public/tours/engineering-tour.json`
- [ ] T033 [US6] Add construction phase highlights during tour stops
- [ ] T034 [US6] Create simplified UI for public mode

**Independent Test Criteria**: 導覽模式自動播放施工動畫並顯示說明

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T035 Create EngineeringFallback2D using Canvas 2D in `src/components/scene/EngineeringFallback2D.tsx`
- [ ] T036 Integrate `ErrorBoundary` wrapper in engineering viewer entry point
- [ ] T037 Create loading progress percentage display
- [ ] T038 Optimize 3d-tiles-renderer LOD for performance
- [ ] T039 Accessibility review: keyboard timeline controls
- [ ] T040 Create construction phase JSON schema in `src/schemas/phase-schema.json`
- [ ] T041 Create SketchUp to glTF conversion guide in `docs/sketchup-conversion.md`
- [ ] T042 Performance test: 50MB glTF load time

---

## Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
Phase 3 (US1: 模型顯示) ←────────────────────────────────┐
    ↓                                                    │
Phase 4 (US2: 構件點選) ←── depends on US1               │
    ↓                                                    │
Phase 5 (US3: 時間軸) ←──────────────────────────────────┤
    ↓                                                    │
Phase 6 (US4: 動態顯示) ←── depends on US1 + US3         │
    ↓                                                    │
Phase 7 (US5: 圖說檢視) ←── depends on US2               │
    ↓                                                    │
Phase 8 (US6: 導覽) ←── depends on US1 + US3             │
    ↓                                                    │
Phase 9 (Polish) ←───────────────────────────────────────┘
```

## Parallel Execution Opportunities

| Phase | Parallelizable Tasks |
|-------|---------------------|
| Phase 2 | T004-T005 (types), T006-T007 (stores) |
| Phase 4 | T015-T016 (info panels) |
| Phase 7 | T027-T028 (document viewers) |

## MVP Scope

**Recommended MVP**: Phase 1-5 (US1-US3)

- 工程模型顯示 + 構件點選 + 時間軸 UI
- 預估工時: 1 sprint
