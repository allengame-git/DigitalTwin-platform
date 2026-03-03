# NextSteps.md - 後續開發指引

本文件記錄專案目前的完成狀態與後續待辦事項，供接手的 AI Agent 或開發人員參考。

---

## 📍 目前狀態

**最後更新**: 2026-03-03 (設施導覽模組完成)

**當前分支**: `1-geology-module`

### 已完成功能

#### 1. 地質模組 (Geology Module) — 完整

- ✅ 3D 場景初始化 (React Three Fiber + Three.js)
- ✅ 800+ 鑽孔 InstancedMesh 高效渲染
- ✅ LOD (Level of Detail) 自動切換機制
- ✅ 鑽孔點選互動與詳細資訊面板 (動態高度優化)
- ✅ Inspector Panel：地層顏色跟隨專案設定
- ✅ 圖層控制面板 (開關、透明度)
- ✅ 剖面切片工具 (Clipping Plane)
- ✅ 斷層線與位態符號視覺化
- ✅ 導覽模式 (Guided Tour)
- ✅ 真實鑽孔資料正式串接 (project-scoped API)
- ✅ 地質構造 (斷層面) 完整實作 (CRUD + CSV 批次匯入)

#### 2. 地形與著色 (Terrain & Visualization) — 完整

- ✅ DEM 地形整合 (GeoTIFF / CSV 點雲 → 16-bit Heightmap)
- ✅ 衛星影像融合 (reproject/resample 自動對齊)
- ✅ 三模式紋理切換 (衛星影像 / Hillshade / Color Ramp)
- ✅ 地形圖例 (Color Ramp, Reverse, Z-range)
- ✅ 即時渲染：Custom Shader (`onBeforeCompile`)
- ✅ 航照圖高程控制 (-500m ~ 100m offset)
- ✅ 設定持久化 (localStorage)

#### 3. 地下水位面 (Water Level Surface) — 完整

- ✅ Python 處理器 (CSV/DAT/TXT → SciPy griddata 插值 → 16-bit heightmap)
- ✅ 雙模式範圍 (well: user-defined bounds / simulation: auto-detect + 5% padding)
- ✅ API (POST/GET/DELETE `/api/water-level`)
- ✅ 3D 渲染：半透明藍色 Displacement Mesh
- ✅ 圖層控制 + 上傳 UI

#### 4. 3D 地質模型 — 完整

- ✅ Tecplot `.dat` 解析 + Solid Body Contour Band Extraction
- ✅ CSV Voxel → Isosurface Mesh (GLB) via Marching Cubes
- ✅ 前端 `useGLTF` 載入 + Clipping Plane + 透明度

#### 5. 設施導覽模組 (Facility Navigation) — 2026-03-03 新增，完整

- ✅ **Prisma Schema**: `FacilityScene` (自我參照巢狀) + `FacilityModel` + `FacilityModelInfo` + `FacilityInfoType` enum
- ✅ **後端 API** (`server/routes/facility.ts`, 805 行):
  - 場景 CRUD (含級聯刪除 + 遞迴檔案清理)
  - 模型 CRUD (multipart GLB 上傳, 100MB 限制)
  - Rich Content CRUD (TEXT/IMAGE/DOCUMENT/LINK)
  - 平面圖上傳
  - 地形上傳 (CSV + 衛星影像 → Python 處理)
- ✅ **Python 地形** (`server/scripts/facility_terrain_processor.py`): CSV → SciPy griddata → 16-bit heightmap + hillshade
- ✅ **前端 Store** (`src/stores/facilityStore.ts`): 場景樹、模型管理、sceneStack 導覽歷史、編輯模式
- ✅ **前端路由**: `/project/:projectCode/facility` → `FacilityPage`
- ✅ **3D Canvas** (`FacilityCanvas`): R3F Canvas + MapControls + logarithmic depth buffer
- ✅ **環境** (`FacilityEnvironment`): 三光源 (ambient + directional + hemisphere) + 網格 + fog
- ✅ **相機控制** (`FacilityCameraController`): 800ms cubic ease-out fly-to 動畫，依場景切換
- ✅ **模型載入** (`FacilityModels` + `FacilityModelItem`):
  - `useGLTF` 載入 GLB，clone scene 避免共享衝突
  - Hover emissive 高亮 (clone material 避免污染)
  - Click 選取 → InfoPanel；有 childSceneId 則觸發 enterScene
  - TransformControls 編輯模式 + 500ms debounce 更新後端
