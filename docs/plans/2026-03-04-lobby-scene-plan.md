# 設施導覽場景（Lobby Scene）Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 為設施導覽模組的根場景建立「導覽模式」（lobby），點擊有子場景的模型在 3D 中浮現「進入」按鈕直接進入子場景，全螢幕沉浸式體驗。

**Architecture:** `FacilityScene` 新增 `sceneType` 欄位（`"lobby"` | `"normal"`），Store 新增 `isLobbyMode()` 與 `getChildScenes()`。FacilityPage lobby 模式隱藏 sidebar，FacilityModelItem 有子場景時顯示「進入」按鈕，FacilityInfoPanel lobby 模式下有子場景模型不顯示。

**Tech Stack:** React 19, React Three Fiber 9.5, Zustand 5, Prisma 7, Express 5, `@react-three/drei` Html

---

## 現有程式碼關鍵路徑（必讀）

- `server/prisma/schema.prisma:319-353` — FacilityScene model（要加 `sceneType`）
- `server/routes/facility.ts:50-74` — POST /scenes（要加 sceneType 預設）
- `server/routes/facility.ts:76-106` — PUT /scenes/:id（要加 sceneType 支援）
- `src/types/facility.ts:6-34` — FacilityScene 介面（要加 sceneType）
- `src/stores/facilityStore.ts:40-77` — Store 介面（要加 isLobbyMode + getChildScenes）
- `src/stores/facilityStore.ts:189-192` — getCurrentScene 實作
- `src/pages/FacilityPage.tsx:79-137` — 頁面 render（要條件隱藏 sidebar）
- `src/components/facility/FacilityModelItem.tsx:163-172` — handleClick（要加 lobby 邏輯）
- `src/components/facility/FacilityModelItem.tsx:206-240` — label group（要加「進入」按鈕）
- `src/components/facility/FacilityInfoPanel.tsx:42` — early return（要加 lobby 條件）

---

## Task 1: DB Schema + Backend API

**Files:**
- Modify: `server/prisma/schema.prisma:319-353`
- Modify: `server/routes/facility.ts:50-106`

**Step 1: 在 schema 新增 sceneType 欄位**

開啟 `server/prisma/schema.prisma`，在 `FacilityScene` model 的 `sortOrder` 行（line 340）後插入：

```prisma
  sceneType           String          @default("normal")   // "lobby" | "normal"
```

**Step 2: Prisma 同步**

```bash
cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform/server"
npx prisma db push && npx prisma generate
```

預期：成功同步，新欄位 `sceneType` 加入 DB，預設值 `"normal"`。

**Step 3: 修改 POST /scenes — 根場景預設 lobby**

開啟 `server/routes/facility.ts`，找到 line 53：
```typescript
const { projectId, parentSceneId, parentModelId, name, description, sortOrder } = req.body;
```
改為：
```typescript
const { projectId, parentSceneId, parentModelId, name, description, sortOrder, sceneType } = req.body;
```

找到 line 58-66 的 `data` 物件，在 `sortOrder` 行後加入：
```typescript
                sceneType: sceneType || (parentSceneId ? 'normal' : 'lobby'),
```

這樣根場景（`parentSceneId` 為 null/undefined）預設 `"lobby"`，子場景預設 `"normal"`，但都可被前端覆蓋。

**Step 4: 修改 PUT /scenes/:id — 支援 sceneType 更新**

找到 line 80 的 destructure：
```typescript
const { name, description, cameraPosition, cameraTarget, coordShiftX, coordShiftY, coordShiftZ, coordRotation, sortOrder, parentModelId } = req.body;
```
加入 `sceneType`：
```typescript
const { name, description, cameraPosition, cameraTarget, coordShiftX, coordShiftY, coordShiftZ, coordRotation, sortOrder, parentModelId, sceneType } = req.body;
```

找到 data 物件中 `...('parentModelId' in req.body && { parentModelId: parentModelId || null }),` 那行，在其後加入：
```typescript
                ...(sceneType !== undefined && { sceneType }),
```

**Step 5: TypeScript 確認**

```bash
cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform" && npx tsc --noEmit 2>&1 | grep -v vite.config
```

