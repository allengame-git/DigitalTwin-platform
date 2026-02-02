# Checklist: 模擬分析模組需求品質 (Simulation Module Requirements Quality)

**Purpose**: 驗證模擬分析展示模組規格的完整性、清晰度與一致性  
**Created**: 2026-02-02  
**Focus**: 體積渲染、情境切換、雙向互動

## Requirement Completeness 需求完整性

- [ ] CHK001 - 體積渲染是否定義支援的資料格式與解析度上限？ [Gap, Spec §FR-01]
- [ ] CHK002 - 等值面是否定義閾值調整 UI 的範圍與步進值？ [Gap, Spec §FR-02]
- [ ] CHK003 - 熱圖是否定義色彩映射 (Color Map) 選項與自訂能力？ [Gap, Spec §FR-03]
- [ ] CHK004 - 流線圖是否定義粒子數量、長度與密度參數？ [Gap, Spec §FR-04]
- [ ] CHK005 - 時間軸是否定義支援的時間步數量上限 (對應 20 情境)？ [Gap, Spec §FR-05]
- [ ] CHK006 - 情境列表是否定義 20 種情境的命名慣例與分類方式？ [Gap, Spec §FR-10]

## Requirement Clarity 需求清晰度

- [ ] CHK007 - 「30 FPS 體積渲染」是否定義測量條件 (體積大小、解析度)？ [Ambiguity, Spec §NFR-01]
- [ ] CHK008 - 「2 秒內完成情境切換」是否定義網路條件與資料預載策略？ [Clarity, Spec §NFR-02]
- [ ] CHK009 - 「無明顯掉幀」的具體定義是否與 NFR-01 一致？ [Ambiguity, Spec §NFR-03]
- [ ] CHK010 - 「分級載入」是否定義 LOD 層級數量與切換條件？ [Clarity, Spec §NFR-04]
- [ ] CHK011 - 色彩圖例「清楚標示」是否定義字體大小、刻度數量與位置？ [Ambiguity, Spec §NFR-06]

## Requirement Consistency 需求一致性

- [ ] CHK012 - 儀表板 ECharts 圖表類型是否與規格中提及的統計需求一致？ [Consistency, Spec §FR-12]
- [ ] CHK013 - 雙向連動延遲 <500ms 是否與其他互動延遲需求合理對應？ [Consistency, Spec §SC-02]
- [ ] CHK014 - 導覽模式 JSON 配置是否與其他兩個模組使用相同 Schema？ [Consistency, Cross-Module]
- [ ] CHK015 - 降級顯示 (2D 熱圖) 是否與地質模組 (2D 地圖) 策略一致？ [Consistency, Cross-Module]

## Acceptance Criteria Quality 驗收標準品質

- [ ] CHK016 - SC-01 「1 分鐘內完成兩情境比較」是否定義操作步驟與成功判定？ [Measurability, Spec §SC-01]
- [ ] CHK017 - SC-02 「雙向連動 <500ms」是否定義測量起點與終點？ [Measurability, Spec §SC-02]
- [ ] CHK018 - SC-03 「正確識別超標區域」是否定義正確的判定標準？ [Measurability, Spec §SC-03]
- [ ] CHK019 - SC-04 「90% 民眾易於理解」是否定義調查方法與樣本量？ [Measurability, Spec §SC-04]

## Edge Case Coverage 邊界案例覆蓋

- [ ] CHK020 - 是否定義模擬資料為全零或全空時的顯示行為？ [Coverage, Gap]
- [ ] CHK021 - 是否定義等值面閾值超出資料範圍時的處理？ [Coverage, Gap]
- [ ] CHK022 - 是否定義觀測點無時間歷線資料時的圖表顯示？ [Coverage, Gap]
- [ ] CHK023 - 是否定義多使用者同時切換情境時的狀態同步？ [Coverage, Gap]
- [ ] CHK024 - 是否定義時間播放至最後一步後的行為 (循環/停止)？ [Coverage, Gap]

## Scenario Coverage 情境覆蓋

- [ ] CHK025 - 是否定義情境比較模式 (並排/疊加) 的功能需求？ [Gap, Alternate Flow]
- [ ] CHK026 - 是否定義使用者自訂等值面閾值的儲存/分享功能？ [Gap, Alternate Flow]
- [ ] CHK027 - 是否定義儀表板圖表匯出 (PNG/CSV) 功能需求？ [Gap, Alternate Flow]
- [ ] CHK028 - 是否定義情境資料更新時的通知與重新載入策略？ [Gap, Exception Flow]

## Non-Functional Requirements 非功能性需求

- [ ] CHK029 - 體積渲染是否定義 GPU 記憶體需求與超限處理？ [Gap, NFR]
- [ ] CHK030 - 是否定義不支援體積渲染 (WebGL 2.0 不足) 時的偵測機制？ [Gap, NFR]
- [ ] CHK031 - 是否定義模擬資料預處理 (抽稀) 的精度與品質標準？ [Gap, NFR, Constraint]

## Dependencies & Assumptions 相依性與假設

- [ ] CHK032 - 假設「模擬結果已轉為 Web 友善格式」的格式規格是否定義？ [Assumption]
- [ ] CHK033 - 假設「GPU 支援體積渲染」的最低顯卡需求是否明確？ [Assumption]
- [ ] CHK034 - 後端模擬資料 API 是否定義響應內容與錯誤碼？ [Dependency, Gap]
- [ ] CHK035 - 與觀測點資料的來源 (資料庫/靜態檔案) 是否明確？ [Dependency, Gap]

## Data Model Quality 資料模型品質

- [ ] CHK036 - SimulationScenario.inputParameters 是否定義必要參數欄位？ [Gap, Data Model]
- [ ] CHK037 - TimeStep.dataUrl 是否定義 URL 格式與存取認證需求？ [Gap, Data Model]
- [ ] CHK038 - ObservationPoint.timeSeries 是否定義時間格式與值域範圍？ [Gap, Data Model]
