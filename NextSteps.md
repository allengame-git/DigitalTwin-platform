# NextSteps.md — 後續開發指引

本文件記錄專案目前的完成狀態、座標系統說明，以及後續待辦事項，供接手的 AI Agent 或開發人員參考。

**最後更新**: 2026-03-06（安全審計修復 + 曲線路徑動畫 + 3D 路徑編輯器 + keyframe 拖曳 + N8 UX 改善）
**當前分支**: `1-geology-module`
**主分支**: `main`（此分支尚未 merge 回 main）

---

## 重要：座標系統說明

本專案採用 **TWD97 + Three.js 混合座標系**，必須正確理解以下對應關係：

| 工程/TWD97 | Three.js 儲存 | 說明 |
|-----------|-------------|------|
| X（東）   | `position.x` | 相同 |
| Y（北）   | `position.z` | **對調**，Three.js Z = 北 |
| Z（高程） | `position.y` | **對調**，Three.js Y = 垂直軸 |

- **水平面 = X-Z 平面**（Y 軸朝上）
- `rotation.y`（Ry）= 水平方位旋轉（yaw），是最常用的旋轉
- 所有 DB 儲存欄位（`position.x/y/z`）均以 Three.js 原生座標儲存
- UI 標籤已依此對應：位置欄位顯示「X 東 / Z 高程 / Y 北」，旋轉顯示「Rx 俯仰 / Ry 方位 / Rz 橫滾」
- **設施導覽座標轉換**（TransformInputPanel）：
  - X東 = +100 → `position.x = 100`（無翻轉）
  - Z北 = +100 → `position.z = -100`（Z 軸取反，因 Three.js -Z = 北）
  - Y高程 = +100 → `position.y = 100`（無翻轉）
- **指北針**: north = -Z（`angle = atan2(forward.x, -forward.z)`），地質與設施模組統一

---

## 已完成功能

### 1. 地質模組 (Geology Module) — 完整

- 3D 場景初始化（React Three Fiber + Three.js）
- 800+ 鑽孔 InstancedMesh 高效渲染 + LOD 機制
- 鑽孔點選互動與詳細資訊面板（動態高度優化）
- 圖層控制面板（開關、透明度）
- 剖面切片工具（Clipping Plane）
- 斷層線與位態符號視覺化
- 地質構造（斷層面）完整 CRUD + CSV 批次匯入
- 導覽模式（Guided Tour）
- 真實鑽孔資料正式串接（project-scoped API）

### 2. 地形與著色 — 完整

- DEM 地形整合（GeoTIFF / CSV → 16-bit Heightmap）
- 衛星影像融合（reproject/resample 自動對齊）
- 三模式紋理切換（衛星影像 / Hillshade / Color Ramp）
- 地形圖例（Color Ramp, Reverse, Z-range）+ 設定持久化
- 航照圖高程控制（-500m ~ 100m offset）

### 3. 地下水位面 — 完整

- Python 處理器（CSV/DAT/TXT → SciPy griddata 插值 → 16-bit heightmap）
- 雙模式範圍（well: user-defined / simulation: auto-detect）
- API：POST/GET/DELETE `/api/water-level`
- 3D 渲染：半透明藍色 Displacement Mesh + Clipping Plane
- 圖層控制 + 上傳 UI

### 4. 3D 地質模型 — 完整

- Tecplot `.dat` + CSV Voxel → Isosurface Mesh（GLB）via Marching Cubes
- 前端 `useGLTF` 載入 + Clipping Plane + 透明度

### 5. 設施導覽模組 — 完整（含動畫系統 + 曲線路徑 + 3D 路徑編輯 + 手動觸發 + 場景轉場 + Error Boundary + 視角切換）

#### 5a. 後端與資料庫
- Prisma Schema：`FacilityScene`（自我參照巢狀）+ `FacilityModel`（含 `introduction String?`, `modelType`）+ `FacilityModelInfo` + `FacilityAnimation`
- 後端 API（`server/routes/facility.ts`）：場景/模型/Rich Content/平面圖/地形/動畫 完整 CRUD
- 動畫 API：GET/POST `/models/:id/animations`, PUT/DELETE `/animations/:animId`

#### 5b. 前端頁面與路由
- `/project/:code/facility` → `FacilityPage`（3D 導覽）
- `/project/:code/facility-data` → `FacilityDataPage`（資料管理，獨立頁面）
- `ProjectDashboardPage`：儀表板拆為「地質資料管理」與「設施資料管理」兩個獨立卡片
- `DataManagementPage`：已移除 FacilityUploadSection（僅保留地質相關）

#### 5c. 設施導覽 3D 頁面（FacilityPage）
- 無頂部 Toolbar：FacilityToolbar 已從頁面移除
- 側邊欄（FacilitySidebar）：白色亮色主題
  - 返回專案儀表板連結
  - 可收合切換（280px <-> 50px）
  - 視角快速切換按鈕（俯視/預設/重置）— 模型清單上方
  - 模型清單：Checkbox 多選 + 全域播放/暫停按鈕 + 批次工具列
  - 「進入/退出編輯模式」按鈕
  - 「進入/退出動畫模式」按鈕（紫色主題，與編輯模式互斥）
  - 動畫模式下 Transform 數值輸入面板（移動/旋轉/縮放，200ms 同步 3D groupRef）
- 編輯模式：TransformInputPanel 精確輸入（座標軸已對應工程語義）
- 動畫模式：底部 AnimationTimeline 面板（多軌模式）
- 截圖：右下角按鈕，InfoPanel 開啟時左移，動畫模式下上移
- 指北針：FacilityNorthArrow（north = -Z）

#### 5d. 多模型選取與批次操作（2026-03-05）

**選取架構**：
```
selectedModelIds: string[]     ← Cmd/Ctrl+Click 或 Checkbox 多選
focusedModelId: string | null  ← 焦點模型（唯一，用於編輯/動畫/資訊面板）
hiddenModelIds: string[]       ← 客戶端隱藏（不影響 DB）
```

**操作行為**：
| 操作 | 行為 |
|------|------|
| 單擊模型（3D 或 sidebar） | 設為焦點 + 加入選取 |
| Cmd/Ctrl + 單擊 | 切換選取（toggle），不改焦點 |
| Checkbox | 純切換選取 |
| 批次顯示/隱藏 | 切換 `hiddenModelIds`，隱藏的模型 `return null`（不渲染） |
| 批次刪除 | 需二次確認（3 秒超時），呼叫 `DELETE /api/facility/models/:id` |

**UI 反饋**：
- 焦點模型：藍色背景（`#2563eb`）
- 選取模型：淡藍背景（`#dbeafe`）
- 隱藏模型：50% opacity + 刪除線文字
- Checkbox：選取時藍色，未選取時淡灰

#### 5e. 動畫系統（2026-03-05）

**資料模型**：
```
FacilityAnimation (1:N from FacilityModel)
  ├─ type: 'keyframe' | 'gltf'
  ├─ trigger: 'auto' | 'manual'
  ├─ loop, duration, easing
  ├─ gltfClipName (GLB 內嵌動畫名稱)
  └─ keyframes: [{ time, position, rotation, scale }]
```

**混合動畫架構**：
| 層級 | 來源 | 控制內容 | 範例 |
|------|------|---------|------|
| GLB 內嵌動畫 | Blender/SketchUp 匯出 | 骨骼/形變動畫 | 吊車手臂升降、車門開關 |
| 關鍵幀動畫 | 本系統時間軸編輯 | position/rotation/scale | 車子沿路線移動、旋轉轉彎 |

兩層可同時疊加：車子沿路線移動（關鍵幀）的同時播放車輪轉動（GLB 內嵌）。

