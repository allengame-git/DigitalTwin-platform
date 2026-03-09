# 地質資料管理頁面 UI 重構設計

> **Date**: 2026-03-09
> **Status**: Approved
> **Scope**: `src/pages/DataManagementPage.tsx` + 新增 3 個 sub-components

## 背景

DataManagementPage.tsx 目前 ~1894 行，包含 9 個資料管理區塊。問題：
1. 無導航機制，使用者需大量捲動
2. 航照圖/3D 地質模型/地球物理三個區塊 inline 在頁面中（~700 行 state + handlers）
3. 所有 section 視覺外觀相同，無法快速辨識
4. 字體/配色為泛用 SaaS 風格，缺乏工程專業感

## 設計方案

### 1. 浮動導航條（Floating TOC）

- `position: sticky; top: 80px`，在 content 區域左側
- 頁面 layout 改為：左側 TOC (200px) + 右側 content
- **Scroll Spy**：`IntersectionObserver` 追蹤當前可見 section
- **群組分類**：
  - 基礎設定：專案設定、岩性
  - 地質資料：鑽孔、斷層面、位態
  - 地表資料：航照圖、地形、地下水位
  - 模型資料：3D 地質模型、地球物理
- **統計 badge**：每個項目旁顯示資料筆數
- **RWD**：`< 1400px` 時隱藏 TOC

### 2. Section 收合（Collapsible）

- Section header 加 expand/collapse toggle（ChevronDown/ChevronUp）
- 預設全部展開
- 收合時顯示：icon + 標題 + 統計 badge + 展開箭頭
- CSS `max-height` + `overflow: hidden` + `transition` 動畫

### 3. Inline Sections 抽成 Sub-components

| 新檔案 | 來源 | Props |
|--------|------|-------|
| `src/components/data/ImageryUploadSection.tsx` | 航照圖 inline code | `showToast` |
| `src/components/data/GeologyModelSection.tsx` | 3D 地質模型 inline code | `showToast` |
| `src/components/data/GeophysicsUploadSection.tsx` | 地球物理 inline code | `showToast` |

每個 sub-component 帶走：
- 自身的 useState/handlers
- Upload form modal
- Delete confirm modal
- Detail modal（如有）

DataManagementPage 最終只保留：
- Header
- TOC 元件
- Section layout（渲染各 sub-components）
- Toast 通知
- 預估 ~400 行

### 4. 群組色帶 + 統計 Badge

| 群組 | 左側 border 色 | CSS Variable |
|------|---------------|-------------|
| 基礎設定 | `#64748b` (slate) | `--group-setup` |
| 地質資料 | `#d97706` (amber-600) | `--group-geology` |
| 地表資料 | `#0891b2` (cyan-600) | `--group-surface` |
| 模型資料 | `#7c3aed` (violet-600) | `--group-model` |

Section card 左側加 `border-left: 3px solid var(--group-xxx)`。

Badge 樣式：淺色背景 + 群組色文字，圓角，顯示在 section title 右側。

### 5. 字體/配色

**字體**（Google Fonts）：
- 標題/UI：`'DM Sans'`, sans-serif
- 座標值/mono：`'JetBrains Mono'`, monospace
- 在 `index.html` 加入 `<link>` 引入

**配色調整**：
- `--primary`: `#2563eb` (保留，用於互動元素)
- `--text-primary`: `#0f172a` (slate-900，取代原本的 gray-800)
- `--bg-page`: `#f1f5f9` (稍深背景，增加卡片對比)
- `--bg-card`: `#ffffff`

**Mono 使用場景**：
- TWD97 座標值
- 檔案大小
- 版本號
- 進度百分比

## 不做的事

- 不改變任何 API 呼叫或 store 邏輯
- 不改變 sub-components 的內部實作（BoreholeUploadSection 等）
- 不新增路由
- 不做 dark mode
