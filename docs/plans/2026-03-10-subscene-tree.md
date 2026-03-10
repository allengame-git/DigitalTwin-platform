# Sub-scene N-Level Tree Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor SceneManager to support true N-level nested sub-scenes with correct per-parent model loading.

**Architecture:** Pure frontend refactor of `FacilityUploadSection.tsx`. Add `buildSceneTree()` utility, extract recursive `SceneTreeNode` component, make model loading and `parentSceneId` dynamic per node. No backend changes.

**Tech Stack:** React, TypeScript, Zustand, Axios, Lucide icons

---

### Task 1: Add `buildSceneTree` utility and `SceneTreeItem` type

**Files:**
- Modify: `src/components/data/FacilityUploadSection.tsx`

**Step 1: Add the tree builder**

After the existing imports (around line 15), before the `SceneManager` component, add:

```typescript
interface SceneTreeItem {
    scene: FacilityScene;
    children: SceneTreeItem[];
}

function buildSceneTree(scenes: FacilityScene[]): { root: FacilityScene | null; tree: SceneTreeItem[] } {
    const root = scenes.find(s => !s.parentSceneId) ?? null;
    if (!root) return { root: null, tree: [] };
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
    return { root, tree: [build(root)] };
}

function countDescendants(node: SceneTreeItem): number {
    let count = node.children.length;
    for (const child of node.children) count += countDescendants(child);
    return count;
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx
git commit -m "feat(scene): add buildSceneTree utility for N-level nesting"
```

---

### Task 2: Extract `SceneTreeNode` recursive component

**Files:**
- Modify: `src/components/data/FacilityUploadSection.tsx`

**Step 1: Add ChevronRight/ChevronDown to Lucide imports**

Update the lucide-react import to include `ChevronRight` and `ChevronDown`:

```typescript
import { X, ChevronRight, ChevronDown } from 'lucide-react';
```

**Step 2: Create `SceneTreeNode` component**

Add before `SceneManager` (after `buildSceneTree`):

