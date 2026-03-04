# 設施模型資訊系統設計文件

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan.

**Goal:** 為設施模組建立完整的模型資訊管理系統，包含資料管理頁面的 Dashboard 卡片牆、WYSIWYG 介紹編輯、圖說上傳，以及 3D 場景中的資訊面板顯示。

**Architecture:** 在 `FacilityModel` 新增 `introduction` 欄位儲存 WYSIWYG HTML，現有 `FacilityModelInfo` 依 type 分類為圖說（IMAGE/DOCUMENT）與自訂欄位（TEXT/LINK）。前端用 TipTap 作為 WYSIWYG 編輯器。

**Tech Stack:** React 19, TipTap (WYSIWYG), Prisma/PostgreSQL, Express API, React Three Fiber (3D 場景面板)

---

## 一、資料層

### DB Schema 變更

```prisma
// server/prisma/schema.prisma
model FacilityModel {
  // 新增欄位
  introduction  String?   // WYSIWYG HTML 內容（設施介紹）
  // 其他欄位不變
}
```

### FacilityModelInfo 分類語義（不改 DB）

| type | 語義 |
|------|------|
| `IMAGE` | 設施圖說：圖片（JPG/PNG） |
| `DOCUMENT` | 設施圖說：文件（PDF/CAD/DWG） |
| `TEXT` | 自訂欄位：文字 |
| `LINK` | 自訂欄位：超連結 |

### API 變更

- `PATCH /api/facility/models/:id` 支援 `introduction` 欄位
- Frontend `FacilityModel` 型別新增 `introduction?: string`

---

## 二、設施資料管理頁面（FacilityUploadSection — 模型資訊 Tab）

### 場景選擇 → 模型 Dashboard

- 選擇場景後，以 3 欄 responsive grid 顯示所有模型卡片
- 每張卡片：
  - 縮圖（取 infos 第一筆 IMAGE；無則顯示預設 box icon）
  - 模型名稱（粗體）
  - 設施介紹前 80 字摘要（灰色小字，無介紹顯示「尚未填寫介紹」）
  - 底部 badge：`圖說 N`、`欄位 N`

### 模型資訊 Modal（點卡片後開啟）

全螢幕 Modal，三個捲動區塊：

#### 區塊 1：設施介紹
- TipTap WYSIWYG 編輯器（Bold/Italic/Heading/BulletList/Link 工具列）
- 儲存按鈕 → `PATCH /api/facility/models/:id` 帶 `{ introduction: html }`
- 自動儲存 debounce（2 秒）

#### 區塊 2：設施圖說
- 拖拉上傳區，接受 JPG/PNG/PDF/CAD/DWG
- 上傳後以卡片顯示：圖片顯示縮圖，文件顯示副檔名 icon + 檔名
- 每個條目可刪除
- 儲存為 `FacilityModelInfo { type: IMAGE | DOCUMENT, label: 檔名, content: url }`

#### 區塊 3：自訂欄位
- 複用現有 `ModelInfoEditor` 邏輯（新增/刪除 TEXT/LINK 條目）
- 每個欄位：label 輸入 + content 輸入

---

## 三、3D 場景資訊面板（FacilityInfoPanel 重新設計）

位置：右下角，width: 340px，max-height: 60vh，內部可捲動

### 結構
```
┌─────────────────────────┐
│ 模型名稱              X │
├─────────────────────────┤
│ 設施介紹               │
│ <WYSIWYG HTML 渲染>    │
├─────────────────────────┤
│ 設施圖說               │
│ [縮圖][縮圖][+N]        │
├─────────────────────────┤
│ 自訂欄位               │
│ 標籤：內容             │
│ 標籤：內容             │
└─────────────────────────┘
```

- HTML 以 `dangerouslySetInnerHTML` 渲染（封閉系統）
- 圖說縮圖點擊 → lightbox 全螢幕預覽
- 無資料的區塊不顯示

---

## 四、受影響檔案清單

### 後端
- `server/prisma/schema.prisma` — 新增 `introduction` 欄位
- `server/routes/facility.ts` — PATCH models/:id 支援 introduction

### 前端
- `src/types/facility.ts` — FacilityModel 加 introduction
- `src/stores/facilityStore.ts` — updateModelMeta 支援 introduction
- `src/components/data/FacilityUploadSection.tsx` — ModelInfoTab 全面改寫
- `src/components/facility/FacilityInfoPanel.tsx` — 重新設計三區塊顯示
- `package.json` — 新增 `@tiptap/react @tiptap/starter-kit @tiptap/extension-link`