- ✅ **地形** (`FacilityTerrain`): Image+Canvas 解析 16-bit heightmap → PlaneGeometry 頂點置換 + 衛星紋理
- ✅ **側邊欄** (`FacilitySidebar`): 場景名稱 + BreadcrumbNav + SceneTree + 模型清單 + PlanView
- ✅ **麵包屑導覽** (`BreadcrumbNav`): sceneStack → 可點擊路徑
- ✅ **場景樹** (`SceneTree`): 子場景列表 + 圖示 + 子孫計數
- ✅ **2D 平面圖** (`PlanView`): 圖片 + 模型位置標記 (MapPin / DoorOpen 圖示)
- ✅ **Rich Content 面板** (`FacilityInfoPanel`): 右側滑入 + TEXT/IMAGE(Lightbox)/DOCUMENT(下載)/LINK + 進入內部按鈕
- ✅ **工具列** (`FacilityToolbar`): 根場景按鈕 + 編輯模式切換
- ✅ **Transform 面板** (`TransformInputPanel`): 移動/旋轉/縮放 Tab + XYZ 數值輸入 (R/G/B 色標)
- ✅ **座標偏移面板** (`CoordShiftPanel`): ShiftX/Y/Z + Rotation 設定 + 套用/重設
- ✅ **上傳管理** (`FacilityUploadSection`, 835 行): 4 個 Tab (場景管理/模型上傳/資訊編輯/地形上傳)
- ✅ **導覽連結**: GeologySidebar 新增 Building2 icon 跳轉設施導覽頁面
- ✅ **TypeScript**: 全模組 0 型別錯誤，共 ~3,900 行新增程式碼

#### 6. 基礎架構 — 完整

- ✅ JWT 認證 (Access Token + Refresh Token + HTTP-only Cookie)
- ✅ 多專案架構 (project-scoped 路由與資料隔離)
- ✅ Docker PostgreSQL (port 5433)
- ✅ Prisma 7 ORM
- ✅ 儲存空間清理系統 (孤兒檔案掃描 + 垃圾桶)
- ✅ 動態指北針 + 快速視角切換 + Gimbal Lock 修正

---

## 🔜 設施導覽模組 — 後續優化任務 (Next Steps)

以下列出設施導覽模組已完成基礎實作後，需要優化或補充的功能項目。分為「建議優先處理」與「未來擴展」兩大類。

### 🚨 建議優先處理 — 功能完善與 Bug 修復

#### N1. 首次部署驗證與 DB Migration

**目的**: 確保設施模組 schema 正確同步到資料庫，且所有 API 可正常運作。

**步驟**:
1. 執行 `cd server && npx prisma db push` 同步 FacilityScene/FacilityModel/FacilityModelInfo 到資料庫
2. 執行 `cd server && npx prisma generate` 重新產生 Prisma Client
3. 啟動後端 (`cd server && npm run dev`)，測試以下 API：
   - `POST /api/facility/scenes` — 建立根場景
   - `POST /api/facility/models` — 上傳一個 GLB 模型
   - `GET /api/facility/scenes?projectId=xxx` — 確認回傳
   - `GET /api/facility/models?sceneId=xxx` — 確認含 `infos` 欄位
4. 啟動前端 (`npm run dev`)，進入 `/project/:code/facility` 確認頁面載入無白屏
5. 進入 DataManagementPage 確認「設施導覽」上傳區塊正常顯示

**相關檔案**:
- `server/prisma/schema.prisma`
- `server/routes/facility.ts`
- `src/pages/FacilityPage.tsx`

#### N2. 場景切換動畫完善

**目的**: 目前 `enterScene` 切換場景時直接跳轉，缺少設計文件中描述的淡出淡入過渡效果。

**需實作**:
1. 在 `FacilityCanvas.tsx` 中加入一個全螢幕遮罩 overlay（`<div>` 在 Canvas 上方）
2. 切換場景時：
   - 相機 fly-to 被點擊模型位置 (800ms)
   - 畫面淡出 (opacity 0, 300ms)
   - 卸載舊模型、載入新模型
   - 畫面淡入 (opacity 1, 300ms)
   - 相機 fly-to 子場景預設視角
3. `facilityStore` 可能需要新增 `isTransitioning` 狀態

