# 設施模型管理 Tab 實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `FacilityUploadSection` 新增「模型管理」第 5 個 Tab，支援列出模型、刪除、改名、換子場景、修改 position/rotation/scale。

**Architecture:** 純前端修改，新增 `ModelManager` React component 嵌入現有 `FacilityUploadSection`。後端所有 API 已就緒，不需修改。每個模型卡片可展開/收合顯示編輯表單，儲存和刪除各自呼叫對應 API。

**Tech Stack:** React 19, TypeScript, axios, 現有 `dm-*` CSS classes（定義在 DataManagementPage 的 `<style>` 中）

---

## 前置知識

### 關鍵檔案
- **修改目標：** `src/components/data/FacilityUploadSection.tsx`（835 行）
- **型別參考：** `src/types/facility.ts`（查看 FacilityScene 型別）
- **API base：** `const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'`
- **Auth headers：** `getAuthHeaders()` 函數已在該檔案定義

### 現有 API（後端已就緒）

```
GET    /api/facility/models?sceneId=xxx  → FacilityModelItem[]（含 position/rotation/scale）
PUT    /api/facility/models/:id          → { name, childSceneId }
PUT    /api/facility/models/:id/transform → { position, rotation, scale }（各為 {x,y,z} JSON）
DELETE /api/facility/models/:id          → { success: true }
```

### 現有 FacilityModelItem 型別（在 FacilityUploadSection.tsx 已定義）

```ts
interface FacilityModelItem {
    id: string;
    name: string;
    sceneId: string;
    childSceneId?: string | null;
    glbUrl?: string;
}
```

需擴充加入 transform 欄位（後端 GET /models 有回傳）。

### CSS classes 可直接用
`dm-form-input`, `dm-form-label`, `dm-form-group`, `dm-file-card`, `dm-file-btn`, `dm-file-btn-delete`, `dm-btn-confirm`, `dm-btn-cancel`, `dm-empty`, `dm-error`, `dm-modal-overlay`, `dm-modal`, `dm-modal-header`, `dm-modal-title`, `dm-modal-body`

---

## Task 1：擴充 FacilityModelItem 型別

**Files:**
- Modify: `src/components/data/FacilityUploadSection.tsx:33-39`

**Step 1: 擴充 interface**

找到現有的 `FacilityModelItem` interface（約第 33 行）：

```ts
interface FacilityModelItem {
    id: string;
    name: string;
    sceneId: string;
    childSceneId?: string | null;
    glbUrl?: string;
}
```

替換為：

```ts
interface Vec3 { x: number; y: number; z: number; }

interface FacilityModelItem {
    id: string;
    name: string;
    sceneId: string;
    childSceneId?: string | null;
    glbUrl?: string;
    position?: Vec3;
    rotation?: Vec3;
    scale?: Vec3;
}
```

**Step 2: TypeScript 檢查**

```bash
cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform" && npx tsc --noEmit 2>&1 | grep -v vite.config
```

預期：零錯誤（或只剩 vite.config 的既有錯誤）

**Step 3: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx
git commit -m "feat: 擴充 FacilityModelItem 型別加入 transform 欄位"
```

---

## Task 2：新增 ModelManager component

**Files:**
- Modify: `src/components/data/FacilityUploadSection.tsx`（在 `// ─── Tab 4: TerrainUploader` 上方插入）

**Step 1: 在 Tab 4 (`SceneTerrainUploader`) 之前插入 ModelManager component**

插入位置：`// ─── Tab 4: TerrainUploader` 這行的正上方（約第 651 行）。

插入以下完整 component：