**關鍵幀引擎**（`FacilityModelItem.tsx` 內的 `interpolateKeyframes`）：
- Position: 直線段 `Vector3.lerpVectors`、曲線段 `CatmullRomCurve3.getPointAt`（弧長等速）
- Rotation: `Quaternion.slerpQuaternions`（避免 gimbal lock），autoOrient 時自動沿切線旋轉
- Scale: `Vector3.lerpVectors`
- Easing: `linear`, `easeIn`, `easeOut`, `easeInOut`
- **Per-segment pathMode**: 每個 keyframe 可設定 `pathMode: 'linear' | 'catmullrom'`，覆蓋動畫預設

**曲線路徑插值架構**（`FacilityModelItem.tsx`）：
```
_curveCache = Map<key, {curve, arcLengths}>   ← per-animation 快取（最多 50 條）

getGlobalCurve(posKeyframes)       → 建/取快取 CatmullRomCurve3 (centripetal)
    └─ getLengths(n)               → 預計算每個控制點的弧長比例 (0~1)
getCurveArcLengths(posKeyframes)   → 取快取的弧長映射表

sampleGlobalCurve(curve, arcLengths, segIdx, alpha) → 從曲線取第 segIdx 段的 alpha 位置
    └─ arcStart/arcEnd             → 該段的弧長起止
    └─ getPointAt(arcT)            → 弧長等速取樣
    └─ getTangentAt(arcT)          → 取切線（autoOrient 用）
```

**注意**：曲線快取已從 module-level singleton 改為 `Map`（I5 修復），支援多模型同時播放不會互相覆蓋。快取以控制點座標拼接為 key，上限 50 條，LRU 淘汰。

**Per-segment 混合邏輯**：
- 每個 keyframe 的 `pathMode` 欄位控制「從此 keyframe 到下一個」的插值方式
- 空值或 undefined → fallback 到動畫的全域 `pathMode`
- 全域曲線保證控制點位置連續，直線段用 lerp、曲線段從全域曲線取樣

**為何用 centripetal 而非 uniform**：
- Uniform `'catmullrom'` 在急轉彎處會 overshoot（曲線超過目標後折回，產生 S 形雙轉折）
- Centripetal 用 √(弦長) 做參數化，轉彎越急間距越短，不會自交叉或產生尖點

**弧長等速 vs 均勻參數化**：
- `getPoint(t)`: t 均勻分布在控制點上，速度不均勻（長段快、短段慢）
- `getPointAt(u)`: u 均勻分布在弧長上，速度均勻（視覺上更自然）
- 視覺化用 `getPoint`（路徑形狀一樣，只需正確幾何）；動畫插值用 `getPointAt`（需等速）

**播放狀態與動畫行為對照**：
| playbackState | auto 動畫 | 編輯中動畫 | 動畫模式非編輯中 |
|--------------|-----------|-----------|----------------|
| `stopped`（預設） | 自動播放 | N/A | N/A |
| `playing` | 自動播放 | 跟隨 playbackTime | 凍結 |
| `paused`（進入動畫模式） | 暫停 | scrub 到 playbackTime 位置 | 凍結 |

**關鍵設計決策**：
1. 進入動畫模式 → `playbackState = 'paused'`，所有動畫凍結
2. 退出動畫模式 → `playbackState = 'stopped'`，auto 動畫恢復自動播放
3. `animationMode && !isEditingThis` → 空分支，完全不執行任何插值（凍結）
4. `lastAppliedPauseTime` ref → paused 狀態下只 snap 一次，之後允許 TransformControls 自由拖曳
5. `fetchModels` 完成後自動 `fetchAnimationsForModels` 載入所有模型動畫
6. `fetchAnimationsForModels` 使用 merge 策略，不會覆蓋已載入的其他模型動畫

**多軌時間軸**（`AnimationTimeline.tsx`）：
- 每個 `selectedModelIds` 中的模型各一條軌道（`ModelTrackRow`）
- 焦點軌道：藍色左邊框 + 高亮背景，可編輯動畫屬性與關鍵幀
- 非焦點軌道：灰色，僅顯示軌道可視化
- 播放控制在 header，共用於所有軌道
- 關鍵幀操作（新增/編輯/刪除）限焦點模型的選中動畫

**手動觸發播放**（A2，2026-03-06）：
- `manualPlayingModelIds: string[]` — 正在播放手動動畫的模型 ID 列表
- `toggleManualPlay(modelId)` — 若不在列表則加入（播放），在列表則移除（停止）
- Keyframe 手動播放：獨立 `manualStartTimeRef` + `manualNeedReset` refs，非循環播完自動停止
- GLB 手動播放：`manualGltfActionsRef` 預建 actions，useEffect on `isManualPlaying` 控制 play/stop
- Sidebar 按鈕：有 `trigger='manual'` 動畫的模型旁顯示 Play（灰 `#9ca3af`）/ Pause（紫 `#7c3aed`）按鈕
- 狀態重設：場景切換（enterScene/goBack/goToRoot/fetchScenes）+ 動畫模式進入時清空

**動畫路徑可視化 + 3D 路徑編輯器**（A4 + Phase 2，2026-03-06）：
- 顯示條件：`animationMode && selectedAnimationId` 匹配 keyframe 動畫 && >= 2 個帶 position 的 keyframes
- `pathVizData` useMemo：篩選有 position 的 keyframes → per-segment 混合直線/曲線路徑
  - 曲線段：建全域 `CatmullRomCurve3(centripetal)`，每段 20 個取樣點 via `getPoint`
  - 直線段：直接連接控制點
- 路徑線：drei `<Line>` 紫色 `#7c3aed`
- **可拖曳控制點**（`PathControlPoint` 子元件）：
  - 節點球：`SphereGeometry(0.8/1.0/1.2)` 紫色，hover 時放大 + 亮色 + cursor pointer
  - 點擊節點球 → 選取該 keyframe（同步時間軸高亮 + 播放頭跳到該時間）
  - 選中的節點球掛 `TransformControls (mode='translate', size=0.6)` → 拖曳平移
  - 拖曳結束 → debounce 300ms `updateKeyframe` 寫入 API 持久化
- 渲染在 model group 之外（場景空間），不受動畫 transform 影響

**時間軸 keyframe 拖曳**（`AnimationTimeline.tsx`）：
- 菱形標記（10px）支援 pointer 拖曳移動時間位置
- 區分點擊 vs 拖曳：pointerDown 記起始 X，pointerMove 超過 3px 閾值才啟動拖曳
- Clamp：不可超過前/後 keyframe（最小間距 0.05s），捨入到 0.1s
- 拖曳中即時更新菱形位置（`dragTime` local state）+ 播放頭同步
- 放開後寫 API 持久化（`updateAnimation` with updated keyframes）
- 沒拖曳 → 純點擊選取/取消選取（原本行為）

**動畫選擇記憶**（`facilityStore.ts`）：
- `selectedAnimPerModel: Record<string, string>` — 每個模型記住上次選取的動畫 ID
- `selectAnimation` 寫入 map，`setAnimationMode(true)` 時清空
- `ModelTrackRow` useEffect：焦點切換時自動恢復記憶的動畫或選第一個

**動畫名稱中文輸入修正**（`AnimationTimeline.tsx`）：
- 問題：`onChange` 直接呼叫 `updateAnimation` API 會打斷 IME composition
- 修正：`editingAnimName` local state buffer + `onBlur` / Enter 才呼叫 API

**全域播放按鈕**（sidebar 模型清單標題列）：
- 場景內有任何帶 keyframe 的動畫時顯示
- 動畫編輯模式下隱藏（Timeline 有自己的控制）
- 播放中：紫色背景 + Pause 圖示
- 停止/暫停中：白色背景 + Play 圖示