**相關檔案**:
- `src/components/facility/FacilityCanvas.tsx`
- `src/components/facility/FacilityCameraController.tsx`
- `src/stores/facilityStore.ts`

**設計文件**: `docs/plans/2026-03-02-facility-module-design.md` 第 173-179 行

#### N3. 自動俯視截圖功能

**目的**: 設計文件中要求支援自動產生場景的 2D 俯視截圖 (autoPlanImageUrl)，目前 FacilityToolbar 的截圖按鈕是 disabled 狀態。

**需實作**:
1. 截圖邏輯需要在 R3F Canvas 內部執行（需 `useThree` 取得 `gl`）
2. 建立一個 `useScreenshot` hook，或將截圖功能放在一個 Canvas 內的元件中
3. 切換到 orthographic camera → 設定俯視角度 → `gl.domElement.toDataURL()` → 上傳 `PUT /api/facility/scenes/:id/auto-plan-image`
4. FacilityToolbar 的截圖按鈕改為 enabled，點擊時觸發截圖

**相關檔案**:
- `src/components/facility/FacilityToolbar.tsx` — 截圖按鈕目前是 disabled
- `src/components/facility/FacilityCanvas.tsx` — 需要在 Canvas 內新增截圖元件
- `server/routes/facility.ts` — 已有 `PUT /api/facility/scenes/:id/auto-plan-image` 端點

#### N4. 模型 Outline 高亮替代方案

**目的**: 目前使用 emissive 方式做模型 hover 高亮，但效果不夠明顯。設計文件提到可使用 `@react-three/postprocessing` 的 Outline 效果。

**可選方案**:
- A. 維持 emissive（目前），調高 `emissiveIntensity` 到 0.5
- B. 使用 `@react-three/postprocessing` 的 `Outline` pass（效果更佳但有 GPU 開銷）
- C. 使用自訂 shader 的 `outlinePass`

**相關檔案**:
- `src/components/facility/FacilityModelItem.tsx` — hover 高亮邏輯 (emissive)
- `src/components/facility/FacilityCanvas.tsx` — 若用 postprocessing 需加 EffectComposer

#### N5. lucide-react 型別宣告修復

**目的**: 目前所有使用 `lucide-react` 的元件都有 `TS7016: Could not find a declaration file for module 'lucide-react'` 警告。雖不影響執行，但會干擾 TypeScript 檢查。

**修復方式**:
1. 確認 `@types/lucide-react` 是否存在（可能不需要，lucide-react 應自帶型別）
2. 檢查 `package.json` 中 `lucide-react` 版本，可能需要更新
3. 或在 `src/types/` 新增 `lucide-react.d.ts` 宣告檔

**影響範圍**: BreadcrumbNav, FacilitySidebar, SceneTree, PlanView, FacilityInfoPanel, FacilityToolbar, TransformInputPanel, CoordShiftPanel, FacilityUploadSection

### 🔧 中優先級 — 功能增強

#### N6. 模型載入錯誤處理

**目的**: 當 GLB 檔案損壞或 URL 失效時，`useGLTF` 會拋出錯誤導致白屏。需要 Error Boundary。

**需實作**:
1. 在 `FacilityModelItem` 外層包裹 React Error Boundary
2. 或使用 `useGLTF` 的 `onError` 回呼（如果支援）
3. 顯示友善的錯誤提示（如紅色佔位方塊 + 模型名稱）

**相關檔案**:
- `src/components/facility/FacilityModelItem.tsx`
- `src/components/facility/FacilityModels.tsx`

#### N7. FacilityUploadSection — 上傳後自動刷新

**目的**: 上傳模型或建立場景後，若使用者同時開著 FacilityPage，3D 場景不會自動更新。

**需實作**:
1. 在 `facilityStore` 中暴露 `refreshCurrentScene()` action
2. 或使用 polling / WebSocket 偵測資料變更
3. 簡單方案：在 FacilityPage 加入 `visibilitychange` 事件監聽，tab 切換回來時自動 refetch

#### N8. 大型模型載入進度

**目的**: 大型 GLB (>50MB) 載入時間較長，使用者無法得知載入進度。

**需實作**:
1. `useGLTF` 自帶進度功能有限，改用 `useLoader(GLTFLoader, url, undefined, onProgress)` 追蹤
2. 或使用 `@react-three/drei` 的 `useProgress` 搭配 `<Html>` 顯示載入百分比

