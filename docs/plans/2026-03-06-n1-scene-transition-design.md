# N1: 場景切換淡出淡入動畫 — 設計文件

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 進入子場景時，相機先飛向模型 → 黑幕淡出 → 切換場景 → 黑幕淡入，提供流暢的過渡體驗。

**日期:** 2026-03-06

---

## 設計

### 過渡時序（僅「進入子場景」觸發，goBack/goToRoot 不觸發）

```
使用者點擊進入子場景
  → transitionState = 'flyToModel'
  → 相機 fly-to 模型 bbox 中心（300ms）
  → transitionState = 'fadeOut'
  → 黑幕 opacity 0→1（200ms CSS transition）
  → transitionState = 'loading'
  → 執行 enterScene()（切換 currentSceneId + fetchModels）
  → 等待 isLoading = false
  → 相機瞬間設到新場景預設位置（skipFlyTo flag）
  → transitionState = 'fadeIn'
  → 黑幕 opacity 1→0（200ms CSS transition）
  → transitionState = 'idle'
```

### Store 新增狀態

```typescript
// facilityStore.ts
transitionState: 'idle' | 'flyToModel' | 'fadeOut' | 'loading' | 'fadeIn'
transitionTargetSceneId: string | null   // 目標場景 ID
transitionModelId: string | null          // fly-to 目標模型 ID（用於 bbox center 查詢）

// 新增 action
startSceneTransition: (sceneId: string, modelId: string) => void
advanceTransition: () => void    // 推進到下一個階段
```

### FacilityPage — 黑幕 Overlay

在 Canvas 容器上方加一個 `<div>`：
- `position: absolute; inset: 0; z-index: 15`
- `background: #000`
- `opacity`: 由 `transitionState` 控制
- `pointer-events: none`（不攔截互動）
- `transition: opacity 200ms ease-in-out`

| transitionState | opacity | 說明 |
|----------------|---------|------|
| idle | 0 | 透明，不可見 |
| flyToModel | 0 | 相機飛行中，畫面可見 |
| fadeOut | 1 | 淡出到黑 |
| loading | 1 | 維持黑幕，等待載入 |
| fadeIn | 0 | 淡入，顯示新場景 |

### FacilityCameraController — 過渡模式

1. `transitionState === 'flyToModel'`：fly-to `transitionModelId` 的 bbox center，300ms
2. fly-to 完成後呼叫 `advanceTransition()` → 進入 fadeOut
3. `transitionState === 'loading'` 且 `isLoading` 變 false 時：瞬間設定相機到新場景位置（不飛行），然後 `advanceTransition()` → 進入 fadeIn

### 觸發點修改

| 位置 | 原本 | 改為 |
|------|------|------|
| FacilitySidebar 子場景按鈕 | `enterScene(sub.id)` | `startSceneTransition(sub.id, model.id)` |
| FacilityPage Lobby 進入按鈕 | `enterScene(scene.id)` | `startSceneTransition(scene.id, focusedModelId)` |

goBack / goToRoot 不變。

---

## 修改檔案

| 檔案 | 修改內容 |
|------|---------|
| `src/stores/facilityStore.ts` | 新增 transition 狀態 + startSceneTransition + advanceTransition |
| `src/pages/FacilityPage.tsx` | 新增黑幕 overlay div |
| `src/components/facility/FacilityCameraController.tsx` | 支援 transition fly-to + 瞬間定位 |
| `src/components/facility/FacilitySidebar.tsx` | 進入子場景改呼叫 startSceneTransition |