**Zustand Store 動畫狀態**（`facilityStore.ts`）：
```typescript
// 選取狀態
selectedModelIds: string[]
focusedModelId: string | null
hiddenModelIds: string[]

// 動畫狀態
animations: FacilityAnimation[]
animationMode: boolean
selectedAnimationId: string | null
playbackState: 'stopped' | 'playing' | 'paused'
playbackTime: number
editingKeyframeIndex: number | null
manualPlayingModelIds: string[]   // 正在播放手動動畫的模型 ID (A2)
selectedAnimPerModel: Record<string, string>  // 每模型記憶的動畫選擇

// 場景轉場 (N1)
transitionState: 'idle' | 'flyToModel' | 'fadeOut' | 'loading' | 'fadeIn'
transitionTargetSceneId: string | null
transitionModelId: string | null

// 視角快速切換
viewPreset: 'top' | 'default' | 'reset' | null

// 選取 Actions
selectModel(id, multi?)       // 單選或多選
toggleModelSelection(id)      // Checkbox toggle
setFocusedModel(id)           // 設定焦點
batchDeleteModels(ids)        // 批次刪除
toggleModelVisibility(ids)    // 切換顯示/隱藏

// 動畫 Actions
fetchAnimations, fetchAnimationsForModels(ids)
createAnimation, updateAnimation, deleteAnimation
addKeyframe, updateKeyframe, deleteKeyframe
setAnimationMode, selectAnimation, setPlaybackState, setPlaybackTime
toggleManualPlay(modelId)     // 切換手動動畫播放/停止 (A2)

// 場景轉場 Actions (N1)
startSceneTransition(sceneId, modelId)  // 啟動轉場（有 modelId 先 fly-to）
advanceTransition()                      // 推進狀態機

// 視角快速切換 Actions
setViewPreset(preset)         // 設定視角 preset
clearViewPreset()             // CameraController 消費後清除
```

**模組層級 ref 註冊**（`facilityStore.ts`）：
```typescript
const _modelGroupRefs = new Map<string, THREE.Group>();
export function registerModelGroupRef(id, ref)  // FacilityModelItem 掛載時註冊
export function unregisterModelGroupRef(id)      // FacilityModelItem 卸載時反註冊
export function getModelGroupRef(id)             // AnimationTimeline / Sidebar 讀取即時 transform
```

#### 5f. 模型資訊面板（FacilityInfoPanel）
- 右下角浮動面板，`width: 340px`，`max-height: 60vh`，`zIndex: 110`
- 三區塊：設施介紹（RichTextView） / 設施圖說 / 自訂欄位
- 動畫模式下隱藏（`!animationMode` 條件）

#### 5g. 模型資訊 Dashboard（FacilityUploadSection Tab 3）
- 卡片牆 + ModelInfoModal 全螢幕編輯
- TipTap WYSIWYG 編輯器（Bold/Italic/Underline/H1-H3/List/TextAlign/Link/Image Upload/Table）
- RichTextView 唯讀渲染（含 table/image CSS）

#### 5h. 設施資料管理（5 Tab）
- 場景管理 / 模型上傳 / 模型資訊 / 場景地形 / 模型管理

#### 5i. 場景切換過渡動畫（N1，2026-03-06）

**5 狀態轉場機**：
```
idle → flyToModel → fadeOut → loading → fadeIn → idle
```

**State**（`facilityStore.ts`）：
```typescript
transitionState: 'idle' | 'flyToModel' | 'fadeOut' | 'loading' | 'fadeIn'
transitionTargetSceneId: string | null
transitionModelId: string | null
startSceneTransition(sceneId, modelId)   // 啟動轉場
advanceTransition()                       // 推進狀態機
```

**轉場流程**：
| 階段 | 動作 | 觸發者 |
|------|------|--------|
| `idle → flyToModel` | `startSceneTransition()` 設定 flyToModelId，CameraController 開始 300ms fly-to | sidebar / Lobby 按鈕 |
| `flyToModel → fadeOut` | fly-to 完成時 `flyCompleteCallback` 呼叫 `advanceTransition()` | CameraController useFrame |
| `fadeOut → loading` | 200ms + 20ms buffer 後 `advanceTransition()` 呼叫 `enterScene()` | FacilityPage useEffect |
| `loading → fadeIn` | `isLoading` 變 false 後 50ms 延遲 `advanceTransition()` | FacilityPage useEffect |
| `fadeIn → idle` | 200ms fade-in 後 `advanceTransition()` | FacilityPage useEffect |

**黑幕 overlay**（`FacilityPage.tsx`）：
```tsx
<div style={{
    position: 'absolute', inset: 0, zIndex: 15, background: '#000',
    opacity: (transitionState === 'fadeOut' || transitionState === 'loading') ? 1 : 0,
    pointerEvents: transitionState === 'idle' ? 'none' : 'all',
    transition: 'opacity 200ms ease-in-out',
}} />
```

**相機策略**（`FacilityCameraController.tsx`）：
- `transitionState === 'flyToModel'`：fly-to 用 300ms（一般 fly-to 用 1000ms），完成時觸發 `advanceTransition`
- `transitionState === 'loading' || 'fadeIn'`：瞬間設定相機到新場景 `cameraPosition/cameraTarget`（黑幕遮蓋，不需動畫）
- `goBack` / `goToRoot` 不走 transition，直接切換場景 + 飛行動畫

**設計文件**: `docs/plans/2026-03-06-n1-scene-transition-design.md`

#### 5j. 模型載入 Error Boundary（N2，2026-03-06）

**實作位置**: `src/components/facility/FacilityModels.tsx`

```tsx
class ModelErrorBoundary extends React.Component<Props, State> {
    static getDerivedStateFromError(error: Error) { ... }
    handleRetry = () => this.setState({ hasError: false, error: null });
    render() {
        if (this.state.hasError) {
            return (
                <group position={...} rotation={...}>
                    {/* 紅色半透明方塊 + 線框 */}
                    <Html center>
                        {/* 模型名稱 + 錯誤訊息 + 重試按鈕 */}
                    </Html>
                </group>
            );
        }
        return this.props.children;
    }
}

// 使用
<ModelErrorBoundary key={model.id} model={model}>
    <FacilityModelItem model={model} />
</ModelErrorBoundary>
```

**重試機制**: `setState({ hasError: false })` → 重新 mount `FacilityModelItem` → `useGLTF` 重新載入 GLB

#### 5k. 視角快速切換（2026-03-06）

**UI**: sidebar 麵包屑下方、模型清單上方，3 個橫排按鈕

| 按鈕 | 行為 | 相機位置計算 |
|------|------|-------------|
| 俯視 | 正上方往下看 | `(center.x, radius*1.5, center.z+0.01)` → `+0.01` 避免 gimbal lock |
| 預設 | 回到場景設定相機位置 | 有 `cameraPosition` → 用場景設定；無 → 斜 45° fallback |
| 重置 | fit-all 視角 | `center + (0, dist*0.6, dist)`，dist 由模型分布半徑決定 |

**場景中心計算優先順序**: `cameraTarget` → `modelBboxCenters` 平均 → `model.position` 平均 → 原點

**Store**（`facilityStore.ts`）：
```typescript
viewPreset: 'top' | 'default' | 'reset' | null
setViewPreset(preset)    // 設定 preset，CameraController 監聽
clearViewPreset()        // CameraController 消費後清除
```

**CameraController** 監聽 `viewPreset` 變化 → 計算目標相機位置 → 800ms cubic ease-out fly 動畫

### 6. 基礎架構 — 完整

- JWT 認證（Access Token + Refresh Token + HTTP-only Cookie）
- 多專案架構（project-scoped 路由與資料隔離）
- Docker PostgreSQL（port 5433）+ Prisma 7 ORM
- 儲存空間清理系統（孤兒檔案掃描 + 垃圾桶）
- 動態指北針 + 快速視角切換 + Gimbal Lock 修正

