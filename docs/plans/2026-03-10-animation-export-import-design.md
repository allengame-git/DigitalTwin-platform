# A5. 動畫匯出/匯入 — Design Document

**Date:** 2026-03-10
**Status:** Approved

## Goal

Allow users to export animation settings as JSON files and import them onto other models, enabling animation reuse across the facility scene.

## Decisions

| Question | Decision |
|----------|----------|
| Offset alignment | **A. 平移對齊** — delta offset applied to all keyframe positions |
| Export scope | **C. 兩者都支援** — export single animation or all animations per model |
| Import target | **C. 多模型** — import to all currently selected models |
| JSON metadata | **B. 帶 metadata** — version, exportedAt, sourceModelName |
| Architecture | **A. 純前端** — no new API endpoints; use existing `createAnimation` |

## JSON Format (version 1)

```jsonc
{
  "version": 1,
  "exportedAt": "2026-03-10T12:00:00Z",
  "sourceModelName": "水塔A",
  "type": "single",                    // "single" | "batch"
  "animations": [
    {
      "name": "旋轉展示",
      "type": "keyframe",
      "trigger": "auto",
      "loop": true,
      "duration": 5,
      "easing": "easeInOut",
      "pathMode": "catmullrom",
      "autoOrient": false,
      "keyframes": [
        { "time": 0, "position": { "x": 0, "y": 0, "z": 0 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "scale": { "x": 1, "y": 1, "z": 1 } },
        { "time": 2.5, "position": { "x": 10, "y": 5, "z": 0 } },
        { "time": 5, "position": { "x": 20, "y": 0, "z": 0 }, "pathMode": "linear" }
      ]
    }
  ]
}
```

**Excluded fields:** `id`, `modelId`, `sortOrder`, `createdAt`, `updatedAt`, `gltfClipName` (model-bound).

## Export Flow

1. User selects an animation in AnimationTimeline.
2. Clicks "匯出此動畫" (single) or "匯出全部" (batch).
3. Frontend filters animations from store, strips DB-specific fields.
4. Assembles JSON with metadata header.
5. Creates `Blob` + `URL.createObjectURL`, triggers download.
6. Filename: `{modelName}-{animName}-animation.json` or `{modelName}-all-animations.json`.

## Import Flow

1. User selects target model(s) in 3D scene (single or CMD/Ctrl multi-select).
2. Clicks "匯入動畫" in timeline header.
3. Hidden `<input type="file" accept=".json">` opens file picker.
4. `FileReader` reads file, `JSON.parse` validates structure.
5. Validation checks: `version === 1`, `animations` array non-empty.
6. For each selected model:
   a. Read model's current position from store (`models` array transform or `modelBboxCenters`).
   b. Find the first keyframe with a `position` field (anchor keyframe).
   c. Compute `offset = modelPosition - anchorKeyframe.position`.
   d. Clone all keyframes; add offset to every keyframe that has a `position`.
   e. Skip animations with `type === 'gltf'` (GLB clips are model-bound).
   f. Call `createAnimation(modelId, animData)` for each animation.
7. Show result: "已匯入 N 個動畫到 M 個模型" or partial failure message.

### Offset Calculation Detail

- Only `position` is adjusted; `rotation` and `scale` remain unchanged.
- If no keyframe has a `position` field (pure rotation animation), skip offset entirely.
- The anchor is the first keyframe in the array that contains a `position`.

## UI Layout

```
Timeline Header (always visible)
├── "動畫 — {count}" label
├── Play/Pause/Stop buttons
├── Playback time display
├── [+ 新增] button          (existing)
└── [匯入動畫] button        (NEW — always available)

Animation Properties Panel (visible when animation selected)
├── Name, Duration, Trigger, Easing, PathMode, Loop, AutoOrient
├── [刪除動畫] button        (existing)
├── [匯出此動畫] button      (NEW)
└── [匯出全部動畫] button    (NEW)
```

- "匯入動畫" in header: does not require a selected animation (can import anytime).
- "匯出" buttons in properties panel: require a selected animation to be visible.

## Validation & Error Handling

| Condition | Action |
|-----------|--------|
| JSON parse fails | alert "檔案格式不正確" |
| `version !== 1` | alert "不支援的版本格式" |
| `animations` empty | alert "檔案中沒有動畫資料" |
| `type === 'gltf'` animation | Skip silently (don't import) |
| No model selected on import | alert "請先選擇目標模型" |
| API call fails | Show partial result: "已匯入 2/3 個動畫，1 個失敗" |

## What Does NOT Change

- **Backend:** Zero modifications. Uses existing `POST /models/:id/animations`.
- **Zustand store:** Zero modifications. Uses existing `createAnimation` action.
- **Prisma schema:** Zero modifications.
- **FacilityModelItem:** Zero modifications (playback engine unaffected).

## Files to Modify

| File | Change |
|------|--------|
| `src/components/facility/AnimationTimeline.tsx` | Add export/import buttons, file input, export/import logic |
| `src/types/facility.ts` | Add `AnimationExportFile` interface |

## Non-Goals (YAGNI)

- Animation preview before import
- Drag-and-drop import
- Server-side animation template library
- Undo/redo for import operations
- Rotation/scale offset adjustment