```tsx
// ─── Tab 5: ModelManager ──────────────────────────────────────────────────────

interface ModelEditState {
    name: string;
    childSceneId: string;
    posX: string; posY: string; posZ: string;
    rotX: string; rotY: string; rotZ: string;
    sclX: string; sclY: string; sclZ: string;
}

const DEFAULT_EDIT = (m: FacilityModelItem): ModelEditState => ({
    name: m.name,
    childSceneId: m.childSceneId ?? '',
    posX: String(m.position?.x ?? 0), posY: String(m.position?.y ?? 0), posZ: String(m.position?.z ?? 0),
    rotX: String(m.rotation?.x ?? 0), rotY: String(m.rotation?.y ?? 0), rotZ: String(m.rotation?.z ?? 0),
    sclX: String(m.scale?.x ?? 1),    sclY: String(m.scale?.y ?? 1),    sclZ: String(m.scale?.z ?? 1),
});

const ModelManager: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { scenes, fetchScenes } = useFacilityStore();

    const [sceneId, setSceneId] = useState('');
    const [models, setModels] = useState<FacilityModelItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editState, setEditState] = useState<Record<string, ModelEditState>>({});
    const [savingId, setSavingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => { if (projectId) fetchScenes(projectId); }, [projectId, fetchScenes]);

    useEffect(() => {
        if (!sceneId) { setModels([]); return; }
        setIsLoading(true);
        setError(null);
        axios.get<FacilityModelItem[]>(`${API_BASE}/api/facility/models`, {
            params: { sceneId },
            headers: getAuthHeaders(),
            withCredentials: true,
        })
            .then(r => {
                const list = Array.isArray(r.data) ? r.data : [];
                setModels(list);
                const initEdit: Record<string, ModelEditState> = {};
                list.forEach(m => { initEdit[m.id] = DEFAULT_EDIT(m); });
                setEditState(initEdit);
            })
            .catch(() => setError('載入模型失敗'))
            .finally(() => setIsLoading(false));
    }, [sceneId]);

    const setField = (id: string, field: keyof ModelEditState, value: string) => {
        setEditState(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const handleSave = async (modelId: string) => {
        const s = editState[modelId];
        if (!s) return;
        setSavingId(modelId);
        setError(null);
        try {
            // Update name + childSceneId
            await axios.put(`${API_BASE}/api/facility/models/${modelId}`, {
                name: s.name.trim(),
                childSceneId: s.childSceneId || null,
            }, { headers: getAuthHeaders(), withCredentials: true });

            // Update transform
            await axios.put(`${API_BASE}/api/facility/models/${modelId}/transform`, {
                position: { x: parseFloat(s.posX) || 0, y: parseFloat(s.posY) || 0, z: parseFloat(s.posZ) || 0 },
                rotation: { x: parseFloat(s.rotX) || 0, y: parseFloat(s.rotY) || 0, z: parseFloat(s.rotZ) || 0 },
                scale:    { x: parseFloat(s.sclX) || 1, y: parseFloat(s.sclY) || 1, z: parseFloat(s.sclZ) || 1 },
            }, { headers: getAuthHeaders(), withCredentials: true });

            // Update local model name
            setModels(prev => prev.map(m => m.id === modelId ? { ...m, name: s.name.trim() } : m));
            setSuccessMsg('儲存成功');
            setTimeout(() => setSuccessMsg(null), 2500);
        } catch (e: any) {
            setError(e?.response?.data?.error || '儲存失敗');
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (modelId: string) => {
        try {
            await axios.delete(`${API_BASE}/api/facility/models/${modelId}`, {
                headers: getAuthHeaders(),
                withCredentials: true,
            });
            setModels(prev => prev.filter(m => m.id !== modelId));
            setDeleteConfirmId(null);
            if (expandedId === modelId) setExpandedId(null);
        } catch (e: any) {
            setError(e?.response?.data?.error || '刪除失敗');
            setDeleteConfirmId(null);
        }
    };

    return (
        <div>
            {error && <div className="dm-error" style={{ marginBottom: 8 }}>{error}</div>}
            {successMsg && <div style={{ color: '#16a34a', background: '#f0fdf4', padding: '8px 12px', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>{successMsg}</div>}

            <div className="dm-form-group">
                <label className="dm-form-label">場景</label>
                <SceneSelect scenes={scenes} value={sceneId} onChange={v => { setSceneId(v); setExpandedId(null); }} />
            </div>

            {isLoading && <div style={{ color: '#64748b', fontSize: 13 }}>載入中...</div>}

            {!isLoading && sceneId && models.length === 0 && (
                <div className="dm-empty">此場景尚無模型</div>
            )}

            {models.map(model => {
                const s = editState[model.id];
                const isExpanded = expandedId === model.id;
                const isSaving = savingId === model.id;

                return (
                    <div key={model.id} className="dm-file-card" style={{ marginBottom: 8, padding: 0, overflow: 'hidden' }}>
                        {/* Card header */}
                        <div
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: isExpanded ? '#f0f7ff' : undefined }}
                            onClick={() => setExpandedId(isExpanded ? null : model.id)}
                        >
                            <span style={{ fontWeight: 500, fontSize: 14 }}>{model.name}</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>

                        {/* Expanded edit form */}
                        {isExpanded && s && (
                            <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', background: '#fafafa' }}>
                                {/* Name + childScene row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                    <div className="dm-form-group" style={{ margin: 0 }}>
                                        <label className="dm-form-label">模型名稱</label>
                                        <input
                                            className="dm-form-input"
                                            value={s.name}
                                            onChange={e => setField(model.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="dm-form-group" style={{ margin: 0 }}>
                                        <label className="dm-form-label">子場景</label>
                                        <SceneSelect
                                            scenes={scenes}
                                            value={s.childSceneId}
                                            onChange={v => setField(model.id, 'childSceneId', v)}
                                            placeholder="（無）"
                                        />
                                    </div>
                                </div>

                                {/* Transform fields */}
                                {([
                                    { label: '位置 Position (m)', fields: ['posX', 'posY', 'posZ'] as const },
                                    { label: '旋轉 Rotation (deg)', fields: ['rotX', 'rotY', 'rotZ'] as const },
                                    { label: '縮放 Scale', fields: ['sclX', 'sclY', 'sclZ'] as const },
                                ] as const).map(({ label, fields }) => (
                                    <div key={label} style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                            {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                                                <div key={axis} className="dm-form-group" style={{ margin: 0 }}>
                                                    <label className="dm-form-label">{axis}</label>
                                                    <input
                                                        className="dm-form-input"
                                                        type="number"
                                                        step="0.1"
                                                        value={s[fields[i]]}
                                                        onChange={e => setField(model.id, fields[i], e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Actions */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                    <button
                                        className="dm-btn-confirm"
                                        onClick={() => handleSave(model.id)}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? '儲存中...' : '儲存變更'}
                                    </button>
                                    <button
                                        className="dm-file-btn dm-file-btn-delete"
                                        onClick={() => setDeleteConfirmId(model.id)}
                                    >
                                        刪除模型
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Delete confirm modal */}
            {deleteConfirmId && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal dm-modal-delete">
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">確認刪除模型</h3>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定刪除「{models.find(m => m.id === deleteConfirmId)?.name}」？此操作無法復原，相關資訊條目也將一併移除。</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                                <button className="dm-btn-cancel" onClick={() => setDeleteConfirmId(null)}>取消</button>
                                <button
                                    style={{ background: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
                                    onClick={() => handleDelete(deleteConfirmId)}
                                >
                                    確認刪除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
```