```typescript
interface SceneTreeNodeProps {
    item: SceneTreeItem;
    depth: number;
    projectId: string;
    onError: (msg: string) => void;
    onRefresh: () => void;
    planInputRef: React.RefObject<HTMLInputElement | null>;
    setPlanUploadSceneId: (id: string) => void;
    isPlanUploading: boolean;
}

const SceneTreeNode: React.FC<SceneTreeNodeProps> = ({
    item, depth, projectId, onError, onRefresh, planInputRef, setPlanUploadSceneId, isPlanUploading,
}) => {
    const { createScene, updateScene, deleteScene } = useFacilityStore();
    const [expanded, setExpanded] = useState(true);
    const [models, setModels] = useState<FacilityModelItem[]>([]);

    // 新增子場景
    const [showAddSub, setShowAddSub] = useState(false);
    const [addSubForm, setAddSubForm] = useState({ name: '', description: '', parentModelId: '' });
    // 編輯
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '', parentModelId: '', boundsWidth: '', boundsDepth: '', boundsHeight: '' });
    // 刪除確認
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const scene = item.scene;

    // 載入當前場景的模型（供子節點的 ModelSelect 使用）
    useEffect(() => {
        axios.get<FacilityModelItem[]>(`${API_BASE}/api/facility/models`, {
            params: { sceneId: scene.id },
            headers: getAuthHeaders(),
            withCredentials: true,
        }).then(r => setModels(Array.isArray(r.data) ? r.data : []))
          .catch(() => setModels([]));
    }, [scene.id]);

    const handleAddSub = async () => {
        if (!addSubForm.name.trim()) { onError('子場景名稱為必填'); return; }
        setIsSaving(true);
        try {
            await createScene({
                projectId,
                parentSceneId: scene.id,
                parentModelId: addSubForm.parentModelId || undefined,
                name: addSubForm.name.trim(),
                description: addSubForm.description.trim() || undefined,
            });
            setShowAddSub(false);
            setAddSubForm({ name: '', description: '', parentModelId: '' });
        } catch (e: any) {
            onError(e?.response?.data?.error || '新增失敗');
        } finally { setIsSaving(false); }
    };

    const handleEditSave = async () => {
        if (!editForm.name.trim()) { onError('名稱為必填'); return; }
        setIsSaving(true);
        try {
            const bW = parseFloat(editForm.boundsWidth);
            const bD = parseFloat(editForm.boundsDepth);
            const bH = parseFloat(editForm.boundsHeight);
            const bounds = (bW > 0 && bD > 0 && bH > 0) ? { width: bW, depth: bD, height: bH } : null;
            await updateScene(scene.id, {
                name: editForm.name.trim(),
                description: editForm.description.trim(),
                parentModelId: editForm.parentModelId || null,
                sceneBounds: bounds,
            });
            setIsEditing(false);
        } catch (e: any) {
            onError(e?.response?.data?.error || '更新失敗');
        } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        try {
            await deleteScene(scene.id);
            setShowDeleteConfirm(false);
        } catch (e: any) {
            onError(e?.response?.data?.error || '刪除失敗');
        }
    };

    const ModelSelect: React.FC<{ value: string; onChange: (v: string) => void; parentModels: FacilityModelItem[] }> = ({ value, onChange, parentModels }) => (
        <select className="dm-form-input" value={value} onChange={e => onChange(e.target.value)}>
            <option value="">（不關聯模型）</option>
            {parentModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
    );

    const descendantCount = countDescendants(item);
    const hasChildren = item.children.length > 0;

    return (
        <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
            <div className="dm-file-card" style={{ marginBottom: 4 }}>
                {isEditing ? (
                    <div style={{ flex: 1 }}>
                        <div className="dm-form-group" style={{ marginBottom: 6 }}>
                            <label className="dm-form-label">子場景名稱 *</label>
                            <input className="dm-form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="dm-form-group" style={{ marginBottom: 6 }}>
                            <label className="dm-form-label">描述（可選）</label>
                            <input className="dm-form-input" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div className="dm-form-group" style={{ marginBottom: 8 }}>
                            <label className="dm-form-label">關聯模型</label>
                            <ModelSelect value={editForm.parentModelId} onChange={v => setEditForm(f => ({ ...f, parentModelId: v }))} parentModels={models} />
                            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>顯示父場景「{scene.name}」中的模型</div>
                        </div>
                        <div className="dm-form-group" style={{ marginBottom: 8 }}>
                            <label className="dm-form-label">場景範圍（選填，空白=自動計算）</label>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input className="dm-form-input" type="number" min="0" step="any" placeholder="寬 (m)" value={editForm.boundsWidth} onChange={e => setEditForm(f => ({ ...f, boundsWidth: e.target.value }))} style={{ width: 90 }} />
                                <span style={{ fontSize: 12, color: '#9ca3af' }}>x</span>
                                <input className="dm-form-input" type="number" min="0" step="any" placeholder="深 (m)" value={editForm.boundsDepth} onChange={e => setEditForm(f => ({ ...f, boundsDepth: e.target.value }))} style={{ width: 90 }} />
                                <span style={{ fontSize: 12, color: '#9ca3af' }}>x</span>
                                <input className="dm-form-input" type="number" min="0" step="any" placeholder="高 (m)" value={editForm.boundsHeight} onChange={e => setEditForm(f => ({ ...f, boundsHeight: e.target.value }))} style={{ width: 90 }} />
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>m</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="dm-btn dm-btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={handleEditSave} disabled={isSaving}>儲存</button>
                            <button className="dm-btn dm-btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setIsEditing(false)}>取消</button>
                        </div>
                    </div>
                ) : (
                    <div className="dm-file-info" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {hasChildren && (
                                <button
                                    onClick={() => setExpanded(!expanded)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', display: 'flex' }}
                                >
                                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            )}
                            <span className="dm-file-name">{scene.name}</span>
                            {hasChildren && <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>({item.children.length})</span>}
                        </div>
                        {scene.parentModelId && (
                            <div className="dm-file-meta" style={{ color: '#2563eb' }}>
                                關聯模型：{models.find(m => m.id === scene.parentModelId)?.name || scene.parentModelId}
                            </div>
                        )}
                        {!scene.parentModelId && scene.parentSceneId && <div className="dm-file-meta">未關聯模型</div>}
                        {scene.description && <div className="dm-file-meta">{scene.description}</div>}
                        {/* 平面圖狀態 */}
                        {(scene.planImageUrl || scene.autoPlanImageUrl) ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '3px 8px', borderRadius: 4, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <span style={{ fontSize: 11, color: '#15803d', fontWeight: 500 }}>已有平面圖</span>
                                {scene.planImageUrl && <span style={{ fontSize: 10, color: '#86efac' }}>（手動上傳）</span>}
                                {!scene.planImageUrl && scene.autoPlanImageUrl && <span style={{ fontSize: 10, color: '#86efac' }}>（自動生成）</span>}
                            </div>
                        ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '3px 8px', borderRadius: 4, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>尚未上傳平面圖</span>
                            </div>
                        )}
                        <div className="dm-file-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                            <button className="dm-file-btn" onClick={() => {
                                setIsEditing(true);
                                setEditForm({
                                    name: scene.name, description: scene.description || '',
                                    parentModelId: scene.parentModelId || '',
                                    boundsWidth: scene.sceneBounds?.width?.toString() || '',
                                    boundsDepth: scene.sceneBounds?.depth?.toString() || '',
                                    boundsHeight: scene.sceneBounds?.height?.toString() || '',
                                });
                            }}>編輯</button>
                            <button className="dm-file-btn" onClick={() => { setPlanUploadSceneId(scene.id); planInputRef.current?.click(); }} disabled={isPlanUploading}>
                                {(scene.planImageUrl || scene.autoPlanImageUrl) ? '更換平面圖' : '上傳平面圖'}
                            </button>
                            <button className="dm-file-btn" onClick={() => setShowAddSub(true)}>+ 子場景</button>
                            {scene.parentSceneId && (
                                <button className="dm-file-btn dm-file-btn-delete" onClick={() => setShowDeleteConfirm(true)}>刪除</button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 子場景列表 */}
            {expanded && item.children.map(child => (
                <SceneTreeNode
                    key={child.scene.id}
                    item={child}
                    depth={depth + 1}
                    projectId={projectId}
                    onError={onError}
                    onRefresh={onRefresh}
                    planInputRef={planInputRef}
                    setPlanUploadSceneId={setPlanUploadSceneId}
                    isPlanUploading={isPlanUploading}
                />
            ))}

            {/* 新增子場景表單 */}
            {showAddSub && (
                <div style={{ marginLeft: 16, marginTop: 4, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div className="dm-form-group">
                        <label className="dm-form-label">子場景名稱 *</label>
                        <input className="dm-form-input" value={addSubForm.name} onChange={e => setAddSubForm(f => ({ ...f, name: e.target.value }))} placeholder="例：操作室、試驗室" autoFocus />
                    </div>
                    <div className="dm-form-group">
                        <label className="dm-form-label">描述（可選）</label>
                        <input className="dm-form-input" value={addSubForm.description} onChange={e => setAddSubForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="dm-form-group">
                        <label className="dm-form-label">關聯模型（點擊該模型時顯示入口）</label>
                        <ModelSelect value={addSubForm.parentModelId} onChange={v => setAddSubForm(f => ({ ...f, parentModelId: v })} parentModels={models} />
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>顯示「{scene.name}」場景中的模型</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="dm-btn dm-btn-primary" onClick={handleAddSub} disabled={isSaving}>{isSaving ? '新增中...' : '新增子場景'}</button>
                        <button className="dm-btn dm-btn-secondary" onClick={() => { setShowAddSub(false); }}>取消</button>
                    </div>
                </div>
            )}

            {/* 刪除確認 */}
            {showDeleteConfirm && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal dm-modal-delete">
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title" style={{ color: '#dc2626' }}>確認刪除</h3>
                            <button onClick={() => setShowDeleteConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定刪除「{scene.name}」？{descendantCount > 0 ? `其下 ${descendantCount} 個子場景將一併刪除。` : ''}場景內的模型資料將一併移除，此操作無法復原。</p>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={() => setShowDeleteConfirm(false)}>取消</button>
                            <button className="dm-btn dm-btn-danger" onClick={handleDelete}>確認刪除</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx
git commit -m "feat(scene): add SceneTreeNode recursive component"
```

