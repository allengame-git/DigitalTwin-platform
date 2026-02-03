# Checklist: 工程設計模組需求品質 (Engineering Design Module Requirements Quality)

**Purpose**: 驗證工程設計展示模組規格的完整性、清晰度與一致性  
**Created**: 2026-02-02  
**Focus**: BIM 整合、4D 施工模擬、互動說明

## Requirement Completeness 需求完整性

- [ ] CHK001 - 是否定義支援的 glTF 版本與擴展 (Draco 壓縮等)？ [Gap, Spec §FR-01]
- [ ] CHK002 - 是否定義 3D Tiles 版本與 LOD 切換策略？ [Gap, Spec §FR-02]
- [ ] CHK003 - Raycasting 地形吻合是否定義高程容差與邊緣處理？ [Gap, Spec §FR-03]
- [ ] CHK004 - 構件分組是否定義標準分類代碼 (IFC class 或自訂)？ [Gap, Spec §FR-04]
- [ ] CHK005 - 時間軸是否定義時間單位 (日/週/月) 與起訖範圍？ [Gap, Spec §FR-05]
- [ ] CHK006 - 施工狀態顏色是否定義具體色碼與圖例？ [Gap, Spec §FR-08]

## Requirement Clarity 需求清晰度

- [ ] CHK007 - 「50MB glTF 10秒內完成」是否定義網路條件假設？ [Ambiguity, Spec §NFR-01]
- [ ] CHK008 - 「30 FPS 以上」是否定義測試場景 (構件數量、動畫複雜度)？ [Clarity, Spec §NFR-02]
- [ ] CHK009 - 「漸進式載入」是否定義優先順序策略 (距離/可見性)？ [Clarity, Spec §NFR-04]
- [ ] CHK010 - 設計圖說連結開啟方式 (新視窗/Modal) 是否明確定義？ [Ambiguity, Spec §FR-10]
- [ ] CHK011 - 時間軸「逐步前進/後退」的步進單位是否定義？ [Gap, Spec §FR-06]

## Requirement Consistency 需求一致性

- [ ] CHK012 - 構件資訊面板欄位是否與資料模型 Component.parameters 結構一致？ [Consistency, Data Model]
- [ ] CHK013 - ConstructionPhase.status 枚舉是否與 FR-08 顏色定義完全對應？ [Consistency]
- [ ] CHK014 - 導覽模式需求是否與地質模組 (FR-18) 使用相同 JSON 配置格式？ [Consistency, Cross-Module]
- [ ] CHK015 - 錯誤處理需求 (NFR-08/09) 是否與地質模組降級策略一致？ [Consistency, Cross-Module]

## Acceptance Criteria Quality 驗收標準品質

- [ ] CHK016 - SC-01 「10秒內找到構件」是否定義搜尋方法 (點擊/搜尋框)？ [Measurability, Spec §SC-01]
- [ ] CHK017 - SC-02 「掉幀 <5%」是否定義計算方式與測量區間？ [Measurability, Spec §SC-02]
- [ ] CHK018 - SC-03 「準確定位至指定階段」是否定義操作步驟與成功標準？ [Measurability, Spec §SC-03]
- [ ] CHK019 - SC-04 「90% 認為整合自然」是否定義調查對象與評分量表？ [Measurability, Spec §SC-04]

## Edge Case Coverage 邊界案例覆蓋

- [ ] CHK020 - 是否定義施工階段為空 (無資料) 時時間軸的顯示行為？ [Coverage, Gap]
- [ ] CHK021 - 是否定義施工階段重疊 (同時進行) 時的顯示規則？ [Coverage, Gap]
- [ ] CHK022 - 是否定義構件無設計參數時 InfoPanel 的顯示？ [Coverage, Gap]
- [ ] CHK023 - 是否定義設計圖說 PDF 載入失敗時的處理？ [Coverage, Gap]
- [ ] CHK024 - 是否定義工程模型與地形不吻合時的視覺處理？ [Coverage, Gap]

## Scenario Coverage 情境覆蓋

- [ ] CHK025 - 是否定義時間軸跳轉至特定日期的功能需求？ [Gap, Alternate Flow]
- [ ] CHK026 - 是否定義構件搜尋/過濾功能需求？ [Gap, Alternate Flow]
- [ ] CHK027 - 是否定義多模型同時載入的行為與效能需求？ [Gap, Edge Case]
- [ ] CHK028 - 是否定義施工進度與實際完成日期不一致時的標示方式？ [Gap, Exception Flow]

## Non-Functional Requirements 非功能性需求

- [ ] CHK029 - 是否定義模型檔案大小上限與超限處理？ [Gap, NFR]
- [ ] CHK030 - 是否定義離線 (無網路) 時的行為？ [Gap, NFR, Spec §Constraint]
- [ ] CHK031 - 是否定義模型快取策略與過期機制？ [Gap, NFR]

## Dependencies & Assumptions 相依性與假設

- [ ] CHK032 - SketchUp 座標系統轉換是否定義標準流程與驗證方法？ [Assumption]
- [ ] CHK033 - 轉檔工具 (gltf-pipeline) 是否定義版本與參數配置？ [Dependency, Gap]
- [ ] CHK034 - 設計圖說 URL 存取是否需要認證？與 Auth 模組整合方式？ [Dependency, Gap]
