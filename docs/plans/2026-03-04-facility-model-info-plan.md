# 設施模型資訊系統 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 為設施模組建立模型資訊管理系統：資料管理頁面 Dashboard 卡片牆 + WYSIWYG 介紹 + 圖說上傳 + 自訂欄位；3D 場景點擊模型顯示底部右側資訊面板。

**Architecture:** `FacilityModel` 加 `introduction` 欄位（WYSIWYG HTML），現有 `FacilityModelInfo` 以 type 分類圖說（IMAGE/DOCUMENT）與自訂欄位（TEXT/LINK）。TipTap 做編輯器，`dangerouslySetInnerHTML` 顯示 HTML。

**Tech Stack:** React 19, TipTap 2.x (`@tiptap/react` `@tiptap/pm` `@tiptap/starter-kit` `@tiptap/extension-link`), Prisma 7, Express 5, R3F

---

## 現有程式碼關鍵路徑（必讀）

- `server/prisma/schema.prisma:356` — FacilityModel（要加 `introduction String?`）
- `server/routes/facility.ts:322` — `PUT /models/:id`（要加 `introduction` 支援）
- `server/routes/facility.ts:245` — `GET /models`（自動回傳，無需改）
- `src/types/facility.ts:41` — `FacilityModel` 介面（要加 `introduction?: string`）
- `src/stores/facilityStore.ts:244` — `updateModelMeta`（要擴充）
- `src/components/data/FacilityUploadSection.tsx:554` — `ModelInfoEditor`（整個替換）
- `src/components/facility/FacilityInfoPanel.tsx` — 整個改寫（目前是右側全高滑出面板）

---

## Task 1: DB Schema + Backend API

**Files:**
- Modify: `server/prisma/schema.prisma:356-374`
- Modify: `server/routes/facility.ts:322-346`

**Step 1: 在 schema 新增 introduction 欄位**

開啟 `server/prisma/schema.prisma`，在 `FacilityModel` 的 `sortOrder` 行後插入：

```prisma
model FacilityModel {
  id          String              @id @default(uuid())
  sceneId     String
  name        String
  modelUrl    String
  fileSize    Int
  introduction String?                          // ← 新增這行
  position    Json                @default("{\"x\":0,\"y\":0,\"z\":0}")
  rotation    Json                @default("{\"x\":0,\"y\":0,\"z\":0}")
  scale       Json                @default("{\"x\":1,\"y\":1,\"z\":1}")
  sortOrder   Int                 @default(0)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  scene       FacilityScene       @relation("SceneModels", fields: [sceneId], references: [id], onDelete: Cascade)
  childScenes FacilityScene[]     @relation("ModelChildScenes")
  infos       FacilityModelInfo[]

  @@index([sceneId])
  @@map("facility_models")
}
```

**Step 2: 同步 DB 並重新產生 Prisma client**

```bash
cd server
npx prisma db push
npx prisma generate
```

預期輸出：`Your database is now in sync with your Prisma schema.`

**Step 3: 更新 PUT /models/:id 支援 introduction**

在 `server/routes/facility.ts:325` 找到：
```typescript
const { name, sortOrder } = req.body;
```
改為：
```typescript
const { name, sortOrder, introduction } = req.body;
```

在 `server/routes/facility.ts:332` 的 `data` 物件，加入：
```typescript
data: {
    ...(name !== undefined && { name }),
    ...(sortOrder !== undefined && { sortOrder }),
    ...(introduction !== undefined && { introduction }),  // ← 新增
},
```

**Step 4: 確認 TypeScript 編譯**

```bash
cd server && npx tsc --noEmit
```

預期：零錯誤。

**Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/routes/facility.ts
git commit -m "feat: FacilityModel 新增 introduction 欄位，PUT /models/:id 支援儲存"
```

---

## Task 2: Frontend Types + Store

**Files:**
- Modify: `src/types/facility.ts:41-54`
- Modify: `src/stores/facilityStore.ts:63-64` (updateModelMeta)

**Step 1: 更新 FacilityModel 型別**

在 `src/types/facility.ts` 的 `FacilityModel` 介面加入：

```typescript
export interface FacilityModel {
    id: string;
    sceneId: string;
    name: string;
    modelUrl: string;
    fileSize: number;
    introduction?: string;    // ← 新增
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    infos: FacilityModelInfo[];
}
```

**Step 2: 更新 facilityStore 的 updateModelMeta**

在 `src/stores/facilityStore.ts:63` 找到：
```typescript
updateModelMeta: (modelId: string, data: { name?: string }) => Promise<void>;
```
改為：
```typescript
updateModelMeta: (modelId: string, data: { name?: string; introduction?: string }) => Promise<void>;
```

**Step 3: TypeScript 確認**

```bash
cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform"
npx tsc --noEmit 2>&1 | grep -v vite.config
```

預期：零錯誤。

**Step 4: Commit**

```bash
git add src/types/facility.ts src/stores/facilityStore.ts
git commit -m "feat: FacilityModel 型別加 introduction，store updateModelMeta 支援"
```

---

## Task 3: 安裝 TipTap + 建立共用元件

**Files:**
- Modify: `package.json`
- Create: `src/components/common/RichTextEditor.tsx`
- Create: `src/components/common/RichTextView.tsx`

**Step 1: 安裝 TipTap 套件**

```bash
cd "/Users/allen/Desktop/LLRWD DigitalTwin Platform"
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link
```

**Step 2: 建立 RichTextEditor.tsx**

建立 `src/components/common/RichTextEditor.tsx`：

```tsx
/**
 * RichTextEditor — TipTap WYSIWYG 編輯器（共用元件）
 * 工具列：Bold / Italic / H2 / H3 / BulletList / Link
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // 外部 value 變更時同步（切換模型時）
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '', false);
        }
    }, [value, editor]);

    if (!editor) return null;

    const btn = (active: boolean) => ({
        background: active ? '#2563eb' : '#f1f5f9',
        color: active ? '#fff' : '#374151',
        border: 'none',
        borderRadius: 4,
        padding: '3px 8px',
        fontSize: 12,
        cursor: 'pointer',
        fontWeight: 500,
    } as React.CSSProperties);

    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            {/* 工具列 */}
            <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <button style={btn(editor.isActive('bold'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}>B</button>
                <button style={{ ...btn(editor.isActive('italic')), fontStyle: 'italic' }} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}>I</button>
                <button style={btn(editor.isActive('heading', { level: 2 }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}>H2</button>
                <button style={btn(editor.isActive('heading', { level: 3 }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}>H3</button>
                <button style={btn(editor.isActive('bulletList'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}>• 清單</button>
                <button
                    style={btn(editor.isActive('link'))}
                    onMouseDown={e => {
                        e.preventDefault();
                        if (editor.isActive('link')) {
                            editor.chain().focus().unsetLink().run();
                        } else {
                            const url = prompt('輸入連結網址');
                            if (url) editor.chain().focus().setLink({ href: url }).run();
                        }
                    }}
                >
                    🔗
                </button>
            </div>

            {/* 編輯區 */}
            <EditorContent
                editor={editor}
                style={{ minHeight: 120, padding: '10px 12px', fontSize: 14, lineHeight: 1.6 }}
            />

            {/* placeholder */}
            {editor.isEmpty && placeholder && (
                <div style={{
                    position: 'absolute',
                    top: 48,
                    left: 12,
                    color: '#94a3b8',
                    fontSize: 14,
                    pointerEvents: 'none',
                }}>
                    {placeholder}
                </div>
            )}
        </div>
    );
}
```

**Step 3: 建立 RichTextView.tsx**

建立 `src/components/common/RichTextView.tsx`：

```tsx
/**
 * RichTextView — 顯示 WYSIWYG HTML 內容（唯讀）
 */
interface RichTextViewProps {
    html: string;
    style?: React.CSSProperties;
}

export function RichTextView({ html, style }: RichTextViewProps) {
    if (!html || html === '<p></p>') return null;
    return (
        <div
            className="rich-text-view"
            style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: '#1e293b',
                ...style,
            }}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
```

**Step 4: 加全域 TipTap CSS**（在 `src/index.css` 或 `src/App.css` 加）

```css
/* TipTap editor base styles */
.ProseMirror {
    outline: none;
}
.ProseMirror h2 { font-size: 1.2em; font-weight: 700; margin: 0.5em 0; }
.ProseMirror h3 { font-size: 1.05em; font-weight: 600; margin: 0.4em 0; }
.ProseMirror ul { list-style: disc; padding-left: 1.5em; }
.ProseMirror a { color: #2563eb; text-decoration: underline; }
.ProseMirror p { margin: 0.25em 0; }

/* RichTextView display styles */
.rich-text-view h2 { font-size: 1.15em; font-weight: 700; margin: 0.5em 0 0.25em; }
.rich-text-view h3 { font-size: 1.05em; font-weight: 600; margin: 0.4em 0 0.2em; }
.rich-text-view ul { list-style: disc; padding-left: 1.4em; }
.rich-text-view a { color: #2563eb; text-decoration: underline; }
.rich-text-view p { margin: 0.2em 0; }
```

**Step 5: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 6: Commit**

```bash
git add src/components/common/RichTextEditor.tsx src/components/common/RichTextView.tsx src/index.css package.json package-lock.json
git commit -m "feat: 安裝 TipTap，新增 RichTextEditor / RichTextView 共用元件"
```

---

## Task 4: ModelInfoDashboard — 卡片牆

**Files:**
- Modify: `src/components/data/FacilityUploadSection.tsx` — 將 `ModelInfoEditor` component（line 554 開始）整個替換

**背景知識：**
- 現有 `ModelInfoEditor` 約從 line 554 到約 line 830
- 它的結構：場景下拉選單 → 模型下拉選單 → 新增/刪除 info 條目
- **完整替換**此 component，不保留任何舊邏輯

**Step 1: 在 FacilityUploadSection.tsx 頂部加必要 import**

找到現有 import 區塊，加入：
```typescript
import { RichTextEditor } from '../common/RichTextEditor';
import { RichTextView } from '../common/RichTextView';
```

（注意：component 在同一檔案內部定義，所以只需要確保這兩個 import 存在）

**Step 2: 建立 ModelCard 子元件**

在 `ModelInfoEditor` 上方（約 line 554 之前）加入此 helper component：

```tsx
interface ModelCardProps {
    model: FacilityModelItem & { introduction?: string };
    onClick: () => void;
}

const API_URL_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function resolveInfoUrl(url: string) {
    if (url.startsWith('http')) return url;
    return `${API_URL_BASE}${url}`;
}

function ModelCard({ model, onClick }: ModelCardProps) {
    const diagrams = model.infos?.filter((i: any) => i.type === 'IMAGE' || i.type === 'DOCUMENT') ?? [];
    const customFields = model.infos?.filter((i: any) => i.type === 'TEXT' || i.type === 'LINK') ?? [];
    const thumbInfo = model.infos?.find((i: any) => i.type === 'IMAGE');
    const introText = model.introduction
        ? model.introduction.replace(/<[^>]+>/g, '').slice(0, 80)
        : null;

    return (
        <div
            onClick={onClick}
            style={{
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 'pointer',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.15s, transform 0.15s',
                display: 'flex',
                flexDirection: 'column',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.12)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
        >
            {/* 縮圖 */}
            <div style={{ height: 120, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {thumbInfo ? (
                    <img src={resolveInfoUrl(thumbInfo.content)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    </svg>
                )}
            </div>

            {/* 內容 */}
            <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{model.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, flex: 1 }}>
                    {introText || <span style={{ color: '#94a3b8' }}>尚未填寫介紹</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {diagrams.length > 0 && (
                        <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', borderRadius: 4, padding: '2px 6px' }}>
                            圖說 {diagrams.length}
                        </span>
                    )}
                    {customFields.length > 0 && (
                        <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', borderRadius: 4, padding: '2px 6px' }}>
                            欄位 {customFields.length}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
```

**Step 3: 完整替換 ModelInfoEditor component**

找到 `// ─── Tab 3: ModelInfoEditor ───` 這行（約 line 554）到 component 結束的 `};`，整個替換為：

```tsx
// ─── Tab 3: ModelInfoDashboard ─────────────────────────────────────────────

const ModelInfoDashboard: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { scenes, fetchScenes } = useFacilityStore();
    const [sceneId, setSceneId] = useState('');
    const [models, setModels] = useState<(FacilityModelItem & { introduction?: string })[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [selectedModel, setSelectedModel] = useState<(FacilityModelItem & { introduction?: string }) | null>(null);

    useEffect(() => { if (projectId) fetchScenes(projectId); }, [projectId, fetchScenes]);

    useEffect(() => {
        if (!sceneId) { setModels([]); return; }
        setIsLoadingModels(true);
        axios.get<(FacilityModelItem & { introduction?: string })[]>(`${API_BASE}/api/facility/models`, {
            params: { sceneId },
            headers: getAuthHeaders(),
            withCredentials: true,
        }).then(r => setModels(Array.isArray(r.data) ? r.data : []))
          .catch(() => setModels([]))
          .finally(() => setIsLoadingModels(false));
    }, [sceneId]);

    const handleModelSaved = (updated: FacilityModelItem & { introduction?: string }) => {
        setModels(prev => prev.map(m => m.id === updated.id ? updated : m));
        setSelectedModel(updated);
    };

    return (
        <div style={{ padding: '16px 0' }}>
            {/* 場景選擇 */}
            <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 4 }}>選擇場景</label>
                <select
                    value={sceneId}
                    onChange={e => { setSceneId(e.target.value); setSelectedModel(null); }}
                    style={{ width: '100%', maxWidth: 320, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
                >
                    <option value="">-- 請選擇場景 --</option>
                    {scenes.filter(s => s.parentSceneId === null).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>

            {/* 模型 Dashboard */}
            {isLoadingModels && <div style={{ color: '#64748b', fontSize: 13 }}>載入中...</div>}
            {!isLoadingModels && sceneId && models.length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>此場景尚無模型</div>
            )}
            {!isLoadingModels && models.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {models.map(m => (
                        <ModelCard key={m.id} model={m} onClick={() => setSelectedModel(m)} />
                    ))}
                </div>
            )}

            {/* 模型資訊 Modal */}
            {selectedModel && (
                <ModelInfoModal
                    model={selectedModel}
                    onClose={() => setSelectedModel(null)}
                    onSaved={handleModelSaved}
                />
            )}
        </div>
    );
};
```

**Step 4: 更新 Tab render 處**

在 `FacilityUploadSection.tsx` 找到：
```tsx
{activeTab === 'info' && <ModelInfoEditor projectId={projectId} />}
```
改為：
```tsx
{activeTab === 'info' && <ModelInfoDashboard projectId={projectId} />}
```

**Step 5: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 6: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx src/components/common/RichTextEditor.tsx src/components/common/RichTextView.tsx
git commit -m "feat: 模型資訊 Tab 改為 Dashboard 卡片牆"
```

---

## Task 5: ModelInfoModal — 全螢幕編輯 Modal

**Files:**
- Modify: `src/components/data/FacilityUploadSection.tsx` — 在 ModelInfoDashboard 上方加入 `ModelInfoModal` component

**Step 1: 建立 ModelInfoModal**

在 `ModelCard` component 下方（Task 4 Step 2 結束後），`ModelInfoDashboard` 上方，插入：

```tsx
interface ModelInfoModalProps {
    model: FacilityModelItem & { introduction?: string };
    onClose: () => void;
    onSaved: (updated: FacilityModelItem & { introduction?: string }) => void;
}

function ModelInfoModal({ model, onClose, onSaved }: ModelInfoModalProps) {
    // ── 設施介紹 state ──
    const [intro, setIntro] = useState(model.introduction || '');
    const [isSavingIntro, setIsSavingIntro] = useState(false);
    const introDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── 設施圖說 state ──
    const [diagrams, setDiagrams] = useState<RichContentItem[]>(
        (model.infos || []).filter(i => i.type === 'IMAGE' || i.type === 'DOCUMENT')
    );
    const [isDiagramUploading, setIsDiagramUploading] = useState(false);
    const diagramInputRef = useRef<HTMLInputElement>(null);

    // ── 自訂欄位 state ──
    const [customFields, setCustomFields] = useState<RichContentItem[]>(
        (model.infos || []).filter(i => i.type === 'TEXT' || i.type === 'LINK')
    );
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldContent, setNewFieldContent] = useState('');
    const [newFieldType, setNewFieldType] = useState<'TEXT' | 'LINK'>('TEXT');
    const [isSavingField, setIsSavingField] = useState(false);
    const [fieldError, setFieldError] = useState<string | null>(null);

    // 同步外部 model 切換
    useEffect(() => {
        setIntro(model.introduction || '');
        setDiagrams((model.infos || []).filter(i => i.type === 'IMAGE' || i.type === 'DOCUMENT'));
        setCustomFields((model.infos || []).filter(i => i.type === 'TEXT' || i.type === 'LINK'));
    }, [model.id]);

    // ── 設施介紹儲存（debounce 2 秒）──
    const handleIntroChange = (html: string) => {
        setIntro(html);
        if (introDebounceRef.current) clearTimeout(introDebounceRef.current);
        introDebounceRef.current = setTimeout(() => saveIntro(html), 2000);
    };

    const saveIntro = async (html: string) => {
        setIsSavingIntro(true);
        try {
            const res = await axios.put<FacilityModelItem & { introduction?: string }>(
                `${API_BASE}/api/facility/models/${model.id}`,
                { introduction: html },
                { headers: getAuthHeaders(), withCredentials: true }
            );
            onSaved({ ...res.data, infos: [...diagrams, ...customFields] });
        } catch (e) {
            console.error('intro save failed', e);
        } finally {
            setIsSavingIntro(false);
        }
    };

    // ── 設施圖說上傳 ──
    const handleDiagramFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsDiagramUploading(true);
        for (const file of Array.from(files)) {
            const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
            const type = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'IMAGE' : 'DOCUMENT';
            const fd = new FormData();
            fd.append('type', type);
            fd.append('label', file.name);
            fd.append('file', file);
            try {
                const res = await axios.post<RichContentItem>(
                    `${API_BASE}/api/facility/models/${model.id}/info`,
                    fd,
                    { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }, withCredentials: true }
                );
                setDiagrams(prev => [...prev, res.data]);
            } catch (e) {
                console.error('diagram upload failed', e);
            }
        }
        setIsDiagramUploading(false);
    };

    const handleDeleteDiagram = async (id: string) => {
        try {
            await axios.delete(`${API_BASE}/api/facility/info/${id}`, {
                headers: getAuthHeaders(), withCredentials: true
            });
            setDiagrams(prev => prev.filter(d => d.id !== id));
        } catch (e) {
            console.error('delete diagram failed', e);
        }
    };

    // ── 自訂欄位新增 ──
    const handleAddField = async () => {
        if (!newFieldLabel.trim()) { setFieldError('標籤為必填'); return; }
        if (!newFieldContent.trim()) { setFieldError('內容為必填'); return; }
        setIsSavingField(true);
        setFieldError(null);
        try {
            const fd = new FormData();
            fd.append('type', newFieldType);
            fd.append('label', newFieldLabel.trim());
            fd.append('content', newFieldContent.trim());
            const res = await axios.post<RichContentItem>(
                `${API_BASE}/api/facility/models/${model.id}/info`,
                fd,
                { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }, withCredentials: true }
            );
            setCustomFields(prev => [...prev, res.data]);
            setNewFieldLabel('');
            setNewFieldContent('');
        } catch (e: any) {
            setFieldError(e?.response?.data?.error || '新增失敗');
        } finally {
            setIsSavingField(false);
        }
    };

    const handleDeleteField = async (id: string) => {
        try {
            await axios.delete(`${API_BASE}/api/facility/info/${id}`, {
                headers: getAuthHeaders(), withCredentials: true
            });
            setCustomFields(prev => prev.filter(f => f.id !== id));
        } catch (e) {
            console.error('delete field failed', e);
        }
    };

    const sectionStyle: React.CSSProperties = {
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
    };

    const sectionTitle: React.CSSProperties = {
        fontSize: 15,
        fontWeight: 700,
        color: '#1e293b',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            overflowY: 'auto', padding: '24px 16px',
        }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ background: '#f8fafc', borderRadius: 16, width: '100%', maxWidth: 800, minHeight: '80vh' }}>
                {/* Modal Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff',
                    borderRadius: '16px 16px 0 0', position: 'sticky', top: 0, zIndex: 1,
                }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: '#1e293b' }}>{model.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isSavingIntro && <span style={{ fontSize: 12, color: '#94a3b8' }}>儲存中...</span>}
                        <button onClick={onClose} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                            color: '#64748b', fontSize: 20, lineHeight: 1,
                        }}>×</button>
                    </div>
                </div>

                {/* Modal Body */}
                <div style={{ padding: 24 }}>
                    {/* 區塊 1：設施介紹 */}
                    <div style={sectionStyle}>
                        <div style={sectionTitle}>設施介紹</div>
                        <RichTextEditor
                            value={intro}
                            onChange={handleIntroChange}
                            placeholder="輸入設施介紹文字..."
                        />
                        <div style={{ textAlign: 'right', marginTop: 8 }}>
                            <button
                                onClick={() => saveIntro(intro)}
                                disabled={isSavingIntro}
                                style={{
                                    background: '#2563eb', color: '#fff', border: 'none',
                                    borderRadius: 6, padding: '6px 16px', fontSize: 13,
                                    cursor: 'pointer', opacity: isSavingIntro ? 0.6 : 1,
                                }}
                            >
                                {isSavingIntro ? '儲存中...' : '儲存介紹'}
                            </button>
                        </div>
                    </div>

                    {/* 區塊 2：設施圖說 */}
                    <div style={sectionStyle}>
                        <div style={sectionTitle}>設施圖說</div>

                        {/* 上傳區 */}
                        <div
                            onClick={() => diagramInputRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); handleDiagramFiles(e.dataTransfer.files); }}
                            style={{
                                border: '2px dashed #cbd5e1', borderRadius: 8, padding: '20px 16px',
                                textAlign: 'center', cursor: 'pointer', marginBottom: 16,
                                color: '#64748b', fontSize: 13, background: '#f8fafc',
                            }}
                        >
                            {isDiagramUploading ? '上傳中...' : '點擊或拖曳上傳圖說（JPG/PNG/PDF/CAD/DWG）'}
                        </div>
                        <input
                            ref={diagramInputRef}
                            type="file"
                            multiple
                            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.dwg,.dxf,.cad"
                            style={{ display: 'none' }}
                            onChange={e => handleDiagramFiles(e.target.files)}
                        />

                        {/* 圖說清單 */}
                        {diagrams.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                                {diagrams.map(d => (
                                    <div key={d.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                                        {d.type === 'IMAGE' ? (
                                            <img src={resolveInfoUrl(d.content)} alt={d.label} style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: 12, color: '#475569', padding: 8, textAlign: 'center' }}>
                                                📄 {d.label}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleDeleteDiagram(d.id)}
                                            style={{
                                                position: 'absolute', top: 4, right: 4,
                                                background: 'rgba(0,0,0,0.5)', color: '#fff',
                                                border: 'none', borderRadius: '50%', width: 20, height: 20,
                                                fontSize: 12, cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 區塊 3：自訂欄位 */}
                    <div style={sectionStyle}>
                        <div style={sectionTitle}>自訂欄位</div>

                        {/* 現有欄位 */}
                        {customFields.map(f => (
                            <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 6 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{f.type === 'LINK' ? '🔗' : '📝'} {f.label}</div>
                                    {f.type === 'LINK'
                                        ? <a href={f.content} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#2563eb', wordBreak: 'break-all' }}>{f.content}</a>
                                        : <div style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>{f.content}</div>
                                    }
                                </div>
                                <button onClick={() => handleDeleteField(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, padding: 2 }}>×</button>
                            </div>
                        ))}

                        {/* 新增欄位 */}
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 4 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <select
                                    value={newFieldType}
                                    onChange={e => setNewFieldType(e.target.value as 'TEXT' | 'LINK')}
                                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, minWidth: 70 }}
                                >
                                    <option value="TEXT">文字</option>
                                    <option value="LINK">連結</option>
                                </select>
                                <input
                                    value={newFieldLabel}
                                    onChange={e => setNewFieldLabel(e.target.value)}
                                    placeholder="欄位名稱"
                                    style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    value={newFieldContent}
                                    onChange={e => setNewFieldContent(e.target.value)}
                                    placeholder={newFieldType === 'LINK' ? 'https://...' : '內容'}
                                    style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}
                                />
                                <button
                                    onClick={handleAddField}
                                    disabled={isSavingField}
                                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}
                                >
                                    新增
                                </button>
                            </div>
                            {fieldError && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{fieldError}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

**Step 2: 在 ModelInfoDashboard 的 useState import 後加入 useRef import**

確認 `FacilityUploadSection.tsx` 頂部的 React imports 包含 `useRef`（通常已有）。

**Step 3: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 4: Commit**

```bash
git add src/components/data/FacilityUploadSection.tsx
git commit -m "feat: ModelInfoModal — WYSIWYG 介紹 + 圖說上傳 + 自訂欄位"
```

---

## Task 6: FacilityInfoPanel 改寫

**Files:**
- Modify: `src/components/facility/FacilityInfoPanel.tsx` — 完整改寫

**背景知識：**
- 現有面板是右側全高滑出（`fixed right-0 top-0 h-full w-80`）
- 要改為右下角浮動面板（`fixed bottom-6 right-6`，`width: 340px`，`max-height: 60vh`）
- 分三個區塊：設施介紹（HTML渲染）/ 設施圖說（縮圖陣列）/ 自訂欄位（key-value）
- lightbox 保留

**Step 1: 完整改寫 FacilityInfoPanel.tsx**

```tsx
import { useState, useMemo } from 'react'
import { X, Edit3, Download, ExternalLink } from 'lucide-react'
import { useFacilityStore } from '@/stores/facilityStore'
import { RichTextView } from '@/components/common/RichTextView'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function resolveUrl(url: string) {
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
}

export default function FacilityInfoPanel() {
    const models = useFacilityStore(state => state.models)
    const selectedModelId = useFacilityStore(state => state.selectedModelId)
    const editMode = useFacilityStore(state => state.editMode)
    const selectModel = useFacilityStore(state => state.selectModel)
    const setEditingModel = useFacilityStore(state => state.setEditingModel)

    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

    const selectedModel = useMemo(
        () => models.find(m => m.id === selectedModelId) ?? null,
        [models, selectedModelId]
    )

    const diagrams = useMemo(() =>
        (selectedModel?.infos ?? []).filter(i => i.type === 'IMAGE' || i.type === 'DOCUMENT'),
        [selectedModel]
    )
    const customFields = useMemo(() =>
        (selectedModel?.infos ?? []).filter(i => i.type === 'TEXT' || i.type === 'LINK'),
        [selectedModel]
    )

    const hasContent = selectedModel && (
        selectedModel.introduction ||
        diagrams.length > 0 ||
        customFields.length > 0
    )

    if (!selectedModelId) return null

    return (
        <>
            {/* Lightbox */}
            {lightboxSrc && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => setLightboxSrc(null)}
                >
                    <img
                        src={lightboxSrc}
                        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Panel */}
            <div style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                width: 340,
                maxHeight: '60vh',
                background: '#fff',
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                zIndex: 40,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.08)',
            }}>
                {selectedModel && (
                    <>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {selectedModel.name}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {editMode && (
                                    <button
                                        onClick={() => setEditingModel(selectedModel.id)}
                                        style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}
                                    >
                                        <Edit3 size={12} /> 編輯
                                    </button>
                                )}
                                <button
                                    onClick={() => selectModel(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex' }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 14px' }}>
                            {!hasContent && (
                                <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>尚無資訊</p>
                            )}

                            {/* 設施介紹 */}
                            {selectedModel.introduction && (
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>設施介紹</div>
                                    <RichTextView html={selectedModel.introduction} />
                                </div>
                            )}

                            {/* 設施圖說 */}
                            {diagrams.length > 0 && (
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>設施圖說</div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {diagrams.map(d => (
                                            d.type === 'IMAGE' ? (
                                                <button key={d.id} onClick={() => setLightboxSrc(resolveUrl(d.content))} style={{ border: 'none', padding: 0, cursor: 'zoom-in', borderRadius: 6, overflow: 'hidden' }}>
                                                    <img src={resolveUrl(d.content)} alt={d.label} style={{ width: 72, height: 56, objectFit: 'cover', display: 'block' }} />
                                                </button>
                                            ) : (
                                                <a key={d.id} href={resolveUrl(d.content)} download style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#2563eb', textDecoration: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px' }}>
                                                    <Download size={12} />
                                                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                                                </a>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 自訂欄位 */}
                            {customFields.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>自訂欄位</div>
                                    {customFields.map(f => (
                                        <div key={f.id} style={{ marginBottom: 6 }}>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{f.label}</div>
                                            {f.type === 'LINK'
                                                ? <a href={f.content} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}><ExternalLink size={11} />{f.content}</a>
                                                : <div style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>{f.content}</div>
                                            }
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
```

**Step 2: TypeScript 確認**

```bash
npx tsc --noEmit 2>&1 | grep -v vite.config
```

**Step 3: Commit**

```bash
git add src/components/facility/FacilityInfoPanel.tsx
git commit -m "feat: FacilityInfoPanel 改為右下角浮動面板，顯示介紹/圖說/自訂欄位"
```

---

## 驗收測試

執行以下人工測試步驟：

1. `npm run dev`（前端）+ `cd server && npm run dev`（後端）
2. 前往 `/project/:code/facility-data` → 模型資訊 Tab
3. 選擇場景 → 確認出現模型卡片牆（3欄 grid）
4. 點擊一張卡片 → 確認全螢幕 Modal 打開
5. 在「設施介紹」輸入 WYSIWYG 文字 → 等 2 秒自動儲存 → 關閉重開確認持久化
6. 在「設施圖說」上傳一張圖 + 一個 PDF → 確認縮圖顯示
7. 在「自訂欄位」新增一筆文字欄位 → 確認出現
8. 關閉 Modal → 卡片上的摘要/badge 更新
9. 前往 `/project/:code/facility` 3D 場景
10. 點擊一個模型 → 右下角浮動面板出現，顯示介紹/圖說/自訂欄位
11. 圖說縮圖點擊 → lightbox 顯示