預期：零錯誤。

**Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/routes/facility.ts
git commit -m "feat: FacilityScene 新增 sceneType 欄位，根場景預設 lobby"
```

---

## Task 2: Frontend Types + Store

**Files:**
- Modify: `src/types/facility.ts:6-34`
- Modify: `src/stores/facilityStore.ts`

**Step 1: FacilityScene 型別加 sceneType**

開啟 `src/types/facility.ts`，在 `sortOrder: number;`（line 30）後加入：
```typescript
    sceneType: 'lobby' | 'normal';
```

**Step 2: Store 介面新增 isLobbyMode + getChildScenes**

開啟 `src/stores/facilityStore.ts`，在 interface `FacilityState` 的 Navigation 區塊（line 52 `getBreadcrumbs` 後），加入：

```typescript
    // Lobby mode
    isLobbyMode: () => boolean;
    getChildScenes: (modelId: string) => FacilityScene[];
```

注意：需要在檔案頂部確認 `FacilityScene` 已從 types import。目前 line 4：
```typescript
import type { FacilityScene, FacilityModel, Transform } from '../types/facility';
```
已包含 `FacilityScene`，無需改動。

**Step 3: Store 實作 isLobbyMode + getChildScenes**

在 `getBreadcrumbs` 實作（line 199-203）後加入：

```typescript
    // ===== Lobby Mode =====
    isLobbyMode: () => {
        const scene = get().getCurrentScene();
        return scene?.sceneType === 'lobby';
    },

    getChildScenes: (modelId: string) => {
        return get().scenes.filter(s => s.parentModelId === modelId);
    },
```

**Step 4: updateScene 型別擴充**

找到 line 43 的 `updateScene` 型別：
```typescript
    updateScene: (id: string, data: Partial<Pick<FacilityScene, 'name' | 'description' | 'cameraPosition' | 'cameraTarget' | 'coordShiftX' | 'coordShiftY' | 'coordShiftZ' | 'coordRotation' | 'sortOrder'>>) => Promise<void>;
```
在 `'sortOrder'` 後加入 `| 'sceneType'`：
```typescript
    updateScene: (id: string, data: Partial<Pick<FacilityScene, 'name' | 'description' | 'cameraPosition' | 'cameraTarget' | 'coordShiftX' | 'coordShiftY' | 'coordShiftZ' | 'coordRotation' | 'sortOrder' | 'sceneType'>>) => Promise<void>;
```

**Step 5: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

預期：零錯誤。

**Step 6: Commit**

```bash
git add src/types/facility.ts src/stores/facilityStore.ts
git commit -m "feat: FacilityScene 型別加 sceneType，Store 新增 isLobbyMode / getChildScenes"
```

---

## Task 3: FacilityPage — Lobby 模式隱藏 Sidebar

**Files:**
- Modify: `src/pages/FacilityPage.tsx:18-137`

**Step 1: 取得 isLobbyMode**

在 `FacilityPage` 元件內（line 21），現有的 store 取值後加入：

```typescript
    const isLobby = useFacilityStore(state => state.isLobbyMode);
