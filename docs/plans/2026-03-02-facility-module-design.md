# 設施導覽模組設計文件

> 日期：2026-03-02
> 狀態：已核准

## 概述

在 LLRWD DigitalTwin Platform 新增獨立的設施 3D 導覽模組。使用者上傳建築物/設施的 GLB/glTF 模型，在獨立 3D 場景中互動瀏覽。支援多層巢狀場景切換（場區 → 建築 → 樓層 → 房間）、Rich Content 資訊面板、地形載入與衛星影像疊加。

## 核心需求

- 獨立 3D 頁面，不與地質場景混合
- 上傳 GLB/glTF，模型自帶定位 + 場景內 gizmo/參數微調
- 點擊模型彈出 Rich Content 資訊框（文字、圖片、文件附件、超連結）
- 多層巢狀場景，進入內部 = 切換到子場景模型
- 側邊樹狀清單 + 2D 平面圖（自動俯視截圖 or 手動上傳）
- 地形 CSV (x, y, elevation) + 衛星影像紋理 + 座標偏移功能
- 權限跟現有專案一致

## 架構方案

**採用：方案 A — 單一 Canvas + 動態載入**

每個「層級」是一組模型集合。切換層級時卸載當前模型、載入目標層級模型，始終只有一個 Canvas。記憶體可控，與專案既有模組一致。

## 資料模型

### FacilityScene（場景層級）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String PK | |
| projectId | FK → Project | |
| parentSceneId | FK → FacilityScene? | null = 根場景 |
| name | String | "場區總覽"、"A棟 1F" |
| description | String? | |
| planImageUrl | String? | 手動上傳的 2D 平面圖 |
| autoPlanImageUrl | String? | 自動產生的俯視截圖 |
| cameraPosition | Json? | 預設相機位置 {x,y,z} |
| cameraTarget | Json? | 預設相機注視點 {x,y,z} |
| terrainCsvUrl | String? | 地形 CSV 檔案路徑 |
| terrainHeightmapUrl | String? | 處理後的 heightmap |
| terrainTextureUrl | String? | 衛星影像紋理 |
| terrainTextureMode | String? | 'satellite' \| 'colorRamp' |
| terrainBounds | Json? | {minX, maxX, minY, maxY, minZ, maxZ} |
| coordShiftX | Float | default: 0 |
| coordShiftY | Float | default: 0 |
| coordShiftZ | Float | default: 0 |
| coordRotation | Float | default: 0 (degrees) |
| sortOrder | Int | 同層級排序 |
| createdAt / updatedAt | DateTime | |

### FacilityModel（場景內模型）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String PK | |
| sceneId | FK → FacilityScene | |
| name | String | "主廠房"、"廢棄物儲存槽" |
| modelUrl | String | GLB/glTF 檔案路徑 |
| fileSize | Int | |
| position | Json | {x, y, z}，預設 0,0,0 |
| rotation | Json | {x, y, z}，euler degrees |
| scale | Json | {x, y, z}，預設 1,1,1 |
| childSceneId | FK → FacilityScene? | 可進入的子場景 |
| sortOrder | Int | |
| createdAt / updatedAt | DateTime | |

### FacilityModelInfo（Rich Content）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String PK | |
| modelId | FK → FacilityModel | |
| type | Enum | TEXT \| IMAGE \| DOCUMENT \| LINK |
| label | String | "設計圖紙"、"施工照片" |
| content | String | 文字內容 or URL or 檔案路徑 |
| sortOrder | Int | |
| createdAt | DateTime | |

## 前端架構

### 頁面路由

```
/project/:projectCode/facility          → FacilityPage
/project/:projectCode/data-management   → DataManagementPage (新增設施上傳區塊)
```

### 元件結構

