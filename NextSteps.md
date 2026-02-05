# NextSteps.md - 後續開發指引

本文件記錄專案目前的完成狀態與後續待辦事項，供接手的 AI Agent 或開發人員參考。

---

## 📍 目前狀態

**最後更新**: 2026-02-05

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

#### 2. 資料管理 (Data Management)

- ✅ 航照圖上傳功能
  - 支援 JPG/PNG/TIF 格式
  - GeoTIFF 自動解析座標
  - 手動輸入 TWD97 座標
  - 縮圖自動產生
  - 詳細資料 Modal
  - 刪除功能（含確認 Modal）

- ✅ 地球物理探查資料功能 (New)
  - Prisma Schema: `Geophysics` model
  - 後端 API: POST/GET/DELETE `/api/upload/geophysics`
  - 前端 Store: `uploadStore.ts` (GeophysicsFile, actions)
  - 資料管理 UI: 上傳區塊、表單 Modal、檔案卡片
  - 3D 場景: `GeophysicsPlane.tsx` 垂直剖面渲染
  - 圖層控制: `layerStore` 新增 'geophysics' 類型

#### 3. 基礎架構

- ✅ 身分驗證 (JWT Token + Refresh)
- ✅ Docker PostgreSQL 資料庫設定
- ✅ Prisma 7 ORM 整合

### 資料庫連線資訊

```
Container: llrwd-postgres
Port: 5433
Database: llrwddb
User: postgres
Password: postgres
```

---

## 🔜 待辦事項 (Next Steps)

### 高優先級

#### 1. 地球物理探查功能驗證與優化

- [ ] 實際測試上傳流程（上傳圖片、填入座標、確認 3D 顯示）
- [ ] 驗證座標轉換正確性（TWD97 → Three.js 世界座標）
- [ ] 檢查深度計算邏輯（依圖片比例 vs 手動輸入）
- [ ] 優化剖面圖渲染（可能需要調整 depthWrite、renderOrder 避免 Z-fighting）

#### 2. 真實資料整合

- [ ] 串接真實後端 API 取代 Mock 鑽孔資料
- [ ] 串接真實航照圖 Tile 服務
- [ ] 串接真實 3D Tiles 地質模型

#### 3. 航照圖 3D 顯示

- [ ] `ImageryPlane.tsx` 目前使用固定邊界
- [ ] 應從 `uploadStore` 讀取航照圖的 minX/maxX/minY/maxY 動態定位

### 中優先級

#### 4. 使用者體驗優化

- [ ] 地球物理探查詳細資料 Modal 新增「在 3D 場景中定位」按鈕
- [ ] 上傳進度條（目前只有 spinner）
- [ ] 批次上傳功能

#### 5. 圖層面板增強

- [ ] 地球物理探查圖層的子項目展開（顯示各測線）
- [ ] 單獨控制每條測線的可見性

#### 6. 剖面工具擴展

- [ ] 支援沿地球物理探查測線方向切片
- [ ] 多剖面同時顯示

### 低優先級

#### 7. 效能優化

- [ ] 地球物理探查資料量大時的分頁載入
- [ ] 縮圖 Lazy Loading

#### 8. 新模組開發

- [ ] 工程設計模組 (Engineering Design)
- [ ] 模擬模組 (Simulation)

---

## 📁 關鍵檔案位置

### 後端

| 檔案 | 說明 |
|------|------|
| `server/routes/upload.ts` | 航照圖 & 地球物理探查 API 路由 |
| `server/prisma/schema.prisma` | 資料庫 Schema (Imagery, Geophysics) |
| `server/prisma.config.ts` | Prisma 設定（讀取 DATABASE_URL） |
| `server/.env` | 環境變數（DATABASE_URL） |

### 前端 Store

| 檔案 | 說明 |
|------|------|
| `src/stores/uploadStore.ts` | 航照圖 & 地球物理探查狀態管理 |
| `src/stores/layerStore.ts` | 圖層控制（含 'geophysics' 類型） |
| `src/stores/boreholeStore.ts` | 鑽孔資料 |
| `src/stores/viewerStore.ts` | 3D 檢視器狀態 (LOD, Clipping) |

### 前端元件

| 檔案 | 說明 |
|------|------|
| `src/pages/DataManagementPage.tsx` | 資料管理頁面（航照圖 + 地球物理探查 UI） |
| `src/components/scene/GeophysicsPlane.tsx` | 地球物理探查 3D 剖面渲染 |
| `src/components/scene/GeologyCanvas.tsx` | 3D 場景主容器 |
| `src/components/overlay/LayerPanel.tsx` | 圖層控制面板 |

### 工具函式

| 檔案 | 說明 |
|------|------|
| `src/utils/coordinates.ts` | TWD97 ↔ Three.js 座標轉換 |

---

## ⚠️ 已知問題

1. **終端機權限錯誤** (`EPERM: process.cwd failed`)
   - 原因：目錄被刪除/重建後終端機 session 權限脫節
   - 解法：關閉並重新開啟 Terminal

2. **Prisma 7 變更**
   - `schema.prisma` 中不再支援 `url = env("DATABASE_URL")`
   - 需透過 `prisma.config.ts` 的 `datasource.url` 設定

3. **Docker PostgreSQL**
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

# Docker 資料庫
docker start llrwd-postgres    # 啟動
docker stop llrwd-postgres     # 停止
docker logs llrwd-postgres     # 查看 logs
```

---

## 📞 聯絡資訊

如有問題或需要額外說明，請參考專案 README.md 或聯繫專案負責人。
