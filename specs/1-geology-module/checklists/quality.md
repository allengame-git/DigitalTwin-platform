# Checklist: 地質模組需求品質 (Geology Module Requirements Quality)

**Purpose**: 驗證地質資料展示模組規格的完整性、清晰度與一致性  
**Created**: 2026-02-02  
**Focus**: 3D 視覺化、資料處理、效能需求

## Requirement Completeness 需求完整性

- [ ] CHK001 - 是否明確規定 LOD 距離閾值 (>2km 與 <2km) 的確切判定邏輯？ [Clarity, Spec §FR-06]
- [ ] CHK002 - 切片工具是否定義支援的剖面角度範圍與限制？ [Gap, Spec §FR-02]
- [ ] CHK003 - 爆炸圖模式是否定義地層分離距離與動畫行為？ [Gap, Spec §FR-04]
- [ ] CHK004 - 是否定義鑽探資料 CSV/Excel 的標準化欄位名稱與格式？ [Gap, Spec §FR-13]
- [ ] CHK005 - 地質構造符號 (Strike/Dip) 是否定義顏色編碼與尺寸規範？ [Gap, Spec §FR-12]
- [ ] CHK006 - 導覽模式 JSON 配置是否定義 Schema 結構？ [Gap, Spec §FR-18]

## Requirement Clarity 需求清晰度

- [ ] CHK007 - 「即時顯示剖面」是否量化具體的延遲時間 (<200ms 已定義於 NFR-02)？ [Clarity, Spec §FR-02]
- [ ] CHK008 - 「高解析度航照圖」的 0.5m 解析度是否為最低或最高需求？ [Ambiguity, Spec §FR-09]
- [ ] CHK009 - 「無明顯卡頓」是否量化為具體 FPS 或延遲指標？ [Ambiguity, Spec §NFR-03]
- [ ] CHK010 - 物性數據的「深度-物性數據曲線」是否定義需支援的物性類型？ [Clarity, Spec §FR-08]
- [ ] CHK011 - 「岩性柱狀圖」的視覺呈現規範 (高度、顏色、標籤) 是否明確定義？ [Gap]

## Requirement Consistency 需求一致性

- [ ] CHK012 - FR-05 (500孔位) 與更新後的 800 孔位需求是否在所有相關章節同步？ [Consistency]
- [ ] CHK013 - 3D 場景的座標系統 (WGS84) 是否與資料模型定義一致？ [Consistency, Data Model]
- [ ] CHK014 - 圖層控制面板的圖層列表是否與各 FR 定義的圖層類型完全對應？ [Consistency, Spec §FR-16]
- [ ] CHK015 - Loading States 需求 (NFR-06) 是否涵蓋所有異步載入操作？ [Consistency with Constitution §4]

## Acceptance Criteria Quality 驗收標準品質

- [ ] CHK016 - SC-01 「30秒內找到特定鑽孔」是否定義搜尋起始條件與成功判定？ [Measurability, Spec §SC-01]
- [ ] CHK017 - SC-02 「>30 FPS」是否定義測量條件 (設備規格、資料量)？ [Measurability, Spec §SC-02]
- [ ] CHK018 - SC-03 「滿意度 4/5」是否定義調查方法與樣本量？ [Measurability, Spec §SC-03]
- [ ] CHK019 - SC-04 「導覽完成率 70%」是否定義完成判定標準？ [Measurability, Spec §SC-04]

## Edge Case Coverage 邊界案例覆蓋

- [ ] CHK020 - 是否定義鑽孔資料為空 (0 孔位) 時的顯示行為？ [Coverage, Gap]
- [ ] CHK021 - 是否定義地層資料深度不連續 (有間隙) 時的處理方式？ [Coverage, Gap]
- [ ] CHK022 - 是否定義岩芯照片載入失敗時的替代顯示？ [Coverage, Gap]
- [ ] CHK023 - 是否定義地質模型超出視窗邊界時的行為？ [Coverage, Gap]
- [ ] CHK024 - 是否定義同時啟用多個圖層時的 Z-order 與遮擋處理？ [Coverage, Gap]

## Non-Functional Requirements 非功能性需求

- [ ] CHK025 - 效能需求是否定義最低硬體規格要求？ [Gap, NFR]
- [ ] CHK026 - 是否定義 WebGL 2.0 不支援時的降級策略？ [Gap, Spec §Assumption]
- [ ] CHK027 - 是否定義觸控設備的手勢操作細節 (雙指縮放、旋轉)？ [Clarity, Spec §NFR-05]
- [ ] CHK028 - 是否定義不同瀏覽器版本的相容性測試範圍？ [Coverage, Spec §NFR-04]

## Dependencies & Assumptions 相依性與假設

- [ ] CHK029 - 假設「鑽探資料以 CSV/Excel 格式提供」是否有驗證機制或錯誤處理？ [Assumption]
- [ ] CHK030 - 假設「使用者設備支援 WebGL 2.0」是否有偵測與提示機制？ [Assumption]
- [ ] CHK031 - 地質模型來源 (3D Tiles/glTF) 是否定義版本與相容性要求？ [Dependency, Gap]
- [ ] CHK032 - 與後端 API 的錯誤回應格式是否對齊 OpenAPI 定義？ [Dependency, Contract]

## Constitution Alignment 憲章對齊

- [ ] CHK033 - 是否明確定義所有 Interface (Borehole, Layer 等) 的必填/選填欄位？ [Constitution §1]
- [ ] CHK034 - 是否明確定義 JSDoc 註釋的必要區塊 (座標轉換邏輯)？ [Constitution §1]
- [ ] CHK035 - 是否明確定義 Deck.gl vs Three.js 的使用場景分界？ [Constitution §2]
- [ ] CHK036 - 是否定義 Tooltip 內容格式與顯示時機？ [Constitution §4]