```
FacilityPage
├── FacilityCanvas
│   ├── FacilityEnvironment           # 燈光、天空
│   ├── FacilityTerrain               # 地形 mesh + 衛星影像/色階紋理
│   ├── FacilityModels                # 動態載入當前場景模型群
│   │   └── FacilityModelItem         # 單一 GLB (hover 高亮、click 選取)
│   ├── TransformGizmo                # drei TransformControls
│   └── FacilityCameraController      # OrbitControls + fly-to 動畫
│
├── FacilitySidebar
│   ├── BreadcrumbNav                 # 場區 > A棟 > 1F
│   ├── SceneTree                     # 巢狀樹 + 展開/收合
│   ├── PlanView                      # 2D 平面圖 + 可點擊標記
│   └── CoordShiftPanel               # 座標偏移設定 (編輯模式)
│
├── FacilityInfoPanel                 # 右側滑出
│   ├── ModelHeader                   # 名稱、描述
│   ├── InfoEntries                   # Rich Content 清單
│   │   ├── TextEntry
│   │   ├── ImageEntry                # 圖片 + lightbox 放大
│   │   ├── DocumentEntry             # 檔案下載連結
│   │   └── LinkEntry
│   └── ActionButtons                 # 進入內部 / 編輯位置
│
├── FacilityToolbar
│   ├── EditModeToggle
│   ├── ScreenshotButton              # 自動俯視截圖
│   ├── TerrainTextureToggle
│   └── BackToRoot
│
└── TransformInputPanel               # 編輯模式浮動面板
    ├── Position X/Y/Z
    ├── Rotation X/Y/Z
    ├── Scale X/Y/Z
    └── TransformMode 切換
```

### Zustand Store（facilityStore.ts）

```typescript
interface FacilityStore {
  // 場景樹
  scenes: FacilityScene[]
  currentSceneId: string | null
  sceneStack: string[]              // 導覽歷史堆疊

  // 模型
  models: FacilityModel[]           // 當前場景的模型列表
  selectedModelId: string | null
  hoveredModelId: string | null

  // 編輯
  editMode: boolean
  editingModelId: string | null
  transformMode: 'translate' | 'rotate' | 'scale'

  // Actions
  fetchScenes: (projectId: string) => Promise<void>
  fetchModels: (sceneId: string) => Promise<void>
  enterScene: (sceneId: string) => Promise<void>
  goBack: () => Promise<void>
  goToRoot: () => Promise<void>
  selectModel: (modelId: string | null) => void
  updateModelTransform: (modelId: string, transform: Partial<Transform>) => Promise<void>
}
```

### 互動流程

**進入頁面：**
1. fetchScenes() 取得場景樹
2. enterScene(rootSceneId) 載入根場景模型
3. 3D 場景顯示，側邊顯示樹狀清單 + 平面圖

**點擊模型（無 childSceneId）：** selectModel() → 右側 InfoPanel 滑出

**點擊模型（有 childSceneId）：** InfoPanel + 「進入內部」按鈕 → enterScene() → 相機 fly-to → 淡出淡入 → 載入子場景

**返回：** goBack() → pop stack → 載入上層場景

### 場景切換動畫

1. 相機 fly-to 被點擊模型位置 (800ms, cubic easing)
2. 畫面淡出 (opacity 0, 300ms)
3. 卸載當前模型、載入子場景模型
4. 畫面淡入 (opacity 1, 300ms)
5. 相機 fly-to 子場景預設視角

### 模型互動

- **一般模式：** hover 高亮 (outline) + tooltip，click 選取開 InfoPanel
- **編輯模式：** click 選中 + TransformGizmo，拖拉即時更新，debounce 300ms 存後端，側邊數值輸入框精確調整

### 地形

- CSV (x, y, elevation) 上傳 → Python 三角化 → heightmap + mesh
- 衛星影像疊加作為紋理
- 座標偏移 (coordShiftX/Y/Z + rotation) 存在 Scene 層級
- 偏移套用於地形頂點，對齊模型座標空間
- 自動對齊：計算地形與模型 bounding box 中心差值

### 平面圖

- 顯示當前場景平面圖（手動上傳 or 自動俯視截圖）
- 模型位置映射為 2D 標記點
- hover/click 標記與 3D 場景聯動
- 有 childSceneId 的標記用不同圖示區分

## 後端 API

