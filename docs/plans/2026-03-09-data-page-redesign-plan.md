# 地質資料管理頁面 UI 重構 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor DataManagementPage from a 1894-line monolith into a navigable, visually-grouped page with floating TOC, collapsible sections, and extracted sub-components.

**Architecture:** Extract 3 inline sections (imagery, geology model, geophysics) into standalone sub-components following the existing no-props pattern (direct Zustand store access). Add a floating TOC with IntersectionObserver scroll-spy. Wrap each section in a collapsible container with group color bands. All CSS stays in DataManagementPage's `<style>` block (children inherit).

**Tech Stack:** React 19, TypeScript, Zustand, Google Fonts (DM Sans + JetBrains Mono), IntersectionObserver API, CSS transitions

**Design Doc:** `docs/plans/2026-03-09-data-page-redesign-design.md`

---

## Important Context

- **No test suite** — verification is `npx tsc --noEmit` + `npx vite build` + browser check
- **CSS pattern**: All `dm-` classes are defined in DataManagementPage's inline `<style>` block and cascade to child components
- **Store pattern**: All existing sub-components take **zero props** and access Zustand stores directly
- **Exception**: The new sub-components need `showToast` — pass it as the **sole prop** since there's no toast store
- **uploadStore**: Imagery, geophysics, geology model state all live in `useUploadStore` — the new components will import it directly
- **File locations**: All sub-components go in `src/components/data/`

---

### Task 1: Add Google Fonts + Update CSS Variables

**Files:**
- Modify: `index.html`
- Modify: `src/pages/DataManagementPage.tsx` (CSS variables block, lines 539-557)

**Step 1: Add Google Fonts link to index.html**

Add before `</head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Step 2: Update CSS variables in DataManagementPage.tsx**

Replace the `:root` block (lines 541-557) with:

```css
:root {
    --primary: #2563eb;
    --primary-hover: #1d4ed8;
    --danger: #dc2626;
    --danger-hover: #b91c1c;
    --success: #16a34a;
    --gray-50: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-200: #e5e7eb;
    --gray-300: #d1d5db;
    --gray-400: #9ca3af;
    --gray-500: #6b7280;
    --gray-600: #4b5563;
    --gray-700: #374151;
    --gray-800: #1f2937;
    --gray-900: #111827;
    --text-primary: #0f172a;
    --bg-page: #f1f5f9;
    --bg-card: #ffffff;
    --font-sans: 'DM Sans', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
    --group-setup: #64748b;
    --group-geology: #d97706;
    --group-surface: #0891b2;
    --group-model: #7c3aed;
}
```

**Step 3: Update page-level font and background**

Change `.data-management-page` (line 560-564):

```css
.data-management-page {
    min-height: 100vh;
    background: var(--bg-page);
    color: var(--text-primary);
    font-family: var(--font-sans);
}
```

Change `.dm-title` (line 607-611):

```css
.dm-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.025em;
}
```

**Step 4: Add mono font class**

Add after the `:root` block:

```css
.dm-mono {
    font-family: var(--font-mono);
    font-size: 13px;
    letter-spacing: -0.01em;
}
```

**Step 5: Verify**

```bash
npx tsc --noEmit
npx vite build
```

Open browser → 資料管理頁面 → 確認字體已變更（DM Sans 標題比 Inter 更圓潤幾何）

**Step 6: Commit**

```bash
git add index.html src/pages/DataManagementPage.tsx
git commit -m "style: add DM Sans + JetBrains Mono fonts, update CSS variables"
```

---

### Task 2: Extract ImageryUploadSection

**Files:**
- Create: `src/components/data/ImageryUploadSection.tsx`
- Modify: `src/pages/DataManagementPage.tsx`

**Step 1: Create ImageryUploadSection.tsx**

Extract from DataManagementPage:
- **State** (lines 149-172): `isDragging`, `selectedFile`, `showUploadForm`, `showAdvanced`, `formData`, `formErrors`, `showDeleteConfirm`, `fileToDelete`, `showDetailModal`, `selectedDetailFile`, `fileInputRef`
- **Handlers** (lines 246-361): `handleFileSelect`, `handleDrop`, `handleInputChange`, `validateForm`, `handleSubmit`, `handleCancelUpload`, `formatFileSize`, `handleDeleteClick`, `confirmDelete`, `cancelDelete`, `handleViewDetail`, `handleCloseDetail`
- **JSX**: The `<section className="dm-section">` for 航照圖 (lines 1065-1146) + modals (lines 1341-1527)

```tsx
/**
 * ImageryUploadSection
 * 航照圖管理 — 上傳、預覽、刪除航照底圖
 */