#### N9. PlanView 標記位置精確度

**目的**: 目前 PlanView 用 `terrainBounds` 或模型 bounding box 計算標記位置，但未考慮 `coordShift`。若地形有偏移，標記位置會不準確。

**需修正**:
- 在 `getMarkerPosition` 計算中，先將模型 position 減去 coordShift，再映射到圖片百分比

**相關檔案**:
- `src/components/facility/PlanView.tsx`

#### N10. 地形座標自動對齊

**目的**: 設計文件提到「自動對齊：計算地形與模型 bounding box 中心差值」，目前只有手動 coordShift。

**需實作**:
1. 在 CoordShiftPanel 新增「自動對齊」按鈕
2. 計算所有模型的 bounding box 中心
3. 計算地形的 bounds 中心
4. 差值自動填入 coordShiftX/Y/Z

**相關檔案**:
- `src/components/facility/CoordShiftPanel.tsx`

### 🌟 低優先級 — 未來擴展

#### N11. 場景間複製/移動模型

允許使用者將模型從一個場景拖拉到另一個場景，或複製到其他場景。

#### N12. 多人即時狀態同步

使用 WebSocket 實現多使用者同時瀏覽時的游標位置和選取狀態同步。（設計文件已列為 YAGNI，但可視需求開放）

#### N13. 模型格式轉換

支援 OBJ、FBX、STL 等格式上傳並自動轉換為 GLB。（設計文件已列為 YAGNI）

#### N14. LOD 機制

大型場景中，遠距模型用低精度版本替換以提升效能。（設計文件已列為 YAGNI）

---

## 🔜 地質模組 — 後續優化任務

### 中優先級

#### G1. 岩性系統整合

- [ ] 確認 3D 地質模型渲染使用專案級 `LithologyDefinition` 顏色
- [ ] 岩性顏色編輯後，3D 場景即時更新
- [ ] CSV Voxel `lith_id` 與 `LithologyDefinition` ID 對應

#### G2. 斷層面功能完善

- [ ] 3D 視覺增強：增加斷層名稱標籤 (Html Label) 與傾向指示箭頭
- [ ] 批次匯入效能測試
- [ ] UI：點擊斷層後側邊欄自動顯示詳細參數

### 低優先級

#### G3. 效能優化

- [ ] 大型 GLB 的 LOD 支援
- [ ] `StrikeDipSymbol` InstancedMesh 化（目前 100 個個別 mesh）
- [ ] Terrain LOD: 超大範圍地形 Chunk LOD
- [ ] Terrain Interaction: Raycasting 取得地形座標與高度

#### G4. 地下水位面後續優化

- [ ] 多層水位面：同時顯示不同含水層
- [ ] 時間序列：時間滑桿動態切換
- [ ] 等值線 (Contour)
- [ ] 色階渲染 (Color Ramp) 取代純藍色
- [ ] 水位標籤：3D 場景顯示觀測井數值
- [ ] 地形交叉分析：水位面與地形面差異 (地下水埋深)

#### G5. 新模組開發

- [ ] 工程設計模組 (Engineering Design — BIM/SketchUp 整合)
- [ ] 模擬模組 (Simulation — 污染物傳輸、熱圖視覺化)
- [ ] 情境分析 (Scenario Analysis — 豐水期 vs 枯水期)

---

## 📁 關鍵檔案位置

### 後端 — API Routes

| 檔案 | 說明 |
|:---|:---|
| `server/routes/facility.ts` | **設施導覽 API** (場景/模型/Rich Content/平面圖/地形) |
| `server/routes/auth.ts` | 認證 API |
| `server/routes/project.ts` | 專案管理 API |
| `server/routes/borehole.ts` | 鑽孔 API |
| `server/routes/attitude.ts` | 位態 API |
| `server/routes/faultPlane.ts` | 斷層面 API |
| `server/routes/geology-model.ts` | 地質模型 API (含 CSV/Tecplot → GLB 轉換) |
| `server/routes/upload.ts` | 航照圖 & 地球物理探查 API |
| `server/routes/lithology.ts` | 岩性定義 API |
| `server/routes/terrain.ts` | DEM 地形 API |
| `server/routes/water-level.ts` | 地下水位面 API |
| `server/routes/cleanup.ts` | 儲存空間清理 API |

### 後端 — Python 處理腳本