```
# 場景 CRUD
GET    /api/facility/scenes?projectId=xxx
POST   /api/facility/scenes
PUT    /api/facility/scenes/:id
DELETE /api/facility/scenes/:id              # 級聯刪除子場景+模型

# 模型 CRUD
GET    /api/facility/models?sceneId=xxx
POST   /api/facility/models                  # multipart: GLB + metadata
PUT    /api/facility/models/:id
PUT    /api/facility/models/:id/transform    # 位置/旋轉/縮放
DELETE /api/facility/models/:id

# Rich Content
GET    /api/facility/models/:id/info
POST   /api/facility/models/:id/info         # multipart: 圖片/文件上傳
PUT    /api/facility/info/:id
DELETE /api/facility/info/:id

# 平面圖
POST   /api/facility/scenes/:id/plan-image
PUT    /api/facility/scenes/:id/auto-plan-image

# 地形
POST   /api/facility/scenes/:id/terrain      # CSV + 衛星影像上傳
DELETE /api/facility/scenes/:id/terrain
```

## 檔案儲存

```
server/uploads/facility/
├── models/{modelId}/model.glb
├── info/{infoId}/uploaded-file.pdf
├── plans/{sceneId}/plan.png, auto-plan.png
└── terrain/{sceneId}/terrain.csv, heightmap.png, satellite.png
```

## 上傳介面（DataManagementPage）

FacilityUploadSection 包含：
- **場景管理：** 建立/編輯/刪除場景（樹狀顯示）、上傳平面圖
- **模型上傳：** 選擇目標場景、拖拉 GLB/glTF（限 100MB）、填寫名稱、可選指定 childSceneId
- **模型資訊編輯：** 選擇模型、新增/編輯 Rich Content（TEXT/IMAGE/DOCUMENT/LINK）
- **場景地形：** 上傳地形 CSV、衛星影像、座標偏移設定

**上傳體驗優化：**
- A. 上傳模型時「點擊可進入」下拉旁有「+ 新建場景」快捷按鈕
- B. 上傳模型到某場景時，若有未關聯的子場景，自動提示是否連結

## 檔案驗證

- GLB/glTF：檢查 magic bytes，最大 100MB
- 圖片：PNG/JPG/WebP，最大 10MB，Sharp 壓縮產生縮圖
- 文件：PDF/DOC/DOCX/XLS，最大 50MB
- 刪除場景時級聯清理所有關聯檔案

## 技術選型

| 需求 | 方案 |
|------|------|
| GLB 載入 | `useGLTF` (drei) |
| 模型高亮 | `@react-three/postprocessing` Outline 或自訂 shader emissive |
| Transform Gizmo | `TransformControls` (drei) |
| Fly-to 動畫 | 自訂 lerp + `useFrame` |
| 地形 mesh | `PlaneGeometry` + displacement 或 Python 產生 mesh |
| 衛星影像紋理 | `TextureLoader` |
| 俯視截圖 | `gl.domElement.toDataURL()` + orthographic camera |
| Rich Content 圖片放大 | 自訂 lightbox |

## 新增檔案

```
前端：
  src/pages/FacilityPage.tsx
  src/stores/facilityStore.ts
  src/types/facility.ts
  src/components/facility/
    ├── FacilityCanvas.tsx
    ├── FacilityEnvironment.tsx
    ├── FacilityTerrain.tsx
    ├── FacilityModels.tsx
    ├── FacilityModelItem.tsx
    ├── FacilityCameraController.tsx
    ├── FacilitySidebar.tsx
    ├── BreadcrumbNav.tsx
    ├── SceneTree.tsx
    ├── PlanView.tsx
    ├── CoordShiftPanel.tsx
    ├── FacilityInfoPanel.tsx
    ├── FacilityToolbar.tsx
    └── TransformInputPanel.tsx
  src/components/data/FacilityUploadSection.tsx

後端：
  server/routes/facility.ts
  server/scripts/facility_terrain_processor.py

Prisma：
  schema.prisma 新增 FacilityScene / FacilityModel / FacilityModelInfo
```

## 不做的事（YAGNI）

- 不做導覽路線動畫
- 不做模型間距離/測量工具
- 不做多人同時編輯
- 不做模型格式轉換（只接受 GLB/glTF）
- 不做 LOD 切換
- 不做獨立權限系統
