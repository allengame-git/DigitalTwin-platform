
## 第一部分：需求規格說明 (Requirement Specifications)

### 1. 專案概述 (Project Overview)

本專案旨在建立一個基於 Web 的 **「工程數位孿生 (Engineering Digital Twin)」** 平台，採用 **Local 工程座標系** (非全球 GIS 座標)。系統需整合地質調查、工程設計與數值模擬成果，具備「多層次資訊深度」，既能滿足專業工程師與審查委員的細部檢視需求，亦能切換為簡易模式供一般民眾科普展示。

### 2. 功能模組細節 (Functional Modules)

#### A. 地質與水文模組 (Geology & Hydrogeology Module)

- **核心功能 (Core Features):**

  - **3D 地質/水文模型:** 支援即時剖面切割 (Slicing Tool)、爆炸圖 (Exploded View) 及地層透明度調整 (Opacity Control)，以透視地下結構。

  - **數位地表 (Surface):** 疊加高解析度航照圖 (Texture)、地形 DEM (Heightmap)、斷層構造線 (Faults) 與地質位態符號 (Strike/Dip)。

- **鑽探資料庫 (Borehole System):**

  - **視覺化:** 在 3D 場景中顯示數百至數千口鑽孔。

  - **LOD 機制:** 遠景顯示為簡易點 (Points)；近景顯示為真實比例的岩性柱狀圖 (Cylinders with textures)。

  - **互動:** 點擊孔位需連動 ECharts 儀表板，展示詳細岩芯照片 (Core Photos) 與物理性質數據。

- **資料處理與實作 (Data Processing & Implementation):**

  - **Boreholes:** 原始 CSV/Excel 需轉換為標準 JSON 陣列。

    - _Technical Note:_ 實作時需使用 `InstancedMesh` 渲染大量重複的圓柱體以優化效能。

  - **Geophysics (地球物理):**

    - **電阻率/電磁法:** 將反演剖面影像轉為 3D 空間中的「垂直貼圖牆 (Textured Wall Geometry)」。

    - **震測:** 將地層界面轉為點雲 (Point Cloud) 或三角網格 (Mesh)。

  - **Strike/Dip:** 在 3D 空間利用 `Object3D` (圓盤或法向量箭頭) 標示岩層走向與傾角。

#### B. 工程設計展示模組 (Engineering Design Module)

- **核心功能 (Core Features):**

  - **BIM/SketchUp 整合:** 匯入大壩、廠房、隧道等高精度模型。

  - **4D 時序施工模擬:** 透過時間軸滑桿 (Timeline Slider) 播放工程進度（如：開挖移除土方 -> 架設支撐 -> 結構澆置）。

  - **互動說明:** 支援 Raycasting 點選模型構件，彈出懸浮視窗顯示設計參數與 PDF 圖說。

- **資料處理與實作 (Data Processing & Implementation):**

  - **Model Pipeline:** `.skp` 檔案需經由自動化流程轉換為 **glTF (Draco Compressed)** (適用單體) 或 **3D Tiles** (適用超大工區)。

  - **Clamping:** 確保工程模型與地形 DEM 在 Local 座標系下精確咬合 (Clamping)，無懸空或穿模。

  - **Phasing:** 每個 3D 物件需綁定「施工階段 ID」，由 Zustand Store 控制其可見性 (Visibility)。

#### C. 模擬分析展示模組 (Simulation & Analysis Module)

- **核心功能 (Core Features):**

  - **數值模擬視覺化:**

    - **污染物傳輸:** 利用體積渲染 (Volumetric Rendering) 或等值面 (Isosurface) 技術展示地下水污染羽 (Plume) 的 3D 擴散範圍。

    - **熱圖 (Heatmaps):** 在地表或任意剖面上繪製濃度、壓力或地溫分佈。

  - **情境分析 (Scenario Analysis):** 提供 UI 下拉選單切換不同模擬案（Case A: 豐水期 vs Case B: 枯水期），3D 場景需即時更新數據流。

  - **整合儀表板:** 使用 Split Pane 設計，左側 3D 場景，右側整合 Ag-Grid 資料表與 ECharts 統計圖。

- **資料處理與實作 (Data Processing & Implementation):**

  - **Data Optimization:** 巨大的網格數據 (VTK/NetCDF) 需在後端抽稀 (Downsampling) 或轉換為前端友善的二進制格式 (Binary Arrays)。

  - **Interaction:** 實作雙向連動——在 3D 點選某個監測井，2D 圖表即顯示該井的歷史濃度曲線 (Time-Series)。

### 3. 使用者角色與權限 (User Roles & UX Modes)

- **工程師/專家 (Engineer/Expert Mode):**

  - **權限:** 全功能存取 (Read/Analyze)。

  - **介面:** 顯示完整圖層控制 (Layer Tree)、量測工具 (Measure Tool)、剖面控制器。

- **審查委員 (Reviewer Mode):**

  - **權限:** 檢視與標註 (View/Annotate)。

  - **介面:** 重點在於「設計驗證」與「數據比對」，需提供紅筆標註 (Red-lining) 或便利貼留言功能。

- **一般民眾 (Public/Tour Mode):**

  - **權限:** 僅限瀏覽 (Read Only)。

  - **介面:** 極簡化 UI (Hidden parameters)。以 **Storytelling (導覽模式)** 運作，透過預設的「鏡頭路徑 (Camera Path)」播放 3D 動畫與關鍵成果，隱藏艱澀的技術參數。