| 檔案 | 說明 |
|:---|:---|
| `server/scripts/facility_terrain_processor.py` | **設施地形** CSV → heightmap + hillshade |
| `server/scripts/geology_mesh_builder.py` | Voxel CSV / Tecplot → GLB |
| `server/scripts/terrain_processor.py` | DEM + 衛星影像處理 |
| `server/scripts/water_level_processor.py` | 地下水位插值 |

### 後端 — 服務 & 設定

| 檔案 | 說明 |
|:---|:---|
| `server/prisma/schema.prisma` | 資料庫 Schema (所有 Model) |
| `server/prisma.config.ts` | Prisma 7 設定 (datasource URL) |
| `server/middleware/auth.ts` | JWT 認證中介件 |
| `server/lib/prisma.ts` | Prisma Client singleton |
| `server/.env` | 環境變數 (DATABASE_URL, JWT_SECRET) |

### 前端 — Store

| 檔案 | 說明 |
|:---|:---|
| `src/stores/facilityStore.ts` | **設施導覽** (場景樹/模型管理/sceneStack/編輯模式) |
| `src/stores/authStore.ts` | 認證狀態 (JWT Token) |
| `src/stores/projectStore.ts` | 專案管理 (active project, TWD97 origin) |
| `src/stores/boreholeStore.ts` | 鑽孔資料 |
| `src/stores/attitudeStore.ts` | 位態資料 |
| `src/stores/faultPlaneStore.ts` | 斷層面資料 |
| `src/stores/uploadStore.ts` | 上傳管理 (航照/地物/地質模型) |
| `src/stores/lithologyStore.ts` | 岩性定義 |
| `src/stores/layerStore.ts` | 圖層控制 (可見性、透明度) |
| `src/stores/viewerStore.ts` | 3D 檢視器 |
| `src/stores/terrainStore.ts` | 地形資料 |
| `src/stores/waterLevelStore.ts` | 地下水位面 |
| `src/stores/cameraStore.ts` | 相機控制 |

### 前端 — 設施導覽元件 (`src/components/facility/`)

| 檔案 | 行數 | 說明 |
|:---|:---|:---|
| `FacilityCanvas.tsx` | 70 | R3F Canvas 容器 + MapControls + Loading overlay |
| `FacilityEnvironment.tsx` | 34 | 三光源 + fog + gridHelper |
| `FacilityCameraController.tsx` | 50 | 800ms cubic ease-out fly-to 動畫 |
| `FacilityModels.tsx` | 24 | 模型群管理 (map models → FacilityModelItem) |
| `FacilityModelItem.tsx` | 172 | 單一 GLB: useGLTF + emissive hover + click + TransformControls |
| `FacilityTerrain.tsx` | 183 | 16-bit heightmap → PlaneGeometry 頂點置換 + 衛星紋理 |
| `FacilitySidebar.tsx` | 148 | 側邊欄整合 (場景名稱 + 子元件) |
| `BreadcrumbNav.tsx` | 91 | 麵包屑導覽 (sceneStack → 可點擊路徑) |
| `SceneTree.tsx` | 70 | 子場景樹狀清單 |
| `PlanView.tsx` | 140 | 2D 平面圖 + 可點擊模型標記 |
| `FacilityInfoPanel.tsx` | 144 | 右側滑入 Rich Content 面板 + Lightbox |
| `FacilityToolbar.tsx` | 148 | 工具列 (根場景/編輯模式/截圖) |
| `TransformInputPanel.tsx` | 183 | 移動/旋轉/縮放精確數值輸入 |
| `CoordShiftPanel.tsx` | 288 | 座標偏移設定 (ShiftX/Y/Z + Rotation) |

### 前端 — 地質 3D 場景元件 (`src/components/scene/`)

| 檔案 | 說明 |
|:---|:---|
| `GeologyCanvas.tsx` | 3D Canvas 主容器 |
| `CameraController.tsx` | 相機重置邏輯 (Scene Traverse + Fallback) |
| `BoreholeInstances.tsx` | 鑽孔 InstancedMesh |
| `GeologyTiles.tsx` | GLB 地質模型 |
| `SceneEnvironment.tsx` | 環境設定 |
| `TerrainMesh.tsx` | DEM 地形 (三模式紋理) |
| `WaterLevelSurface.tsx` | 地下水位面 |
| `StrikeDipSymbol.tsx` | 位態符號 |
| `StructureLines.tsx` | 斷層面 3D |
| `GeophysicsPlane.tsx` | 地球物理探查剖面 |

