# NextSteps.md — 後續開發指引

本文件記錄專案目前的完成狀態、座標系統說明，以及後續待辦事項，供接手的 AI Agent 或開發人員參考。

**最後更新**: 2026-03-03（設施導覽模組 UI 重構 + 座標系修正）
**當前分支**: `1-geology-module`

---

## ⚠️ 重要：座標系統說明

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

---

## 📍 已完成功能

### 1. 地質模組 (Geology Module) — 完整

- ✅ 3D 場景初始化（React Three Fiber + Three.js）
- ✅ 800+ 鑽孔 InstancedMesh 高效渲染 + LOD 機制
- ✅ 鑽孔點選互動與詳細資訊面板（動態高度優化）
- ✅ 圖層控制面板（開關、透明度）
- ✅ 剖面切片工具（Clipping Plane）
- ✅ 斷層線與位態符號視覺化
- ✅ 地質構造（斷層面）完整 CRUD + CSV 批次匯入
- ✅ 導覽模式（Guided Tour）
- ✅ 真實鑽孔資料正式串接（project-scoped API）

### 2. 地形與著色 — 完整

- ✅ DEM 地形整合（GeoTIFF / CSV → 16-bit Heightmap）
- ✅ 衛星影像融合（reproject/resample 自動對齊）
- ✅ 三模式紋理切換（衛星影像 / Hillshade / Color Ramp）
- ✅ 地形圖例（Color Ramp, Reverse, Z-range）+ 設定持久化
- ✅ 航照圖高程控制（-500m ~ 100m offset）

### 3. 地下水位面 — 完整

- ✅ Python 處理器（CSV/DAT/TXT → SciPy griddata 插值 → 16-bit heightmap）
- ✅ 雙模式範圍（well: user-defined / simulation: auto-detect）
- ✅ API：POST/GET/DELETE `/api/water-level`
- ✅ 3D 渲染：半透明藍色 Displacement Mesh + Clipping Plane
- ✅ 圖層控制 + 上傳 UI

### 4. 3D 地質模型 — 完整

- ✅ Tecplot `.dat` + CSV Voxel → Isosurface Mesh（GLB）via Marching Cubes
- ✅ 前端 `useGLTF` 載入 + Clipping Plane + 透明度

### 5. 設施導覽模組 — 完整（含 2026-03-03 重構）

#### 5a. 後端與資料庫
- ✅ Prisma Schema：`FacilityScene`（自我參照巢狀）+ `FacilityModel` + `FacilityModelInfo`
- ✅ 後端 API（`server/routes/facility.ts`）：場景/模型/Rich Content/平面圖/地形 完整 CRUD
- ✅ `PUT /api/facility/models/:id/transform`：位置/旋轉/縮放持久化

#### 5b. 前端頁面與路由
- ✅ `/project/:code/facility` → `FacilityPage`（3D 導覽）
- ✅ `/project/:code/facility-data` → `FacilityDataPage`（資料管理，獨立頁面）
- ✅ `ProjectDashboardPage`：儀表板拆為「地質資料管理」與「設施資料管理」兩個獨立卡片
- ✅ `DataManagementPage`：已移除 FacilityUploadSection（僅保留地質相關）

#### 5c. 設施導覽 3D 頁面（FacilityPage）
- ✅ 無頂部 Toolbar：FacilityToolbar 已從頁面移除
- ✅ 無場景座標偏移面板：CoordShiftPanel 已從頁面移除
- ✅ 側邊欄（FacilitySidebar）：白色亮色主題，與地質側邊欄設計一致
  - 返回專案儀表板連結
  - 可收合切換（280px ↔ 50px）
  - 「進入/退出編輯模式」按鈕（sidebar 底部）
  - 收合時顯示直排「設施導覽模組」文字
- ✅ BreadcrumbNav、SceneTree：已從 Tailwind 深色主題改為 inline 亮色 styles
- ✅ 編輯模式：點擊模型 → 設定 `editingModelId`（不進入子場景）
- ✅ TransformInputPanel：軸標籤正確對應座標系（X東/Z高程/Y北，Ry方位）
- ✅ 模型互動：非編輯模式下，點擊有子場景的模型 → 正常進入子場景