import React, { useState, useRef, useCallback } from 'react';
import {
    UploadCloud,
    X,
    Check,
    ChevronDown,
    ChevronUp,
    File,
    Image as ImageIcon,
    Activity,
} from 'lucide-react';
import {
    useUploadStore,
    UploadedFile,
    ImageryMetadata,
} from '../../stores/uploadStore';

interface ImageryUploadSectionProps {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ImageryUploadSection: React.FC<ImageryUploadSectionProps> = ({ showToast }) => {
    const {
        imageryFiles,
        isUploading,
        uploadProgress,
        uploadError,
        fetchImageryFiles,
        uploadImagery,
        deleteImagery,
        clearError,
    } = useUploadStore();

    // --- ALL state from DataManagementPage lines 149-172 ---
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [formData, setFormData] = useState<ImageryMetadata>({
        year: new Date().getFullYear(),
        name: '', source: '', description: '',
        minX: '', maxX: '', minY: '', maxY: '',
    });
    const [formErrors, setFormErrors] = useState<{ year?: string; name?: string }>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDetailFile, setSelectedDetailFile] = useState<UploadedFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- ALL handlers from DataManagementPage lines 246-361 ---
    // (Copy them verbatim, they reference only local state + uploadStore)

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleFileSelect = (file: File) => { /* ... copy from lines 246-266 ... */ };
    const handleDrop = (e: React.DragEvent) => { /* ... copy from lines 268-273 ... */ };
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... copy from lines 275-279 ... */ };
    const validateForm = (): boolean => { /* ... copy from lines 281-293 ... */ };
    const handleSubmit = async () => { /* ... copy from lines 295-319 ... */ };
    const handleCancelUpload = () => { /* ... copy from lines 321-326 ... */ };
    const handleDeleteClick = (id: string) => { setFileToDelete(id); setShowDeleteConfirm(true); };
    const confirmDelete = async () => { /* ... copy from lines 340-346 ... */ };
    const cancelDelete = () => { setShowDeleteConfirm(false); setFileToDelete(null); };
    const handleViewDetail = (file: UploadedFile) => { setSelectedDetailFile(file); setShowDetailModal(true); };
    const handleCloseDetail = () => { setShowDetailModal(false); setSelectedDetailFile(null); };

    return (
        <>
            {/* Section: lines 1065-1146 */}
            <section className="dm-section">
                {/* ... copy section JSX verbatim ... */}
            </section>

            {/* Upload Form Modal: lines 1341-1442 */}
            {showUploadForm && selectedFile && (
                <div className="dm-modal-overlay">{/* ... copy modal JSX ... */}</div>
            )}

            {/* Delete Confirm Modal: lines 1445-1465 */}
            {showDeleteConfirm && (
                <div className="dm-modal-overlay">{/* ... copy modal JSX ... */}</div>
            )}

            {/* Detail Modal: lines 1468-1527 */}
            {showDetailModal && selectedDetailFile && (
                <div className="dm-modal-overlay">{/* ... copy modal JSX ... */}</div>
            )}
        </>
    );
};
```

**IMPORTANT**: Copy handlers and JSX **verbatim** from DataManagementPage. Do NOT rewrite logic. The only change is:
- Handlers are now local to this component
- `showToast` comes from props instead of local scope
- `formatFileSize` is duplicated (will be shared later if needed)

**Step 2: Remove imagery code from DataManagementPage**

Remove from DataManagementPage.tsx:
- State declarations: lines 149-172 (`isDragging` through `fileInputRef`)
- Handlers: lines 246-361 (`handleFileSelect` through `handleCloseDetail`)
- Inline JSX: lines 1064-1146 (航照圖 section)
- Modals: lines 1340-1527 (upload form, delete confirm, detail modal)

Replace the section area with:

```tsx
import { ImageryUploadSection } from '../components/data/ImageryUploadSection';

