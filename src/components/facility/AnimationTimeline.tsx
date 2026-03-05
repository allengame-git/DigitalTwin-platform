/**
 * AnimationTimeline — 動畫時間軸面板
 * 底部面板：動畫清單、播放控制、關鍵幀編輯
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Square, Plus, Trash2, ChevronDown, RefreshCw } from 'lucide-react';
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

function TimelineTrack({ animation }: { animation: FacilityAnimation }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const {
        playbackTime,
        playbackState,
        setPlaybackTime,
        setPlaybackState,
        selectedAnimationId,
        editingKeyframeIndex,
        setEditingKeyframeIndex,
        deleteKeyframe,
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
        if (playbackState === 'playing') {
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
                height: 32,
                background: isActive ? '#f1f5f9' : '#f8fafc',
                borderRadius: 6,
                border: isActive ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                cursor: isActive ? 'pointer' : 'default',
                overflow: 'visible',
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
                        height: 6,
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
                                if (playbackState === 'playing') setPlaybackState('paused');
                            }
                        }}
                        title={`${kf.time.toFixed(1)}s`}
                        style={{
                            position: 'absolute',
                            left: `${left}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%) rotate(45deg)',
                            width: 10,
                            height: 10,
                            background: isEditingThis ? '#7c3aed' : '#2563eb',
                            border: isEditingThis ? '2px solid #a78bfa' : '2px solid #93c5fd',
                            borderRadius: 2,
                            cursor: 'pointer',
                            zIndex: 5,
                        }}
                    />
                );
            })}

            {/* Scrubber (播放指示線) */}
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
                        top: -4,
                        left: -4,
                        width: 10,
                        height: 10,
                        background: '#ef4444',
                        borderRadius: '50%',
                    }} />
                </div>
            )}
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function AnimationTimeline() {
    const {
        selectedModelId,
        animations,
        selectedAnimationId,
        playbackState,
        playbackTime,
        editingKeyframeIndex,
        selectAnimation,
        createAnimation,
        updateAnimation,
        deleteAnimation,
        fetchAnimations,
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

    const selectedModel = useMemo(() =>
        models.find(m => m.id === selectedModelId),
    [models, selectedModelId]);

    // 選取模型時載入動畫
    useEffect(() => {
        if (selectedModelId) {
            fetchAnimations(selectedModelId);
        }
    }, [selectedModelId, fetchAnimations]);

    const selectedAnim = useMemo(() =>
        animations.find(a => a.id === selectedAnimationId),
    [animations, selectedAnimationId]);

    const handleCreateAnimation = useCallback(async () => {
        if (!selectedModelId) return;
        const name = newName.trim() || '未命名動畫';
        const anim = await createAnimation(selectedModelId, { name });
        selectAnimation(anim.id);
        setNewName('');
        setShowNewForm(false);
    }, [selectedModelId, newName, createAnimation, selectAnimation]);

    // 從 3D 場景讀取模型即時 transform（優先）或 fallback 到 DB 值
    const RAD2DEG = 180 / Math.PI;
    const readLiveTransform = useCallback((): Pick<AnimationKeyframe, 'position' | 'rotation' | 'scale'> | null => {
        if (!selectedModelId) return null;
        const group = getModelGroupRef(selectedModelId);
        if (group) {
            return {
                position: { x: group.position.x, y: group.position.y, z: group.position.z },
                rotation: { x: group.rotation.x * RAD2DEG, y: group.rotation.y * RAD2DEG, z: group.rotation.z * RAD2DEG },
                scale: { x: group.scale.x, y: group.scale.y, z: group.scale.z },
            };
        }
        // fallback: DB 靜態值
        if (selectedModel) {
            return {
                position: { ...selectedModel.position },
                rotation: { ...selectedModel.rotation },
                scale: { ...selectedModel.scale },
            };
        }
        return null;
    }, [selectedModelId, selectedModel]);

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

    const modelAnimations = useMemo(() =>
        animations.filter(a => a.modelId === selectedModelId),
    [animations, selectedModelId]);

    if (!selectedModelId) {
        return (
            <div style={panelStyle}>
                <div style={{ padding: '24px 20px', color: '#64748b', fontSize: 14, textAlign: 'center' }}>
                    <div style={{ marginBottom: 4, fontWeight: 600 }}>動畫模式</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>點擊場景中的模型以管理其動畫</div>
                </div>
            </div>
        );
    }

    return (
        <div style={panelStyle}>
            {/* ── Header: 動畫清單 + 新增 ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
            }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', flex: 1 }}>
                    動畫 — {selectedModel?.name}
                </span>
                <button
                    onClick={() => setShowNewForm(true)}
                    style={iconBtnStyle}
                    title="新增動畫"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* 新增表單 */}
            {showNewForm && (
                <div style={{ padding: '8px 16px', display: 'flex', gap: 6, borderBottom: '1px solid #e2e8f0' }}>
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

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* ── 左側：動畫列表 ── */}
                <div style={{
                    width: 180,
                    minWidth: 180,
                    borderRight: '1px solid #e2e8f0',
                    overflowY: 'auto',
                }}>
                    {modelAnimations.length === 0 && (
                        <div style={{ padding: '16px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                            <div>尚無動畫</div>
                            <div style={{ fontSize: 10, marginTop: 4 }}>點擊上方 + 新增</div>
                        </div>
                    )}
                    {modelAnimations.map(anim => (
                        <div
                            key={anim.id}
                            onClick={() => selectAnimation(anim.id)}
                            style={{
                                padding: '8px 12px',
                                fontSize: 12,
                                cursor: 'pointer',
                                background: selectedAnimationId === anim.id ? '#ede9fe' : 'transparent',
                                borderBottom: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <span style={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: selectedAnimationId === anim.id ? '#6d28d9' : '#334155',
                                fontWeight: selectedAnimationId === anim.id ? 600 : 400,
                            }}>
                                {anim.name}
                            </span>
                            <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                                {anim.type === 'gltf' ? 'GLB' : `${anim.duration}s`}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteAnimation(anim.id); }}
                                style={{ ...iconBtnStyle, padding: 2, color: '#94a3b8' }}
                                title="刪除動畫"
                            >
                                <Trash2 size={11} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* ── 右側：時間軸 + 屬性 ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!selectedAnim ? (
                        <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                            選取左側動畫以編輯
                        </div>
                    ) : (
                        <>
                            {/* 屬性列 */}
                            <div style={{
                                display: 'flex',
                                gap: 12,
                                padding: '8px 12px',
                                borderBottom: '1px solid #e2e8f0',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                            }}>
                                <label style={propLabelStyle}>
                                    名稱
                                    <input
                                        value={selectedAnim.name}
                                        onChange={e => updateAnimation(selectedAnim.id, { name: e.target.value })}
                                        style={{ ...inputStyle, width: 120 }}
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
                                        style={{ ...inputStyle, width: 60 }}
                                    />
                                </label>
                                <label style={propLabelStyle}>
                                    觸發
                                    <select
                                        value={selectedAnim.trigger}
                                        onChange={e => updateAnimation(selectedAnim.id, { trigger: e.target.value as 'auto' | 'manual' })}
                                        style={{ ...inputStyle, width: 80 }}
                                    >
                                        {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </label>
                                <label style={propLabelStyle}>
                                    緩動
                                    <select
                                        value={selectedAnim.easing}
                                        onChange={e => updateAnimation(selectedAnim.id, { easing: e.target.value as any })}
                                        style={{ ...inputStyle, width: 80 }}
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
                            </div>

                            {/* 播放控制 + 時間軸 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                                <button onClick={handlePlay} style={ctrlBtnStyle} title={playbackState === 'playing' ? '暫停' : '播放'}>
                                    {playbackState === 'playing' ? <Pause size={14} /> : <Play size={14} />}
                                </button>
                                <button onClick={handleStop} style={ctrlBtnStyle} title="停止">
                                    <Square size={12} />
                                </button>
                                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', width: 80, textAlign: 'center' }}>
                                    {playbackTime.toFixed(1)}s / {selectedAnim.duration}s
                                </span>
                                <div style={{ flex: 1 }}>
                                    <TimelineTrack animation={selectedAnim} />
                                </div>
                            </div>

                            {/* 關鍵幀操作 */}
                            <div style={{
                                display: 'flex',
                                gap: 6,
                                padding: '4px 12px 8px',
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
                        </>
                    )}
                </div>
            </div>
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
    maxHeight: 260,
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
    width: 28,
    height: 28,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
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
