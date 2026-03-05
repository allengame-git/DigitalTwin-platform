# NextSteps.md — 後續開發指引

本文件記錄專案目前的完成狀態、座標系統說明，以及後續待辦事項，供接手的 AI Agent 或開發人員參考。

**最後更新**: 2026-03-05（多模型選取 + 批次操作 + 多軌時間軸 + 全域播放控制 + 動畫模式凍結）
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

### 5. 設施導覽模組 — 完整（含 2026-03-05 多模型選取 + 動畫系統）

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
- Position: `Vector3.lerpVectors`
- Rotation: `Quaternion.slerpQuaternions`（避免 gimbal lock）
- Scale: `Vector3.lerpVectors`
- Easing: `linear`, `easeIn`, `easeOut`, `easeInOut`

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

### 6. 基礎架構 — 完整

- JWT 認證（Access Token + Refresh Token + HTTP-only Cookie）
- 多專案架構（project-scoped 路由與資料隔離）
- Docker PostgreSQL（port 5433）+ Prisma 7 ORM
- 儲存空間清理系統（孤兒檔案掃描 + 垃圾桶）
- 動態指北針 + 快速視角切換 + Gimbal Lock 修正

---

## 動畫系統 — 高優先級待辦（A 系列）

### ~~A1. 動畫編輯模式中使用 TransformControls 記錄關鍵幀~~ — 已完成

### A2. 手動觸發動畫的播放 UI

**目前狀態**: `trigger='manual'` 的動畫沒有觸發入口，只有 `trigger='auto'` 會自動播放。

**需實作**:
1. 在 FacilityInfoPanel 或模型右鍵選單中，顯示該模型的手動動畫列表
2. 點擊動畫名稱 → 觸發單次播放（或循環直到再次點擊）
3. facilityStore 需追蹤每個模型的「當前播放中動畫」狀態

**方案建議**:
- 在 FacilityInfoPanel header 加一個「動畫」小 tab，列出 trigger='manual' 的動畫 + 播放按鈕
- 或在模型標籤旁顯示播放圖示

**相關檔案**:
- `src/components/facility/FacilityInfoPanel.tsx`
- `src/components/facility/FacilityModelItem.tsx`（useFrame 中處理 manual trigger 播放）
- `src/stores/facilityStore.ts`（新增 per-model 播放狀態）

---

### A3. 關鍵幀動畫結束時回到原始位置

**目前狀態**: 非循環 (`loop=false`) 的關鍵幀動畫播放結束後，模型停留在最後一幀位置。

**需實作**:
- 非循環動畫結束時，模型應回到 DB 中的原始 position/rotation/scale
- 或提供選項：「結束後停留最後位置」vs「結束後回到原位」

---

### A4. 動畫預覽路徑可視化

**目的**: 在動畫編輯模式下，顯示關鍵幀之間的插值路徑線，幫助使用者理解動畫軌跡。

**需實作**:
1. 在 FacilityModelItem（或新元件）中，當動畫模式 + 選中 keyframe 動畫時
2. 用 `THREE.Line` 或 `THREE.CatmullRomCurve3` 繪製關鍵幀 position 之間的路徑
3. 關鍵幀位置用小球體或菱形標記

**相關檔案**:
- 新增 `src/components/facility/AnimationPathVisualization.tsx`
- 或在 `FacilityModelItem.tsx` 內條件渲染

---

### A5. 動畫匯出/匯入

**目的**: 允許使用者匯出動畫設定為 JSON 檔案，或從 JSON 匯入到其他模型。

**需實作**:
1. AnimationTimeline 新增「匯出」按鈕，將選中動畫的 keyframes/duration/easing 等導出為 JSON
2. 「匯入」按鈕，從 JSON 檔案讀取並 POST 建立新動畫
3. 匯入時自動對齊第一個 keyframe 到模型當前位置（offset）

---

## 設施導覽模組 — 高優先級待辦（N 系列）

### N1. 場景切換淡出淡入動畫

**目的**：目前 `enterScene` 切換場景直接跳轉，缺少淡出淡入過渡效果。

**需實作**：
1. 在 `FacilityCanvas.tsx` 加入全螢幕遮罩 overlay（`<div>` 覆蓋 Canvas 上方，`zIndex: 10`）
2. `facilityStore` 新增 `isTransitioning: boolean` 狀態
3. 切換流程：
   - 相機 fly-to 被點擊模型位置（300ms）
   - 畫面淡出（opacity 0, 200ms）
   - 卸載舊模型、載入新場景模型
   - 畫面淡入（opacity 1, 200ms）
4. `FacilityCameraController` 切換場景後 fly-to 子場景預設相機位置

