# Feature Specification: 工程設計展示模組 (Engineering Design Module)

**Status**: DRAFT  
**Owner**: Engineering Team  
**Created**: 2026-02-02

## 1. Overview

本模組提供工程數位孿生平台的 BIM/工程設計視覺化功能。使用者可透過 3D 介面檢視壩體、廠房、隧道等工程設施，並透過時序模擬功能了解施工進度與順序。

**核心價值**:

- 整合 SketchUp/BIM 模型至統一的 3D 場景，與地質資料無縫整合
- 透過 4D 施工模擬，讓審查委員與民眾理解工程進度規劃
- 點擊互動取得設計參數與圖說，減少查閱紙本文件需求

## 2. User Scenarios

### 情境 A：工程師檢視設計模型

作為**工程師**，我想要**在 3D 場景中檢視工程設施與周邊地形的關係**，以便**確認設計與現地條件的吻合度**。

**流程**：

1. 開啟工程設計展示模組，載入工程設施模型
2. 旋轉視角檢視壩體與地形的咬合情況
3. 點擊特定構件查看設計參數
4. 開啟設計圖說 PDF 進行細部確認

### 情境 B：審查委員檢核施工順序

作為**審查委員**，我想要**播放 4D 施工動畫**，以便**評估施工順序的合理性與風險**。

**流程**：

1. 進入時序模擬模式
2. 使用時間軸滑桿播放施工進度動畫
3. 暫停於特定施工階段，檢視當時的結構狀態
4. 使用標註工具記錄審查意見

### 情境 C：民眾了解工程規模

作為**一般民眾**，我想要**透過動畫了解工程的建造過程**，以便**理解工程的規模與效益**。

**流程**：

1. 進入導覽模式，觀看預設的施工動畫
2. 閱讀關鍵階段的說明文字
3. 可選擇點擊感興趣的設施了解更多

## 3. Functional Requirements

### BIM/模型整合

- [ ] FR-01: 系統必須支援載入 glTF 格式的單體設施模型
- [ ] FR-02: 系統必須支援載入 3D Tiles 格式的大範圍工區模型
- [ ] FR-03: 系統必須將工程模型精確放置於地形表面 (Terrain Clamping)
- [ ] FR-04: 系統必須支援模型的分層顯示控制 (依構件類型分組)

### 4D 施工模擬

- [ ] FR-05: 系統必須提供時間軸滑桿控制施工進度顯示
- [ ] FR-06: 時間軸必須支援播放、暫停、逐步前進/後退操作
- [ ] FR-07: 系統必須根據時間軸位置動態顯示/隱藏對應施工階段的構件
- [ ] FR-08: 系統必須支援以顏色變化標示施工狀態 (規劃中/進行中/完成)

### 互動說明

- [ ] FR-09: 點擊工程構件時，系統必須彈出資訊面板顯示設計參數
- [ ] FR-10: 資訊面板必須支援連結至設計圖說 (PDF/Image)，可在新視窗開啟
- [ ] FR-11: 系統必須支援構件高亮顯示 (滑鼠懸停時)

### 資料處理

- [ ] FR-12: 系統必須提供 SketchUp (.skp) 轉 glTF/3D Tiles 的轉檔指引或工具
- [ ] FR-13: 施工階段資料必須支援 JSON 格式定義 (階段名稱、時間、關聯構件)
- [ ] FR-14: 導覽模式內容 (動畫路徑、說明文字、停留點) 必須透過外部 JSON 配置檔載入

## 4. Non-Functional Requirements

### 效能

- [ ] NFR-01: 載入完整工區模型 (50MB glTF) 必須在 10 秒內完成
- [ ] NFR-02: 時間軸播放動畫必須維持 30 FPS 以上
- [ ] NFR-03: 模型與地形的咬合計算必須在載入時完成，互動時無額外延遲

### 相容性

- [ ] NFR-04: 大型模型必須支援漸進式載入 (Progressive Loading)
- [ ] NFR-05: 系統必須支援主流瀏覽器 (Chrome, Firefox, Safari, Edge)

### 可用性

- [ ] NFR-06: 時間軸 UI 必須清楚標示當前日期與施工階段名稱
- [ ] NFR-07: 載入模型時必須顯示進度百分比

### 異常處理

- [ ] NFR-08: 3D 資產載入失敗時必須顯示友善錯誤訊息與重試按鈕
- [ ] NFR-09: 3D 模型無法載入時必須提供降級顯示 (2D 平面圖替代)

## 5. Success Criteria

- [ ] SC-01: 使用者能在 10 秒內找到特定工程構件並查看其設計參數
- [ ] SC-02: 4D 動畫播放完整施工流程時無卡頓 (掉幀 <5%)
- [ ] SC-03: 審查委員能透過時間軸準確定位至指定施工階段
- [ ] SC-04: 90% 的使用者認為模型與地形整合「自然且準確」

## 6. Assumptions & Constraints

### Assumptions

- SketchUp 模型已正確設定座標系統與比例
- 施工階段資料由專案團隊提供，格式為 JSON
- 設計圖說已預先轉換為 PDF 格式並可透過 URL 存取

### Constraints

- 首期不支援即時協作編輯模型
- 模型更新需透過重新上傳，不支援差異更新
- 轉檔工具為離線提供，不整合於 Web 平台內

## 7. Data Model

### 核心實體

```
EngineeringModel (工程模型)
├── id: string
├── name: string (模型名稱)
├── type: 'dam' | 'plant' | 'tunnel' | 'other'
├── modelUrl: string (glTF/3D Tiles URL)
├── position: { longitude, latitude, altitude }
├── components: Component[]
└── constructionPhases: ConstructionPhase[]

Component (構件)
├── id: string
├── modelId: string
├── name: string (構件名稱)
├── category: string (構件類型)
├── parameters: { [key: string]: any } (設計參數)
└── documentUrl: string (圖說連結)

ConstructionPhase (施工階段)
├── id: string
├── modelId: string
├── name: string (階段名稱)
├── startDate: Date
├── endDate: Date
├── componentIds: string[] (涉及構件)
└── status: 'planned' | 'in_progress' | 'completed'
```

## 8. Clarifications (Auto-generated)

### Session 2026-02-02

- Q: 導覽模式內容如何維護？ → A: JSON 配置檔外部載入
- Q: 3D 資產載入失敗時如何處理？ → A: 友善錯誤 + 重試按鈕 + 降級顯示
