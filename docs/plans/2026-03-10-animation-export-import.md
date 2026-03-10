# Animation Export/Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add export/import buttons to AnimationTimeline so users can save animation settings as JSON and apply them to other models with automatic position offset alignment.

**Architecture:** Pure frontend — no backend changes. Export uses `Blob` + `URL.createObjectURL` to download JSON. Import reads JSON via `FileReader`, validates, computes position offset, then calls existing `createAnimation` store action (which POSTs to existing API). Two files modified: types + AnimationTimeline component.

**Tech Stack:** React, TypeScript, Zustand, existing `createAnimation` API

---

### Task 1: Add `AnimationExportFile` type

**Files:**
- Modify: `src/types/facility.ts:94` (after existing interfaces)

**Step 1: Add the interface**

Append after the `Transform` interface at line 100:

```typescript
/** 動畫匯出 JSON 格式 (version 1) */
export interface AnimationExportData {
    name: string;
    type: 'keyframe';
    trigger: 'auto' | 'manual';
    loop: boolean;
    duration: number;
    easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
    pathMode: 'linear' | 'catmullrom';
    autoOrient: boolean;
    keyframes: AnimationKeyframe[];
}

export interface AnimationExportFile {
    version: 1;
    exportedAt: string;
    sourceModelName: string;
    type: 'single' | 'batch';
    animations: AnimationExportData[];
}
```

**Step 2: Verify build**

Run: `cd /Users/allen/Desktop/LLRWD\ DigitalTwin\ Platform && npx tsc --noEmit`
Expected: No new errors (existing errors in FacilityModelItem/vite.config are pre-existing)

**Step 3: Commit**

```bash
git add src/types/facility.ts
git commit -m "feat(types): add AnimationExportFile interface for animation export/import"
```

---

### Task 2: Add export functions to AnimationTimeline

**Files:**
- Modify: `src/components/facility/AnimationTimeline.tsx`

**Step 1: Add import for the new type**

At line 8, update the import:

```typescript
import type { FacilityAnimation, AnimationKeyframe, AnimationExportFile, AnimationExportData } from '@/types/facility';
```

**Step 2: Add helper functions before the main component (before line 324)**

Insert these utility functions after the `ModelTrackRow` component and before `export function AnimationTimeline()`:

```typescript
// ── Export/Import Helpers ────────────────────────────────────────────────────

/** Strip DB-specific fields from an animation for export */
function toExportData(anim: FacilityAnimation): AnimationExportData {
    return {
        name: anim.name,
        type: anim.type as 'keyframe',
        trigger: anim.trigger,
        loop: anim.loop,
        duration: anim.duration,
        easing: anim.easing,
        pathMode: anim.pathMode,
        autoOrient: anim.autoOrient,
        keyframes: anim.keyframes,
    };
}

/** Trigger browser download of a JSON file */
function downloadJson(data: AnimationExportFile, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Sanitize string for safe filename (replace non-alphanumeric/CJK with dash) */
function safeFilename(s: string): string {
    return s.replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf-]/g, '-').replace(/-+/g, '-');
}

/** Apply position offset to all keyframes that have a position field */
function applyPositionOffset(
    keyframes: AnimationKeyframe[],
    offset: { x: number; y: number; z: number },
): AnimationKeyframe[] {
    return keyframes.map(kf => {
        if (!kf.position) return kf;
        return {
            ...kf,
            position: {
                x: kf.position.x + offset.x,
                y: kf.position.y + offset.y,
                z: kf.position.z + offset.z,
            },
        };
    });
}

/** Validate an imported JSON object. Returns error message or null if valid. */
function validateImport(data: unknown): string | null {
    if (!data || typeof data !== 'object') return '檔案格式不正確';
    const obj = data as Record<string, unknown>;
    if (obj.version !== 1) return '不支援的版本格式';
    if (!Array.isArray(obj.animations) || obj.animations.length === 0) return '檔案中沒有動畫資料';
    return null;
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/components/facility/AnimationTimeline.tsx
git commit -m "feat(animation): add export/import helper functions"
```