// Inside render, where the imagery section was:
<ImageryUploadSection showToast={showToast} />
```

**Step 3: Verify**

```bash
npx tsc --noEmit
npx vite build
```

Open browser → 航照圖 section → 上傳、刪除、詳情功能正常

**Step 4: Commit**

```bash
git add src/components/data/ImageryUploadSection.tsx src/pages/DataManagementPage.tsx
git commit -m "refactor: extract ImageryUploadSection from DataManagementPage"
```

---

### Task 3: Extract GeologyModelSection

**Files:**
- Create: `src/components/data/GeologyModelSection.tsx`
- Modify: `src/pages/DataManagementPage.tsx`

**Step 1: Create GeologyModelSection.tsx**

Extract from DataManagementPage:
- **State** (lines 231-243): `geoModelFile`, `showGeoModelForm`, `geoModelFormData`, `geoModelFormErrors`, `geoModelInputRef`, `showGeoModelDeleteConfirm`, `geoModelToDelete`
- **Handlers** (lines 446-534): `handleGeoModelFileSelect`, `handleGeoModelDrop`, `handleGeoModelInputChange`, `validateGeoModelForm`, `handleGeoModelSubmit`, `handleCancelGeoModelUpload`, `handleGeoModelDeleteClick`, `confirmGeoModelDelete`, `handleActivateGeoModel`
- **Helper** (lines 526-535): `getStatusBadge`
- **Polling effect** (lines 188-201)
- **JSX**: 3D 地質模型 section (lines 1159-1265) + modals (lines 1734-1850)

Pattern identical to Task 2. Same `showToast` prop. This component also needs:
```tsx
import { useUploadStore, GeologyModelMetadata, GeologyModelFile } from '../../stores/uploadStore';
```

And the polling `useEffect`:
```tsx
useEffect(() => {
    const { geologyModels, pollGeologyModelStatus } = useUploadStore.getState();
    // ... copy polling logic from lines 188-201
}, [geologyModels, pollGeologyModelStatus]);
```

**Step 2: Remove geology model code from DataManagementPage**

Same pattern as Task 2 — remove state, handlers, JSX, modals. Replace with:

```tsx
import { GeologyModelSection } from '../components/data/GeologyModelSection';

<GeologyModelSection showToast={showToast} />
```

Also remove from the `useUploadStore` destructuring in DataManagementPage:
- `geologyModels`, `uploadGeologyModel`, `deleteGeologyModel`, `activateGeologyModel`, `pollGeologyModelStatus`
- `fetchGeologyModels` (move to the new component's useEffect)

**Step 3: Verify**

```bash
npx tsc --noEmit
npx vite build
```

Browser → 3D 地質模型 section → 上傳、轉換進度、啟用、刪除功能正常

**Step 4: Commit**

```bash
git add src/components/data/GeologyModelSection.tsx src/pages/DataManagementPage.tsx
git commit -m "refactor: extract GeologyModelSection from DataManagementPage"
```

---

### Task 4: Extract GeophysicsUploadSection

**Files:**
- Create: `src/components/data/GeophysicsUploadSection.tsx`
- Modify: `src/pages/DataManagementPage.tsx`

**Step 1: Create GeophysicsUploadSection.tsx**

Extract from DataManagementPage:
- **State** (lines 203-226): `geoFile`, `showGeoForm`, `geoFormData`, `geoFormErrors`, `geoInputRef`, `showGeoDeleteConfirm`, `geoToDelete`, `showGeoDetail`, `selectedGeoDetail`
- **Handlers** (lines 364-441): all `handleGeo*` functions
- **JSX**: 地球物理 section (lines 1267-1336) + modals (lines 1529-1732)

This component also needs camera navigation (for "在 3D 場景中定位" button):
```tsx
import { useCameraStore } from '../../stores/cameraStore';
import { twd97ToWorld } from '../../utils/coordinates';
import { useNavigate, useParams } from 'react-router-dom';
```

Same `showToast` prop pattern.

**Step 2: Remove geophysics code from DataManagementPage**

Remove state, handlers, JSX, modals. Replace with:

```tsx
import { GeophysicsUploadSection } from '../components/data/GeophysicsUploadSection';