### 7. 安全審計與修復 (2026-03-06) — 完整

經過完整 code review（152 commits, 251 files, 65k+ lines），識別並修復以下安全與品質問題：

#### Critical（已修復）

| # | 問題 | 修復方式 | 檔案 |
|---|------|---------|------|
| C1 | **路徑穿越** — `file.originalname` 可含 `../` 寫入任意位置 | `path.basename()` + `encodeURIComponent()` | `server/routes/facility.ts:496` |
| C2 | **XSS** — `dangerouslySetInnerHTML` 直接渲染未消毒 HTML | `DOMPurify.sanitize(html)` | `src/components/common/RichTextView.tsx` |
| C3 | **敏感檔案已提交** — `dev.db`, `__pycache__`, `server.log`, `cookies.txt` | `git rm --cached` + `.gitignore` 更新 | `.gitignore` |

#### Important（已修復）

| # | 問題 | 修復方式 | 檔案 |
|---|------|---------|------|
| I2 | **JWT fallback 硬編碼** — `'dev-secret'` 在 production 可被利用 | production 環境缺 secret 直接 throw 啟動錯誤 | `server/middleware/auth.ts` |
| I4 | **材質 GPU 記憶體洩漏** — hover/select 每次 clone 材質不 dispose | 直接修改 `emissive` 屬性，不 clone | `FacilityModelItem.tsx:564` |
| I5 | **全域曲線快取衝突** — module-level singleton 多模型互覆蓋 | `Map<key, {curve, arcLengths}>` per-animation 快取 | `FacilityModelItem.tsx:28` |
| I6 | **fetchScenes 無法強制刷新** | 新增 `force` 參數跳過 guard | `facilityStore.ts:170` |

#### Important（尚未修復 — 需評估）

| # | 問題 | 建議 | 優先級 |
|---|------|------|--------|
| I1 | **認證系統 in-memory** — server 重啟遺失使用者 | 遷移至 Prisma User model | 中（Production 前必修） |
| I3 | **GET 路由無認證** — 多數資料完全公開 | 統一加 `authenticate` 或記錄為公開 API | 中 |

#### Suggestions（建議改善）

| # | 問題 | 建議 |
|---|------|------|
| S1 | `useFrame` 每幀 `new THREE.Vector3` 產生 GC 壓力 | 提升為 module-level reusable 變數 |
| S2 | `setPlaybackTime` 每幀觸發 Zustand 更新 | throttle 或 `requestAnimationFrame` 節流 |
| S3 | FacilityCanvas 缺頂層 ErrorBoundary | 加 `FacilityCanvasErrorBoundary` 防白屏 |
| S4 | Python 路徑僅限 macOS/Linux | 加 Windows `Scripts\python.exe` 判斷 |
| S5 | `express.json({ limit: '50mb' })` 過大 | 降低或加 rate limiting |

---

## 動畫系統 — 高優先級待辦（A 系列）

### ~~A1. 動畫編輯模式中使用 TransformControls 記錄關鍵幀~~ — 已完成

### ~~A2. 手動觸發動畫的播放 UI~~ — 已完成 (2026-03-06)

**實作摘要**：

- **Store**: `manualPlayingModelIds: string[]` + `toggleManualPlay(modelId)` action
- **Keyframe 手動播放**: `FacilityModelItem.tsx` useFrame 新增 `trigger === 'manual' && isManualPlaying` 分支，使用獨立 `manualStartTimeRef` 計時
- **GLB 手動播放**: `manualGltfActionsRef` 預建 AnimationAction 但不 play，`isManualPlaying` useEffect 控制 play/stop
- **Sidebar 按鈕**: 有 `trigger='manual'` 動畫的模型旁顯示 Play/Pause 按鈕（紫色），動畫編輯模式下隱藏
- **狀態重設**: 場景切換、動畫模式進入時自動清空 `manualPlayingModelIds`
- **非循環自動停止**: 非 loop 的手動動畫播完後自動從 `manualPlayingModelIds` 移除

**設計文件**: `docs/plans/2026-03-05-a2-manual-trigger-animation-design.md`

---

### A3. 關鍵幀動畫結束時回到原始位置

**目前狀態**: 非循環 (`loop=false`) 的關鍵幀動畫播放結束後，模型停留在最後一幀位置。

**需實作**:
- 非循環動畫結束時，模型應回到 DB 中的原始 position/rotation/scale
- 或提供選項：「結束後停留最後位置」vs「結束後回到原位」

---

### ~~A4. 動畫路徑可視化 + 3D 路徑編輯器~~ — 已完成 (2026-03-06, Phase 1 + Phase 2)

**Phase 1 — 曲線路徑插值**：

- **Catmull-Rom centripetal 樣條**: 全域曲線插值，急轉彎不 overshoot（centripetal vs uniform 的差異見上方 5e）
- **弧長等速參數化**: `getLengths(n)` + `getPointAt` 確保等速移動
- **Per-segment pathMode**: 每段 keyframe 可獨立設定 `pathMode: 'linear' | 'catmullrom'`
- **autoOrient**: 自動沿路徑切線旋轉（Y 軸 yaw）
- **DB Schema**: `FacilityAnimation` 新增 `pathMode String @default("linear")` + `autoOrient Boolean @default(false)`
- **AnimationKeyframe 型別**: 新增 `pathMode?: 'linear' | 'catmullrom'`（per-segment 覆蓋）
- **後端**: POST/PUT 動畫 API 接受 `pathMode` + `autoOrient` 欄位
- **UI**: AnimationTimeline 新增路徑模式 dropdown、自動朝向 checkbox、per-keyframe 路徑模式 selector

**Phase 2 — 3D 路徑控制點編輯器**：

- **`PathControlPoint` 子元件**: 可互動的節點球（`SphereGeometry(0.8/1.0/1.2)`）
- **點擊選取**: 點擊節點球 → `setEditingKeyframeIndex(kfIndex)` + 播放頭跳到該時間
- **TransformControls 拖曳**: 選中節點掛 `TransformControls(mode='translate', size=0.6)`，拖曳平移
- **API 持久化**: 拖曳結束 debounce 300ms → `updateKeyframe` 更新 position
- **hover 回饋**: 放大 + 亮紫色 + cursor pointer

**時間軸 keyframe 拖曳**：
- 菱形標記可拖曳移動時間位置
- 點擊 vs 拖曳區分（3px 閾值）
- Clamp 前後 keyframe（最小間距 0.05s），捨入到 0.1s

**其他改善**：
- 動畫選擇記憶（`selectedAnimPerModel` Map）
- 動畫名稱中文輸入修正（IME local state buffer）

**設計文件**: `docs/plans/2026-03-05-a4-animation-path-visualization-design.md`

---

### A5. 動畫匯出/匯入

**目的**: 允許使用者匯出動畫設定為 JSON 檔案，或從 JSON 匯入到其他模型。

**需實作**:
1. AnimationTimeline 新增「匯出」按鈕，將選中動畫的 keyframes/duration/easing 等導出為 JSON
2. 「匯入」按鈕，從 JSON 檔案讀取並 POST 建立新動畫
3. 匯入時自動對齊第一個 keyframe 到模型當前位置（offset）

---

## 設施導覽模組 — 高優先級待辦（N 系列）

### ~~N1. 場景切換淡出淡入動畫~~ — 已完成 (2026-03-06)

**實作摘要**：
- **5 狀態轉場機**: `idle → flyToModel → fadeOut → loading → fadeIn → idle`
- **Store**: `transitionState` + `startSceneTransition()` + `advanceTransition()` actions
- **FacilityPage**: 黑色 `<div>` overlay，CSS `opacity` transition 200ms
- **CameraController**: transition fly-to 300ms + 黑幕中瞬間設定新場景相機
- **入口統一**: sidebar 與 Lobby 按鈕都改用 `startSceneTransition(sceneId, modelId)`
- **設計文件**: `docs/plans/2026-03-06-n1-scene-transition-design.md`

