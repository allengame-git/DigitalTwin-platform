# 路徑節點拖曳 UX 改善 — 實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 選中路徑節點時模型半透明 + 禁用 raycasting，讓節點球的 TransformControls 可以正常拖曳。

**Architecture:** 擴充 `FacilityModelItem.tsx` 現有的 emissive useEffect，加入 `editingKeyframeIndex` 依賴，控制 opacity 和 raycast。

**Tech Stack:** Three.js MeshStandardMaterial, React useEffect

---

### Task 1: 修改 emissive useEffect — 加入半透明 + 禁用 raycasting

**Files:**
- Modify: `src/components/facility/FacilityModelItem.tsx:577-595`

**Step 1: 擴充 useEffect**

將現有的 emissive useEffect（第 577-595 行）改為同時處理「選中節點時的半透明 + raycasting 禁用」：

```typescript
// 高亮 + 路徑節點編輯時半透明
// 直接修改材質屬性，不 clone，避免 GPU 記憶體洩漏
const isEditingPathNode = editingKeyframeIndex !== null && animationMode;

useEffect(() => {
    const emissiveColor = isHovered ? '#ffaa00' : isSelected ? '#2255ff' : '#000000';
    const emissiveIntensity = isHovered ? 0.3 : isSelected ? 0.25 : 0;
    const ghostMode = isEditingPathNode;

    clonedScene.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            // 禁用 raycasting — 讓射線穿透模型打到後方的節點球
            if (ghostMode) {
                if (!(mesh.userData as any)._origRaycast) {
                    (mesh.userData as any)._origRaycast = mesh.raycast;
                }
                mesh.raycast = () => {};
            } else if ((mesh.userData as any)._origRaycast) {
                mesh.raycast = (mesh.userData as any)._origRaycast;
                delete (mesh.userData as any)._origRaycast;
            }

            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of mats) {
                if (mat instanceof THREE.MeshStandardMaterial) {
                    mat.emissive.set(emissiveColor);
                    mat.emissiveIntensity = emissiveIntensity;
                    mat.transparent = ghostMode ? true : mat.transparent;
                    mat.opacity = ghostMode ? 0.3 : 1;
                }
            }
        }
    });
}, [isHovered, isSelected, isEditingPathNode, clonedScene]);
```

**關鍵邏輯**：
- `isEditingPathNode = editingKeyframeIndex !== null && animationMode` — 只在動畫模式 + 有選中節點時觸發
- `mesh.raycast = () => {}` — 空函式讓 raycasting 穿透
- `mesh.userData._origRaycast` — 保存原始 raycast 函式，取消選取時恢復
- `mat.opacity = 0.3` — 半透明幽靈效果
- 取消選取（`editingKeyframeIndex = null`）→ `ghostMode = false` → 自動恢復

**Step 2: 驗證 build**

Run: `cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform" && npx tsc --noEmit 2>&1 | grep -v "vite.config\|FacilityModelItem.tsx(231"`
Expected: 無新錯誤

**Step 3: 手動測試**

1. 進入設施導覽 → 動畫模式 → 選取有路徑動畫的模型
2. 點擊路徑節點球 → 模型應變半透明
3. 拖曳 TransformControls → 應能正常拖曳節點球，不會拖到模型
4. 點擊空白處取消選取 → 模型應恢復不透明
5. hover 模型 → emissive 高亮應正常

**Step 4: Commit**

```bash
git add src/components/facility/FacilityModelItem.tsx
git commit -m "fix: 選中路徑節點時模型半透明 + 禁用 raycasting，解決拖曳衝突"
```