#### 5d. 設施資料管理（FacilityDataPage / FacilityUploadSection）
- ✅ 5 個 Tab：場景管理 / 模型上傳 / 模型資訊 / 場景地形 / **模型管理**（新）
- ✅ Tab 5「模型管理」（ModelManager）：
  - 選擇場景後列出模型卡片（可展開/收合）
  - 展開後可編輯：名稱、子場景、位置 X東/Z高程/Y北、旋轉 Rx俯仰/Ry方位/Rz橫滾、縮放
  - 「儲存變更」→ 呼叫 `PUT /api/facility/models/:id` + `PUT /api/facility/models/:id/transform`
  - 「刪除模型」→ 確認 modal → `DELETE /api/facility/models/:id`
  - 位置/旋轉/縮放與 3D 視窗天然同步（同一 API）

### 6. 基礎架構 — 完整

- ✅ JWT 認證（Access Token + Refresh Token + HTTP-only Cookie）
- ✅ 多專案架構（project-scoped 路由與資料隔離）
- ✅ Docker PostgreSQL（port 5433）+ Prisma 7 ORM
- ✅ 儲存空間清理系統（孤兒檔案掃描 + 垃圾桶）
- ✅ 動態指北針 + 快速視角切換 + Gimbal Lock 修正

---

## 🔜 設施導覽模組 — 後續優化任務

### 🚨 高優先級

#### N1. 場景切換淡出淡入動畫

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

#### N2. 模型載入錯誤處理（Error Boundary）

**目的**：`useGLTF` 載入失敗（GLB 損壞/URL 失效）會導致白屏，需加 Error Boundary。

**需實作**：
1. 在 `FacilityModels.tsx` 中對每個 `FacilityModelItem` 包裹 React Error Boundary
2. catch 時顯示佔位方塊（紅色半透明方塊 + 模型名稱標籤）
3. 可選：Error Boundary 提供「重試」按鈕

**相關檔案**：
- `src/components/facility/FacilityModels.tsx`
- `src/components/facility/FacilityModelItem.tsx`

---

#### N3. 自動俯視截圖（Auto Plan Image）

**目的**：`FacilityScene.autoPlanImageUrl` 欄位存在但截圖功能尚未實作。

**背景**：後端 API `PUT /api/facility/scenes/:id/auto-plan-image` 已就緒，只需前端截圖並上傳。截圖必須在 R3F Canvas 內部執行（需 `useThree` 取得 `gl`）。

**需實作**：
1. 新增 `useAutoScreenshot` hook（或 `ScreenshotCapture.tsx` Canvas 內元件）
2. 切換到 OrthographicCamera → 設定俯視角度（top-down）
3. `gl.domElement.toDataURL('image/png')` 取得截圖
4. 上傳到 `PUT /api/facility/scenes/:id/auto-plan-image`
5. 在 FacilitySidebar 底部或 PlanView 上方加「生成俯視圖」按鈕觸發

**相關檔案**：
- `src/components/facility/FacilityCanvas.tsx`
- `src/components/facility/FacilitySidebar.tsx`（加按鈕）
- `server/routes/facility.ts`（`auto-plan-image` 端點，已存在）

---

#### N4. PlanView 標記位置修正（考慮 coordShift）

**目的**：目前 PlanView 映射標記位置時未考慮場景的 `coordShiftX/Z`，若地形有偏移，標記位置會偏差。

**修正邏輯**（`src/components/facility/PlanView.tsx`）：
```typescript
// 取模型位置時，先扣除場景 coordShift
const adjustedX = model.position.x - (currentScene?.coordShiftX ?? 0);
const adjustedZ = model.position.z - (currentScene?.coordShiftZ ?? 0);
// 再用 terrainBounds 映射到圖片百分比
```

---

### 🔧 中優先級

#### N5. 上傳後自動刷新 3D 場景

**目的**：在 FacilityDataPage 上傳/刪除模型後，若使用者同時有開 FacilityPage，3D 場景不會自動更新。

**簡單方案**（建議）：
- 在 `FacilityPage.tsx` 監聽 `visibilitychange` 事件，tab 切回來時自動 refetch 當前場景模型
- 或在 `facilityStore` 新增 `refreshCurrentScene()` action，讓 FacilityDataPage 呼叫

#### N6. 大型 GLB 載入進度

**目的**：大型 GLB（>50MB）載入時間較長，無進度提示。

**方案**：
- 改用 `useLoader(GLTFLoader, url, undefined, (xhr) => setProgress(xhr.loaded/xhr.total*100))` 追蹤進度
- 或使用 `@react-three/drei` 的 `useProgress` + `<Html>` 顯示百分比

