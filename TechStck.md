### Frontend (核心應用層)

- **Framework:** **React 18+ (Vite) + TypeScript**

  - _說明：_ 提供最強的 3D 生態系支援與型別安全，確保地質資料結構（如 `BoreholeLayer`, `LithologyData`）不發生錯誤。

- **State Management:** **Zustand**

  - _說明：_ 用於管理複雜的 3D 狀態（如：目前的剖面切割位置、時間軸數值、選中的鑽孔 ID）。比 Redux 更輕量且無 Boilerplate。

- **UI System:** **Tailwind CSS** + **Shadcn/ui**

  - _說明：_ 快速構建現代化、半透明的 HUD (抬頭顯示器) 風格控制面板，懸浮於 3D 場景之上。

### 3D Visualization (工程視覺化核心)

- **Core Engine:** **@react-three/fiber (Three.js)**

  - _變更重點：_ 直接處理 **Local Cartesian Coordinates (工程座標)**，解決浮點數抖動問題，提供更自由的光影與渲染控制。

- **Interaction & Helpers:** **@react-three/drei**

  - _關鍵組件：_

    - `<MapControls>`: 提供類似 AutoCAD 或 Google Earth 俯視模式的平移/縮放體驗。

    - `<Html>`: 將 DOM 標籤（如鑽孔名稱、測站數據）直接「黏」在 3D 物件上。

    - `<Environment>`: 提供擬真的 HDRI 環境光照，讓水面與金屬材質更真實。

- **Large Model Streaming:** **3d-tiles-renderer** (NASA/Google Open Source)

  - _說明：_ 如果 SketchUp 模型或地形非常巨大，使用此套件在 Three.js 中載入 3D Tiles，實現「看哪裡、載哪裡」的效能優化。

- **Massive Data Rendering:** **InstancedMesh** (Three.js Native)

  - _變更重點：_ 利用 GPU Instancing 技術，在單一 Draw Call 中渲染數千根鑽孔與地質結構，效能極佳且能接受統一的光影投射。

- **Charts/BI:** **ECharts-for-React**

  - _說明：_ 負責所有 2D 統計圖表（地層分佈比例、地下水位歷線），並與 3D 場景進行雙向互動。

### Backend & Data (數據處理層)

- **Runtime:** **Node.js**

- **API Framework:** **NestJS** (推薦) 或 Express.js

  - _說明：_ NestJS 的架構更適合企業級大型應用，且對 TypeScript 支援度最高。

- **Database:** **PostgreSQL** + **PostGIS**

  - _說明：_ 雖然不使用全球經緯度，但 PostGIS 的 `Geometry` 類型仍然是儲存 3D 點位 (Point Z)、多邊形 (Polygon Z) 並進行空間查詢（例如：「找出這個 3D 範圍內的鑽孔」）的最佳選擇。

- **Data Pipeline:**

  - **Python (Scripting):** 用於前處理。將原始地質軟體數據或 CSV 轉換為前端易讀的 JSON。

  - **gltf-pipeline / Blender API:** 用於將 SketchUp (`.skp`) 自動化轉檔為網頁優化的 `.glb` (Draco 壓縮格式)。
