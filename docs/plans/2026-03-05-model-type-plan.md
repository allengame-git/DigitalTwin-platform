# 設施模型分類管理（Model Type）Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 為設施模型新增 `modelType` 欄位（`primary` / `decorative`），裝飾模型不可在一般模式互動、不顯示在模型清單，但編輯模式可調整 transform。

**Architecture:** `FacilityModel` 新增 `modelType` 欄位，前端各元件根據 modelType 與 editMode 條件決定互動與顯示行為。上傳 UI 加入類型選擇。

**Tech Stack:** React 19, React Three Fiber 9.5, Zustand 5, Prisma 7, Express 5

---

## 現有程式碼關鍵路徑

- `server/prisma/schema.prisma:357-376` — FacilityModel model
- `server/routes/facility.ts:268-321` — POST /models（上傳）
- `server/routes/facility.ts:324-349` — PUT /models/:id（更新）
- `src/types/facility.ts:42-56` — FacilityModel 介面
- `src/components/facility/FacilityModelItem.tsx:172-208` — handleClick / hover / group events
- `src/components/facility/FacilityModelItem.tsx:215-249` — label group
- `src/components/facility/FacilitySidebar.tsx:205-274` — 模型清單
- `src/components/facility/FacilityInfoPanel.tsx:44-50` — early return
- `src/components/data/FacilityUploadSection.tsx:415-568` — ModelUploader（Tab 2）
- `src/components/data/FacilityUploadSection.tsx:884-947` — ModelInfoDashboard（Tab 3）

---

## Task 1: DB Schema + Backend API

**Files:**
- Modify: `server/prisma/schema.prisma:367`
- Modify: `server/routes/facility.ts:272, 305, 327, 337`

**Step 1: 在 schema 新增 modelType 欄位**

開啟 `server/prisma/schema.prisma`，在 FacilityModel 的 `sortOrder` 行（line 367）後插入：

```prisma
  modelType   String              @default("primary")  // "primary" | "decorative"
```

**Step 2: Prisma 同步**

```bash
cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform/server"
npx prisma db push && npx prisma generate
```

**Step 3: 修改 POST /models — 支援 modelType**

`server/routes/facility.ts` line 272：
```typescript
// 原
const { sceneId, name, sortOrder } = req.body;
// 改為
const { sceneId, name, sortOrder, modelType } = req.body;
```

line 305（data 物件），在 `sortOrder` 行後加：
```typescript
                modelType: modelType || 'primary',
```

**Step 4: 修改 PUT /models/:id — 支援 modelType**

line 327：
```typescript
// 原
const { name, sortOrder, introduction } = req.body;
// 改為
const { name, sortOrder, introduction, modelType } = req.body;
```

line 337（data 物件），在 `introduction` 行後加：
```typescript
                ...(modelType !== undefined && { modelType }),
```

**Step 5: TypeScript 確認（後端）**

```bash
cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform" && npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/routes/facility.ts
git commit -m "feat: FacilityModel 新增 modelType 欄位（primary/decorative）"
```

---

## Task 2: Frontend Types

**Files:**
- Modify: `src/types/facility.ts:42-56`

**Step 1: FacilityModel 介面加 modelType**

在 `sortOrder: number;`（line 52）後加入：

```typescript
    modelType: 'primary' | 'decorative';
```

**Step 2: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 3: Commit**

```bash
git add src/types/facility.ts
git commit -m "feat: FacilityModel 型別加 modelType"
```

---

## Task 3: FacilityModelItem — 裝飾模型互動限制

**Files:**
- Modify: `src/components/facility/FacilityModelItem.tsx`

核心邏輯：裝飾模型 (`model.modelType === 'decorative'`) 在一般瀏覽模式下不可 hover、不可 click、不顯示 label。編輯模式下正常互動。

**Step 1: 新增 isDecorative 判斷**

在 line 49（`const isEditing = ...` 行後），加入：

```typescript
    const isDecorative = model.modelType === 'decorative';
```

**Step 2: 修改 group 事件綁定**

找到 line 206-208 的 group props：
```tsx
                onClick={handleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
```
改為：
```tsx
                onClick={isDecorative && !editMode ? undefined : handleClick}
                onPointerOver={isDecorative && !editMode ? undefined : handlePointerOver}
                onPointerOut={isDecorative && !editMode ? undefined : handlePointerOut}
```

**Step 3: 修改 label 顯示條件**

找到 line 215 的 label group：
```tsx
            {showLabels && (
```
改為：
```tsx
            {showLabels && !isDecorative && (
```

**Step 4: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 5: Commit**

```bash
git add src/components/facility/FacilityModelItem.tsx
git commit -m "feat: 裝飾模型一般模式不可互動，編輯模式可操作"
```

---

## Task 4: FacilitySidebar — 過濾裝飾模型

**Files:**
- Modify: `src/components/facility/FacilitySidebar.tsx:207-210`

**Step 1: 過濾 decorative 模型**

找到 line 207-210 的模型清單：
```typescript
                            {models
                                .slice()
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map(model => {
```
改為：
```typescript
                            {models
                                .filter(m => m.modelType !== 'decorative')
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map(model => {
```

**Step 2: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 3: Commit**