---

### ~~N2. 模型載入錯誤處理（Error Boundary）~~ — 已完成 (2026-03-06)

**實作摘要**：
- **Class Component**: `ModelErrorBoundary` 在 `FacilityModels.tsx` 包裹每個 `FacilityModelItem`
- **Fallback**: 紅色半透明方塊 + 線框 + Html 標籤（模型名稱/錯誤訊息/重試按鈕）
- **重試**: `setState({ hasError: false })` → 重新 mount 子元件 → `useGLTF` 重載

---

### N3. 自動俯視截圖（Auto Plan Image）

**目的**：`FacilityScene.autoPlanImageUrl` 欄位存在但截圖功能尚未實作。

**背景**：後端 API `PUT /api/facility/scenes/:id/auto-plan-image` 已就緒，只需前端截圖並上傳。截圖必須在 R3F Canvas 內部執行（需 `useThree` 取得 `gl`）。目前 `FacilityCaptureHandler.tsx` 已暴露 `facilityCanvasEl` 模組層級變數，可直接取得 Canvas DOM 元素。

**需實作**：
1. 切換到 OrthographicCamera → 設定俯視角度（top-down）
2. `gl.domElement.toDataURL('image/png')` 取得截圖
3. 上傳到 `PUT /api/facility/scenes/:id/auto-plan-image`
4. 在 FacilitySidebar 底部或 PlanView 上方加「生成俯視圖」按鈕觸發

**相關檔案**：
- `src/components/facility/FacilityCaptureHandler.tsx`（`facilityCanvasEl` 已就緒）
- `src/components/facility/FacilitySidebar.tsx`（加按鈕）
- `server/routes/facility.ts`（`auto-plan-image` 端點，已存在）

---

### N4. PlanView 標記位置修正（考慮 coordShift）

**目的**：目前 PlanView 映射標記位置時未考慮場景的 `coordShiftX/Z`，若地形有偏移，標記位置會偏差。

**修正邏輯**（`src/components/facility/PlanView.tsx`）：
```typescript
// 取模型位置時，先扣除場景 coordShift
const adjustedX = model.position.x - (currentScene?.coordShiftX ?? 0);
const adjustedZ = model.position.z - (currentScene?.coordShiftZ ?? 0);
// 再用 terrainBounds 映射到圖片百分比
```

---

## 設施導覽模組 — 中優先級待辦

### ~~N5. 上傳後自動刷新 3D 場景~~ — 已完成 (2026-03-06)

**實作摘要**：

- **雙重策略**: 主動刷新 + 被動刷新並用
- **`refreshCurrentScene()` action**（`facilityStore.ts`）:
  - 繞過 `fetchScenes()` 的 `loadedProjectId` guard，直接 `axios.get` 重抓場景列表
  - 若有 `currentSceneId` 則接著 `fetchModels(currentSceneId)` 重載模型
- **被動刷新**（`FacilityPage.tsx`）:
  - `document.addEventListener('visibilitychange', ...)` 監聽 tab 切回
  - `document.visibilityState === 'visible'` 時呼叫 `refreshCurrentScene()`
- **主動刷新**（`FacilityUploadSection.tsx`）:
  - 5 處 callback 結尾加 `useFacilityStore.getState().refreshCurrentScene()`：
    1. 模型上傳成功（`SceneModelUpload` 元件）
    2. ModelManager 儲存（Tab 5）
    3. ModelManager 刪除（Tab 5）
    4. 地形上傳成功（`SceneTerrainUpload` 元件）
    5. Dashboard 模型刪除（Tab 3）
- **使用 `getState()` 模式**: 因為 FacilityUploadSection 的子元件不直接 subscribe store，用 `useFacilityStore.getState()` 直接呼叫 action

**Debug tips**:
- 若 tab 切回未刷新，檢查 `visibilitychange` listener 是否被 cleanup
- 若主動刷新無效，確認 `loadedProjectId` 有值（第一次進入場景後才會設定）

---

### ~~N6. 大型 GLB 載入進度~~ — 已完成 (2026-03-06)

**實作摘要**：

- **攔截點**: `THREE.DefaultLoadingManager`（全域 loading manager，`useGLTF` 自動使用）
- **State**: `loadProgress` (0–100)，初始 100（隱藏）
- **Callbacks**:
  - `onStart(url, loaded, total)`: 設定初始進度，清除隱藏 timer
  - `onProgress(url, loaded, total)`: 更新進度百分比
  - `onLoad()`: 設定 100%，500ms 後保持 100%（觸發隱藏）
- **UI**: `FacilityPage.tsx` Canvas 上方，`position: absolute; top: 0; height: 3px`
  - 藍色 `#2563eb`，`transition: width 0.3s ease-out`
  - `zIndex: 20`，`pointerEvents: none`
  - `loadProgress < 100` 時顯示
- **保留既有 callbacks**: 存儲 `prevOnStart/prevOnProgress/prevOnLoad`，chain call 避免破壞其他程式碼
- **Cleanup**: `useEffect` return 時還原原始 callbacks + clearTimeout

**為何不用 `useProgress`**: drei 的 `useProgress` hook 必須在 `<Canvas>` 內部使用，而進度條 UI 在 Canvas 外面的 HTML overlay，因此直接 hook `THREE.DefaultLoadingManager` 更合適。

**Debug tips**:
- 進度條一直不消失 → 檢查 `onLoad` 是否被觸發（可能有資源載入失敗卡住）
- 進度跳動不平滑 → `onProgress` 的 `total` 是檔案總數非位元組數，大 GLB 會一次跳大幅度

### N7. Hover 高亮優化

**目前**：emissive + `emissiveIntensity: 0.3`，效果較弱。

**可選方案**：
- A. 調高 `emissiveIntensity` 到 0.6（最簡單）
- B. `@react-three/postprocessing` 的 `Outline` pass（效果最好，但有 GPU 開銷）
- C. Geometry 縮放 + backside 材質（wireframe outline，中等成本）

### ~~N8. 模型資訊面板 UX 優化~~ — 已完成 (2026-03-06)

**實作摘要**：

- **`modalError` state**（`FacilityUploadSection.tsx`）：ModelInfoModal 新增 `modalError` 行內紅色錯誤條
- **3 個 silent catch 改善**：`saveIntro`、`handleDeleteDiagram`、`handleDeleteField` 改為顯示 `modalError` 錯誤訊息
- **批次上傳錯誤**：`handleDiagramFiles` 追蹤 `failedNames[]`，上傳完成後匯總顯示失敗檔名
- **空內容防護**：FacilityInfoPanel `.filter(d => d.content)` 防止 `resolveUrl('')` 回傳 API 根路徑
- **未改動**：`handleAddField` FormData（保持現有行為）

---

## 設施導覽模組 — 低優先級待辦

### N9. 地形自動對齊功能

**目的**：目前地形與模型的座標對齊需手動設定 `coordShiftX/Y/Z`，應提供「自動對齊」按鈕。

**邏輯**：
1. 計算所有模型 position 的 bounding box 中心 `(cx, cy, cz)`
2. 計算地形 `terrainBounds` 的 XZ 中心
3. 差值自動填入並呼叫 `PUT /api/facility/scenes/:id`（`coordShiftX/Z` 欄位）

### N10. 場景間複製/移動模型

允許使用者將模型從一個場景移動或複製到另一個場景，在 ModelManager Tab 中操作。

### N11. 多人即時狀態同步

WebSocket 同步多使用者游標位置與選取狀態。（YAGNI，視需求開放）

