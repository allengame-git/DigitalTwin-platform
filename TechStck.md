技術棧與套件 (Tech Stack)

### Frontend (核心)

- **Framework:** React 18+ (Vite) + TypeScript

- **State Management:** Zustand (輕量級，適合處理 3D 場景狀態)

- **Styling:** Tailwind CSS (快速刻畫 UI) + Shadcn/ui (高品質 UI 組件)

### 3D & GIS Visualization (視覺化核心)

- **Global Context (宏觀):** **Resium** (CesiumJS 的 React 封裝) - 負責地形、影像、大範圍場景。

- **Data Layer (大數據):** **Deck.gl** - 負責鑽孔、大量點雲、向量場。

- **Detailed Models (微觀):** **@react-three/fiber (Three.js)** - 負責獨立視窗中的地質塊體細節、互動式工程模型展示。

- **Chart/Dashboard:** **ECharts-for-React** - 負責所有 2D 統計圖表。

### Backend & Data

- **Runtime:** Node.js

- **API:** Express.js 或 NestJS (處理地質資料 API)。

- **Database:** PostgreSQL + **PostGIS** (處理空間查詢的關鍵)。

- **3D Pipeline:** 使用 `gltf-pipeline` 或 `obj2gltf` 工具處理 SketchUp 轉檔。
