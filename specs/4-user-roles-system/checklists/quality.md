# Checklist: 使用者角色模組需求品質 (User Roles Module Requirements Quality)

**Purpose**: 驗證使用者角色與權限系統規格的完整性、清晰度與一致性  
**Created**: 2026-02-02  
**Focus**: 認證授權、標註功能、介面適配

## Requirement Completeness 需求完整性

- [ ] CHK001 - 是否定義密碼複雜度要求 (長度、字元類型)？ [Gap, Spec §FR-19]
- [ ] CHK002 - 是否定義登入失敗後的鎖定機制 (嘗試次數、鎖定時間)？ [Gap, Security]
- [ ] CHK003 - 是否定義邀請連結的有效期限與單次使用限制？ [Gap, Spec §FR-20]
- [ ] CHK004 - 是否定義標註類型 (text/arrow/region) 的視覺規格？ [Gap, Spec §FR-10]
- [ ] CHK005 - 是否定義標註解決 (resolve) 狀態的權限與工作流程？ [Gap, Spec §Annotation]
- [ ] CHK006 - 是否定義可觀測性 (錯誤日誌/頁面統計) 的資料保留期限？ [Gap, Spec §NFR-08/09]

## Requirement Clarity 需求清晰度

- [ ] CHK007 - Session 逾時「8 小時/1 小時」是否基於「無活動」還是「總時長」？ [Ambiguity, Spec §FR-21]
- [ ] CHK008 - 「極度簡化」的民眾介面是否定義具體保留的 UI 元素？ [Clarity, Spec §FR-18]
- [ ] CHK009 - 「友善提示」未授權存取是否定義提示內容與導向？ [Clarity, Spec §NFR-07]
- [ ] CHK010 - 「複雜技術操作」隱藏清單是否明確列出？ [Ambiguity, Spec §FR-13]
- [ ] CHK011 - 量測工具 (距離、面積、角度) 是否定義操作方式與輸出格式？ [Clarity, Spec §FR-06]

## Requirement Consistency 需求一致性

- [ ] CHK012 - 三個角色的功能存取矩陣是否明確定義並無衝突？ [Consistency]
- [ ] CHK013 - 標註功能是否與其他三個模組的 3D 場景整合方式一致？ [Consistency, Cross-Module]
- [ ] CHK014 - 導覽模式 (民眾) 是否與各展示模組的 GuidedTour 整合？ [Consistency, Cross-Module]
- [ ] CHK015 - 錯誤日誌格式是否與後端統一？ [Consistency, Spec §NFR-08]

## Security Requirements 安全性需求

- [ ] CHK016 - 是否定義 JWT Token 的簽章演算法與金鑰管理策略？ [Gap, Security]
- [ ] CHK017 - 是否定義 Refresh Token 的儲存位置 (Cookie/LocalStorage) 與安全措施？ [Gap, Security]
- [ ] CHK018 - 是否定義跨站請求偽造 (CSRF) 防護機制？ [Gap, Security]
- [ ] CHK019 - 是否定義敏感資料 (密碼、Token) 的傳輸加密要求 (HTTPS)？ [Gap, Security, Spec §NFR-01]
- [ ] CHK020 - 是否定義 API 端點權限驗證的錯誤回應格式？ [Gap, Spec §NFR-02]

## Acceptance Criteria Quality 驗收標準品質

- [ ] CHK021 - SC-01 「5 秒內存取完整功能」是否定義起始點 (登入完成瞬間)？ [Measurability, Spec §SC-01]
- [ ] CHK022 - SC-02 「標註使用率 80%」是否定義統計期間與計算方式？ [Measurability, Spec §SC-02]
- [ ] CHK023 - SC-03 「跳出率 <30%」是否定義跳出的判定標準？ [Measurability, Spec §SC-03]
- [ ] CHK024 - SC-04 「無未授權存取事件」是否定義事件的偵測與記錄機制？ [Measurability, Spec §SC-04]

## Edge Case Coverage 邊界案例覆蓋

- [ ] CHK025 - 是否定義同一帳號多設備同時登入的行為？ [Coverage, Gap]
- [ ] CHK026 - 是否定義標註建立時 3D 場景已變更 (模型更新) 的處理？ [Coverage, Gap]
- [ ] CHK027 - 是否定義邀請連結 Token 被多次使用嘗試時的安全回應？ [Coverage, Gap]
- [ ] CHK028 - 是否定義角色變更 (工程師→審查委員) 後的 Session 處理？ [Coverage, Gap]
- [ ] CHK029 - 是否定義網路斷線時標註提交失敗的重試策略？ [Coverage, Gap]

## Scenario Coverage 情境覆蓋

- [ ] CHK030 - 是否定義忘記密碼的重設流程需求？ [Gap, Alternate Flow]
- [ ] CHK031 - 是否定義帳號停用/刪除的需求與資料處理？ [Gap, Alternate Flow]
- [ ] CHK032 - 是否定義審查會議結束後標註的歸檔/匯出需求？ [Gap, Alternate Flow]
- [ ] CHK033 - 是否定義多語言支援需求？ [Gap, Alternate Flow]

## Dependencies & Assumptions 相依性與假設

- [ ] CHK034 - 假設「帳號由管理員預先建立」是否定義管理介面需求？ [Assumption]
- [ ] CHK035 - 假設「穩定網路連線」失敗時標註功能的行為是否定義？ [Assumption]
- [ ] CHK036 - Sentry 整合是否定義事件類型與過濾規則？ [Dependency, Gap]
- [ ] CHK037 - 頁面瀏覽統計是否定義隱私合規 (GDPR/個資法) 處理？ [Dependency, Gap]

## Data Model Quality 資料模型品質

- [ ] CHK038 - User.role 是否考慮未來擴展 (新增角色) 的彈性？ [Gap, Data Model]
- [ ] CHK039 - Annotation.cameraState 是否定義完整的相機參數結構？ [Gap, Data Model]
- [ ] CHK040 - InviteLink.expiresAt 的預設值與可配置範圍是否定義？ [Gap, Data Model]