### N12. 模型格式轉換

支援 OBJ、FBX、STL 上傳並自動轉換為 GLB。（YAGNI）

---

## 安全與架構 — 待辦（Production 前必修）

### SEC1. 認證系統遷移至 DB（對應 I1）

**目前狀態**: `server/routes/auth.ts` 使用 in-memory `Map` 儲存使用者與 session，server 重啟即遺失全部資料。密碼硬編碼（`engineer123` 等）。

**需實作**:
1. Prisma `User` model（email, hashedPassword, role, createdAt）
2. 密碼使用 `bcrypt` 雜湊儲存
3. Refresh token 持久化至 DB（可選 Redis）
4. 註冊 / 重設密碼 API
5. 移除硬編碼的預設使用者

**相關檔案**:
- `server/routes/auth.ts`（改寫目標）
- `server/prisma/schema.prisma`（新增 User model）
- `server/middleware/auth.ts`（JWT secret 已加 production 保護）

---

### SEC2. API 路由認證策略統一（對應 I3）

**目前狀態**: `GET /api/water-level` 有 `authenticate` middleware，但其餘多數 GET 路由無認證。

**需決策**:
- A. 全部 GET 路由加 `authenticate`（嚴格）
- B. 保持 GET 公開、POST/PUT/DELETE 需認證（寬鬆）
- C. 加入 `optionalAuth`，讓認證過的使用者看到更多資料（混合）

**影響路由**:
- `GET /api/facility/scenes`
- `GET /api/facility/models`
- `GET /api/borehole`
- `GET /api/terrain`
- `GET /api/geology-model`
- `GET /api/upload/imagery`
- 等 10+ 路由

---

### SEC3. 效能優化（對應 S1, S2, S3）

**S1 — useFrame 記憶體分配**:
```typescript
// 目前：每幀 new
const result = new THREE.Vector3();
// 改為：module-level reusable
const _tmpVec = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpEuler = new THREE.Euler();
```

**S2 — setPlaybackTime 節流**:
```typescript
// 目前：每幀觸發 Zustand 更新
useFacilityStore.getState().setPlaybackTime(currentTime);
// 改為：throttle 60ms（約 16fps 更新 UI）
```

**S3 — FacilityCanvas ErrorBoundary**: 在 `FacilityPage.tsx` 的 `<FacilityCanvas>` 外包一層 ErrorBoundary，防止 WebGL context 錯誤導致白屏。

---

## 地質模組 — 後續優化任務

### 中優先級

#### G1. 岩性系統整合

- 確認 3D 地質模型渲染使用專案級 `LithologyDefinition` 顏色
- 岩性顏色編輯後，3D 場景即時更新
- CSV Voxel `lith_id` 與 `LithologyDefinition` ID 對應

#### G2. 斷層面功能完善

- 3D 視覺增強：斷層名稱標籤（Html Label）與傾向指示箭頭
- 點擊斷層後側邊欄自動顯示詳細參數

### 低優先級

#### G3. 效能優化

- `StrikeDipSymbol` InstancedMesh 化（目前 100 個個別 mesh）
- Terrain LOD：超大範圍地形 Chunk LOD
- Terrain Interaction：Raycasting 取得地形座標與高度

#### G4. 地下水位面後續

- 多層水位面：同時顯示不同含水層
- 時間序列：時間滑桿動態切換
- 色階渲染（Color Ramp）取代純藍色
- 地形交叉分析：水位面與地形面差異（地下水埋深）

#### G5. 新模組開發

- 工程設計模組（Engineering Design — BIM/SketchUp 整合）
- 模擬模組（Simulation — 污染物傳輸、熱圖視覺化）
- 情境分析（豐水期 vs 枯水期）

---

## 已知問題與注意事項

| # | 問題 | 嚴重度 | 說明 |
|---|------|-------|------|
| 1 | `lucide-react` TS7016 警告 | 低 | 不影響執行，`lucide-react` 應自帶型別，需確認版本 |
| 2 | ~~`useGLTF` 無 Error Boundary~~ | ~~高~~ | ~~已完成 N2：ModelErrorBoundary 包裹 + 重試按鈕~~ |
| 3 | PlanView 標記不考慮 coordShift | 中 | 地形偏移時標記位置偏差（待 N4） |
| 4 | ~~上傳後 3D 場景不自動刷新~~ | ~~中~~ | ~~已完成 N5：主動刷新 + 被動 visibilitychange~~ |
| 5 | Docker DB 每次重開機需手動啟動 | 低 | `docker start llrwd-postgres` |
| 6 | `StrikeDipSymbol` 效能 | 低 | 100 個個別 mesh，未來應 InstancedMesh 化 |
| 7 | `CoordShiftPanel` 元件已從頁面移除 | 低 | 元件檔案保留，若需場景偏移功能需重新整合至其他 UI |
| 8 | ~~模型資訊錯誤回饋不足~~ | ~~中~~ | ~~已完成 N8：modalError 行內錯誤條 + 批次上傳錯誤匯總~~ |
| 9 | ~~手動觸發動畫無播放入口~~ | ~~中~~ | ~~已完成 A2：sidebar 模型旁 Play/Pause 按鈕~~ |
| 10 | `vite.config.ts` tsc 警告 | 低 | `path` 模組 TS2307/TS2304，不影響 build 與 dev |
| 11 | 場景無 `cameraPosition` 時預設/重置視角用 fallback | 低 | 視角快速切換已加 fallback 計算，但建議場景設定相機位置以獲得最佳體驗 |
| 12 | ~~路徑穿越漏洞~~ | ~~Critical~~ | ~~已修復 C1：`path.basename()` 清除 `../`~~ |
| 13 | ~~XSS 風險~~ | ~~Critical~~ | ~~已修復 C2：`DOMPurify.sanitize()` 消毒 HTML~~ |
| 14 | ~~敏感檔案已提交~~ | ~~Critical~~ | ~~已修復 C3：`git rm --cached` + `.gitignore`~~ |
| 15 | ~~材質 GPU 記憶體洩漏~~ | ~~Important~~ | ~~已修復 I4：不再 clone 材質~~ |
| 16 | ~~全域曲線快取衝突~~ | ~~Important~~ | ~~已修復 I5：改為 Map per-animation 快取~~ |
| 17 | 認證系統 in-memory | 中 | I1：server 重啟遺失使用者，Production 前需遷移至 Prisma User model |
| 18 | GET 路由無認證 | 中 | I3：多數 GET API 完全公開，需統一認證策略 |
| 19 | `useFrame` 每幀分配 THREE 物件 | 低 | S1：GC 壓力，建議提升為 reusable 變數 |
| 20 | `setPlaybackTime` 每幀 Zustand 更新 | 低 | S2：cascading re-render，建議 throttle |
| 21 | FacilityCanvas 缺頂層 ErrorBoundary | 中 | S3：GLB 載入失敗可能白屏 |
| 22 | Python 路徑僅限 macOS/Linux | 低 | S4：Windows 不相容 |
| 23 | `express.json limit: 50mb` | 低 | S5：潛在記憶體消耗攻擊向量 |

---

## 關鍵檔案位置

### 路由架構

| URL | 元件 | 說明 |
|:----|:-----|:-----|
| `/project/:code` | `ProjectDashboardPage` | 專案儀表板（含設施資料管理入口卡片） |
| `/project/:code/geology` | `GeologyPage` | 地質 3D 場景 |
| `/project/:code/facility` | `FacilityPage` | 設施導覽 3D 場景 |
| `/project/:code/facility-data` | `FacilityDataPage` | 設施資料管理（5 Tab） |
| `/project/:code/data` | `DataManagementPage` | 地質資料管理（不含設施） |

### 後端 — API Routes

