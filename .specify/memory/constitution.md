<!--
Sync Impact Report: 2026-02-02
- Version: 1.0.0 -> 1.1.0
- Changes: Defined 4 core principles replacing generic placeholders.
  - Added: 1. 程式碼品質與架構 (Code Quality & Architecture)
  - Added: 2. 效能至上 (Performance Quality)
  - Added: 3. 測試標準 (Testing Standards)
  - Added: 4. 一致的使用者體驗 (User Experience Consistency)
- Templates Updated:
  - .specify/templates/plan-template.md (Updated Constitution Check section to match 4 principles) ✅
-->
# Project Constitution

**Project**: LLRWD DigitalTwin Platform  
**Version**: 1.1.0  
**Last Amended**: 2026-02-02

## Preamble

本文件確立了 LLRWD DigitalTwin Platform 程式碼庫的核心原則與不可協商的規則。所有的規格說明、計畫與程式碼變更都必須遵守這些原則。

## Principles

### 1. 程式碼品質與架構 (Code Quality & Architecture)

- **TypeScript Strong Typing**: 嚴格禁止使用 `any`。所有地質資料結構（如 `Borehole`, `Layer`）必須定義明確 Interface。
- **Component Structure**: 採用 Functional Components 與 Hooks。必須將 3D 場景邏輯 (Scene) 與 UI 疊加層邏輯 (Overlay) 分離。
- **State Management**: 使用 Zustand 進行全域狀態管理，避免 Prop Drilling。
- **Documentation**: 複雜的數學運算與 GIS 座標轉換邏輯必須包含詳細 JSDoc 註釋。

### 2. 效能至上 (Performance Quality)

- **Rendering Strategy**: 分級渲染策略——Cesium 用於底圖與地形，Deck.gl 用於大量數據點 (>100)，Three.js 僅用於局部細節檢視。
- **Asset Optimization**: 優先使用 Draco 壓縮的 `.glb` 或 `3D Tiles`，並配合 `Suspense` 實作非同步載入。
- **Memory Management**: 組件卸載時必須 Dispose 幾何與材質；重複物件必須使用 `InstancedMesh`。

### 3. 測試標準 (Testing Standards)

- **Unit Testing**: 關鍵商業邏輯、座標轉換與數據處理函數必須包含單元測試。
- **Integration Testing**: 針對 3D 互動流程與複雜 UI 狀態變換進行整合測試。
- **CI/CD**: 所有 Pull Request 必須通過 Lint 檢查與既定測試規範，確保無 Regression。

### 4. 一致的使用者體驗 (User Experience Consistency)

- **Loading States**: 讀取重型 3D 資產或數據時，必須顯示進度條或 Skeleton Screen。
- **Interaction Standards**: 左鍵點擊用於「選取/識別」，右鍵拖曳用於「旋轉/平移」，滑鼠懸停顯示 Tooltip。
- **Responsiveness**: Dashboard 介面在小螢幕上必須可折疊，且不能阻擋 3D 視圖的核心操作。

## Governance

- 修改本憲章需要進行 Major 或 Minor 版本號更新。
- 所有 Pull Requests 必須根據本憲章進行檢查。