<GeophysicsUploadSection showToast={showToast} />
```

Also remove unused imports from DataManagementPage:
- `Activity` (now only in GeophysicsUploadSection)
- `twd97ToWorld` (moved)
- `useCameraStore` (moved)
- `GeophysicsFile`, `GeophysicsMetadata` from uploadStore
- `GeologyModelFile`, `GeologyModelMetadata` from uploadStore (moved in Task 3)

**Step 3: Verify**

```bash
npx tsc --noEmit
npx vite build
```

Browser → 地球物理 section → 上傳、詳情（含 3D 定位按鈕）、刪除功能正常

**Step 4: Commit**

```bash
git add src/components/data/GeophysicsUploadSection.tsx src/pages/DataManagementPage.tsx
git commit -m "refactor: extract GeophysicsUploadSection from DataManagementPage"
```

---

### Task 5: Add Collapsible Section Wrapper

**Files:**
- Create: `src/components/data/CollapsibleSection.tsx`
- Modify: `src/pages/DataManagementPage.tsx` (wrap each section)

**Step 1: Create CollapsibleSection component**

```tsx
/**
 * CollapsibleSection
 * 可收合的 section 容器，包含群組色帶 + 統計 badge
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
    id: string;                    // scroll spy anchor id
    icon: React.ReactNode;
    title: string;
    description: string;
    count?: number;                // 資料筆數 badge
    groupColor: string;            // CSS variable name, e.g. 'var(--group-geology)'
    defaultExpanded?: boolean;
    disabled?: boolean;            // isSetupComplete === false
    children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    id, icon, title, description, count, groupColor,
    defaultExpanded = true, disabled = false, children,
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const contentRef = useRef<HTMLDivElement>(null);

    return (
        <section
            id={id}
            className="dm-section dm-collapsible"
            style={{
                borderLeft: `3px solid ${groupColor}`,
                opacity: disabled ? 0.5 : 1,
                pointerEvents: disabled ? 'none' : 'auto',
            }}
        >
            <div
                className="dm-section-header dm-collapsible-header"
                onClick={() => setExpanded(!expanded)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
            >
                <div className="dm-section-icon" style={{ color: groupColor }}>
                    {icon}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="dm-section-title">{title}</div>
                        {count !== undefined && (
                            <span
                                className="dm-mono"
                                style={{
                                    fontSize: '12px',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    background: `${groupColor}15`,
                                    color: groupColor,
                                    fontWeight: 500,
                                }}
                            >
                                {count}
                            </span>
                        )}
                    </div>
                    <div className="dm-section-desc">{description}</div>
                </div>
                <div
                    style={{
                        transition: 'transform 0.2s',
                        transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        color: 'var(--gray-400)',
                    }}
                >
                    <ChevronDown size={20} />
                </div>
            </div>
            <div
                ref={contentRef}
                style={{
                    overflow: 'hidden',
                    maxHeight: expanded ? '10000px' : '0',
                    opacity: expanded ? 1 : 0,
                    transition: 'max-height 0.3s ease-in-out, opacity 0.2s ease-in-out',
                }}
            >
                <div style={{ paddingTop: expanded ? '0' : '0' }}>
                    {children}
                </div>
            </div>
        </section>
    );
};
```

**Step 2: Add CSS for collapsible sections in DataManagementPage**

Add to the `<style>` block:

```css
.dm-collapsible {
    transition: border-color 0.2s;
}
.dm-collapsible-header:hover {
    background: var(--gray-50);
    margin: -24px;
    padding: 24px;
    border-radius: 12px 12px 0 0;
}
```

**Step 3: Wrap each section in DataManagementPage**

Replace the bare `<div style={{ opacity... }}>` wrappers + raw sub-component calls with `CollapsibleSection`. Example for BoreholeUploadSection:

```tsx
<CollapsibleSection
    id="section-borehole"
    icon={<Layers size={20} />}
    title="鑽孔資料"
    description="上傳與管理鑽孔柱狀圖資料"
    groupColor="var(--group-geology)"
    count={boreholeCount}
    disabled={!isSetupComplete}
>
    <BoreholeUploadSection />
</CollapsibleSection>
```

**IMPORTANT**: The sub-components (BoreholeUploadSection etc.) currently render their own `<section className="dm-section">` wrapper. After wrapping in CollapsibleSection, the sub-components should **remove their outer `<section>` wrapper** and just render content. But this is invasive — instead, have CollapsibleSection **not** use `dm-section` class and let children keep their own section styling. The CollapsibleSection becomes a transparent wrapper that only adds:
- The `id` anchor
- The `borderLeft` color band
- The collapse toggle
- The disabled overlay

Adjust: CollapsibleSection should NOT duplicate the section-header. Instead, it wraps the entire child section and adds an expand/collapse bar ABOVE it.

**Alternative simpler approach**: Don't create a wrapper component. Instead, add collapse state directly in DataManagementPage for each section, and modify the existing `dm-section` CSS to support the color band. This avoids changing all sub-components.

**Revised Step 3**: Add collapse state in DataManagementPage:

```tsx
const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
};
```

For each section, wrap with a thin collapse bar + content div:

```tsx
<div id="section-borehole" style={{ opacity: isSetupComplete ? 1 : 0.5, pointerEvents: isSetupComplete ? 'auto' : 'none' }}>
    <div
        className="dm-collapse-bar"
        style={{ borderLeftColor: 'var(--group-geology)' }}
        onClick={() => toggleSection('borehole')}
    >
        <span className="dm-collapse-title">鑽孔資料</span>
        <span className="dm-collapse-badge" style={{ color: 'var(--group-geology)' }}>{boreholeCount}</span>
        <ChevronDown size={16} style={{ transform: collapsedSections.has('borehole') ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
    </div>
    {!collapsedSections.has('borehole') && <BoreholeUploadSection />}
</div>
```

Wait — this approach has the collapse bar separate from the section's own header, creating visual duplication. The sub-components already have their own section header (icon + title + description).

**Final approach: CollapsibleSection wraps and REPLACES the sub-component's section header.** Each sub-component needs a minor change: accept an optional `hideHeader` prop to skip rendering its own header when wrapped by CollapsibleSection. This is the cleanest solution.

Actually, the cleanest approach for the existing extracted sub-components is: **CollapsibleSection only controls visibility of children. The sub-components keep their own headers.** The collapse bar is a thin clickable strip that appears BETWEEN sections when collapsed.

Let me simplify: **Just add collapse to the existing section headers.** Each sub-component already renders `<section className="dm-section">` with `<div className="dm-section-header">`. We modify the CSS so clicking the header collapses the section content below it.

Since modifying all 8 sub-components to accept a `collapsed` prop is too invasive, the pragmatic solution is:

**In DataManagementPage, wrap each sub-component in a div that can collapse:**

```tsx
{/* Wrapper that shows/hides content */}
<div id="section-borehole" className="dm-section-wrapper" data-group="geology">
    {collapsedSections.has('borehole') ? (
        <div className="dm-collapsed-bar" onClick={() => toggleSection('borehole')}>
            <Layers size={16} />
            <span>鑽孔資料</span>
            <span className="dm-collapse-badge">{boreholeCount}</span>
            <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
        </div>
    ) : (
        <div>
            <div className="dm-expand-toggle" onClick={() => toggleSection('borehole')}>
                <ChevronDown size={14} />
            </div>
            <BoreholeUploadSection />
        </div>
    )}