---

### Task 3: Refactor SceneManager to use tree structure

**Files:**
- Modify: `src/components/data/FacilityUploadSection.tsx`

**Step 1: Simplify SceneManager state**

Remove from SceneManager:
- `rootModels` state and its `useEffect` (lines 102, 114-122)
- `subScenes` computed variable (line 112)
- `showAddSub`, `addSubForm` state and `handleAddSubScene` (lines 90-91, 153-169)
- `editingSubId`, `editSubForm` state and `handleEditSubSave` (lines 93-94, 171-191)
- `deleteConfirmId` state and `handleDeleteSub` (lines 96, 193-200)
- `ModelSelect` inner component (lines 217-222)
- The entire "子場景" section in JSX (lines 320-418)
- The delete confirmation modal (lines 432-448)

Keep in SceneManager:
- `isEditingRoot`, `editRootForm` — for editing root scene
- `isCreatingRoot`, `createRootForm`, `handleCreateRoot` — for creating root scene
- `handleEditRootSave` — for saving root edits
- `planUploadSceneId`, `isPlanUploading`, `planInputRef`, `handlePlanUpload` — shared plan upload logic
- `isSaving`, `error` — for root scene operations
- `rootScene` computed from scenes

**Step 2: Replace flat sub-scene list with tree**

