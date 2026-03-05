# A2: 手動觸發動畫播放 UI — 設計文件

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓 `trigger='manual'` 的動畫可以在導覽模式下被使用者觸發播放。

**日期:** 2026-03-05

---

## 現況問題

`trigger='manual'` 的動畫（keyframe 和 GLB 類型）**完全沒有播放路徑**：

- **Keyframe 動畫**：`FacilityModelItem.tsx` useFrame 中只有 `trigger === 'auto'` 分支，manual 不進入任何播放邏輯
- **GLB 動畫**：AnimationMixer 初始化時只對 `trigger === 'auto'` 的 clip 呼叫 `action.play()`，manual 被跳過
- **Store 層**：`playbackState` 是全域單一狀態，沒有 per-model 或 per-animation 的獨立播放追蹤

---

## 設計

### 1. Store 層 — per-model 播放狀態

```typescript
// facilityStore.ts 新增 state
manualPlayingModelIds: string[]   // 正在播放 manual 動畫的模型 ID 列表

// 新增 action
toggleManualPlay: (modelId: string) => void
// - 若 modelId 不在列表中 → 加入（開始播放該模型所有 manual 動畫）
// - 若 modelId 已在列表中 → 移除（停止該模型所有 manual 動畫）
```

選擇 `string[]` 而非 `Map<animId, state>`，因為「全部一起播」只需追蹤哪些模型在播。

**與現有狀態的關係**：
- `manualPlayingModelIds` 獨立於全域 `playbackState`
- 全域暫停（`playbackState = 'paused'`）只影響 auto 動畫，不影響 manual
- 進入動畫編輯模式 → 清空 `manualPlayingModelIds`

### 2. FacilityModelItem.tsx — useFrame 播放邏輯

#### 2a. Keyframe 動畫

在現有分支結構中，`else if (animationMode)` 和 `else if (anim.trigger === 'auto')` 之間，新增 manual 分支：

```typescript
} else if (anim.trigger === 'manual' && manualPlayingModelIds.includes(model.id)) {
    // manual trigger：使用獨立的 startTime ref
    if (manualNeedResetStartTime.current) {
        manualStartTimeRef.current = clock.elapsedTime;
        manualNeedResetStartTime.current = false;
    }
    const elapsed = clock.elapsedTime - manualStartTimeRef.current;
    currentTime = anim.loop
        ? elapsed % anim.duration
        : Math.min(elapsed, anim.duration);
    shouldAnimate = true;

    // 非循環且播完 → 自動停止
    if (!anim.loop && elapsed >= anim.duration) {
        useFacilityStore.getState().toggleManualPlay(model.id);
    }
}
```

需新增 refs：
- `manualStartTimeRef = useRef(0)`
- `manualNeedResetStartTime = useRef(true)`

當 `manualPlayingModelIds` 變化時（useEffect），重設 `manualNeedResetStartTime = true`。

#### 2b. GLB 動畫

在 AnimationMixer 初始化的 useEffect 中，改為：
- `trigger === 'auto'` → 立即 `action.play()`（現有邏輯不變）
- `trigger === 'manual'` → 建立 action 但不 play，存入 ref

新增 useEffect 監聽 `manualPlayingModelIds`：
- model.id 加入 → 對所有 manual GLB actions 呼叫 `action.play()`
- model.id 移除 → 對所有 manual GLB actions 呼叫 `action.stop()`

### 3. Sidebar UI — 模型列表旁播放按鈕

在 `FacilitySidebar.tsx` 每個模型的 `<li>` 內，名稱按鈕之後：

```
[☐] [模型名稱............] [▶]   ← 有 manual 動畫時顯示
[☐] [模型名稱............]       ← 無 manual 動畫時不顯示
```

顯示條件：
- 該模型有任何 `trigger === 'manual'` 的動畫（keyframe 或 GLB）
- `!animationMode`（動畫編輯模式下隱藏，Timeline 有自己的控制）

按鈕行為：
- 點擊 → `toggleManualPlay(model.id)`
- 播放中 → Pause 圖示 + 紫色（`#7c3aed`）
- 停止中 → Play 圖示 + 灰色（`#9ca3af`）

### 4. 狀態重設時機

| 事件 | manualPlayingModelIds 行為 |
|------|--------------------------|
| 進入動畫編輯模式 | 清空（`[]`） |
| 切換場景（enterScene/goBack） | 清空（`[]`） |
| 非循環動畫播完 | 自動從列表移除該 modelId |
| 使用者點停止按鈕 | 從列表移除該 modelId |

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|---------|
| `src/stores/facilityStore.ts` | 新增 `manualPlayingModelIds` state + `toggleManualPlay` action + 各場景切換處清空 |
| `src/components/facility/FacilityModelItem.tsx` | useFrame 新增 manual keyframe 分支 + GLB manual action 管理 |
| `src/components/facility/FacilitySidebar.tsx` | 模型列表旁新增 Play/Pause 按鈕 |