</div>
```

This adds a small collapse toggle without modifying sub-components at all.

**Step 4: Add CSS**

```css
.dm-section-wrapper {
    margin-bottom: 24px;
}
.dm-section-wrapper[data-group="setup"] .dm-section { border-left: 3px solid var(--group-setup); }
.dm-section-wrapper[data-group="geology"] .dm-section { border-left: 3px solid var(--group-geology); }
.dm-section-wrapper[data-group="surface"] .dm-section { border-left: 3px solid var(--group-surface); }
.dm-section-wrapper[data-group="model"] .dm-section { border-left: 3px solid var(--group-model); }

.dm-collapsed-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 24px;
    background: var(--bg-card);
    border: 1px solid var(--gray-200);
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    color: var(--text-primary);
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.dm-collapsed-bar:hover { background: var(--gray-50); }

.dm-collapse-badge {
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 9999px;
    background: var(--gray-100);
    color: var(--gray-600);
    font-weight: 500;
}

.dm-expand-toggle {
    position: absolute;
    top: 28px;
    right: 24px;
    cursor: pointer;
    color: var(--gray-400);
    z-index: 2;
    padding: 4px;
    border-radius: 4px;
}
.dm-expand-toggle:hover { background: var(--gray-100); color: var(--gray-600); }

.dm-section-wrapper { position: relative; }
```

**Step 5: Get section counts**

Add count logic in DataManagementPage (reads from stores):

```tsx
const { boreholes } = useBoreholeStore();
const { faultPlanes } = useFaultPlaneStore();
const { attitudes } = useAttitudeStore();
const { terrainFiles } = useTerrainStore();
const { waterLevels } = useWaterLevelStore();
const boreholeCount = boreholes.length;
// etc.
```

For imagery, geophysics, geology models — read counts from `useUploadStore`:

```tsx
const imageryCount = useUploadStore(s => s.imageryFiles.length);
const geophysicsCount = useUploadStore(s => s.geophysicsFiles.length);
const geologyModelCount = useUploadStore(s => s.geologyModels.length);
```

**Step 6: Verify**

```bash
npx tsc --noEmit
npx vite build
```

Browser → 每個 section 左側有彩色 border → 點擊收合 toggle → section 隱藏，顯示精簡 collapsed bar → 再點展開

**Step 7: Commit**

```bash
git add src/pages/DataManagementPage.tsx
git commit -m "feat: add collapsible sections with group color bands"
```

---

### Task 6: Add Floating TOC with Scroll Spy

**Files:**
- Create: `src/components/data/DataPageTOC.tsx`
- Modify: `src/pages/DataManagementPage.tsx` (layout + render TOC)

**Step 1: Create DataPageTOC component**

```tsx
/**
 * DataPageTOC
 * 浮動導航目錄 with scroll spy
 */