---

### Task 3: Add export buttons to the Animation Properties Panel

**Files:**
- Modify: `src/components/facility/AnimationTimeline.tsx`

**Step 1: Add Lucide icons import**

Update line 6 to add `Download` and `Upload` icons:

```typescript
import { Play, Pause, Square, Plus, Trash2, RefreshCw, Download, Upload } from 'lucide-react';
```

**Step 2: Add export handler functions inside `AnimationTimeline` component**

Insert after the `handleDeleteKeyframe` function (around line 445), before the early return for no selected models:

```typescript
    // ── Export ──
    const handleExportSingle = useCallback(() => {
        if (!selectedAnim || !focusedModel) return;
        const exportFile: AnimationExportFile = {
            version: 1,
            exportedAt: new Date().toISOString(),
            sourceModelName: focusedModel.name,
            type: 'single',
            animations: [toExportData(selectedAnim)],
        };
        downloadJson(exportFile, `${safeFilename(focusedModel.name)}-${safeFilename(selectedAnim.name)}-animation.json`);
    }, [selectedAnim, focusedModel]);

    const handleExportAll = useCallback(() => {
        if (!focusedModel) return;
        const modelAnims = animations.filter(a => a.modelId === focusedModel.id && a.type === 'keyframe');
        if (modelAnims.length === 0) return;
        const exportFile: AnimationExportFile = {
            version: 1,
            exportedAt: new Date().toISOString(),
            sourceModelName: focusedModel.name,
            type: 'batch',
            animations: modelAnims.map(toExportData),
        };
        downloadJson(exportFile, `${safeFilename(focusedModel.name)}-all-animations.json`);
    }, [focusedModel, animations]);
```

**Step 3: Add export buttons to the properties panel**

In the properties panel (the `<div>` containing animation properties), find the delete button (the `<button>` with `<Trash2 size={12} />` around line 623-629). Replace that single button with a button group:

Replace:
```tsx
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteAnimation(selectedAnim.id); }}
                            style={{ ...iconBtnStyle, color: '#94a3b8', marginLeft: 'auto' }}
                            title="刪除此動畫"
                        >
                            <Trash2 size={12} />
                        </button>
```

With:
```tsx
                        <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
                            <button onClick={handleExportSingle} style={{ ...iconBtnStyle, color: '#94a3b8' }} title="匯出此動畫">
                                <Download size={12} />
                            </button>
                            <button onClick={handleExportAll} style={{ ...iconBtnStyle, color: '#94a3b8' }} title="匯出全部動畫">
                                <Download size={12} /><Plus size={8} style={{ marginLeft: -4 }} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteAnimation(selectedAnim.id); }}
                                style={{ ...iconBtnStyle, color: '#94a3b8' }}
                                title="刪除此動畫"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/components/facility/AnimationTimeline.tsx
git commit -m "feat(animation): add export single/all buttons to properties panel"
```

---

### Task 4: Add import button and logic

**Files:**
- Modify: `src/components/facility/AnimationTimeline.tsx`

**Step 1: Add hidden file input ref and import handler**

Inside `AnimationTimeline` component, add after the export handlers:

```typescript
    // ── Import ──
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = useCallback(() => {
        if (selectedModelIds.length === 0) {
            alert('請先選擇目標模型');
            return;
        }
        fileInputRef.current?.click();
    }, [selectedModelIds]);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset input so same file can be re-selected
        e.target.value = '';

        try {
            const text = await file.text();
            let data: unknown;
            try {
                data = JSON.parse(text);
            } catch {
                alert('檔案格式不正確');
                return;
            }

            const error = validateImport(data);
            if (error) { alert(error); return; }

            const importFile = data as AnimationExportFile;
            const keyframeAnims = importFile.animations.filter(a => a.type === 'keyframe');
            if (keyframeAnims.length === 0) {
                alert('檔案中沒有可匯入的 keyframe 動畫');
                return;
            }

            let successCount = 0;
            let failCount = 0;

            for (const modelId of selectedModelIds) {
                const model = models.find(m => m.id === modelId);
                if (!model) continue;

                // Model's current position for offset calculation
                const modelPos = model.position ?? { x: 0, y: 0, z: 0 };

                for (const animData of keyframeAnims) {
                    // Find anchor keyframe (first with position)
                    const anchor = animData.keyframes.find(kf => kf.position);
                    const offset = anchor?.position
                        ? { x: modelPos.x - anchor.position.x, y: modelPos.y - anchor.position.y, z: modelPos.z - anchor.position.z }
                        : { x: 0, y: 0, z: 0 };

                    const offsetKeyframes = applyPositionOffset(animData.keyframes, offset);

                    try {
                        await createAnimation(modelId, {
                            name: animData.name,
                            type: animData.type,
                            trigger: animData.trigger,
                            loop: animData.loop,
                            duration: animData.duration,
                            easing: animData.easing,
                            pathMode: animData.pathMode,
                            autoOrient: animData.autoOrient,
                            keyframes: offsetKeyframes,
                        });
                        successCount++;
                    } catch {
                        failCount++;
                    }
                }
            }

            const modelCount = selectedModelIds.length;
            if (failCount === 0) {
                alert(`已匯入 ${successCount} 個動畫到 ${modelCount} 個模型`);
            } else {
                alert(`已匯入 ${successCount} 個動畫，${failCount} 個失敗`);
            }
        } catch {
            alert('匯入過程發生錯誤');
        }
    }, [selectedModelIds, models, createAnimation]);
```

**Step 2: Add hidden file input element**

At the very end of the component's return JSX (just before the closing `</div>` of `panelStyle`), add:

```tsx
            {/* Hidden file input for import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
```

**Step 3: Add import button to the header**

In the header section, find the existing `+` button (the `<button>` that calls `setShowNewForm(true)` around line 503-511). Add an import button right after it:

After the existing `+` button block:
```tsx
                {focusedModelId && (
                    <button
                        onClick={() => setShowNewForm(true)}
                        style={{ ...iconBtnStyle, marginLeft: selectedAnim ? 0 : 'auto' }}
                        title="為焦點模型新增動畫"
                    >
                        <Plus size={14} />
                    </button>
                )}
```

Add this import button:
```tsx
                <button
                    onClick={handleImportClick}
                    style={{ ...iconBtnStyle, marginLeft: (!focusedModelId && !selectedAnim) ? 'auto' : 0 }}
                    title="從 JSON 匯入動畫"
                >
                    <Upload size={14} />
                </button>
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/components/facility/AnimationTimeline.tsx
git commit -m "feat(animation): add import button with offset alignment and multi-model support"
```

---

### Task 5: Final verification and combined commit

**Step 1: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No new errors beyond pre-existing ones (FacilityModelItem useRef, vite.config)

**Step 2: Verify Vite build**

Run: `npx vite build`
Expected: Build succeeds

**Step 3: Manual browser test checklist**

1. Enter facility scene, select a model, enter animation mode
2. Create a keyframe animation with 2-3 keyframes
3. Click Download icon in properties panel → JSON file downloads with correct content
4. Click Download+Plus icon → exports all keyframe animations for that model
5. Select a different model (or CMD+Click to multi-select)
6. Click Upload icon in header → file picker opens
7. Select the exported JSON → animations created on target model(s)
8. Verify keyframe positions are offset-aligned to model position
9. Verify playback works correctly on imported animations
10. Test error cases: select no model then import, import invalid JSON

**Step 4: Update NextSteps.md**

Mark A5 as completed in NextSteps.md if all tests pass.
