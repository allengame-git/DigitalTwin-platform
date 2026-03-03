# 設施模型管理功能設計

**日期：** 2026-03-03
**功能：** FacilityDataPage 模型管理 Tab

## 需求

在 `/project/:projectCode/facility-data` 的 `FacilityUploadSection` 中新增「模型管理」Tab，支援：

1. 重新命名模型
2. 修改 position / rotation / scale（X/Y/Z）
3. 刪除模型（含實體檔案）
4. 更換綁定子場景

## 方案選擇

採用**方案 A**：新增獨立第 5 個 Tab「模型管理」，職責分離，上傳與管理各自獨立。

## UI 設計

```
Tab 列表: 場景管理 | 模型上傳 | 模型資訊 | 場景地形 | 模型管理
```

模型管理 Tab 流程：
1. 頂部選擇場景（SceneSelect 下拉）
2. 列出該場景下所有模型卡片（可展開/收合）
3. 展開後顯示編輯表單：名稱、子場景、position/rotation/scale
4. 底部「儲存變更」+ 「刪除模型」按鈕（刪除需確認 modal）

## API 對應（後端不需修改）

| 操作 | Endpoint |
|------|----------|
| 載入模型列表 | `GET /api/facility/models?sceneId=xxx` |
| 改名 / 換子場景 | `PUT /api/facility/models/:id` |
| 修改 transform | `PUT /api/facility/models/:id/transform` |
| 刪除 | `DELETE /api/facility/models/:id` |

## 實作範圍

- **修改** `src/components/data/FacilityUploadSection.tsx`
  - 新增 `ModelManager` component（~150 行）
  - Tab 列表加入 `{ key: 'manage', label: '模型管理' }`
  - Tab content 區加入對應渲染
- **不修改** 後端任何程式碼
