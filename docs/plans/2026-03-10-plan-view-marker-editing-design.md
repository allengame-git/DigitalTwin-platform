# 平面圖標記編輯 — Design Document

**Date:** 2026-03-10
**Status:** Approved

## Goal

在 Lobby 場景的浮動平面圖（PlanViewFloating）中，讓使用者可以手動拖曳模型標記到正確的平面圖位置，並可隱藏不需要的標記。每個模型獨立儲存平面圖 2D 位置，與 3D position 脫鉤。

## Decisions

| Question | Decision |
|----------|----------|
| 標記代表什麼 | 關聯到模型，但存獨立的平面圖 2D 位置（與 3D position 脫鉤） |
| 儲存位置 | 模型表新增 `planX`/`planY`/`planVisible` 三個欄位 |
| 編輯進入方式 | 平面圖右上角「編輯標記」toggle 按鈕 |
| 預設顯示規則 | `modelType === 'primary'` 顯示，`'decorative'` 不顯示 |
| 未設定位置的 fallback | 用 3D position 自動映射（現有 `getMarkerPos` 邏輯） |

## DB Schema

`FacilityModel` 新增三個欄位：

```prisma
planX       Float?              // 平面圖 X 百分比 (0~100)，null = 用 3D position 自動映射
planY       Float?              // 平面圖 Y 百分比 (0~100)
planVisible Boolean @default(true) // false = 在平面圖隱藏
```

## API

新增 endpoint：

```
PUT /api/facility/models/:id/plan-marker
Body: { planX?: number | null, planY?: number | null, planVisible?: boolean }
Response: updated model object
```

需 `authenticate` middleware。驗證 `planX`/`planY` 範圍 0~100。

## 前端改動

### 標記位置邏輯

```typescript
function getMarkerPos(model: FacilityModel): { x: number; y: number } {
    if (model.planX != null && model.planY != null) {
        return { x: model.planX, y: model.planY };
    }
    // fallback: 現有 3D position → 百分比映射
    return computeFromBounds(model, bounds);
}
```

### 篩選邏輯

```typescript
models.filter(m => m.modelType !== 'decorative' && m.planVisible !== false)
```

編輯模式下，隱藏的模型仍顯示（半透明 + 眼睛按鈕），方便恢復。

### 編輯模式 UI

- 平面圖右上角（關閉按鈕左側）新增「編輯標記」toggle 按鈕
- 開啟編輯模式後：
  - 標記可拖曳（pointer events: down → move → up）
  - 拖曳期間顯示十字游標
  - 每個標記旁出現小眼睛圖示，點擊切換 `planVisible`
  - 拖曳結束 → debounce 300ms → `PUT /plan-marker` 寫入百分比座標
  - `planVisible === false` 的模型以半透明顯示
- 關閉編輯模式 → 標記恢復不可拖曳，隱藏的模型消失

### PlanView（sidebar）同步

`PlanView.tsx` 同樣讀取 `planX`/`planY`/`planVisible`，但不加編輯功能。篩選邏輯相同。

## 不改動的部分

- 3D 場景中模型的 position/rotation/scale
- 平面圖上傳/自動生成邏輯
- FacilityPage layout

## Files to Modify

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | `FacilityModel` 加 `planX`/`planY`/`planVisible` |
| `server/routes/facility.ts` | 新增 `PUT /models/:id/plan-marker` |
| `src/types/facility.ts` | `FacilityModel` 加 `planX`/`planY`/`planVisible` |
| `src/components/facility/PlanViewFloating.tsx` | 編輯模式 UI、拖曳、位置邏輯 |
| `src/components/facility/PlanView.tsx` | 讀取自訂位置 + 篩選 decorative/hidden |