```bash
git add src/components/facility/FacilitySidebar.tsx
git commit -m "feat: 側邊欄模型清單過濾裝飾模型"
```

---

## Task 5: FacilityInfoPanel — 裝飾模型不顯示

**Files:**
- Modify: `src/components/facility/FacilityInfoPanel.tsx:44-50`

**Step 1: 加入 decorative early return**

在 line 44 的 `if (!selectedModelId) return null` 之後，加入：

```typescript
    // 裝飾模型不顯示 InfoPanel
    const selectedModel = models.find(m => m.id === selectedModelId)
    if (selectedModel?.modelType === 'decorative') return null
```

注意：`models` 已經在 line 14 從 store 取出。`selectedModel` 需要在 early return 之前計算。確認不會與後面（line 24-27）的 `useMemo selectedModel` 衝突 — 因為這是 early return，後面不會執行。但為避免命名衝突，可用不同名稱：

```typescript
    // 裝飾模型不顯示 InfoPanel
    if (models.find(m => m.id === selectedModelId)?.modelType === 'decorative') return null
```

**Step 2: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 3: Commit**

```bash
git add src/components/facility/FacilityInfoPanel.tsx
git commit -m "feat: 裝飾模型不顯示 InfoPanel"
```

---

## Task 6: 上傳 UI — 模型類型選擇 + 模型資訊過濾

**Files:**
- Modify: `src/components/data/FacilityUploadSection.tsx`

這是最複雜的 Task，分兩部分：ModelUploader 加類型選擇、ModelInfoDashboard 過濾裝飾模型。

### Part A: ModelUploader 加模型類型選擇

**Step 1: 新增 state**

在 ModelUploader 元件的 state 區塊（line 422），加入：

```typescript
    const [modelType, setModelType] = useState<'primary' | 'decorative'>('primary');
```

**Step 2: FormData 加入 modelType**

在 line 472（`if (childSceneId) ...` 行後）加入：

```typescript
            fd.append('modelType', modelType);
```

**Step 3: 上傳成功後重置 modelType**

在 line 485（`setChildSceneId('')`）後加入：

```typescript
            setModelType('primary');
```

**Step 4: 在場景選擇器與拖放區之間加入類型選擇 UI**

找到 line 504（Scene selector `</div>` 結束後、Drop zone `<div` 之前），插入：

```tsx
            {/* Model type selector */}
            <div className="dm-form-group">
                <label className="dm-form-label">模型類型</label>
                <select
                    className="dm-form-input"
                    value={modelType}
                    onChange={e => setModelType(e.target.value as 'primary' | 'decorative')}
                >
                    <option value="primary">一般模型（可互動、可填資訊）</option>
                    <option value="decorative">附屬模型（景觀裝飾，不可互動）</option>
                </select>
            </div>
```

**Step 5: 裝飾模型隱藏子場景連結選項**

找到 line 542-546 的 childSceneId selector：
```tsx
            {/* Child scene link */}
            <div className="dm-form-group">
                <label className="dm-form-label">點擊進入的子場景（可選）</label>
                <SceneSelect scenes={scenes} value={childSceneId} onChange={setChildSceneId} placeholder="（無）" />
            </div>
```
用條件包起來：
```tsx
            {/* Child scene link — 僅一般模型 */}
            {modelType === 'primary' && (
                <div className="dm-form-group">
                    <label className="dm-form-label">點擊進入的子場景（可選）</label>
                    <SceneSelect scenes={scenes} value={childSceneId} onChange={setChildSceneId} placeholder="（無）" />
                </div>
            )}
```

### Part B: ModelInfoDashboard 過濾裝飾模型

**Step 6: 過濾 decorative**

在 ModelInfoDashboard（line 884），找到 line 930-934 的模型卡片渲染：
```tsx
                <div style={{ display: 'grid', ...}}>
                    {models.map(m => (
                        <ModelCard key={m.id} model={m} onClick={() => setSelectedModel(m)} />
                    ))}
                </div>
```
改為：
```tsx
                <div style={{ display: 'grid', ...}}>
                    {models.filter(m => m.modelType !== 'decorative').map(m => (
                        <ModelCard key={m.id} model={m} onClick={() => setSelectedModel(m)} />
                    ))}
                </div>
```

同時修改 line 927 的「無模型」判斷：
```tsx
            {!isLoadingModels && sceneId && models.length === 0 && (
```
改為：
```tsx
            {!isLoadingModels && sceneId && models.filter(m => m.modelType !== 'decorative').length === 0 && (
```

**Step 7: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 8: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx
git commit -m "feat: 模型上傳加入類型選擇，模型資訊過濾裝飾模型"
```

---

## 驗收測試

1. `npm run dev`（前端）+ `cd server && npm run dev`（後端）
2. 上傳一個「一般模型」→ 確認清單有顯示、可點擊、有 label
3. 上傳一個「附屬模型」→ 確認清單沒顯示、一般模式不可點擊/hover、無 label
4. 切換到編輯模式 → 確認附屬模型可選取、可移動/旋轉/縮放
5. 切回一般模式 → 確認附屬模型又不可互動
6. 模型資訊 Tab → 確認只看到一般模型
7. InfoPanel → 確認選取附屬模型（編輯模式）不會彈出 InfoPanel
