# NextSteps.md - 後續開發指引

本文件記錄專案目前的完成狀態與後續待辦事項，供接手的 AI Agent 或開發人員參考。

---

## 📍 目前狀態

**最後更新**: 2026-02-10

### 已完成功能

#### 1. 地質模組 (Geology Module)

- ✅ 3D 場景初始化 (React Three Fiber + Three.js)
- ✅ 800+ 鑽孔 InstancedMesh 高效渲染
- ✅ LOD (Level of Detail) 自動切換機制
- ✅ 鑽孔點選互動與詳細資訊面板
- ✅ 圖層控制面板 (開關、透明度)
- ✅ 剖面切片工具 (Clipping Plane)
- ✅ 斷層線與位態符號視覺化
- ✅ 導覽模式 (Guided Tour)
- ✅ 物理性質圖表更新：顯示 N 值與 RQD
- ✅ **真實鑽孔資料正式串接**
  - 取代全域 Mock 資料，改為 project-scoped API 載入
  - 修正不同專案間資料外洩問題
  - 更新 Dashboard 與 Sidebar 即時資料統計 (鑽孔數、模型數等)
- ✅ **地質構造 (斷層面) 完整實作**
  - Database: `FaultPlane` + `FaultCoordinate` 模型
  - Backend: 完整 CRUD API 與 CSV 批次匯入
  - Frontend: `faultPlaneStore` 狀態管理
  - UI: `FaultPlaneUploadSection` 支援單筆新增、編輯與 CSV 匯入
  - 3D: `StructureLines.tsx` 整合真實資料與位態渲染

#### 2. 3D 地質模型 (2026-02-06)

- ✅ **Isosurface Mesh Generation**
  - CSV Voxel 資料自動轉換為 GLB 格式
  - Marching Cubes 演算法產生平滑表面
  - 支援多岩性 (lith_id) 分層著色
  - TWD97 座標自動轉換為場景座標
- ✅ **前端 GLB 渲染**
  - `GeologyTiles.tsx` 使用 `useGLTF` 載入 GLB mesh
  - 支援 clipping plane 切片
  - 支援透明度控制
- ✅ **資料庫 Schema**
  - `GeologyModel` 新增 `meshUrl`, `meshFormat` 欄位
  - 轉換狀態追蹤 (`conversionStatus`, `conversionProgress`)

#### 3. 資料管理 (Data Management)

- ✅ 航照圖上傳功能
- ✅ 地球物理探查資料功能
- ✅ 3D 地質模型上傳 (CSV → GLB)
- ✅ 位態 CSV 批次匯入 (含重複檢查)
- ✅ 斷層面 CSV 批次匯入

#### 4. UI/UX

- ✅ **Sidebar 分頁設計**
  - 圖層頁 (所有使用者): 圖層開關、透明度、地下透視
  - 設定頁 (admin/engineer): 自動 LOD、背景顏色、圖資管理、資料管理連結
- ✅ 移除多剖面切割功能 (MultiSectionPanel)
- ✅ **位態資料表格 (2026-02-10)**: 固定 400px 高度 + Sticky Header

#### 5. 多專案架構 (Multi-Project - 2026-02-07)

- ✅ **資料庫 Schema**: 新增 `Project` model，關聯 GeoModel/Imagery/Geophysics
- ✅ **API**: 專案 CRUD 介面 (建立、列表、統計、刪除、編輯更新)
- ✅ **Frontend**:
  - `ProjectDashboardPage`: 專案專屬入口 (`/project/:code`)
  - `projectStore`: 全域專案狀態管理
  - `AppRoutes`: 專案範圍路由 (`/project/:code/*`)
  - **Dynamic Config**: 支援專案自定義 TWD97 座標原點
  - **Safeguards**: 專案刪除確認 Modal、Admin 權限刪除防呆
  - **Cleanup**: 移除全域 `/data` 頁面，強化專案隔離
  - **Navigation**: 子頁面導覽修正，返回按鈕正確導向專案儀表板

#### 6. 場景環境優化 (2026-02-10)

