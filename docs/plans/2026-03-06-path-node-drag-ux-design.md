# 路徑節點拖曳 UX 改善 — 設計文件

**日期**: 2026-03-06
**問題**: 動畫模式下點擊路徑節點後，模型 snap 到該位置遮住節點球，導致無法拖曳節點

## 根因

1. 點擊 `PathControlPoint` → `setPlaybackTime(keyframe.time)` + `setPlaybackState('paused')`
2. `useFrame` 偵測 `playbackTime` 變化 → 模型 snap 到該 keyframe 位置
3. GLB mesh 完全遮住節點球 → raycasting 先命中模型 → 拖曳操作失敗

## 解決方案

**方案 A（採用）：選中節點時模型半透明 + 禁用 raycasting**

### 觸發條件

`editingKeyframeIndex !== null`（有選中的路徑節點）

### 行為

1. 模型所有 mesh 設為 `opacity: 0.3` + `transparent: true`
2. 模型所有 mesh 的 `raycast` 設為空函式（raycasting 穿透）
3. 取消選取節點（`editingKeyframeIndex = null`）時恢復原始 opacity 和 raycast

### 實作位置

`FacilityModelItem.tsx` 現有的 emissive 高亮 `useEffect`，加入 `editingKeyframeIndex` 判斷。

### 視覺效果

| 狀態 | 模型外觀 | 節點球 | raycasting |
|------|---------|--------|-----------|
| 未選中節點 | 不透明 | 正常大小 | 正常 |
| 選中節點 | 半透明 0.3 | 放大 1.2 + 亮紫 | 穿透模型 |

## 被排除的方案

- **方案 B**（不 snap 模型）：失去 keyframe 姿態預覽功能
- **方案 C**（renderOrder + depthTest=false）：破壞空間感，TransformControls raycasting 不受 renderOrder 影響