**相關檔案**：
- `src/components/facility/FacilityCanvas.tsx`
- `src/components/facility/FacilityCameraController.tsx`
- `src/stores/facilityStore.ts`

---

### N2. 模型載入錯誤處理（Error Boundary）

**目的**：`useGLTF` 載入失敗（GLB 損壞/URL 失效）會導致白屏，需加 Error Boundary。

**需實作**：
1. 在 `FacilityModels.tsx` 中對每個 `FacilityModelItem` 包裹 React Error Boundary
2. catch 時顯示佔位方塊（紅色半透明方塊 + 模型名稱標籤）
3. 可選：Error Boundary 提供「重試」按鈕

**相關檔案**：
- `src/components/facility/FacilityModels.tsx`
- `src/components/facility/FacilityModelItem.tsx`

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

### N5. 上傳後自動刷新 3D 場景

**目的**：在 FacilityDataPage 上傳/刪除模型後，若使用者同時有開 FacilityPage，3D 場景不會自動更新。

**簡單方案**（建議）：
- 在 `FacilityPage.tsx` 監聯 `visibilitychange` 事件，tab 切回來時自動 refetch 當前場景模型
- 或在 `facilityStore` 新增 `refreshCurrentScene()` action，讓 FacilityDataPage 呼叫

### N6. 大型 GLB 載入進度

**目的**：大型 GLB（>50MB）載入時間較長，無進度提示。

**方案**：
- 改用 `useLoader(GLTFLoader, url, undefined, (xhr) => setProgress(xhr.loaded/xhr.total*100))` 追蹤進度
- 或使用 `@react-three/drei` 的 `useProgress` + `<Html>` 顯示百分比

### N7. Hover 高亮優化

**目前**：emissive + `emissiveIntensity: 0.3`，效果較弱。

**可選方案**：
- A. 調高 `emissiveIntensity` 到 0.6（最簡單）
- B. `@react-three/postprocessing` 的 `Outline` pass（效果最好，但有 GPU 開銷）
- C. Geometry 縮放 + backside 材質（wireframe outline，中等成本）

### N8. 模型資訊面板 UX 優化

**目的**：目前 `ModelInfoModal` 和 `FacilityInfoPanel` 有幾個可改善的地方。

**可改善項目**：
1. **錯誤回饋**：`saveIntro`、`handleDeleteDiagram`、`handleDeleteField` 目前僅 `console.error`，使用者看不到失敗訊息。應加 toast 或行內錯誤提示。
2. **圖說上傳批次錯誤**：多檔上傳中某檔失敗，使用者無提示。
3. **自訂欄位 API**：`handleAddField` 使用 `FormData`（multipart）送純文字，可改用 JSON（`application/json`）。
4. **FacilityInfoPanel 中圖說 URL 守衛**：若 `d.content` 為空字串，`resolveUrl('')` 會回傳 API 根路徑。應加 `d.content ?` 守衛。

**相關檔案**：
- `src/components/data/FacilityUploadSection.tsx`（ModelInfoModal）
- `src/components/facility/FacilityInfoPanel.tsx`

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
| 2 | `useGLTF` 無 Error Boundary | 高 | GLB 載入失敗會白屏（待 N2 修復） |
| 3 | PlanView 標記不考慮 coordShift | 中 | 地形偏移時標記位置偏差（待 N4） |
| 4 | 上傳後 3D 場景不自動刷新 | 中 | 需手動重新整理（待 N5） |
| 5 | Docker DB 每次重開機需手動啟動 | 低 | `docker start llrwd-postgres` |
| 6 | `StrikeDipSymbol` 效能 | 低 | 100 個個別 mesh，未來應 InstancedMesh 化 |
| 7 | `CoordShiftPanel` 元件已從頁面移除 | 低 | 元件檔案保留，若需場景偏移功能需重新整合至其他 UI |
| 8 | 模型資訊錯誤回饋不足 | 中 | saveIntro/delete 失敗僅 console.error，使用者無感知（待 N8） |
| 9 | 手動觸發動畫無播放入口 | 中 | trigger='manual' 的動畫目前無法在導覽模式下觸發（待 A2） |
| 10 | `vite.config.ts` tsc 警告 | 低 | `path` 模組 TS2307/TS2304，不影響 build 與 dev |

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
| `FacilityCameraController.tsx` | 800ms cubic ease-out fly-to 動畫 |
| `FacilityModels.tsx` | 模型群管理 |
| `FacilityModelItem.tsx` | 單一 GLB：useGLTF + emissive hover + TransformControls + **AnimationMixer + 關鍵幀插值 + 動畫凍結邏輯** |
| `FacilityTerrain.tsx` | 16-bit heightmap → PlaneGeometry 頂點置換 + 衛星紋理 |
| `FacilitySidebar.tsx` | 側邊欄整合（亮色主題，含多選/批次/全域播放/編輯/動畫模式按鈕 + Transform 數值輸入） |
| `BreadcrumbNav.tsx` | 麵包屑導覽 |
| `SceneTree.tsx` | 子場景樹狀清單 |
| `PlanView.tsx` | 2D 平面圖 + 模型標記 |
| `PlanViewFloating.tsx` | 浮動平面圖容器 |
| `FacilityInfoPanel.tsx` | **右下角浮動面板**（介紹/圖說/自訂欄位，340px/60vh，zIndex:110） |
| `FacilityNorthArrow.tsx` | 動態指北針（north = -Z） |
| `AnimationTimeline.tsx` | **多軌動畫時間軸面板**（每模型獨立軌道/屬性/播放控制/關鍵幀編輯） |
| `FacilityCaptureHandler.tsx` | 暴露 `facilityCanvasEl` 模組變數供截圖使用 |
| `TransformInputPanel.tsx` | 移動/旋轉/縮放精確數值輸入（座標軸已對應工程語義） |
| `CoordShiftPanel.tsx` | 場景座標偏移（元件保留，但已從 FacilityPage 移除） |
| `FacilityToolbar.tsx` | 工具列（元件保留，但已從 FacilityPage 移除） |

