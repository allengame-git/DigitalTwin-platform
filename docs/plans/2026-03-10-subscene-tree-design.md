# 子場景 N 級巢狀遞迴樹 — Design Document

**Date:** 2026-03-10
**Status:** Approved

## Goal

重構場景管理 (SceneManager) 支援真正的 N 級子場景巢狀，讓每個場景節點都能新增子場景，且「關聯模型」下拉正確顯示父場景的模型（而非只有主場景的模型）。

## 問題根因

`FacilityUploadSection.tsx` 的 SceneManager 有三個硬編碼限制：

1. **模型只載入主場景的** — `useEffect` 用 `rootScene.id` 查模型
2. **新增子場景只能掛在主場景下** — `handleAddSubScene` 寫死 `parentSceneId: rootScene.id`
3. **子場景列表是平的** — `scenes.filter(s => !!s.parentSceneId)` 不分層級

## Decisions

| Question | Decision |
|----------|----------|
| 巢狀深度 | N 級（不限層數） |
| 哪些節點可加子場景 | 每個場景節點都可以 |
| 模型下拉顯示什麼 | 父場景的模型（子場景掛在父場景的某個模型上） |
| UI 呈現 | 縮排樹 + 展開/收合 |
| 刪除行為 | Backend cascade delete，前端提示「及其下所有子場景」 |

## 資料結構

DB schema 已支援 N 級（`parentSceneId` FK 自指），不需改 backend。

```typescript
interface SceneTreeItem {
    scene: FacilityScene;
    children: SceneTreeItem[];
}

function buildSceneTree(scenes: FacilityScene[]): SceneTreeItem[] {
    const root = scenes.find(s => !s.parentSceneId);
    if (!root) return [];
    const childMap = new Map<string, FacilityScene[]>();
    for (const s of scenes) {
        if (s.parentSceneId) {
            const arr = childMap.get(s.parentSceneId) || [];
            arr.push(s);
            childMap.set(s.parentSceneId, arr);
        }
    }
    function build(parent: FacilityScene): SceneTreeItem {
        const kids = (childMap.get(parent.id) || []).sort((a, b) => a.sortOrder - b.sortOrder);
        return { scene: parent, children: kids.map(build) };
    }
    return [build(root)];
}
```

## 元件架構

```
SceneManager
├── RootSceneCard (主場景，基本不變)
└── SceneTreeView
    └── SceneTreeNode (遞迴) × N
        ├── 場景資訊 + 操作按鈕（編輯/平面圖/刪除）
        ├── ModelSelect (載入「當前場景」的模型，給子節點選關聯)
        ├── 子場景列表 (children → SceneTreeNode 遞迴)
        └── [+ 新增子場景] 按鈕
```

## 核心改動

### 1. 模型載入策略

每個 `SceneTreeNode` 自己載入當前場景的模型，提供給其子節點的 ModelSelect：

```typescript
const [models, setModels] = useState<FacilityModelItem[]>([]);
useEffect(() => {
    axios.get(`${API_BASE}/api/facility/models`, {
        params: { sceneId: scene.id },
        headers: getAuthHeaders(), withCredentials: true,
    }).then(r => setModels(Array.isArray(r.data) ? r.data : []))
      .catch(() => setModels([]));
}, [scene.id]);
```

### 2. 新增子場景 — parentSceneId 動態化

```typescript
await createScene({
    projectId,
    parentSceneId: scene.id,  // 當前節點的 scene.id
    parentModelId: addSubForm.parentModelId || undefined,
    name: addSubForm.name.trim(),
    description: addSubForm.description.trim() || undefined,
});
```

### 3. UI 縮排

`marginLeft: depth * 16`。ChevronRight/ChevronDown 展開/收合。

### 4. 刪除遞迴提示

有子場景時提示「及其下 N 個子場景將一併刪除」。

## 不改動的部分

- Backend / Prisma schema（已支援 N 級）
- 主場景 RootSceneCard 編輯 UI
- 平面圖上傳邏輯
- 3D 場景導覽的子場景切換（FacilityPage / FacilityCanvas）

## Files to Modify

| File | Change |
|------|--------|
| `src/components/data/FacilityUploadSection.tsx` | 重構 SceneManager：加 `buildSceneTree`、`SceneTreeNode` 遞迴元件、模型載入動態化 |
