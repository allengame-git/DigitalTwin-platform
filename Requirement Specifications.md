### 1. 專案概述 (Project Overview)

建立一個基於 Web 的「工程數位孿生 (Digital Twin)」平台，整合地質、工程設計與數值模擬成果。系統需具備「多層次資訊深度」，能滿足專業人員的細部檢視需求，也能轉化為一般民眾易懂的視覺化科普展示。

### 2. 功能模組細節 (Functional Modules)

#### A. 地質資料展示模組 (Geology & Hydrogeology)

- **3D 地質/水文模型：** 支援切片 (Slicing)、爆炸圖 (Exploded View) 與透明度調整，以檢視地層內部結構。

- **鑽探資料庫 (Boreholes)：**

  - 在 GIS 地圖上顯示數百個孔位。

  - 支援 LOD (Level of Detail)：遠看是點，近看顯示岩性柱狀圖 (Lithology Log)。

  - 點擊孔位連動 ECharts 顯示詳細岩芯照片與物性數據。

- **地表與構造：** 疊加高解析度航照圖、地形 DEM、地質構造線 (Faults) 與地質位態 (Strike/Dip) 符號。
- - **資料源處理：**

    - **鑽探資料 (Boreholes)：** 需將 CSV/Excel 轉為 JSON，包含孔口座標 (X,Y,Z)、地層分層 (Lithology)、地下水位 (Water Level)。

    - **地球物理 (Geophysics)：**

      - _電阻率/電磁法 (Resistivity/EM)：_ 需將反演後的剖面影像轉為帶有空間座標的「垂直貼圖 (Wall Geometry)」。

      - _震測 (Seismic)：_ 需轉為點雲 (Point Cloud) 或 網格 (Mesh) 呈現地層界面。

    - **位態資料 (Strike/Dip)：** 在 3D 空間中以圓盤或法向量符號 (Disks/Vectors) 標示。

- **視覺化重點：** 地下透明度控制 (Subsurface Transparency)、切片檢視 (Slicing)。

#### B. 工程設計展示模組 (Engineering Design)

- **BIM/SketchUp 整合：** 透過 glTF/3D Tiles 格式匯入工程模型（壩體、廠房、隧道）。

- **時序施工模擬 (4D Simulation)：** 透過時間軸 (Timeline Slider) 播放工程進度動畫（開挖、支撐、澆置）。

- **互動說明：** 點擊特定工程部件，彈出設計參數與設計圖說 (PDF/Image)。

- **資料源處理：**

  - **SketchUp (.skp)：** 必須建立自動或半自動流程，轉檔為 **glTF** (單體設施) 或 **3D Tiles** (大範圍工區)。

  - **動畫 (Animation)：** 施工順序 (4D Construction Phasing) 需透過時間軸 (Timeline) 控制模型的顯示/隱藏或顏色變化。

- **視覺化重點：** 模型與地形的精確咬合 (Clamping)、點擊模型顯示設計圖說 (Metadata)。

#### C. 模擬分析展示模組 (Simulation & Analysis)

- **數值模擬視覺化：**

  - **污染物傳輸：** 使用體積渲染 (Volumetric Rendering) 或等值面 (Isosurface) 展示地下水污染羽 (Plume) 的擴散範圍。

  - **熱圖 (Heatmaps)：** 在地表或剖面上繪製濃度/壓力分佈。

- **情境分析 (Scenario Analysis)：** 下拉選單切換不同模擬情境（例如：豐水期/枯水期、有無整治措施），3D 場景即時更新。

- **儀表板 (Dashboard)：** 整合 Ag-Grid 表格與 ECharts，並列顯示模擬輸入參數與輸出結果統計。
- **資料源處理：**

  - **模擬結果 (CFD/Groundwater Flow)：** 網格數據 (VTK/NetCDF) 需抽稀或轉為 WebGL 友善格式 (如 texture-based flow)。

  - **時間歷線：** 污染物濃度隨時間變化，需與 3D 場景連動。

- **視覺化重點：** 熱力圖 (Heatmap)、流線圖 (Streamlines)、雙向互動 (點擊 3D 點位 -> 更新 2D ECharts 圖表)。

### 3. 使用者角色與權限 (User Roles)

- **工程師/專家 (Engineer/Expert)：** 全功能存取，可查看原始數據、切換複雜圖層、使用量測工具。

- **審查委員 (Reviewer)：** 檢視模式，重點在於「設計驗證」與「數據比對」，需有標註 (Annotation) 功能。

- **一般民眾 (Public)：** 導覽模式 (Guided Tour)，介面簡化，隱藏過多技術參數，以 Storytelling 方式展示 3D 動畫與關鍵成果。