- ✅ **移除 fog 效果**: 確保所有距離的清晰視覺
- ✅ **移除冗餘綠色基礎地面**: 避免與 DEM 地形混淆
- ✅ **重新設計相機重置邏輯 (CameraController.tsx)**:
  - 策略 1: 使用 `scene.traverse()` 直接掃描所有可見 Mesh 的真實邊界 (最準確)
  - 策略 2 (Fallback): 依序從 uploadStore → boreholeStore → attitudeStore 取邊界
  - 排除環境物件 (Grid、大型平面 > 5000m)
  - 根據 viewport aspect ratio 動態計算最佳觀看距離
  - 60 度俯視角度，確保模型清晰可見
- ✅ **修復 GeologyCanvas 未載入地質模型 Bug**:
  - `GeologyCanvas.tsx` 新增 `fetchGeologyModels()` 呼叫
  - 之前進入地質展示頁面時 `uploadStore.geologyModels` 永遠是空的
  - 導致 `GeologyTiles` 無法顯示 GLB mesh、Camera Reset 判斷 `hasModel: false`

#### 7. 基礎架構

- ✅ 身分驗證 (JWT Token + Refresh)
- ✅ Docker PostgreSQL 資料庫設定
- ✅ Prisma 7 ORM 整合

### 資料庫連線資訊

```bash
Container: llrwd-postgres
Port: 5433
Database: llrwddb
User: postgres
Password: postgres
```

---

## 🔜 待辦事項 (Next Steps)

### 🚨 高優先級 - 立即需要處理

#### 1. 地質模型載入驗證

**背景**: 已修復 `GeologyCanvas` 未呼叫 `fetchGeologyModels()` 的問題，但需要驗證完整的模型載入流程。

- [ ] **驗證**: 進入地質頁面後，Console 應顯示 `geologyModelsCount: 1` 而非 0
- [ ] **驗證**: Camera Reset 的 log 應顯示 `hasContent: true` 且 `strategy: 'scene-traverse'`
- [ ] **測試**: 確認 NPP3 模型的 GLB mesh 正確顯示在場景中
- [ ] **測試**: 確認 `activeGeologyModelId` 正確設定

**相關檔案**:

- `src/components/scene/GeologyCanvas.tsx` (L38: `fetchGeologyModels()` 呼叫)
- `src/components/scene/GeologyTiles.tsx` (L107: `activeGeologyModelId` 檢查)
- `src/stores/uploadStore.ts` (L406: `fetchGeologyModels` 實作)

#### 2. uploadStore 自動選取 Active Model

**問題**: `fetchGeologyModels()` 載入模型列表後，可能沒有自動設定 `activeGeologyModelId`。需要確認載入後是否自動選取第一個模型。

- [ ] **檢查**: `uploadStore.fetchGeologyModels()` 完成後是否自動 `setActiveGeologyModelId`
- [ ] **如果沒有**: 在 `fetchGeologyModels` 完成時，自動將第一個模型設為 active
- [ ] **如果有但失敗**: 檢查 API response 格式是否與預期一致

**相關檔案**:

- `src/stores/uploadStore.ts`
- `server/routes/geology-model.ts`

#### 3. 相機重置精確度優化

**背景**: 目前 `scene.traverse()` 會掃描所有可見物件包含 DEM 地形 (約 2000m 寬)，若用戶只想 focus 在地質模型上，可能需要更精確的控制。

- [ ] **UI**: 新增「框選目標」下拉選單 (全部 / 僅地質模型 / 僅鑽孔)
- [ ] **Config**: 讓使用者調整重置時的填充率 (目前 0.7x)

**相關檔案**:

- `src/components/scene/CameraController.tsx`
- `src/stores/cameraStore.ts`

#### 4. 斷層面功能完善

- [ ] **3D 視覺增強**: 增加斷層名稱標籤 (Html Label) 與傾向指示箭頭
- [ ] **批次匯入驗證**: 使用實際大量資料測試 CSV 解析與匯入效能
- [ ] **UI 優化**: 在地質分頁點擊斷層後，側邊欄自動顯示斷層詳細參數

### 中優先級

#### 5. 資料管理 UX 優化

- [ ] **UI**: 批次上傳功能 (多檔案同時上傳)
- [ ] **UI**: 上傳進度條 (Progress Bar) 取代 spinner
- [ ] **Feature**: 地質模型版本切換 (Version Control)
- [ ] **Feature**: 地球物理探查詳細資料 Modal 新增「在 3D 場景中定位」按鈕
- [ ] **UI**: 各個 Upload Section 統一固定表格高度 + Sticky Header (已完成位態部分)

