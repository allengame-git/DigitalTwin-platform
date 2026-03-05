/**
 * AnimationTimeline — 多軌動畫時間軸面板
 * 底部面板：多模型分軌顯示、播放控制、關鍵幀編輯
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Square, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useFacilityStore, getModelGroupRef } from '@/stores/facilityStore';
import type { FacilityAnimation, AnimationKeyframe } from '@/types/facility';

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

    const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!trackRef.current || !isActive) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        const time = ratio * duration;
        setPlaybackTime(time);
        if (playbackState !== 'paused') {
            setPlaybackState('paused');
        }
    }, [isActive, duration, playbackState, setPlaybackTime, setPlaybackState]);

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

            {/* 關鍵幀標記 */}
            {animation.keyframes.map((kf, i) => {
                const left = duration > 0 ? (kf.time / duration) * 100 : 0;
                const isEditingThis = isActive && editingKeyframeIndex === i;
                return (
                    <div
                        key={i}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isActive) {
                                setEditingKeyframeIndex(isEditingThis ? null : i);
                                setPlaybackTime(kf.time);
                                // 不論目前狀態，一律切到 paused 讓 useFrame 套用 interpolation
                                if (playbackState !== 'paused') setPlaybackState('paused');
                            }
                        }}
                        title={`${kf.time.toFixed(1)}s`}
                        style={{
                            position: 'absolute',
                            left: `${left}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%) rotate(45deg)',
                            width: 8,
                            height: 8,
                            background: isEditingThis ? '#7c3aed' : isFocusedTrack ? '#2563eb' : '#94a3b8',
                            border: isEditingThis ? '2px solid #a78bfa' : '1.5px solid ' + (isFocusedTrack ? '#93c5fd' : '#cbd5e1'),
                            borderRadius: 2,
                            cursor: isActive ? 'pointer' : 'default',
                            zIndex: 5,
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

    const modelAnims = useMemo(() =>
        animations.filter(a => a.modelId === modelId),
    [animations, modelId]);

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
                                value={selectedAnim.name}
                                onChange={e => updateAnimation(selectedAnim.id, { name: e.target.value })}
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
                        <label style={{ ...propLabelStyle, flexDirection: 'row', gap: 4 }}>
                            <input
                                type="checkbox"
                                checked={selectedAnim.loop}
                                onChange={e => updateAnimation(selectedAnim.id, { loop: e.target.checked })}
                            />
                            循環
                        </label>
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteAnimation(selectedAnim.id); }}
                            style={{ ...iconBtnStyle, color: '#94a3b8', marginLeft: 'auto' }}
                            title="刪除此動畫"
                        >
                            <Trash2 size={12} />
                        </button>
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
                            </>
                        )}
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>
                            {selectedAnim.keyframes.length} 個關鍵幀
                        </span>
                    </div>
                </div>
            )}
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