**Step 2: TypeScript 檢查**

```bash
cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform" && npx tsc --noEmit 2>&1 | grep -v vite.config
```

預期：零新增錯誤

**Step 3: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx
git commit -m "feat: 新增 ModelManager component（模型管理 Tab）"
```

---

## Task 3：加入第 5 個 Tab

**Files:**
- Modify: `src/components/data/FacilityUploadSection.tsx`（主 component，約第 784-835 行）

**Step 1: 修改 Tab 列表和 Tab content**

找到 `export default function FacilityUploadSection`：

```tsx
const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'scenes', label: '場景管理' },
    { key: 'models', label: '模型上傳' },
    { key: 'info', label: '模型資訊' },
    { key: 'terrain', label: '場景地形' },
];
```

替換為：

```tsx
const [activeTab, setActiveTab] = useState<'scenes' | 'models' | 'info' | 'terrain' | 'manage'>('scenes');

const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'scenes', label: '場景管理' },
    { key: 'models', label: '模型上傳' },
    { key: 'info', label: '模型資訊' },
    { key: 'terrain', label: '場景地形' },
    { key: 'manage', label: '模型管理' },
];
```

找到 Tab content 區段：

```tsx
{activeTab === 'scenes' && <SceneManager projectId={projectId} />}
{activeTab === 'models' && <ModelUploader projectId={projectId} />}
{activeTab === 'info' && <ModelInfoEditor projectId={projectId} />}
{activeTab === 'terrain' && <SceneTerrainUploader projectId={projectId} />}
```

新增一行：

```tsx
{activeTab === 'scenes' && <SceneManager projectId={projectId} />}
{activeTab === 'models' && <ModelUploader projectId={projectId} />}
{activeTab === 'info' && <ModelInfoEditor projectId={projectId} />}
{activeTab === 'terrain' && <SceneTerrainUploader projectId={projectId} />}
{activeTab === 'manage' && <ModelManager projectId={projectId} />}
```

**Step 2: TypeScript 檢查**

```bash
cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform" && npx tsc --noEmit 2>&1 | grep -v vite.config
```

預期：零新增錯誤

**Step 3: Vite build 確認**

```bash
cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform" && npx vite build 2>&1 | tail -5
```

預期：`✓ built in X.XXs`

**Step 4: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx
git commit -m "feat: 設施資料管理頁新增模型管理 Tab（刪除/改名/座標/縮放）"
```

---

## 驗收標準

1. `npx tsc --noEmit` 零新增錯誤
2. `npx vite build` 成功
3. 瀏覽器 `/project/:code/facility-data` → 可見 5 個 Tab，最後一個「模型管理」
4. 選擇已有模型的場景 → 顯示模型卡片列表
5. 展開卡片 → 顯示名稱/子場景/position/rotation/scale 欄位
6. 修改值後點「儲存變更」→ 呼叫 API 成功，無 console error
7. 點「刪除模型」→ 確認 modal → 確認後模型從列表消失