#### N7. Hover 高亮優化

**目前**：emissive + `emissiveIntensity: 0.3`，效果較弱。

**可選方案**：
- A. 調高 `emissiveIntensity` 到 0.6（最簡單）
- B. `@react-three/postprocessing` 的 `Outline` pass（效果最好，但有 GPU 開銷）
- C. Geometry 縮放 + backside 材質（wireframe outline，中等成本）

---

### 🌟 低優先級（未來擴展）

#### N8. 地形自動對齊功能

**目的**：目前地形與模型的座標對齊需手動設定 `coordShiftX/Y/Z`，應提供「自動對齊」按鈕。

**實作位置**：需要一個新的 CoordShift 設定 UI（可加在 FacilitySidebar 或 FacilityDataPage 場景管理 Tab 中）。

**邏輯**：
1. 計算所有模型 position 的 bounding box 中心 `(cx, cy, cz)`
2. 計算地形 `terrainBounds` 的 XZ 中心
3. 差值自動填入並呼叫 `PUT /api/facility/scenes/:id`（`coordShiftX/Z` 欄位）

#### N9. 場景間複製/移動模型

允許使用者將模型從一個場景移動或複製到另一個場景，在 ModelManager Tab 中操作。

#### N10. 多人即時狀態同步

WebSocket 同步多使用者游標位置與選取狀態。（YAGNI，視需求開放）

#### N11. 模型格式轉換

支援 OBJ、FBX、STL 上傳並自動轉換為 GLB。（YAGNI）

---

## 🔜 地質模組 — 後續優化任務

### 中優先級

#### G1. 岩性系統整合

- [ ] 確認 3D 地質模型渲染使用專案級 `LithologyDefinition` 顏色
- [ ] 岩性顏色編輯後，3D 場景即時更新
- [ ] CSV Voxel `lith_id` 與 `LithologyDefinition` ID 對應

#### G2. 斷層面功能完善

- [ ] 3D 視覺增強：斷層名稱標籤（Html Label）與傾向指示箭頭
- [ ] 點擊斷層後側邊欄自動顯示詳細參數

### 低優先級

#### G3. 效能優化

- [ ] `StrikeDipSymbol` InstancedMesh 化（目前 100 個個別 mesh）
- [ ] Terrain LOD：超大範圍地形 Chunk LOD
- [ ] Terrain Interaction：Raycasting 取得地形座標與高度

#### G4. 地下水位面後續

- [ ] 多層水位面：同時顯示不同含水層
- [ ] 時間序列：時間滑桿動態切換
- [ ] 色階渲染（Color Ramp）取代純藍色
- [ ] 地形交叉分析：水位面與地形面差異（地下水埋深）

#### G5. 新模組開發

- [ ] 工程設計模組（Engineering Design — BIM/SketchUp 整合）
- [ ] 模擬模組（Simulation — 污染物傳輸、熱圖視覺化）
- [ ] 情境分析（豐水期 vs 枯水期）

---

## ⚠️ 已知問題與注意事項

| # | 問題 | 嚴重度 | 說明 |
|---|------|-------|------|
| 1 | `lucide-react` TS7016 警告 | 低 | 不影響執行，`lucide-react` 應自帶型別，需確認版本 |
| 2 | `useGLTF` 無 Error Boundary | 高 | GLB 載入失敗會白屏（待 N2 修復） |
| 3 | 截圖功能未實作 | 中 | `autoPlanImageUrl` 欄位有但前端截圖邏輯缺（待 N3） |
| 4 | PlanView 標記不考慮 coordShift | 中 | 地形偏移時標記位置偏差（待 N4） |
| 5 | 上傳後 3D 場景不自動刷新 | 中 | 需手動重新整理（待 N5） |
| 6 | Docker DB 每次重開機需手動啟動 | 低 | `docker start llrwd-postgres` |
| 7 | `StrikeDipSymbol` 效能 | 低 | 100 個個別 mesh，未來應 InstancedMesh 化 |
| 8 | `CoordShiftPanel` 在頁面中仍存在 | 低 | 元件檔案保留，但已從 FacilityPage 移除，若需場景偏移功能需重新整合至其他 UI |

---