import React, { useState, useEffect } from 'react';
import {
    Settings, Palette, Layers, GitBranch, Compass,
    Image as ImageIcon, Mountain, Droplets, Box, Activity,
} from 'lucide-react';

interface TocItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    group: string;
    count?: number;
}

interface DataPageTOCProps {
    items: TocItem[];
    collapsedSections: Set<string>;
    onToggleSection: (id: string) => void;
}

export const DataPageTOC: React.FC<DataPageTOCProps> = ({ items, collapsedSections, onToggleSection }) => {
    const [activeId, setActiveId] = useState<string>('');

    // Scroll spy with IntersectionObserver
    useEffect(() => {
        const observers: IntersectionObserver[] = [];

        items.forEach(item => {
            const el = document.getElementById(item.id);
            if (!el) return;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setActiveId(item.id);
                    }
                },
                { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
            );

            observer.observe(el);
            observers.push(observer);
        });

        return () => observers.forEach(o => o.disconnect());
    }, [items]);

    const handleClick = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // If section is collapsed, expand it
        if (collapsedSections.has(id.replace('section-', ''))) {
            onToggleSection(id.replace('section-', ''));
        }
    };

    // Group items
    const groups = [
        { key: 'setup', label: '基礎設定', color: 'var(--group-setup)' },
        { key: 'geology', label: '地質資料', color: 'var(--group-geology)' },
        { key: 'surface', label: '地表資料', color: 'var(--group-surface)' },
        { key: 'model', label: '模型資料', color: 'var(--group-model)' },
    ];

    return (
        <nav className="dm-toc">
            {groups.map(group => {
                const groupItems = items.filter(i => i.group === group.key);
                if (groupItems.length === 0) return null;

                return (
                    <div key={group.key} className="dm-toc-group">
                        <div className="dm-toc-group-label" style={{ color: group.color }}>
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '2px',
                                background: group.color, marginRight: '8px',
                            }} />
                            {group.label}
                        </div>
                        {groupItems.map(item => (
                            <button
                                key={item.id}
                                className={`dm-toc-item ${activeId === item.id ? 'active' : ''}`}
                                onClick={() => handleClick(item.id)}
                            >
                                <span className="dm-toc-item-icon">{item.icon}</span>
                                <span className="dm-toc-item-label">{item.label}</span>
                                {item.count !== undefined && (
                                    <span className="dm-toc-item-count dm-mono">{item.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                );
            })}
        </nav>
    );
};
```

**Step 2: Add TOC CSS to DataManagementPage**

```css
/* Layout: TOC + Content */
.dm-layout {
    display: flex;
    max-width: 1440px;
    margin: 0 auto;
    padding: 32px 24px;
    gap: 32px;
}

.dm-toc {
    position: sticky;
    top: 80px;
    width: 200px;
    flex-shrink: 0;
    align-self: flex-start;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
}

.dm-toc-group {
    margin-bottom: 20px;
}

.dm-toc-group-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 12px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
}

.dm-toc-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: var(--gray-500);
    text-align: left;
    transition: all 0.15s;
    font-family: var(--font-sans);
}

.dm-toc-item:hover {
    background: var(--gray-100);
    color: var(--text-primary);
}

.dm-toc-item.active {
    background: var(--gray-100);
    color: var(--text-primary);
    font-weight: 600;
}

.dm-toc-item-icon {
    display: flex;
    align-items: center;
    color: inherit;
    opacity: 0.6;
}

.dm-toc-item-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dm-toc-item-count {
    font-size: 11px;
    color: var(--gray-400);
    min-width: 20px;
    text-align: right;
}

.dm-content {
    flex: 1;
    min-width: 0;
}

/* RWD: hide TOC below 1400px */
@media (max-width: 1400px) {
    .dm-toc { display: none; }
    .dm-layout { max-width: 1200px; }
}
```

**Step 3: Update DataManagementPage layout**

Replace `<main className="dm-content">` with:

```tsx
import { DataPageTOC } from '../components/data/DataPageTOC';

// Define TOC items
const tocItems = [
    { id: 'section-settings', label: '專案設定', icon: <Settings size={14} />, group: 'setup' },
    { id: 'section-lithology', label: '岩性', icon: <Palette size={14} />, group: 'setup', count: lithologies.length },
    { id: 'section-borehole', label: '鑽孔', icon: <Layers size={14} />, group: 'geology', count: boreholeCount },
    { id: 'section-faultplane', label: '斷層面', icon: <GitBranch size={14} />, group: 'geology', count: faultPlaneCount },
    { id: 'section-attitude', label: '位態', icon: <Compass size={14} />, group: 'geology', count: attitudeCount },
    { id: 'section-imagery', label: '航照圖', icon: <ImageIcon size={14} />, group: 'surface', count: imageryCount },
    { id: 'section-terrain', label: '地形', icon: <Mountain size={14} />, group: 'surface', count: terrainCount },
    { id: 'section-waterlevel', label: '地下水位', icon: <Droplets size={14} />, group: 'surface', count: waterLevelCount },
    { id: 'section-geologymodel', label: '3D 模型', icon: <Box size={14} />, group: 'model', count: geologyModelCount },
    { id: 'section-geophysics', label: '地球物理', icon: <Activity size={14} />, group: 'model', count: geophysicsCount },
];

// In JSX:
<div className="dm-layout">
    <DataPageTOC
        items={tocItems}
        collapsedSections={collapsedSections}
        onToggleSection={toggleSection}
    />
    <main className="dm-content">
        {/* All sections with id anchors... */}
    </main>
</div>
```

**Step 4: Ensure each section wrapper has the correct `id`**

Each `dm-section-wrapper` div must have `id="section-xxx"` matching the TOC items.

**Step 5: Verify**

```bash
npx tsc --noEmit
npx vite build
```

Browser (>1400px width):
- 左側出現 TOC
- 捲動時 TOC 高亮跟隨當前 section
- 點擊 TOC 項目 smooth scroll 到對應 section
- <1400px 時 TOC 隱藏

**Step 6: Commit**

```bash
git add src/components/data/DataPageTOC.tsx src/pages/DataManagementPage.tsx
git commit -m "feat: add floating TOC with scroll spy and section counts"
```

---

### Task 7: Apply Group Color Bands to Sub-components

**Files:**
- Modify: `src/pages/DataManagementPage.tsx`

**Step 1: Apply `data-group` attribute to section wrappers**

The `dm-section-wrapper[data-group="xxx"] .dm-section` CSS rule (from Task 5) adds `border-left` to section cards. Ensure all section wrappers have the correct `data-group`:

```tsx
<div id="section-settings" className="dm-section-wrapper" data-group="setup">
    {/* Project Settings section */}
</div>

<div id="section-lithology" className="dm-section-wrapper" data-group="setup">
    <LithologySection />
</div>

<div id="section-borehole" className="dm-section-wrapper" data-group="geology" ...>
    <BoreholeUploadSection />
</div>

{/* ... same for all sections ... */}
```

**Step 2: Apply mono font to coordinate/numeric values**

In the Project Settings section, add `dm-mono` class to the coordinate input fields:

```tsx
<input type="number" className="dm-form-input dm-mono" value={originForm.x} ... />
```

This step is also needed in sub-components (ImageryUploadSection, GeophysicsUploadSection) for coordinate inputs. Add `dm-mono` class to:
- TWD97 coordinate inputs (x1, y1, z1, x2, y2, z2)
- Coordinate display values in detail modals
- File size display

**Step 3: Verify**

```bash
npx tsc --noEmit
npx vite build
```

Browser → 每個 section 左側有正確的群組色帶 → 座標值使用 monospace 字體

**Step 4: Commit**

```bash
git add src/pages/DataManagementPage.tsx src/components/data/ImageryUploadSection.tsx src/components/data/GeophysicsUploadSection.tsx src/components/data/GeologyModelSection.tsx
git commit -m "style: apply group color bands and mono font to data sections"
```

---

### Task 8: Final Polish + Verification

**Files:**
- Modify: `src/pages/DataManagementPage.tsx` (clean up unused imports/state)

**Step 1: Clean up DataManagementPage imports**

Remove imports that were moved to sub-components:
- `ImageIcon`, `Box`, `Activity` (if only used in moved sections)
- `GeophysicsFile`, `GeophysicsMetadata`, `GeologyModelFile`, `GeologyModelMetadata` from uploadStore
- `twd97ToWorld`, `useCameraStore`

Verify the remaining `useUploadStore` destructuring only includes what the page still uses (should be minimal — just `isUploading`, `uploadProgress`, `uploadError`, `clearError` if still needed, or remove entirely if all upload logic moved to sub-components).

**Step 2: Verify final line count**

DataManagementPage should now be roughly:
- CSS variables + styles: ~450 lines
- Component logic (header, TOC, collapse state, toast): ~100 lines
- JSX (layout, wrappers): ~100 lines
- **Total: ~650 lines** (down from 1894)

**Step 3: Full verification**

```bash
npx tsc --noEmit
npx vite build
```

Browser checklist:
- [ ] 字體：DM Sans 用於所有 UI 文字
- [ ] 字體：JetBrains Mono 用於座標值、檔案大小
- [ ] 背景色：稍深的 `#f1f5f9`
- [ ] TOC：>1400px 時左側出現
- [ ] TOC：scroll spy 正確高亮
- [ ] TOC：顯示各 section 筆數
- [ ] TOC：<1400px 時隱藏
- [ ] 色帶：基礎設定 = slate
- [ ] 色帶：地質資料 = amber
- [ ] 色帶：地表資料 = cyan
- [ ] 色帶：模型資料 = violet
- [ ] 收合：每個 section 可收合/展開
- [ ] 收合：collapsed bar 顯示標題 + 筆數
- [ ] 功能：航照圖上傳/刪除/詳情
- [ ] 功能：3D 地質模型上傳/轉換/啟用/刪除
- [ ] 功能：地球物理上傳/刪除/詳情/3D 定位
- [ ] 功能：鑽孔/斷層面/位態/地形/地下水位（未修改，確認不受影響）

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: complete DataManagementPage UI redesign — TOC, collapsible sections, color bands"
```

---

## File Summary

| Action | File | Description |
|--------|------|-------------|
| Modify | `index.html` | Add Google Fonts |
| Modify | `src/pages/DataManagementPage.tsx` | CSS vars, layout, TOC, collapse, cleanup |
| Create | `src/components/data/ImageryUploadSection.tsx` | 航照圖管理 |
| Create | `src/components/data/GeologyModelSection.tsx` | 3D 地質模型管理 |
| Create | `src/components/data/GeophysicsUploadSection.tsx` | 地球物理探查管理 |
| Create | `src/components/data/DataPageTOC.tsx` | 浮動 TOC + scroll spy |

## Dependency Graph

```
Task 1 (fonts/vars) → independent, do first
Task 2 (imagery) → depends on Task 1
Task 3 (geology model) → depends on Task 1
Task 4 (geophysics) → depends on Task 1
Task 5 (collapsible) → depends on Tasks 2-4
Task 6 (TOC) → depends on Task 5
Task 7 (color bands) → depends on Task 5
Task 8 (cleanup) → depends on all
```

Tasks 2, 3, 4 are independent and can run in parallel after Task 1.
Tasks 5, 6, 7 can partially overlap but have shared CSS in DataManagementPage.