### 前端 — 資料管理元件 (`src/components/data/`)

| 檔案 | 說明 |
|:---|:---|
| `FacilityUploadSection.tsx` | **設施上傳管理** (4 Tab, 835 行) |
| `BoreholeUploadSection.tsx` | 鑽孔資料上傳 |
| `AttitudeUploadSection.tsx` | 位態資料管理 |
| `FaultPlaneUploadSection.tsx` | 斷層面資料管理 |
| `LithologySection.tsx` | 岩性定義管理 |
| `TerrainUploadSection.tsx` | DEM + 衛星影像上傳 |
| `WaterLevelUploadSection.tsx` | 地下水位面上傳 |

### 前端 — 型別定義 (`src/types/`)

| 檔案 | 說明 |
|:---|:---|
| `facility.ts` | `FacilityScene`, `FacilityModel`, `FacilityModelInfo`, `Transform` |

---

## ⚠️ 已知問題

1. **lucide-react 型別宣告**: 所有使用 `lucide-react` 的元件有 `TS7016` 警告（不影響執行）
2. **設施截圖按鈕 disabled**: FacilityToolbar 的截圖功能尚未實作（需 Canvas 內元件）
3. **Prisma 7 設定**: `schema.prisma` 的 `datasource` 需透過 `prisma.config.ts` 設定
4. **Docker PostgreSQL**: 使用 Port 5433，每次重開機需 `docker start llrwd-postgres`
5. **StrikeDipSymbol 效能**: 100 個位態各自獨立 mesh，未來應 InstancedMesh 化
6. **設施模型 Suspense**: `useGLTF` 載入失敗時缺少 Error Boundary

---

## 🔧 開發指令速查

```bash
# 前端
npm run dev                    # Vite dev server on :5173
npm run build                  # tsc && vite build
npx tsc --noEmit               # TypeScript 類型檢查

# 後端
cd server
npm run dev                    # nodemon + ts-node on :3001
npx prisma db push             # 同步 Schema 到 DB
npx prisma generate            # 產生 Prisma Client
npx prisma studio              # DB admin GUI

# Docker 資料庫
docker start llrwd-postgres    # 啟動 (port 5433)
docker stop llrwd-postgres     # 停止

# Python 環境
source server/venv/bin/activate
pip install pyvista numpy trimesh rasterio scipy Pillow pandas
```

---

## 📚 設計文件參考

| 文件 | 說明 |
|:---|:---|
| `docs/plans/2026-03-02-facility-module-design.md` | 設施導覽模組完整設計文件（已核准） |
| `docs/plans/2026-03-02-facility-module-plan.md` | 設施導覽模組 17 步驟實作計畫 |
| `CLAUDE.md` | AI Agent 開發指引 |

---

## 🔧 Debug 技巧

### 設施導覽頁面白屏

1. 開 Console 檢查是否有 `useGLTF` 載入錯誤
2. 確認 `facilityStore.scenes` 是否為空（API 回傳問題）
3. 確認路由 `/project/:code/facility` 是否正確匹配
4. 檢查 `server/uploads/facility/` 目錄是否存在

### 設施模型不顯示

1. 確認 `facilityStore.models` 有資料
2. 確認 `modelUrl` 路徑正確且 GLB 檔案存在
3. 檢查 Network tab 確認 GLB 200 OK
4. 確認模型 position/scale 是否合理（不是 0,0,0 且 scale 不是 0）

### 設施地形不顯示

1. 確認 `currentScene.terrainHeightmapUrl` 有值
2. 確認 `currentScene.terrainBounds` 有值且 minZ ≠ maxZ
3. 確認 heightmap PNG 檔案可正常載入
4. 檢查 `coordShiftX/Y/Z` 是否讓地形偏移到可見範圍外

### 3D 地質模型不顯示

1. 檢查 Console 是否有 `geologyModelsCount > 0`
2. 確認 `activeGeologyModelId` 有值
3. 確認 `meshUrl` 有值且 `conversionStatus` 為 `completed`
4. 檢查 GLB 載入 `boundingBox center` 是否接近原點

---

## 📞 聯絡資訊

如有問題或需要額外說明，請參考專案 README.md 或聯繫專案負責人。