## 📁 關鍵檔案位置

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
| `server/routes/facility.ts` | **設施導覽 API**（場景/模型/Rich Content/平面圖/地形） |
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
| `FacilityModelItem.tsx` | 單一 GLB：useGLTF + emissive hover + click + TransformControls |
| `FacilityTerrain.tsx` | 16-bit heightmap → PlaneGeometry 頂點置換 + 衛星紋理 |
| `FacilitySidebar.tsx` | 側邊欄整合（亮色主題，含編輯模式按鈕） |
| `BreadcrumbNav.tsx` | 麵包屑導覽 |
| `SceneTree.tsx` | 子場景樹狀清單 |
| `PlanView.tsx` | 2D 平面圖 + 模型標記 |
| `FacilityInfoPanel.tsx` | Rich Content 面板（TEXT/IMAGE/DOCUMENT/LINK） |
| `TransformInputPanel.tsx` | 移動/旋轉/縮放精確數值輸入（座標軸已對應工程語義） |
| `CoordShiftPanel.tsx` | 場景座標偏移（元件保留，但已從 FacilityPage 移除） |
| `FacilityToolbar.tsx` | 工具列（元件保留，但已從 FacilityPage 移除） |

### 前端 — 資料管理元件（`src/components/data/`）

| 檔案 | 說明 |
|:-----|:-----|
| `FacilityUploadSection.tsx` | **設施上傳管理**（5 Tab：場景/模型/資訊/地形/模型管理） |
| `BoreholeUploadSection.tsx` | 鑽孔資料上傳 |
| `AttitudeUploadSection.tsx` | 位態資料管理 |
| `FaultPlaneUploadSection.tsx` | 斷層面資料管理 |
| `TerrainUploadSection.tsx` | DEM + 衛星影像上傳 |
| `WaterLevelUploadSection.tsx` | 地下水位面上傳 |

### 前端 — Stores

| 檔案 | 說明 |
|:-----|:-----|
| `src/stores/facilityStore.ts` | **設施導覽**（場景樹/模型管理/sceneStack/editMode/editingModelId） |
| `src/stores/authStore.ts` | 認證狀態（JWT Token） |
| `src/stores/projectStore.ts` | 專案管理（active project, TWD97 origin） |
| `src/stores/layerStore.ts` | 圖層控制（可見性、透明度） |
| `src/stores/terrainStore.ts` | 地形資料 |
| `src/stores/waterLevelStore.ts` | 地下水位面 |

### 前端 — 型別定義

| 檔案 | 說明 |
|:-----|:-----|
| `src/types/facility.ts` | `FacilityScene`, `FacilityModel`, `FacilityModelInfo`, `Transform` |

---

## 🔧 開發指令速查

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

## 🐛 Debug 技巧

### 設施導覽頁面白屏

1. Console 檢查 `useGLTF` 載入錯誤
2. 確認 `facilityStore.scenes` 不為空（API 回傳問題）
3. 確認路由 `/project/:code/facility` 正確匹配
4. 確認 `server/uploads/facility/` 目錄存在

### 設施模型不顯示

1. 確認 `facilityStore.models` 有資料
2. 確認 `modelUrl` 路徑正確且 GLB 檔案存在（`server/uploads/facility-models/`）
3. Network tab 確認 GLB 200 OK
4. 確認模型 `position/scale` 合理（scale 不為 0）
5. **座標系提醒**：若模型在 XZ 平面上放置，`position.y` 應為建築高程（Three.js Y = 高程）

### 編輯模式無法選取模型

1. 確認 `editMode = true`（sidebar 底部按鈕已變藍）
2. 確認 `FacilityModelItem` click handler 邏輯：`editMode` 下設 `editingModelId`
3. 確認 `TransformInputPanel` 顯示（需 `editMode && editingModelId && editingModel`）

### ModelManager 儲存後 3D 場景未更新

- 目前設計為頁面重新整理才同步（待 N5 修復）
- 可在 facilityStore 加入 `fetchModels(currentSceneId)` 呼叫

---

## 📚 設計文件參考

| 文件 | 說明 |
|:-----|:-----|
| `docs/plans/2026-03-02-facility-module-design.md` | 設施導覽模組完整設計文件（已核准） |
| `docs/plans/2026-03-02-facility-module-plan.md` | 設施導覽模組 17 步驟實作計畫 |
| `docs/plans/2026-03-03-facility-model-management.md` | 模型管理 Tab 實作計畫（已完成） |
| `docs/plans/2026-03-03-facility-model-management-design.md` | 模型管理功能設計文件 |
| `CLAUDE.md` | AI Agent 開發指引（必讀） |
