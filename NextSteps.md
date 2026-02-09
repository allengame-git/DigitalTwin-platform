# NextSteps.md - 後續開發指引

本文件記錄專案目前的完成狀態與後續待辦事項，供接手的 AI Agent 或開發人員參考。

---

## 📍 目前狀態

**最後更新**: 2026-02-06

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

#### 2. 3D 地質模型 (New - 2026-02-06)

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

#### 4. UI/UX (New - 2026-02-06)

- ✅ **Sidebar 分頁設計**
  - 圖層頁 (所有使用者): 圖層開關、透明度、地下透視
  - 設定頁 (admin/engineer): 自動 LOD、背景顏色、圖資管理、資料管理連結
- ✅ 移除多剖面切割功能 (MultiSectionPanel)

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

#### 6. 基礎架構

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

#### 1. 地質模型細微調整 (Phase 5)

**目標**: 提供前端微調模型位置的能力，解決座標轉換誤差。

- [ ] **Frontend**: 更新 `viewerStore.ts` 支援模型 offset
- [ ] **UI**: 在 `LayerPanel.tsx` 增加 XYZ Offset 微調控制項

#### 2. 真實資料整合

- [ ] 串接真實後端 API 取代 Mock 鑽孔資料
- [ ] 串接真實航照圖 Tile 服務
- [ ] 驗證真實 CSV 資料的岩性 ID 對應

### 中優先級

#### 3. UX 優化 (Data Management)

- [ ] **UI**: 批次上傳功能
- [ ] **UI**: 上傳進度條 (Progress Bar)
- [ ] **Feature**: 地質模型版本切換 (Version Control)

#### 5. 使用者體驗優化

- [ ] 上傳進度條（目前只有 spinner）
- [ ] 批次上傳功能
- [ ] 地球物理探查詳細資料 Modal 新增「在 3D 場景中定位」按鈕

### 低優先級

#### 6. 效能優化

- [ ] 大型 GLB 檔案的 LOD 支援
- [ ] 縮圖 Lazy Loading

#### 7. 新模組開發

- [ ] 工程設計模組 (Engineering Design)
- [ ] 模擬模組 (Simulation)

---

## 📁 關鍵檔案位置

### 後端 - 地質模型

| 檔案 | 說明 |
| :--- | :--- |
| `server/services/isosurface-generator.ts` | Marching Cubes 演算法，CSV → GLB 轉換 |
| `server/routes/geology-model.ts` | 地質模型 API 路由 |
| `server/prisma/schema.prisma` | 資料庫 Schema (GeologyModel) |

### 後端 - 其他

| 檔案 | 說明 |
| :--- | :--- |
| `server/routes/upload.ts` | 航照圖 & 地球物理探查 API 路由 |
| `server/.env` | 環境變數（DATABASE_URL） |

### 前端 Store

| 檔案 | 說明 |
| :--- | :--- |
| `src/stores/uploadStore.ts` | 航照圖 & 地球物理探查 & 地質模型狀態管理 |
| `src/stores/layerStore.ts` | 圖層控制（含 'geology3d' 類型） |
| `src/stores/viewerStore.ts` | 3D 檢視器狀態 (LOD, Clipping) |

### 前端元件

| 檔案 | 說明 |
| :--- | :--- |
| `src/components/scene/GeologyTiles.tsx` | 3D 地質模型 GLB 渲染 |
| `src/components/scene/GeophysicsPlane.tsx` | 地球物理探查 3D 剖面渲染 |
| `src/components/overlay/LayerPanel.tsx` | 圖層控制面板 (分頁設計) |
| `src/pages/DataManagementPage.tsx` | 資料管理頁面 |
| `src/pages/ProjectDashboardPage.tsx` | 專案 Dashboard 頁面 |

### 工具函式

| 檔案 | 說明 |
| :--- | :--- |
| `src/utils/coordinates.ts` | TWD97 ↔ Three.js 座標轉換 |

---

## ⚠️ 已知問題

1. **座標轉換剛修正**
   - 現有 GLB 使用舊座標，需重新上傳 CSV 觸發重新生成
   - TWD97_ORIGIN 已同步前後端為 (224000, 2429000)

2. **終端機權限錯誤** (`EPERM: process.cwd failed`)
   - 原因：目錄被刪除/重建後終端機 session 權限脫節
   - 解法：關閉並重新開啟 Terminal

3. **Prisma 7 變更**
   - `schema.prisma` 中不再支援 `url = env("DATABASE_URL")`
   - 需透過 `prisma.config.ts` 的 `datasource.url` 設定

4. **Docker PostgreSQL**
   - 使用 Port 5433 避免與系統預設 PostgreSQL (5432) 衝突
   - 每次重新開機需執行 `docker start llrwd-postgres`

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
npm run lint                   # ESLint 檢查
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
   - 確認 `meshUrl` 有值
   - 確認 `conversionStatus` 為 `completed`

2. 檢查 Console 是否有 `📦 GLB Mesh loaded:` 輸出
   - 確認 `boundingBox` 的 `center` 是否接近原點 (0, 0, 0)
   - 如果中心點很遠 (如 262000, 2711000)，表示座標轉換有問題

3. 檢查 Network tab 確認 GLB 檔案成功載入 (200 OK)

4. 如果 debug log 顯示正常但模型不可見：
   - 檢查圖層面板的 `geology3d` 圖層是否開啟
   - 使用 "重設視角" 按鈕飛到模型位置

---

## 📞 聯絡資訊

如有問題或需要額外說明，請參考專案 README.md 或聯繫專案負責人。