After the root scene card section, replace the sub-scene section with:

```tsx
            {/* ── 場景樹（子場景） ── */}
            {rootScene && tree.length > 0 && tree[0].children.length > 0 && (
                <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>子場景</div>
                    <div className="dm-file-list" style={{ marginBottom: 8 }}>
                        {tree[0].children.map(child => (
                            <SceneTreeNode
                                key={child.scene.id}
                                item={child}
                                depth={0}
                                projectId={projectId}
                                onError={setError}
                                onRefresh={() => fetchScenes(projectId)}
                                planInputRef={planInputRef}
                                setPlanUploadSceneId={setPlanUploadSceneId}
                                isPlanUploading={isPlanUploading}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* 根節點也需要「新增子場景」按鈕 */}
            {rootScene && (
                <SceneTreeNodeAddButton
                    parentScene={rootScene}
                    projectId={projectId}
                    onError={setError}
                />
            )}
```

Where `SceneTreeNodeAddButton` is a minimal inline for the root level "add sub-scene". However, since `SceneTreeNode` already has add-sub functionality on each node, we can simply add a top-level "新增子場景" button that adds directly under root. This can be kept in SceneManager as a simplified version, or we render the root as a `SceneTreeNode` with the add button.

**Simpler approach:** Keep the "+ 新增子場景" button in SceneManager for the root level, but use a simplified inline form (same as current):

```tsx
            {rootScene && !showAddSub && (
                <button className="dm-btn dm-btn-primary" onClick={() => setShowAddSub(true)}>+ 新增子場景</button>
            )}
```

For this, keep `showAddSub`/`addSubForm` and a simplified `handleAddSubScene` that hardcodes `parentSceneId: rootScene.id`. Each `SceneTreeNode` handles its own sub-scene creation internally.

**Step 3: Use `buildSceneTree` at the top of SceneManager**

```typescript
const { root: computedRoot, tree } = useMemo(() => buildSceneTree(scenes), [scenes]);
const rootScene = computedRoot;
```

Remove the old `rootScene` and `subScenes` lines.

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 5: Verify Vite build**

Run: `npx vite build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx
git commit -m "feat(scene): refactor SceneManager to use recursive tree for N-level sub-scenes"
```

---

### Task 4: Final verification

**Step 1: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No new errors beyond pre-existing ones

**Step 2: Verify Vite build**

Run: `npx vite build`
Expected: Build succeeds

**Step 3: Manual browser test checklist**

1. 進入設施資料管理 → 場景管理 Tab
2. 確認主場景正常顯示（編輯、平面圖功能不受影響）
3. 新增一個子場景（掛在主場景下），關聯模型下拉應顯示主場景的模型
4. 在子場景上點「+ 子場景」，新增第二層子場景
5. 第二層子場景的關聯模型下拉應顯示第一層子場景的模型
6. 展開/收合子場景樹正常運作
7. 編輯子場景：修改名稱、關聯模型、場景範圍
8. 刪除有子場景的節點：確認提示顯示子場景數量
9. 平面圖上傳/更換在各層級都正常
