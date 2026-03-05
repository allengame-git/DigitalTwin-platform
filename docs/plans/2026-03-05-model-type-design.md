# 設施模型分類管理（Model Type）設計文件

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan.

**Goal:** 為設施模型新增分類（一般模型 / 附屬模型），附屬模型作為景觀裝飾，不可互動、不顯示在清單中，但編輯模式下可調整 transform。

**Architecture:** `FacilityModel` 新增 `modelType` 欄位（`"primary"` | `"decorative"`），前端各元件根據 modelType 決定互動與顯示行為。

**Tech Stack:** React 19, React Three Fiber, Zustand, Prisma/PostgreSQL, Express API

---

## 一、資料層

### DB Schema 變更

```prisma
// server/prisma/schema.prisma
model FacilityModel {
  // 新增欄位
  modelType   String   @default("primary")  // "primary" | "decorative"
  // 其他欄位不變
}
```

### API 變更

- `POST /api/facility/models`：上傳時支援 `modelType` 欄位，預設 `"primary"`
- `PUT /api/facility/models/:id`：支援更新 `modelType` 欄位
- 前端 `FacilityModel` 型別新增 `modelType: 'primary' | 'decorative'`

---

## 二、行為差異表

| 功能 | 一般模型 (primary) | 附屬模型 (decorative) |
|------|-------------------|----------------------|
| 模型資訊（introduction/infos） | 可填寫 | 不可填寫、不顯示 |
| 一般瀏覽 hover 高亮 | 有 | 無 |
| 一般瀏覽點擊選取 | 可 | 不可 |
| 編輯模式 hover 高亮 | 有 | 有 |
| 編輯模式點擊選取 | 可（移動/旋轉/縮放） | 可（移動/旋轉/縮放） |
| 側邊欄模型清單 | 顯示 | 不顯示 |
| FacilityInfoPanel | 顯示 | 不顯示 |
| Lobby「進入」按鈕 | 有子場景時顯示 | 不適用 |
| 模型 label（名稱標籤） | 顯示 | 不顯示 |

---

## 三、FacilityModelItem 行為

```typescript
// 判斷是否為裝飾模型
const isDecorative = model.modelType === 'decorative';

// hover — 裝飾模型僅編輯模式高亮
onPointerOver: isDecorative && !editMode ? undefined : handlePointerOver
onPointerOut: isDecorative && !editMode ? undefined : handlePointerOut

// click — 裝飾模型僅編輯模式可選取
onClick: isDecorative && !editMode ? undefined : handleClick

// label — 裝飾模型不顯示
showLabel: !isDecorative && showLabels && ...
```

---

## 四、側邊欄過濾

`FacilitySidebar` 的模型清單只顯示 `modelType === 'primary'` 的模型。

---

## 五、FacilityInfoPanel 行為

裝飾模型被選取時（編輯模式），不顯示 InfoPanel。

---

## 六、上傳 UI

`FacilityUploadSection` 的模型上傳 Tab：
- 上傳表單新增「模型類型」下拉選單（一般模型 / 附屬模型）
- 模型卡片顯示類型標籤
- 模型資訊 Tab（Tab 3: ModelInfoDashboard）只顯示 primary 模型

---

## 七、受影響檔案清單

### 後端
- `server/prisma/schema.prisma` — FacilityModel 加 `modelType`
- `server/routes/facility.ts` — POST/PUT models 支援 modelType

### 前端
- `src/types/facility.ts` — FacilityModel 加 modelType
- `src/components/facility/FacilityModelItem.tsx` — 條件互動邏輯
- `src/components/facility/FacilitySidebar.tsx` — 過濾 decorative
- `src/components/facility/FacilityInfoPanel.tsx` — decorative 不顯示
- `src/components/data/FacilityUploadSection.tsx` — 上傳類型選擇 + 模型資訊過濾