#### 6. 岩性系統整合

- [ ] **驗證**: 確認 3D 地質模型渲染使用專案級的 `LithologyDefinition` 顏色
- [ ] **UI**: 岩性顏色編輯後，3D 場景即時更新顏色
- [ ] **Data**: CSV Voxel 中的 `lith_id` 必須與 `LithologyDefinition` 的 ID 對應

### 低優先級

#### 7. 效能優化

- [ ] 大型 GLB 檔案的 LOD 支援
- [ ] 縮圖 Lazy Loading
- [ ] `StrikeDipSymbol` InstancedMesh 化 (目前 100 個個別 mesh 物件)

#### 8. 新模組開發

- [ ] 工程設計模組 (Engineering Design - BIM/SketchUp 整合)
- [ ] 模擬模組 (Simulation - 污染物傳輸、熱圖視覺化)
- [ ] 情境分析 (Scenario Analysis - 豐水期 vs 枯水期)

---

## 📁 關鍵檔案位置

### 後端 - API Routes

| 檔案 | 說明 |
|:---|:---|
| `server/routes/auth.ts` | 認證 API |
| `server/routes/project.ts` | 專案管理 API |
| `server/routes/borehole.ts` | 鑽孔 API |
| `server/routes/attitude.ts` | 位態 API |
| `server/routes/faultPlane.ts` | 斷層面 API |
| `server/routes/geology-model.ts` | 地質模型 API (含 CSV→GLB 轉換) |
| `server/routes/upload.ts` | 航照圖 & 地球物理探查 API |
| `server/routes/lithology.ts` | 岩性定義 API |

### 後端 - 服務 & 設定

| 檔案 | 說明 |
|:---|:---|
| `server/services/isosurface-generator.ts` | Marching Cubes 演算法 CSV → GLB |
| `server/prisma/schema.prisma` | 資料庫 Schema (所有 Model) |
| `server/prisma.config.ts` | Prisma 7 設定 (datasource URL) |
| `server/middleware/auth.ts` | JWT 認證中介件 |
| `server/.env` | 環境變數 (DATABASE_URL, JWT_SECRET) |

### 前端 - Store

| 檔案 | 說明 |
|:---|:---|
| `src/stores/authStore.ts` | 認證狀態 (JWT Token 管理) |
| `src/stores/projectStore.ts` | 專案管理 (active project, TWD97 origin) |
| `src/stores/boreholeStore.ts` | 鑽孔資料 (fetch, CRUD, batch import) |
| `src/stores/attitudeStore.ts` | 位態資料 (CRUD, batch import, 重複檢查) |
| `src/stores/faultPlaneStore.ts` | 斷層面資料 (CRUD, batch import) |
| `src/stores/uploadStore.ts` | 上傳管理 (航照/地物/地質模型, activeGeologyModelId) |
| `src/stores/lithologyStore.ts` | 岩性定義 (專案級顏色配置) |
| `src/stores/layerStore.ts` | 圖層控制 (可見性、透明度) |
| `src/stores/viewerStore.ts` | 3D 檢視器 (LOD, Clipping Plane, 背景色) |
| `src/stores/cameraStore.ts` | 相機控制 (reset trigger, target center) |

### 前端 - 3D 場景元件

| 檔案 | 說明 |
|:---|:---|
| `src/components/scene/GeologyCanvas.tsx` | 3D Canvas 主容器 (初始化所有 store fetch) |
| `src/components/scene/CameraController.tsx` | 相機重置邏輯 (Scene Traverse + Fallback) |
| `src/components/scene/BoreholeInstances.tsx` | 鑽孔 InstancedMesh 渲染 |
| `src/components/scene/GeologyTiles.tsx` | GLB 地質模型載入 |
| `src/components/scene/SceneEnvironment.tsx` | 環境設定 (燈光/網格，已移除 fog 和基礎地面) |
| `src/components/scene/StrikeDipSymbol.tsx` | 位態符號渲染 (圓盤 + 傾向箭頭) |
| `src/components/scene/StructureLines.tsx` | 斷層面 3D 渲染 |
| `src/components/scene/TerrainMesh.tsx` | DEM 地形渲染 |
| `src/components/scene/GeophysicsPlane.tsx` | 地球物理探查 3D 剖面 |

### 前端 - 資料管理元件