```

同時需要取得 `projects` 和 `projectCode` 來顯示返回按鈕（已在元件中：line 19-20）。

**Step 2: 修改 render — 條件隱藏 sidebar 與截圖按鈕**

找到 line 79 的 return，改寫為：

```tsx
    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
            {/* Sidebar — lobby 模式隱藏 */}
            {!isLobby() && (
                <React.Suspense fallback={null}>
                    <FacilitySidebar />
                </React.Suspense>
            )}
            <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>載入中...</div>}>
                        <FacilityCanvas />
                    </React.Suspense>
                </div>
                <React.Suspense fallback={null}>
                    <FacilityInfoPanel />
                </React.Suspense>
                <React.Suspense fallback={null}>
                    <TransformInputPanel />
                </React.Suspense>
                <React.Suspense fallback={null}>
                    <PlanViewFloating />
                </React.Suspense>

                {/* Lobby 返回按鈕 — 左上角 */}
                {isLobby() && (
                    <div style={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        zIndex: 50,
                    }}>
                        <a
                            href={`/project/${projectCode}`}
                            style={{
                                background: 'rgba(255,255,255,0.88)',
                                border: '1px solid rgba(0,0,0,0.12)',
                                borderRadius: 8,
                                padding: '7px 14px',
                                fontSize: 13,
                                color: '#333',
                                cursor: 'pointer',
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                textDecoration: 'none',
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                            返回儀表板
                        </a>
                    </div>
                )}

                {/* Screenshot button — lobby 模式隱藏 */}
                {!isLobby() && (
                    <div style={{
                        position: 'absolute',
                        bottom: 24,
                        right: 24,
                        zIndex: 50,
                    }}>
                        <button
                            onClick={handleScreenshot}
                            title="截取目前視角"
                            style={{
                                background: 'rgba(255,255,255,0.88)',
                                border: '1px solid rgba(0,0,0,0.12)',
                                borderRadius: 8,
                                padding: '7px 14px',
                                fontSize: 12,
                                color: '#333',
                                cursor: 'pointer',
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.98)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.88)')}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                <circle cx="12" cy="13" r="4"/>
                            </svg>
                            截圖
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
```

**Step 3: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 4: Commit**

```bash
git add src/pages/FacilityPage.tsx
git commit -m "feat: Lobby 模式隱藏 sidebar 與截圖，左上角加返回儀表板按鈕"
```

---

## Task 4: FacilityModelItem — Lobby 模式「進入」按鈕

**Files:**
- Modify: `src/components/facility/FacilityModelItem.tsx`

這是核心功能：lobby 模式下有子場景的模型被選取時，在模型上方浮現「進入 {場景名稱}」按鈕。

**Step 1: 新增 store selectors**

在現有 store selectors（line 31-42）區塊後加入：

```typescript
    const isLobbyMode = useFacilityStore(state => state.isLobbyMode);
    const getChildScenes = useFacilityStore(state => state.getChildScenes);
```

**Step 2: 計算子場景**

在 `const isEditing = ...`（line 46）後加入：

```typescript
    const isLobby = isLobbyMode();
    const childScenes = useMemo(() => getChildScenes(model.id), [getChildScenes, model.id]);
    const hasChildScene = childScenes.length > 0;
```

需要在檔案頂部 import 確認 `useMemo` 已在（line 1 已有）。同時需要 import `FacilityScene`：

在 line 12 後加入：
```typescript
import type { FacilityScene } from '@/types/facility';
```

**Step 3: 修改 handleClick — lobby 模式行為**

handleClick 不需改動。lobby 模式下點擊模型仍然只是 `selectModel(model.id)`，「進入」按鈕是另外的 UI 元素。保持現有邏輯。

**Step 4: 在 label group 後加入「進入」按鈕**

找到 label group 結束的 `)}` （line 240），在其後、`{isEditing && ...}` 之前，插入：

```tsx
            {/* Lobby 模式：選取有子場景的模型時，顯示「進入」按鈕 */}
            {isLobby && isSelected && hasChildScene && (
                <group ref={labelGroupRef}>
                    <Html center zIndexRange={[200, 0]} style={{ pointerEvents: 'auto' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            {childScenes.map(scene => (
                                <button
                                    key={scene.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        enterScene(scene.id);
                                    }}
                                    style={{
                                        background: 'rgba(37,99,235,0.92)',
                                        color: 'white',
                                        border: '1px solid rgba(147,197,253,0.6)',
                                        borderRadius: 8,
                                        padding: '8px 16px',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,1)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.92)')}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                    進入 {scene.name}
                                </button>
                            ))}
                        </div>
                    </Html>
                </group>
            )}
```

注意：這段使用現有的 `labelGroupRef`，位置會跟隨 label 的 `useFrame` 邏輯（模型 bbox 上方）。但 `labelGroupRef` 已被 label group 使用。需要新建一個 ref。

**修正**：在 component 開頭的 refs 區塊（line 26-29）加入：

```typescript
    const enterBtnGroupRef = useRef<THREE.Group>(null);
```

然後在 `useFrame` callback（line 73-98）中，在 `labelGroupRef` 設定位置後，加入：

```typescript
        // 「進入」按鈕 group 位置跟隨 label（稍高一點）
        if (enterBtnGroupRef.current) {
            enterBtnGroupRef.current.position.set(_topLocal.x, _topLocal.y + 35, _topLocal.z);
        }
```

並將上面的 JSX 中 `ref={labelGroupRef}` 改為 `ref={enterBtnGroupRef}`。

**Step 5: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 6: Commit**

```bash
git add src/components/facility/FacilityModelItem.tsx
git commit -m "feat: Lobby 模式有子場景模型顯示「進入」按鈕"
```

---

## Task 5: FacilityInfoPanel — Lobby 模式條件隱藏

**Files:**
- Modify: `src/components/facility/FacilityInfoPanel.tsx`

Lobby 模式下，有子場景的模型不顯示 InfoPanel（由「進入」按鈕取代），無子場景的模型正常顯示。

**Step 1: 新增 store selectors**

在現有 store selectors（line 7-11）後加入：

```typescript
    const isLobbyMode = useFacilityStore(state => state.isLobbyMode)
    const getChildScenes = useFacilityStore(state => state.getChildScenes)
```

**Step 2: 修改 early return 條件**

找到 line 42 的 early return：
```typescript
    if (!selectedModelId) return null
```
改為：
```typescript
    if (!selectedModelId) return null

    // Lobby 模式下，有子場景的模型不顯示 InfoPanel
    if (isLobbyMode() && selectedModelId && getChildScenes(selectedModelId).length > 0) return null
```

**Step 3: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 4: Commit**

```bash
git add src/components/facility/FacilityInfoPanel.tsx
git commit -m "feat: Lobby 模式有子場景模型不顯示 InfoPanel"
```

---

## Task 6: 場景管理 UI — sceneType 切換

**Files:**
- Modify: `src/components/data/FacilityUploadSection.tsx`

在場景管理 Tab（Tab 1: SceneManager）中，根場景需要可以切換 `sceneType`（lobby ↔ normal）。

**Step 1: 在 SceneManager 的場景編輯區塊中加入 sceneType 選擇**

找到 SceneManager 中編輯場景的 form（包含 name、description 等欄位），在 `sortOrder` 欄位後加入：

```tsx
{/* sceneType 切換 — 僅根場景顯示 */}
{!(editScene as any).parentSceneId && (
    <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 4 }}>場景類型</label>
        <select
            value={editForm.sceneType || 'normal'}
            onChange={e => setEditForm(prev => ({ ...prev, sceneType: e.target.value }))}
            style={{ width: '100%', maxWidth: 320, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
        >
            <option value="lobby">導覽場景（全螢幕沉浸，點模型進入子場景）</option>
            <option value="normal">一般場景（含側邊欄，標準互動模式）</option>
        </select>
    </div>
)}
```

注意：需要確認 `editForm` state 和 `handleEditSave` 函數中包含 `sceneType`。在 SceneManager 的 edit form state 初始化時加入 `sceneType`，在 save 時傳給 `updateScene`。

具體需要閱讀 SceneManager 中的 `editForm` state 和 `handleEditSave` 實作，確認如何加入 `sceneType` 欄位。這部分需要 implementer 閱讀後適配。

**Step 2: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 3: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx
git commit -m "feat: 場景管理加入 sceneType 切換（lobby/normal）"
```

---

## 驗收測試

1. `npm run dev`（前端）+ `cd server && npm run dev`（後端）
2. 建立一個新的根場景 → 確認 DB 中 `sceneType = 'lobby'`
3. 進入設施導覽頁面 → 確認 sidebar 隱藏、左上角有返回按鈕
4. 確認模型 hover 高亮正常
5. 點擊有子場景的模型 → 確認模型上方出現「進入 {場景名}」藍色按鈕
6. 點擊空白處 → 確認按鈕消失
7. 點擊「進入」按鈕 → 確認進入子場景，sidebar 恢復顯示
8. 點擊無子場景的模型 → 確認 InfoPanel 正常顯示
9. 在場景管理中把根場景 sceneType 改為 `normal` → 確認設施導覽頁面恢復正常模式（sidebar 顯示）