| 檔案 | 說明 |
|:-----|:-----|
| `server/routes/facility.ts` | **設施導覽 API**（場景/模型/Rich Content/平面圖/地形/動畫） |
| `server/routes/auth.ts` | 認證 API |
| `server/routes/project.ts` | 專案管理 API |
| `server/routes/borehole.ts` | 鑽孔 API |
| `server/routes/attitude.ts` | 位態 API |
| `server/routes/faultPlane.ts` | 斷層面 API |
| `server/routes/geology-model.ts` | 地質模型 API（CSV/Tecplot → GLB） |
| `server/routes/upload.ts` | 航照圖 & 地球物理探查 API |
| `server/routes/terrain.ts` | DEM 地形 API |
| `server/routes/water-level.ts` | 地下水位面 API |
| `server/routes/cleanup.ts` | 儲存空間清理 API |

### 後端 — Python 處理腳本

| 檔案 | 說明 |
|:-----|:-----|
| `server/scripts/facility_terrain_processor.py` | **設施地形** CSV → heightmap + hillshade |
| `server/scripts/geology_mesh_builder.py` | Voxel CSV / Tecplot → GLB |
| `server/scripts/terrain_processor.py` | DEM + 衛星影像處理 |
| `server/scripts/water_level_processor.py` | 地下水位插值 |

### 前端 — 設施導覽元件（`src/components/facility/`）

| 檔案 | 說明 |
|:-----|:-----|
| `FacilityCanvas.tsx` | R3F Canvas 容器 + MapControls + Loading overlay |
| `FacilityEnvironment.tsx` | 三光源 + fog + gridHelper |
| `FacilityCameraController.tsx` | 800ms cubic ease-out fly-to 動畫 + **視角快速切換** + **場景轉場相機瞬移** |
| `FacilityModels.tsx` | 模型群管理 + **ModelErrorBoundary (N2)** |
| `FacilityModelItem.tsx` | 單一 GLB：useGLTF + emissive hover + TransformControls + **AnimationMixer + Catmull-Rom 曲線插值引擎 + 弧長等速 + autoOrient + 動畫凍結邏輯 + 手動觸發播放 + 路徑可視化 + PathControlPoint 3D 拖曳編輯** |
| `FacilityTerrain.tsx` | 16-bit heightmap → PlaneGeometry 頂點置換 + 衛星紋理 |
| `FacilitySidebar.tsx` | 側邊欄整合（亮色主題，含**視角快速切換**/多選/批次/全域播放/編輯/動畫模式按鈕 + Transform 數值輸入） |
| `BreadcrumbNav.tsx` | 麵包屑導覽 |
| `SceneTree.tsx` | 子場景樹狀清單 |
| `PlanView.tsx` | 2D 平面圖 + 模型標記 |
| `PlanViewFloating.tsx` | 浮動平面圖容器 |
| `FacilityInfoPanel.tsx` | **右下角浮動面板**（介紹/圖說/自訂欄位，340px/60vh，zIndex:110） |
| `FacilityNorthArrow.tsx` | 動態指北針（north = -Z） |
| `AnimationTimeline.tsx` | **多軌動畫時間軸面板**（每模型獨立軌道/屬性/播放控制/關鍵幀編輯/**keyframe 拖曳**/pathMode/autoOrient UI/動畫選擇記憶/IME 修正） |
| `FacilityCaptureHandler.tsx` | 暴露 `facilityCanvasEl` 模組變數供截圖使用 |
| `TransformInputPanel.tsx` | 移動/旋轉/縮放精確數值輸入（座標軸已對應工程語義） |
| `CoordShiftPanel.tsx` | 場景座標偏移（元件保留，但已從 FacilityPage 移除） |
| `FacilityToolbar.tsx` | 工具列（元件保留，但已從 FacilityPage 移除） |

### 前端 — 共用元件（`src/components/common/`）

| 檔案 | 說明 |
|:-----|:-----|
| `RichTextEditor.tsx` | TipTap WYSIWYG 編輯器（Bold/Italic/Underline/H1-H3/List/TextAlign/Link/Image/Table） |
| `RichTextView.tsx` | WYSIWYG HTML 唯讀渲染（DOMPurify 消毒 + table/image 樣式 + 空白 HTML 偵測） |

### 前端 — 資料管理元件（`src/components/data/`）

| 檔案 | 說明 |
|:-----|:-----|
| `FacilityUploadSection.tsx` | **設施上傳管理**（5 Tab：場景/模型/資訊Dashboard/地形/模型管理） |
| `BoreholeUploadSection.tsx` | 鑽孔資料上傳 |
| `AttitudeUploadSection.tsx` | 位態資料管理 |
| `FaultPlaneUploadSection.tsx` | 斷層面資料管理 |
| `TerrainUploadSection.tsx` | DEM + 衛星影像上傳 |
| `WaterLevelUploadSection.tsx` | 地下水位面上傳 |

### 前端 — Stores

