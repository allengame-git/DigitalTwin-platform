# A4: 動畫預覽路徑可視化 — 設計文件

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在動畫編輯模式下，顯示關鍵幀之間的位移路徑線與節點球，幫助使用者理解動畫軌跡。

**日期:** 2026-03-05

---

## 設計

### 顯示條件

- `animationMode === true`
- 該模型有被選中的 keyframe 動畫（`selectedAnimationId === anim.id`）
- 動畫至少有 2 個帶 `position` 的 keyframes
- 多選模式下，每個被選中的模型各自顯示路徑

### 視覺規格

| 元素 | 幾何 | 顏色 | 備註 |
|------|------|------|------|
| 路徑線 | `THREE.Line` + `BufferGeometry` | `#7c3aed`（紫色） | 直線連接，與實際 lerp 插值一致 |
| 一般關鍵幀節點 | `SphereGeometry(0.3)` | `#7c3aed` | 每個有 position 的 keyframe |
| 當前編輯中節點 | `SphereGeometry(0.5)` | `#a78bfa`（亮紫色） | `editingKeyframeIndex` 對應的 keyframe |

### 實作位置

直接在 `FacilityModelItem.tsx` 的 JSX return 中條件渲染，不新增獨立檔案。

### 資料流

```
FacilityAnimation.keyframes
    → 篩選有 position 的 keyframes
    → 提取 Vector3 陣列
    → BufferGeometry.setFromPoints() → <line>
    → 每個 position → <mesh><sphereGeometry/></mesh>
```

### 座標系

路徑線的座標使用 keyframe 中的原始 position 值（Three.js 座標系），直接在場景空間中渲染（不掛在模型 group 下，避免被動畫 transform 影響）。

---

## 修改檔案

| 檔案 | 修改內容 |
|------|---------|
| `src/components/facility/FacilityModelItem.tsx` | JSX 中條件渲染路徑線 + 節點球 |
