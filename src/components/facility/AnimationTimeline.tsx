/**
 * AnimationTimeline — 多軌動畫時間軸面板
 * 底部面板：多模型分軌顯示、播放控制、關鍵幀編輯
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Square, Plus, Trash2, RefreshCw, Download, Upload } from 'lucide-react';
import { useFacilityStore, getModelGroupRef } from '@/stores/facilityStore';
import type { FacilityAnimation, AnimationKeyframe, AnimationExportFile, AnimationExportData } from '@/types/facility';

const EASING_OPTIONS = [
    { value: 'linear', label: '線性' },
    { value: 'easeIn', label: '漸入' },
    { value: 'easeOut', label: '漸出' },
    { value: 'easeInOut', label: '漸入漸出' },
] as const;

const TRIGGER_OPTIONS = [
    { value: 'auto', label: '自動播放' },
    { value: 'manual', label: '手動觸發' },
] as const;

// ── Timeline Track (視覺時間軸) ──────────────────────────────────────────────

function TimelineTrack({ animation, isFocusedTrack }: { animation: FacilityAnimation; isFocusedTrack: boolean }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const {
        playbackTime,
        playbackState,
        setPlaybackTime,
        setPlaybackState,
        selectedAnimationId,
        editingKeyframeIndex,
        setEditingKeyframeIndex,
    } = useFacilityStore();

    const isActive = selectedAnimationId === animation.id;
    const duration = animation.duration;

    // ── Keyframe 拖曳狀態 ──
    const draggingRef = useRef<{ kfIndex: number; startX: number; didDrag: boolean } | null>(null);
    const [dragTime, setDragTime] = useState<{ index: number; time: number } | null>(null);
    const updateAnimation = useFacilityStore(state => state.updateAnimation);
    const justFinishedDragRef = useRef(false);

    const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!trackRef.current || !isActive) return;
        if (justFinishedDragRef.current) { justFinishedDragRef.current = false; return; }
        const rect = trackRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        const time = ratio * duration;
        setPlaybackTime(time);
        if (playbackState !== 'paused') {
            setPlaybackState('paused');
        }
    }, [isActive, duration, playbackState, setPlaybackTime, setPlaybackState]);

    // pointer down: 記錄起始位置，還不算拖曳
    const handleKfPointerDown = useCallback((e: React.PointerEvent, kfIndex: number) => {
        if (!isActive || !trackRef.current) return;
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        draggingRef.current = { kfIndex, startX: e.clientX, didDrag: false };
    }, [isActive]);

    // pointer move: 超過 3px 閾值才啟動拖曳
    const handleKfPointerMove = useCallback((e: React.PointerEvent) => {
        if (!draggingRef.current || !trackRef.current) return;
        const drag = draggingRef.current;
        if (!drag.didDrag && Math.abs(e.clientX - drag.startX) < 3) return;
        drag.didDrag = true;

        const { kfIndex } = drag;
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        let newTime = ratio * duration;

        const kfs = animation.keyframes;
        const MIN_GAP = 0.05;
        const minTime = kfIndex > 0 ? kfs[kfIndex - 1].time + MIN_GAP : 0;
        const maxTime = kfIndex < kfs.length - 1 ? kfs[kfIndex + 1].time - MIN_GAP : duration;
        newTime = Math.round(Math.max(minTime, Math.min(maxTime, newTime)) * 10) / 10;
        newTime = Math.max(minTime, Math.min(maxTime, newTime));

        setDragTime({ index: kfIndex, time: newTime });
        setPlaybackTime(newTime);
        if (playbackState !== 'paused') setPlaybackState('paused');
    }, [animation.keyframes, duration, playbackState, setPlaybackTime, setPlaybackState]);

    // pointer up: 拖曳 → 寫 API；沒拖曳 → 選取 keyframe
    const handleKfPointerUp = useCallback((e: React.PointerEvent) => {
        if (!draggingRef.current || !trackRef.current) return;
        const { kfIndex, didDrag } = draggingRef.current;

        if (didDrag) {
            // 完成拖曳 → 持久化
            const rect = trackRef.current.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            let newTime = ratio * duration;
            const kfs = animation.keyframes;
            const MIN_GAP = 0.05;
            const minTime = kfIndex > 0 ? kfs[kfIndex - 1].time + MIN_GAP : 0;
            const maxTime = kfIndex < kfs.length - 1 ? kfs[kfIndex + 1].time - MIN_GAP : duration;
            newTime = Math.round(Math.max(minTime, Math.min(maxTime, newTime)) * 10) / 10;
            newTime = Math.max(minTime, Math.min(maxTime, newTime));

            const updatedKfs = [...kfs];
            updatedKfs[kfIndex] = { ...updatedKfs[kfIndex], time: newTime };
            updateAnimation(animation.id, { keyframes: updatedKfs });
            setPlaybackTime(newTime);
            setEditingKeyframeIndex(kfIndex);
            justFinishedDragRef.current = true;
        } else {
            // 沒拖曳 → 純點擊選取/取消選取
            const isEditingThis = editingKeyframeIndex === kfIndex;
            setEditingKeyframeIndex(isEditingThis ? null : kfIndex);
            setPlaybackTime(animation.keyframes[kfIndex].time);
            if (playbackState !== 'paused') setPlaybackState('paused');
        }

        setDragTime(null);
        draggingRef.current = null;
    }, [animation.id, animation.keyframes, duration, editingKeyframeIndex, playbackState, updateAnimation, setPlaybackTime, setPlaybackState, setEditingKeyframeIndex]);

    const scrubberLeft = isActive && duration > 0
        ? `${(playbackTime / duration) * 100}%`
        : '0%';

    return (
        <div
            ref={trackRef}
            onClick={handleTrackClick}
            style={{
                position: 'relative',
                height: 28,
                background: isActive ? '#f1f5f9' : isFocusedTrack ? '#f8fafc' : '#fafafa',
                borderRadius: 4,
                border: isActive ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                cursor: isActive ? 'pointer' : 'default',
                overflow: 'visible',
                opacity: isFocusedTrack ? 1 : 0.5,
            }}
        >
            {/* 時間刻度 */}
            {isActive && duration > 0 && Array.from({ length: Math.min(11, Math.floor(duration) + 1) }).map((_, i) => {
                const t = (i / Math.min(10, Math.floor(duration))) * duration;
                const left = (t / duration) * 100;
                return (
                    <div key={i} style={{
                        position: 'absolute',
                        left: `${left}%`,
                        bottom: 0,
                        width: 1,
                        height: 5,
                        background: '#cbd5e1',
                    }} />
                );
            })}

            {/* 關鍵幀標記（可拖曳） */}
            {animation.keyframes.map((kf, i) => {
                const displayTime = (dragTime && dragTime.index === i) ? dragTime.time : kf.time;
                const left = duration > 0 ? (displayTime / duration) * 100 : 0;
                const isEditingThis = isActive && editingKeyframeIndex === i;
                return (
                    <div
                        key={i}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => handleKfPointerDown(e, i)}
                        onPointerMove={handleKfPointerMove}
                        onPointerUp={handleKfPointerUp}
                        title={`${displayTime.toFixed(1)}s`}
                        style={{
                            position: 'absolute',
                            left: `${left}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%) rotate(45deg)',
                            width: 10,
                            height: 10,
                            background: isEditingThis ? '#7c3aed' : isFocusedTrack ? '#2563eb' : '#94a3b8',
                            border: isEditingThis ? '2px solid #a78bfa' : '1.5px solid ' + (isFocusedTrack ? '#93c5fd' : '#cbd5e1'),
                            borderRadius: 2,
                            cursor: isActive ? 'grab' : 'default',
                            zIndex: 5,
                            touchAction: 'none',
                        }}
                    />
                );
            })}

            {/* Scrubber */}
            {isActive && (
                <div style={{
                    position: 'absolute',
                    left: scrubberLeft,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: '#ef4444',
                    zIndex: 10,
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        position: 'absolute',
                        top: -3,
                        left: -3,
                        width: 8,
                        height: 8,
                        background: '#ef4444',
                        borderRadius: '50%',
                    }} />
                </div>
            )}
        </div>
    );
}

// ── 單一模型軌道列 ──────────────────────────────────────────────────────────

function ModelTrackRow({ modelId, modelName, isFocused, onFocus }: {
    modelId: string;
    modelName: string;
    isFocused: boolean;
    onFocus: () => void;
}) {
    const animations = useFacilityStore(state => state.animations);
    const selectedAnimationId = useFacilityStore(state => state.selectedAnimationId);
    const selectAnimation = useFacilityStore(state => state.selectAnimation);
    const selectedAnimPerModel = useFacilityStore(state => state.selectedAnimPerModel);

    const modelAnims = useMemo(() =>
        animations.filter(a => a.modelId === modelId),
    [animations, modelId]);

    // 焦點切換時自動恢復記憶的動畫，或選第一個
    useEffect(() => {
        if (!isFocused || modelAnims.length === 0) return;
        const remembered = selectedAnimPerModel[modelId];
        if (remembered && modelAnims.some(a => a.id === remembered)) {
            if (selectedAnimationId !== remembered) selectAnimation(remembered);
        } else if (!selectedAnimationId || !modelAnims.some(a => a.id === selectedAnimationId)) {
            selectAnimation(modelAnims[0].id);
        }
    }, [isFocused, modelId, modelAnims.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // 焦點模型的選取動畫
    const activeAnim = useMemo(() =>
        modelAnims.find(a => a.id === selectedAnimationId),
    [modelAnims, selectedAnimationId]);

    // 非焦點模型：顯示第一個動畫的 track（或空）
    const displayAnim = isFocused ? activeAnim : modelAnims[0];

    return (
        <div
            onClick={onFocus}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                background: isFocused ? '#f0f9ff' : 'transparent',
                borderBottom: '1px solid #f1f5f9',
                cursor: isFocused ? 'default' : 'pointer',
                borderLeft: isFocused ? '3px solid #2563eb' : '3px solid transparent',
                transition: 'all 0.15s',
            }}
        >
            {/* 模型名稱 */}
            <span style={{
                width: 90,
                minWidth: 90,
                fontSize: 11,
                fontWeight: isFocused ? 600 : 400,
                color: isFocused ? '#1e40af' : '#64748b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }} title={modelName}>
                {modelName}
            </span>

            {/* 動畫選擇（焦點模型） */}
            {isFocused && modelAnims.length > 0 && (
                <select
                    value={selectedAnimationId ?? ''}
                    onChange={e => selectAnimation(e.target.value || null)}
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: 100, minWidth: 100, padding: '2px 4px',
                        border: '1px solid #e2e8f0', borderRadius: 4,
                        fontSize: 10, color: '#334155', background: '#fff',
                    }}
                >
                    <option value="">-- 選擇動畫 --</option>
                    {modelAnims.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
            )}

            {/* 非焦點：顯示動畫數量 */}
            {!isFocused && (
                <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 100 }}>
                    {modelAnims.length > 0 ? `${modelAnims.length} 個動畫` : '無動畫'}
                </span>
            )}

            {/* Timeline track */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {displayAnim ? (
                    <TimelineTrack animation={displayAnim} isFocusedTrack={isFocused} />
                ) : (
                    <div style={{
                        height: 28, borderRadius: 4,
                        background: '#fafafa', border: '1px dashed #e2e8f0',
                    }} />
                )}
            </div>
        </div>
    );
}

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

/** Sanitize string for safe filename */
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

// ── Main Component ───────────────────────────────────────────────────────────

export function AnimationTimeline() {
    const {
        selectedModelIds,
        focusedModelId,
        setFocusedModel,
        animations,
        selectedAnimationId,
        playbackState,
        playbackTime,
        editingKeyframeIndex,
        selectAnimation,
        createAnimation,
        updateAnimation,
        deleteAnimation,
        fetchAnimationsForModels,
        setPlaybackState,
        setPlaybackTime,
        setEditingKeyframeIndex,
        addKeyframe,
        updateKeyframe,
        deleteKeyframe,
        models,
    } = useFacilityStore();

    const [showNewForm, setShowNewForm] = useState(false);
    const [newName, setNewName] = useState('');

    const focusedModel = useMemo(() =>
        models.find(m => m.id === focusedModelId),
    [models, focusedModelId]);

    // 選取的模型清單（帶名稱）
    const selectedModels = useMemo(() =>
        selectedModelIds
            .map(id => models.find(m => m.id === id))
            .filter(Boolean) as typeof models,
    [selectedModelIds, models]);

    // 載入所有選取模型的動畫
    useEffect(() => {
        if (selectedModelIds.length > 0) {
            fetchAnimationsForModels(selectedModelIds);
        }
    }, [selectedModelIds, fetchAnimationsForModels]);

    const selectedAnim = useMemo(() =>
        animations.find(a => a.id === selectedAnimationId),
    [animations, selectedAnimationId]);

    // 動畫名稱 local buffer（避免 IME 中文輸入被打斷）
    const [editingAnimName, setEditingAnimName] = useState('');
    useEffect(() => {
        setEditingAnimName(selectedAnim?.name ?? '');
    }, [selectedAnim?.id, selectedAnim?.name]);

    // 焦點模型的動畫
    const focusedModelAnims = useMemo(() =>
        animations.filter(a => a.modelId === focusedModelId),
    [animations, focusedModelId]);

    const handleCreateAnimation = useCallback(async () => {
        if (!focusedModelId) return;
        const name = newName.trim() || '未命名動畫';
        const anim = await createAnimation(focusedModelId, { name });
        selectAnimation(anim.id);
        setNewName('');
        setShowNewForm(false);
    }, [focusedModelId, newName, createAnimation, selectAnimation]);

    // 從 3D 場景讀取焦點模型即時 transform
    const RAD2DEG = 180 / Math.PI;
    const readLiveTransform = useCallback((): Pick<AnimationKeyframe, 'position' | 'rotation' | 'scale'> | null => {
        if (!focusedModelId) return null;
        const group = getModelGroupRef(focusedModelId);
        if (group) {
            return {
                position: { x: group.position.x, y: group.position.y, z: group.position.z },
                rotation: { x: group.rotation.x * RAD2DEG, y: group.rotation.y * RAD2DEG, z: group.rotation.z * RAD2DEG },
                scale: { x: group.scale.x, y: group.scale.y, z: group.scale.z },
            };
        }
        if (focusedModel) {
            return {
                position: { ...focusedModel.position },
                rotation: { ...focusedModel.rotation },
                scale: { ...focusedModel.scale },
            };
        }
        return null;
    }, [focusedModelId, focusedModel]);

    const handleAddKeyframe = useCallback(async () => {
        if (!selectedAnim) return;
        const transform = readLiveTransform();
        if (!transform) return;
        const kf: AnimationKeyframe = {
            time: playbackTime,
            ...transform,
        };
        await addKeyframe(selectedAnim.id, kf);
    }, [selectedAnim, playbackTime, addKeyframe, readLiveTransform]);

    const handleUpdateKeyframe = useCallback(async () => {
        if (!selectedAnim || editingKeyframeIndex === null) return;
        const transform = readLiveTransform();
        if (!transform) return;
        const existingKf = selectedAnim.keyframes[editingKeyframeIndex];
        if (!existingKf) return;
        const kf: AnimationKeyframe = {
            time: existingKf.time,
            ...transform,
        };
        await updateKeyframe(selectedAnim.id, editingKeyframeIndex, kf);
    }, [selectedAnim, editingKeyframeIndex, updateKeyframe, readLiveTransform]);

    const handleDeleteKeyframe = useCallback(async () => {
        if (!selectedAnim || editingKeyframeIndex === null) return;
        await deleteKeyframe(selectedAnim.id, editingKeyframeIndex);
        setEditingKeyframeIndex(null);
    }, [selectedAnim, editingKeyframeIndex, deleteKeyframe, setEditingKeyframeIndex]);

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

                const modelPos = model.position ?? { x: 0, y: 0, z: 0 };

                for (const animData of keyframeAnims) {
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

    const handlePlay = useCallback(() => {
        if (playbackState === 'playing') {
            setPlaybackState('paused');
        } else {
            setPlaybackState('playing');
        }
    }, [playbackState, setPlaybackState]);

    const handleStop = useCallback(() => {
        setPlaybackState('stopped');
        setPlaybackTime(0);
    }, [setPlaybackState, setPlaybackTime]);

    // 無選取模型
    if (selectedModelIds.length === 0) {
        return (
            <div style={panelStyle}>
                <div style={{ padding: '24px 20px', color: '#64748b', fontSize: 14, textAlign: 'center' }}>
                    <div style={{ marginBottom: 4, fontWeight: 600 }}>動畫模式</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>點擊場景中的模型以管理其動畫 (Cmd/Ctrl+Click 多選)</div>
                </div>
            </div>
        );
    }

    return (
        <div style={panelStyle}>
            {/* ── Header ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                flexShrink: 0,
            }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                    動畫 — {selectedModels.length === 1 ? focusedModel?.name : `${selectedModels.length} 個模型`}
                </span>

                {/* 播放控制 */}
                {selectedAnim && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                        <button onClick={handlePlay} style={ctrlBtnStyle} title={playbackState === 'playing' ? '暫停' : '播放'}>
                            {playbackState === 'playing' ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                        <button onClick={handleStop} style={ctrlBtnStyle} title="停止">
                            <Square size={10} />
                        </button>
                        <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', width: 70, textAlign: 'center' }}>
                            {playbackTime.toFixed(1)}s / {selectedAnim.duration}s
                        </span>
                    </div>
                )}

                {focusedModelId && (
                    <button
                        onClick={() => setShowNewForm(true)}
                        style={{ ...iconBtnStyle, marginLeft: selectedAnim ? 0 : 'auto' }}
                        title="為焦點模型新增動畫"
                    >
                        <Plus size={14} />
                    </button>
                )}
                <button
                    onClick={handleImportClick}
                    style={{ ...iconBtnStyle, marginLeft: (!focusedModelId && !selectedAnim) ? 'auto' : 0 }}
                    title="從 JSON 匯入動畫"
                >
                    <Upload size={14} />
                </button>
            </div>

            {/* 新增表單 */}
            {showNewForm && (
                <div style={{ padding: '6px 16px', display: 'flex', gap: 6, borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                    <input
                        autoFocus
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateAnimation(); if (e.key === 'Escape') setShowNewForm(false); }}
                        placeholder="動畫名稱"
                        style={inputStyle}
                    />
                    <button onClick={handleCreateAnimation} style={smallBtnStyle}>建立</button>
                    <button onClick={() => setShowNewForm(false)} style={{ ...smallBtnStyle, background: '#f1f5f9', color: '#64748b' }}>取消</button>
                </div>
            )}

            {/* ── 多軌 Track 區域 ── */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {selectedModels.map(model => (
                    <ModelTrackRow
                        key={model.id}
                        modelId={model.id}
                        modelName={model.name}
                        isFocused={model.id === focusedModelId}
                        onFocus={() => setFocusedModel(model.id)}
                    />
                ))}
            </div>

            {/* ── 焦點模型的動畫屬性 + 關鍵幀操作 ── */}
            {selectedAnim && (
                <div style={{ borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                    {/* 屬性列 */}
                    <div style={{
                        display: 'flex',
                        gap: 10,
                        padding: '6px 12px',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        background: '#fafafa',
                    }}>
                        <label style={propLabelStyle}>
                            名稱
                            <input
                                value={editingAnimName}
                                onChange={e => setEditingAnimName(e.target.value)}
                                onBlur={() => { if (editingAnimName !== selectedAnim.name) updateAnimation(selectedAnim.id, { name: editingAnimName }); }}
                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                style={{ ...inputStyle, width: 100 }}
                            />
                        </label>
                        <label style={propLabelStyle}>
                            時長(s)
                            <input
                                type="number"
                                value={selectedAnim.duration}
                                min={0.1}
                                step={0.5}
                                onChange={e => updateAnimation(selectedAnim.id, { duration: parseFloat(e.target.value) || 1 })}
                                style={{ ...inputStyle, width: 50 }}
                            />
                        </label>
                        <label style={propLabelStyle}>
                            觸發
                            <select
                                value={selectedAnim.trigger}
                                onChange={e => updateAnimation(selectedAnim.id, { trigger: e.target.value as 'auto' | 'manual' })}
                                style={{ ...inputStyle, width: 75 }}
                            >
                                {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </label>
                        <label style={propLabelStyle}>
                            緩動
                            <select
                                value={selectedAnim.easing}
                                onChange={e => updateAnimation(selectedAnim.id, { easing: e.target.value as any })}
                                style={{ ...inputStyle, width: 75 }}
                            >
                                {EASING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </label>
                        <label style={propLabelStyle}>
                            路徑
                            <select
                                value={selectedAnim.pathMode ?? 'linear'}
                                onChange={e => updateAnimation(selectedAnim.id, { pathMode: e.target.value as 'linear' | 'catmullrom' })}
                                style={{ ...inputStyle, width: 75 }}
                            >
                                <option value="linear">直線</option>
                                <option value="catmullrom">曲線</option>
                            </select>
                        </label>
                        <label style={{ ...propLabelStyle, flexDirection: 'row', gap: 4 }}>
                            <input
                                type="checkbox"
                                checked={selectedAnim.autoOrient ?? false}
                                onChange={e => updateAnimation(selectedAnim.id, { autoOrient: e.target.checked })}
                            />
                            自動朝向
                        </label>
                        <label style={{ ...propLabelStyle, flexDirection: 'row', gap: 4 }}>
                            <input
                                type="checkbox"
                                checked={selectedAnim.loop}
                                onChange={e => updateAnimation(selectedAnim.id, { loop: e.target.checked })}
                            />
                            循環
                        </label>
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
                    </div>

                    {/* 關鍵幀操作 */}
                    <div style={{
                        display: 'flex',
                        gap: 6,
                        padding: '4px 12px 6px',
                        alignItems: 'center',
                    }}>
                        <button onClick={handleAddKeyframe} style={smallBtnStyle} title="在當前時間新增關鍵幀">
                            <Plus size={12} /> 新增關鍵幀
                        </button>
                        {editingKeyframeIndex !== null && (
                            <>
                                <button onClick={handleUpdateKeyframe} style={{ ...smallBtnStyle, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }} title="以目前模型位置更新此關鍵幀">
                                    <RefreshCw size={12} /> 更新關鍵幀
                                </button>
                                <button onClick={handleDeleteKeyframe} style={{ ...smallBtnStyle, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                    <Trash2 size={12} /> 刪除關鍵幀
                                </button>
                                <select
                                    value={selectedAnim.keyframes[editingKeyframeIndex]?.pathMode ?? ''}
                                    onChange={e => {
                                        const kfs = [...selectedAnim.keyframes];
                                        const val = e.target.value as 'linear' | 'catmullrom' | '';
                                        kfs[editingKeyframeIndex] = { ...kfs[editingKeyframeIndex], pathMode: val || undefined };
                                        updateAnimation(selectedAnim.id, { keyframes: kfs });
                                    }}
                                    style={{ ...inputStyle, width: 80, fontSize: 10 }}
                                    title="此段到下一幀的路徑模式（空 = 跟隨動畫預設）"
                                >
                                    <option value="">預設</option>
                                    <option value="linear">直線</option>
                                    <option value="catmullrom">曲線</option>
                                </select>
                            </>
                        )}
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>
                            {selectedAnim.keyframes.length} 個關鍵幀
                        </span>
                    </div>
                </div>
            )}

            {/* Hidden file input for import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </div>
    );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderTop: '1px solid #e2e8f0',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 300,
};

const iconBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 4,
    color: '#475569',
};

const inputStyle: React.CSSProperties = {
    padding: '3px 6px',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    fontSize: 12,
    outline: 'none',
    color: '#1e293b',
};

const smallBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '4px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    background: '#f8fafc',
    fontSize: 11,
    cursor: 'pointer',
    color: '#475569',
    fontWeight: 500,
};

const ctrlBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    background: '#f8fafc',
    cursor: 'pointer',
    color: '#334155',
    flexShrink: 0,
};

const propLabelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: 500,
};

export default AnimationTimeline;