| 檔案 | 說明 |
|:---|:---|
| `src/components/data/BoreholeUploadSection.tsx` | 鑽孔資料上傳 (含岩性顏色整合) |
| `src/components/data/AttitudeUploadSection.tsx` | 位態資料管理 (固定高度表格) |
| `src/components/data/FaultPlaneUploadSection.tsx` | 斷層面資料管理 |
| `src/components/data/LithologySection.tsx` | 岩性定義管理 |

### 工具函式

| 檔案 | 說明 |
|:---|:---|
| `src/utils/coordinates.ts` | TWD97 ↔ Three.js 座標轉換 (含 origin 設定) |
| `src/utils/lod.ts` | LOD 等級計算 |
| `src/config/three.ts` | Three.js 全域設定 (FOV, 近遠裁切, 渲染器) |

---

## ⚠️ 已知問題

1. **座標轉換已修正**
   - TWD97_ORIGIN 已同步前後端為 (224000, 2429000)
   - 專案可自定義原點，覆蓋全域預設值

2. **Prisma 7 變更**
   - `schema.prisma` 中不再支援 `url = env("DATABASE_URL")`
   - 需透過 `prisma.config.ts` 的 `datasource.url` 設定

3. **Docker PostgreSQL**
   - 使用 Port 5433 避免與系統預設 PostgreSQL (5432) 衝突
   - 每次重新開機需執行 `docker start llrwd-postgres`

4. **GeologyCanvas 載入順序**
   - `fetchGeologyModels()` 已加入 GeologyCanvas 初始化流程 (2026-02-10 修復)
   - 需確認 `activeGeologyModelId` 在載入後自動設定

5. **StrikeDipSymbol 效能**
   - 目前 100 個位態各自建立獨立 mesh 物件
   - 未來應考慮 InstancedMesh 化以提升效能

---

## 🔧 開發指令速查

```bash
# 後端
cd server
npm run dev                    # 啟動 (nodemon)
npx prisma db push             # 同步 Schema
npx prisma generate            # 產生 Client
npx prisma studio              # 開啟資料庫 GUI

# 前端
npm run dev                    # 開發伺服器
npm run build                  # 生產建置
npx tsc --noEmit               # TypeScript 類型檢查

# Docker 資料庫
docker start llrwd-postgres    # 啟動
docker stop llrwd-postgres     # 停止
docker logs llrwd-postgres     # 查看 logs
```

---

## 🔧 Debug 技巧

### 3D 地質模型不顯示

1. 檢查 Console 是否有 `🌍 GeologyTiles Debug:` 輸出
   - 確認 `geologyModelsCount` > 0 (若為 0 表示 fetchGeologyModels 未被呼叫)
   - 確認 `activeGeologyModelId` 有值
   - 確認 `meshUrl` 有值
   - 確認 `conversionStatus` 為 `completed`

2. 檢查 Console 是否有 `📦 GLB Mesh loaded:` 輸出
   - 確認 `boundingBox` 的 `center` 接近原點 (0, 0, 0)
   - 如果中心點很遠 (如 262000, 2711000)，表示座標轉換有問題

3. 檢查 Network tab 確認 GLB 檔案成功載入 (200 OK)

4. 模型不可見時：
   - 檢查圖層面板的 `geology3d` 圖層是否開啟
   - 點擊 "🎯 重置相機位置" 按鈕

### 相機重置不如預期

1. 檢查 Console 的 `🎯 Camera Reset:` log
   - `hasContent`: 應為 `true`
   - `strategy`: 應為 `'scene-traverse'` (如果場景有可見物件)
   - `maxHorizontal`: 模型的水平最大維度 (若過大可能是 DEM 地形被計入)
   - `distance`: 相機距離 (應在 50-5000 範圍)

2. 如果 `hasContent: false`:
   - 確認場景中有載入可見的 mesh 物件
   - 確認 SceneEnvironment 的 Grid 或其他環境物件未被誤判為資料物件

### 位態/斷層不顯示

1. 確認圖層面板的對應圖層已開啟
2. 檢查 Console 的 `[StrikeDipSymbol]` log，確認 attitude 數量和座標
3. 確認 TWD97 座標在合理範圍 (x > 10000, y > 10000)

---

## 📞 聯絡資訊

如有問題或需要額外說明，請參考專案 README.md 或聯繫專案負責人。
