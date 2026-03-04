# 設施導覽場景（Lobby Scene）設計文件

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan.

**Goal:** 為設施導覽模組的根場景建立「導覽模式」，點擊有子場景的模型直接進入對應場景，提供全螢幕沉浸式的場景總覽體驗。

**Architecture:** `FacilityScene` 新增 `sceneType` 欄位（`"lobby"` | `"normal"`），根場景預設為 lobby。Lobby 模式下隱藏 sidebar，有子場景的模型點擊後在 3D 中浮現「進入」按鈕，無子場景的模型點擊後顯示正常 InfoPanel。

**Tech Stack:** React 19, React Three Fiber, Zustand, Prisma/PostgreSQL, Express API

---

## 一、資料層

### DB Schema 變更

```prisma
// server/prisma/schema.prisma
model FacilityScene {
  // 新增欄位
  sceneType    String   @default("normal")  // "lobby" | "normal"
  // 其他欄位不變
}
```

### API 變更

- `POST /api/facility/scenes`：建立場景時，若 `parentSceneId === null`（根場景），預設 `sceneType: "lobby"`
- `PUT /api/facility/scenes/:id`：支援更新 `sceneType` 欄位
- 前端 `FacilityScene` 型別新增 `sceneType: 'lobby' | 'normal'`

---

## 二、Store 擴充

```typescript
// facilityStore.ts
interface FacilityState {
  // 新增
  isLobbyMode: () => boolean;
  getChildScenes: (modelId: string) => FacilityScene[];
}

// 實作
isLobbyMode: () => {
    const scene = get().getCurrentScene();
    return scene?.sceneType === 'lobby';
},

getChildScenes: (modelId: string) => {
    return get().scenes.filter(s => s.parentModelId === modelId);
},
```

---

## 三、FacilityPage 佈局（lobby 模式）

導覽場景（`isLobbyMode() === true`）時：
- 隱藏 `<FacilitySidebar />`
- 隱藏截圖按鈕
- 左上角顯示返回按鈕（專案名稱 / 返回儀表板連結）
- 進入子場景後（`sceneType === 'normal'`），sidebar 恢復，一切照常

---

## 四、3D 模型互動（lobby 模式）

### 有子場景的模型
1. Hover：正常 emissive 高亮 + cursor pointer
2. Click：`selectModel(model.id)` → 模型 bbox 上方浮現「進入 {子場景名稱}」按鈕
3. 點擊按鈕：`enterScene(childScene.id)`
4. 點擊空白處：`selectModel(null)` → 按鈕消失

### 無子場景的模型
1. Hover：正常高亮
2. Click：`selectModel(model.id)` → 正常顯示 FacilityInfoPanel

### 判斷方式
`FacilityModelItem` 呼叫 store 的 `getChildScenes(model.id)` 判斷是否有子場景。

---

## 五、「進入」按鈕 UI

```
┌──────────────────────────┐
│  > 進入 廠房一樓          │   ← Html overlay
└──────────────────────────┘
         |
    [3D Model]              ← emissive 高亮中
```

- 使用 `@react-three/drei` 的 `<Html>` 元件
- 位置：模型 bbox 頂部上方（與現有 label 位置邏輯相同）
- 背景 `rgba(37,99,235,0.92)`，白色文字 14px，圓角 8px
- 點擊呼叫 `enterScene(childScenes[0].id)`
- 多個子場景時列出所有選項

---

## 六、FacilityInfoPanel 行為

- lobby 模式下：
  - 有子場景的模型被選取時，不顯示 InfoPanel（由「進入」按鈕取代）
  - 無子場景的模型被選取時，正常顯示 InfoPanel
- normal 模式下：行為不變

---

## 七、受影響檔案清單

### 後端
- `server/prisma/schema.prisma` — FacilityScene 加 `sceneType`
- `server/routes/facility.ts` — POST scenes 預設 lobby；PUT scenes 支援 sceneType

### 前端
- `src/types/facility.ts` — FacilityScene 加 sceneType
- `src/stores/facilityStore.ts` — 新增 isLobbyMode + getChildScenes
- `src/pages/FacilityPage.tsx` — lobby 隱藏 sidebar/截圖、加返回按鈕
- `src/components/facility/FacilityModelItem.tsx` — lobby 模式「進入」按鈕
- `src/components/facility/FacilityInfoPanel.tsx` — lobby 模式條件隱藏