### 前端 — 共用元件（`src/components/common/`）

| 檔案 | 說明 |
|:-----|:-----|
| `RichTextEditor.tsx` | TipTap WYSIWYG 編輯器（Bold/Italic/Underline/H1-H3/List/TextAlign/Link/Image/Table） |
| `RichTextView.tsx` | WYSIWYG HTML 唯讀渲染（含 table/image 樣式，空白 HTML 偵測） |

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
| `src/stores/facilityStore.ts` | **設施導覽**（場景樹/模型管理/多選/批次操作/編輯模式/動畫模式/播放控制/關鍵幀 CRUD/模組層級 ref 註冊） |
| `src/stores/authStore.ts` | 認證狀態（JWT Token） |
| `src/stores/projectStore.ts` | 專案管理（active project, TWD97 origin） |
| `src/stores/layerStore.ts` | 圖層控制（可見性、透明度） |
| `src/stores/terrainStore.ts` | 地形資料 |
| `src/stores/waterLevelStore.ts` | 地下水位面 |

### 前端 — 型別定義

| 檔案 | 說明 |
|:-----|:-----|
| `src/types/facility.ts` | `FacilityScene`, `FacilityModel`, `FacilityAnimation`, `AnimationKeyframe`, `FacilityModelInfo`, `Transform` |

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
6. 確認 `trigger` 設定：auto 自動播放，manual 需手動觸發（目前無 UI 入口，待 A2）
7. Console 檢查 `facilityStore.animations` 是否有資料

### 動畫編輯模式下模型無法拖曳

1. 確認模型是焦點模型（`focusedModelId === model.id`）
2. 確認已選取動畫（`selectedAnimationId !== null`）
3. 確認 `playbackState === 'paused'`（playing 時 useFrame 會持續覆寫位置）
4. `lastAppliedPauseTime` 機制：paused 狀態下只 snap 一次到 playbackTime 位置，之後允許自由拖曳

### 編輯模式無法選取模型

1. 確認 `editMode = true`（sidebar 底部按鈕已變藍）
2. 確認 `FacilityModelItem` click handler 邏輯：`editMode` 下設 `editingModelId`
3. 確認 `TransformInputPanel` 顯示（需 `editMode && editingModelId && editingModel`）

### 多選/批次操作問題

1. 確認使用 Cmd（macOS）或 Ctrl（Windows/Linux）+ Click 進行多選
2. 批次工具列只在 `selectedModelIds.length >= 2` 時顯示
3. 批次刪除需二次點擊確認（3 秒內），超時後需重新點擊
4. 隱藏的模型在 3D 場景中完全不渲染（`return null`），但在 sidebar 仍可見（50% opacity）

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
| `docs/plans/2026-03-02-facility-module-design.md` | 設施導覽模組完整設計文件（已核准） |
| `docs/plans/2026-03-02-facility-module-plan.md` | 設施導覽模組 17 步驟實作計畫 |
| `docs/plans/2026-03-03-facility-model-management.md` | 模型管理 Tab 實作計畫（已完成） |
| `docs/plans/2026-03-03-facility-model-management-design.md` | 模型管理功能設計文件 |
| `docs/plans/2026-03-04-facility-model-info-design.md` | 模型資訊系統設計文件（已完成） |
| `docs/plans/2026-03-04-facility-model-info-plan.md` | 模型資訊系統 6 步驟實作計畫（已完成） |
| `CLAUDE.md` | AI Agent 開發指引（必讀） |