| 檔案 | 說明 |
|:-----|:-----|
| `src/stores/facilityStore.ts` | **設施導覽**（場景樹/模型管理/多選/批次操作/編輯模式/動畫模式/播放控制/關鍵幀 CRUD/手動播放控制/場景轉場 N1/視角切換/模組層級 ref 註冊/**selectedAnimPerModel 動畫選擇記憶**） |
| `src/stores/authStore.ts` | 認證狀態（JWT Token） |
| `src/stores/projectStore.ts` | 專案管理（active project, TWD97 origin） |
| `src/stores/layerStore.ts` | 圖層控制（可見性、透明度） |
| `src/stores/terrainStore.ts` | 地形資料 |
| `src/stores/waterLevelStore.ts` | 地下水位面 |

### 前端 — 型別定義

| 檔案 | 說明 |
|:-----|:-----|
| `src/types/facility.ts` | `FacilityScene`, `FacilityModel`, `FacilityAnimation`（含 pathMode/autoOrient）, `AnimationKeyframe`（含 per-segment pathMode）, `FacilityModelInfo`, `Transform` |

---

## 開發指令速查

```bash
# 前端
npm run dev                     # Vite dev server on :5173
npm run build                   # tsc && vite build
npx tsc --noEmit                # TypeScript 類型檢查

# 後端
cd server
npm run dev                     # nodemon + ts-node on :3001
npx prisma db push              # 同步 Schema 到 DB
npx prisma generate             # 產生 Prisma Client
npx prisma studio               # DB admin GUI

# Docker 資料庫
docker start llrwd-postgres     # 啟動（port 5433）
docker stop llrwd-postgres      # 停止

# Python 環境
source server/venv/bin/activate
pip install pyvista numpy trimesh rasterio scipy Pillow pandas
```

---

## Debug 技巧

### 設施導覽頁面白屏

1. Console 檢查 `useGLTF` 載入錯誤
2. 確認 `facilityStore.scenes` 不為空（API 回傳問題）
3. 確認路由 `/project/:code/facility` 正確匹配
4. 確認 `server/uploads/facility/` 目錄存在

### 設施模型不顯示

1. 確認 `facilityStore.models` 有資料
2. 確認 `modelUrl` 路徑正確且 GLB 檔案存在（`server/uploads/facility/models/`）
3. Network tab 確認 GLB 200 OK
4. 確認模型 `position/scale` 合理（scale 不為 0）
5. **座標系提醒**：若模型在 XZ 平面上放置，`position.y` 應為建築高程（Three.js Y = 高程）
6. 確認模型不在 `hiddenModelIds` 中（sidebar checkbox 或批次操作可能隱藏了模型）

### 動畫不播放

1. 確認 `animationMode = false`（動畫編輯模式會凍結所有動畫）
2. 確認 `playbackState !== 'paused'`（paused 狀態下 auto 動畫也會暫停）
3. 確認 `animations` 陣列已載入（`fetchModels` 完成後會自動 `fetchAnimationsForModels`）
4. 關鍵幀動畫：確認 `keyframes` 陣列非空，且 `duration > 0`
5. GLB 內嵌動畫：確認 `gltfClipName` 與 GLB 中的 AnimationClip 名稱完全匹配
6. 確認 `trigger` 設定：auto 自動播放，manual 需 sidebar 模型旁 Play 按鈕觸發（A2 已實作）
7. Console 檢查 `facilityStore.animations` 是否有資料

### 動畫編輯模式下模型無法拖曳

1. 確認模型是焦點模型（`focusedModelId === model.id`）
2. 確認已選取動畫（`selectedAnimationId !== null`）
3. 確認 `playbackState === 'paused'`（playing 時 useFrame 會持續覆寫位置）
4. `lastAppliedPauseTime` 機制：paused 狀態下只 snap 一次到 playbackTime 位置，之後允許自由拖曳

### 動畫路徑可視化不顯示

1. 確認 `animationMode === true`（路徑只在動畫編輯模式顯示）
2. 確認已選取 keyframe 類型動畫（`selectedAnimationId` 匹配 `type === 'keyframe'` 的動畫）
3. 確認動畫至少有 2 個帶 `position` 的 keyframes
4. 路徑線渲染在場景空間（model group 之外），不會被模型動畫 transform 移動

### 曲線路徑不平滑 / 出現折疊

1. **雙轉折 S 形**: 確認使用 `'centripetal'` 而非 `'catmullrom'` 或 `'chordal'` 建構 `CatmullRomCurve3`
2. **路徑折疊**: 確認弧長映射使用 `getLengths(n)` 而非 `getUtoTmapping`（後者會反向映射導致錯誤）
3. **速度不均勻**: 確認動畫插值用 `getPointAt`（弧長參數化），視覺化用 `getPoint`（形狀一樣，效率更高）
4. **Per-segment 不連續**: 全域曲線確保控制點位置連續；每段只決定從曲線取樣或用 lerp

### 3D 路徑控制點拖曳無反應

1. 確認 `editingKeyframeIndex` 匹配（只有選中的 keyframe 才掛 TransformControls）
2. 確認 `PathControlPoint` 的 `meshRef.current` 不為 null
3. 拖曳後 position 沒更新：檢查 `updateKeyframe` API 是否成功回傳
4. 節點球太小看不到：調整 `SphereGeometry` args（目前 0.8/1.0/1.2）

### 時間軸 keyframe 拖曳異常

1. 拖不動：確認 `pointerCapture` 正確設定（`setPointerCapture` on pointerDown）
2. 時間超出範圍：clamp 邏輯用 `MIN_GAP = 0.05`，前後 keyframe 之間至少 0.05s
3. 點擊無法選取：確認 `didDrag` flag 正確區分（移動 < 3px = 點擊，>= 3px = 拖曳）

### 場景切換卡住（黑幕不消失）

1. Console 檢查 `facilityStore.transitionState` 卡在哪個狀態
2. `fadeOut` 卡住：確認 FacilityPage useEffect `transitionState === 'fadeOut'` 有觸發 `advanceTransition()`（220ms timer）
3. `loading` 卡住：確認 `isLoading` 最終變 false（`fetchModels` 完成後 `set({ isLoading: false })`）
4. `flyToModel` 卡住：確認 `FacilityCameraController` 有正確消費 `flyToModelId`，且 `flyCompleteCallback` 正確呼叫 `advanceTransition`
5. 防重複：`startSceneTransition` 會檢查 `transitionState !== 'idle'`，重複觸發會被忽略

### 視角快速切換按鈕無反應

1. 確認 `facilityStore.viewPreset` 被設定（`setViewPreset` 被呼叫）
2. 確認 `FacilityCameraController` 有消費 `viewPreset`（useEffect 監聽 `viewPreset` 變化）
3. 場景無 `cameraPosition`：「預設」按鈕會 fallback 到斜 45° 俯視（計算場景中心 + 模型分布半徑）
4. 無模型時：場景中心 fallback 到原點 `(0,0,0)`，相機高度 fallback 500
5. `viewPreset` 消費後會被 `clearViewPreset()` 清為 null

### 編輯模式無法選取模型

1. 確認 `editMode = true`（sidebar 底部按鈕已變藍）
2. 確認 `FacilityModelItem` click handler 邏輯：`editMode` 下設 `editingModelId`
3. 確認 `TransformInputPanel` 顯示（需 `editMode && editingModelId && editingModel`）

### 多選/批次操作問題

1. 確認使用 Cmd（macOS）或 Ctrl（Windows/Linux）+ Click 進行多選
2. 批次工具列只在 `selectedModelIds.length >= 2` 時顯示
3. 批次刪除需二次點擊確認（3 秒內），超時後需重新點擊
4. 隱藏的模型在 3D 場景中完全不渲染（`return null`），但在 sidebar 仍可見（50% opacity）

### 安全相關

1. **路徑穿越防護**：所有 `file.originalname` 用於路徑拼接的地方都必須先 `path.basename()` 過濾
2. **XSS 防護**：所有 `dangerouslySetInnerHTML` 必須先 `DOMPurify.sanitize()`，目前只有 `RichTextView.tsx` 使用
3. **JWT production**：部署時務必設定 `JWT_SECRET` 和 `JWT_REFRESH_SECRET` 環境變數，否則 server 無法啟動
4. **材質記憶體**：hover/select 高亮只修改 `emissive` 屬性，絕對不要 clone 材質（I4 教訓）
5. **曲線快取**：`_curveCache` 是 `Map`，多模型各自獨立；上限 50 條，超過會 LRU 淘汰

### ModelManager 儲存後 3D 場景未更新

- 目前設計為頁面重新整理才同步（待 N5 修復）
- 可在 facilityStore 加入 `fetchModels(currentSceneId)` 呼叫

### 模型資訊 Modal 儲存失敗

1. 確認後端 `PUT /api/facility/models/:id` 回傳是否包含 `introduction` 欄位
2. 確認 Prisma schema 已 `npx prisma db push` 同步
3. 確認 `getAuthHeaders()` 回傳有效 token
4. 圖說上傳：確認 `server/uploads/facility/info/` 目錄存在且有寫入權限

---

## 設計文件參考

| 文件 | 說明 |
|:-----|:-----|
| `docs/plans/2026-03-05-multi-model-selection-design.md` | **多模型選取設計文件**（已完成） |
| `docs/plans/2026-03-05-facility-animation-design.md` | **動畫系統設計文件**（已完成） |
| `docs/plans/2026-03-05-a2-manual-trigger-animation-design.md` | **A2 手動觸發動畫播放 UI 設計文件**（已完成） |
| `docs/plans/2026-03-05-a4-animation-path-visualization-design.md` | **A4 動畫預覽路徑可視化設計文件**（已完成） |
| `docs/plans/2026-03-06-n1-scene-transition-design.md` | **N1 場景切換過渡動畫設計文件**（已完成） |
| `docs/plans/2026-03-02-facility-module-design.md` | 設施導覽模組完整設計文件（已核准） |
| `docs/plans/2026-03-02-facility-module-plan.md` | 設施導覽模組 17 步驟實作計畫 |
| `docs/plans/2026-03-03-facility-model-management.md` | 模型管理 Tab 實作計畫（已完成） |
| `docs/plans/2026-03-03-facility-model-management-design.md` | 模型管理功能設計文件 |
| `docs/plans/2026-03-04-facility-model-info-design.md` | 模型資訊系統設計文件（已完成） |
| `docs/plans/2026-03-04-facility-model-info-plan.md` | 模型資訊系統 6 步驟實作計畫（已完成） |
| `CLAUDE.md` | AI Agent 開發指引（必讀） |
