/**
 * FacilitySidebar — 設施導覽側邊欄
 * 整合 BreadcrumbNav、SceneTree 與模型清單
 * @module components/facility/FacilitySidebar
 */

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Box, DoorOpen, Edit3, Tag, Map, Film, Move, RotateCw, Maximize2, ChevronDown, Trash2, Eye, EyeOff, CheckSquare, Play, Pause, Square } from 'lucide-react';
import { useFacilityStore, getModelGroupRef } from '@/stores/facilityStore';
import BreadcrumbNav from './BreadcrumbNav';

type Axis = 'x' | 'y' | 'z';
type TMode = 'translate' | 'rotate' | 'scale';

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

const AXIS_ACCENT: Record<Axis, string> = {
    x: '#7c3aed', y: '#0f766e', z: '#0369a1',
};

const AXIS_META: Record<TMode, Record<Axis, { key: string; sub: string }>> = {
    translate: { x: { key: 'X', sub: '東' }, y: { key: 'Y', sub: '高程' }, z: { key: 'Z', sub: '北' } },
    rotate:    { x: { key: 'Rx', sub: '俯仰' }, y: { key: 'Ry', sub: '方位' }, z: { key: 'Rz', sub: '橫滾' } },
    scale:     { x: { key: 'X', sub: '寬' }, y: { key: 'Y', sub: '高' }, z: { key: 'Z', sub: '深' } },
};

const UNIT: Record<TMode, string> = { translate: 'm', rotate: '\u00B0', scale: '\u00D7' };

/** 從 3D groupRef 讀取即時值 */
function readGroupTransform(modelId: string, mode: TMode): Record<Axis, string> {
    const group = getModelGroupRef(modelId);
    if (!group) return { x: '0', y: '0', z: '0' };
    if (mode === 'translate') {
        return { x: String(+group.position.x.toFixed(3)), y: String(+group.position.y.toFixed(3)), z: String(+group.position.z.toFixed(3)) };
    } else if (mode === 'rotate') {
        return { x: String(+(group.rotation.x * RAD2DEG).toFixed(2)), y: String(+(group.rotation.y * RAD2DEG).toFixed(2)), z: String(+(group.rotation.z * RAD2DEG).toFixed(2)) };
    } else {
        return { x: String(+group.scale.x.toFixed(3)), y: String(+group.scale.y.toFixed(3)), z: String(+group.scale.z.toFixed(3)) };
    }
}

/** 將輸入值寫回 3D groupRef */
function writeGroupTransform(modelId: string, mode: TMode, vals: Record<Axis, string>) {
    const group = getModelGroupRef(modelId);
    if (!group) return;
    const x = parseFloat(vals.x) || 0;
    const y = parseFloat(vals.y) || 0;
    const z = parseFloat(vals.z) || 0;
    if (mode === 'translate') {
        group.position.set(x, y, z);
    } else if (mode === 'rotate') {
        group.rotation.set(x * DEG2RAD, y * DEG2RAD, z * DEG2RAD);
    } else {
        group.scale.set(x, y, z);
    }
}

// ── 動畫模式下的 Transform 操控（可摺疊 + 數值輸入）──
function AnimTransformSection({ transformMode, setTransformMode }: {
    transformMode: TMode;
    setTransformMode: (m: TMode) => void;
}) {
    const focusedModelId = useFacilityStore(s => s.focusedModelId);
    const [expanded, setExpanded] = React.useState(true);
    const [draft, setDraft] = React.useState<Record<Axis, string>>({ x: '0', y: '0', z: '0' });
    const syncRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    // 每 200ms 從 3D 同步數值（當無 focus 時）
    const [focusedAxis, setFocusedAxis] = React.useState<Axis | null>(null);

    React.useEffect(() => {
        if (!focusedModelId) return;
        // 初始讀取
        setDraft(readGroupTransform(focusedModelId, transformMode));
        // 週期同步
        syncRef.current = setInterval(() => {
            if (!focusedAxis && focusedModelId) {
                setDraft(readGroupTransform(focusedModelId, transformMode));
            }
        }, 200);
        return () => { if (syncRef.current) clearInterval(syncRef.current); };
    }, [focusedModelId, transformMode, focusedAxis]);

    const handleChange = (axis: Axis, val: string) => {
        setDraft(prev => ({ ...prev, [axis]: val }));
    };

    const handleCommit = () => {
        if (!focusedModelId) return;
        writeGroupTransform(focusedModelId, transformMode, draft);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { handleCommit(); (e.target as HTMLInputElement).blur(); }
    };

    const modes = [
        { key: 'translate' as const, label: '移動', icon: <Move size={11} /> },
        { key: 'rotate' as const, label: '旋轉', icon: <RotateCw size={11} /> },
        { key: 'scale' as const, label: '縮放', icon: <Maximize2 size={11} /> },
    ];

    const axes: Axis[] = transformMode === 'translate' ? ['x', 'z', 'y'] : ['x', 'y', 'z'];

    return (
        <div style={{ marginTop: 6, border: '1px solid #e9d5ff', borderRadius: 6, overflow: 'hidden' }}>
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 10px', border: 'none', background: '#faf5ff',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#7c3aed',
                }}
            >
                <ChevronDown size={12} style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
                Transform 操控
            </button>
            {expanded && (
                <div style={{ background: '#fff', padding: '6px 8px' }}>
                    {/* Mode tabs */}
                    <div style={{ display: 'flex', gap: 3, marginBottom: 6, background: '#f5f3ff', borderRadius: 5, padding: 2 }}>
                        {modes.map(m => (
                            <button
                                key={m.key}
                                onClick={() => setTransformMode(m.key)}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: 3, padding: '4px 0', borderRadius: 4, fontSize: 10, fontWeight: 500,
                                    cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                                    background: transformMode === m.key ? '#7c3aed' : 'transparent',
                                    color: transformMode === m.key ? '#fff' : '#6b7280',
                                }}
                            >
                                {m.icon} {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Axis inputs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {axes.map(axis => {
                            const accent = AXIS_ACCENT[axis];
                            const meta = AXIS_META[transformMode][axis];
                            const isFocused = focusedAxis === axis;
                            return (
                                <div key={axis} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '4px 6px 4px 8px', borderRadius: 5,
                                    border: `1px solid ${isFocused ? accent + '60' : '#e2e8f0'}`,
                                    borderLeft: `3px solid ${accent}`,
                                    background: isFocused ? '#fafbff' : '#f8fafc',
                                    transition: 'border-color 0.15s',
                                }}>
                                    <div style={{ minWidth: 28 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: accent, lineHeight: 1 }}>{meta.key}</div>
                                        <div style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.2 }}>{meta.sub}</div>
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={draft[axis]}
                                        onChange={e => handleChange(axis, e.target.value)}
                                        onFocus={() => setFocusedAxis(axis)}
                                        onBlur={() => { setFocusedAxis(null); handleCommit(); }}
                                        onKeyDown={handleKeyDown}
                                        style={{
                                            flex: 1, minWidth: 0, padding: 0, border: 'none',
                                            background: 'transparent', color: '#1e293b',
                                            fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                                            fontWeight: 500, outline: 'none', textAlign: 'right',
                                        }}
                                    />
                                    <span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 500, flexShrink: 0 }}>
                                        {UNIT[transformMode]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 9, color: '#cbd5e1', textAlign: 'center' }}>
                        Enter 套用 · 拖曳 gizmo 自動同步
                    </div>
                </div>
            )}
        </div>
    );
}

const FacilitySidebar: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const { projectCode } = useParams<{ projectCode: string }>();

    const {
        models,
        selectedModelIds,
        focusedModelId,
        selectModel,
        toggleModelSelection,
        hiddenModelIds,
        toggleModelVisibility,
        batchDeleteModels,
        currentSceneId,
        scenes,
        isLoading,
        editMode,
        setEditMode,
        setEditingModel,
        animations,
        animationMode,
        setAnimationMode,
        selectedAnimationId,
        playbackState,
        setPlaybackState,
        setPlaybackTime,
        transformMode,
        setTransformMode,
        showLabels,
        toggleLabels,
        showPlanView,
        togglePlanView,
        flyToModel,
        enterScene,
    } = useFacilityStore();

    const [confirmBatchDelete, setConfirmBatchDelete] = React.useState(false);

    // 找到焦點模型下的所有子場景（透過 scene.parentModelId）
    const selectedModelSubScenes = focusedModelId
        ? scenes.filter(s => s.parentModelId === focusedModelId)
        : [];

    const currentScene = scenes.find(s => s.id === currentSceneId);
    const hasPlanImage = !!(currentScene?.planImageUrl || currentScene?.autoPlanImageUrl);

    return (
        // 外層 wrapper 負責寬度動畫；按鈕放在這裡，不受 aside overflow:hidden 裁切
        <div
            style={{
                position: 'relative',
                width: isCollapsed ? 50 : 280,
                minWidth: isCollapsed ? 50 : 280,
                height: '100%',
                flexShrink: 0,
                zIndex: 50,
                transition: 'width 0.3s ease',
            }}
        >
            {/* 收合按鈕：在 aside 外，不受 overflow:hidden 影響 */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? '展開側邊欄' : '收合側邊欄'}
                style={{
                    position: 'absolute',
                    top: 12,
                    right: -15,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'white',
                    border: '1px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 60,
                    transition: 'all 0.3s ease',
                    color: '#4b5563',
                    fontSize: 16,
                }}
            >
                {isCollapsed ? '›' : '‹'}
            </button>

        <aside
            style={{
                width: '100%',
                height: '100%',
                background: 'white',
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
            }}
        >

            {/* Header */}
            <div
                style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    height: isCollapsed ? 0 : 'auto',
                    transition: 'opacity 0.2s ease',
                }}
            >
                <div style={{ marginBottom: 8 }}>
                    <Link
                        to={projectCode ? `/project/${projectCode}` : '/'}
                        style={{
                            textDecoration: 'none',
                            color: '#4b5563',
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 500,
                        }}
                    >
                        ← 回到{projectCode ? '專案' : ''}儀表板
                    </Link>
                </div>
                <h1 style={{ margin: 0, fontSize: 18, color: '#111827', fontWeight: 700 }}>
                    {currentScene?.name ?? '設施導覽'}
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                    互動式 3D 設施導覽
                </p>
            </div>

            {/* 收合時的直排文字 */}
            <div
                style={{
                    display: isCollapsed ? 'flex' : 'none',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 60,
                    opacity: isCollapsed ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
            >
                <div style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    color: '#4b5563',
                    letterSpacing: 2,
                    fontWeight: 600,
                    fontSize: 13,
                }}>
                    設施導覽模組
                </div>
            </div>

            {/* 可捲動內容區 */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    pointerEvents: isCollapsed ? 'none' : 'auto',
                    transition: 'opacity 0.2s ease',
                }}
            >
                {/* 麵包屑導覽 */}
                <div style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <BreadcrumbNav />
                </div>

                {/* 模型清單 */}
                <section style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
                        <Box size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#9ca3af',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            模型清單
                        </span>
                        <span style={{ flex: 1 }} />
                        {selectedModelIds.length > 0 && (
                            <span style={{ fontSize: 10, color: '#6b7280' }}>
                                {selectedModelIds.length} 已選取
                            </span>
                        )}
                        {/* 全域播放/暫停（場景內有動畫時顯示，動畫編輯模式隱藏） */}
                        {!animationMode && animations.some(a => a.keyframes && a.keyframes.length > 0) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (playbackState === 'playing') {
                                        setPlaybackState('paused');
                                    } else {
                                        if (playbackState === 'stopped') setPlaybackTime(0);
                                        setPlaybackState('playing');
                                    }
                                }}
                                title={playbackState === 'playing' ? '暫停所有動畫' : '播放所有動畫'}
                                style={{
                                    background: playbackState === 'playing' ? '#7c3aed' : 'none',
                                    border: playbackState === 'playing' ? '1px solid #7c3aed' : '1px solid #d1d5db',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    flexShrink: 0,
                                    color: playbackState === 'playing' ? '#fff' : '#6b7280',
                                    fontSize: 10,
                                    fontWeight: 500,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {playbackState === 'playing'
                                    ? <><Pause size={10} /> 暫停</>
                                    : <><Play size={10} /> 播放</>
                                }
                            </button>
                        )}
                    </div>

                    {/* 批次操作工具列 */}
                    {selectedModelIds.length >= 2 && (
                        <div style={{
                            display: 'flex', gap: 4, padding: '4px 8px 6px',
                            borderBottom: '1px solid #f1f5f9',
                        }}>
                            <button
                                onClick={() => {
                                    const allHidden = selectedModelIds.every(id => hiddenModelIds.includes(id));
                                    toggleModelVisibility(selectedModelIds);
                                }}
                                title="切換顯示/隱藏"
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: 4, padding: '4px 0', borderRadius: 4, fontSize: 10, fontWeight: 500,
                                    cursor: 'pointer', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563',
                                }}
                            >
                                {selectedModelIds.every(id => hiddenModelIds.includes(id))
                                    ? <><Eye size={11} /> 顯示</>
                                    : <><EyeOff size={11} /> 隱藏</>
                                }
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmBatchDelete) {
                                        batchDeleteModels(selectedModelIds);
                                        setConfirmBatchDelete(false);
                                    } else {
                                        setConfirmBatchDelete(true);
                                        setTimeout(() => setConfirmBatchDelete(false), 3000);
                                    }
                                }}
                                title="批次刪除"
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: 4, padding: '4px 0', borderRadius: 4, fontSize: 10, fontWeight: 500,
                                    cursor: 'pointer',
                                    border: confirmBatchDelete ? '1px solid #ef4444' : '1px solid #e5e7eb',
                                    background: confirmBatchDelete ? '#fef2f2' : '#fff',
                                    color: confirmBatchDelete ? '#dc2626' : '#4b5563',
                                }}
                            >
                                <Trash2 size={11} /> {confirmBatchDelete ? '確認刪除?' : '刪除'}
                            </button>
                        </div>
                    )}

                    {isLoading && (
                        <div style={{ padding: '8px 12px', fontSize: 12, color: '#9ca3af' }}>
                            載入中...
                        </div>
                    )}

                    {!isLoading && models.length === 0 && (
                        <div style={{ padding: '8px 12px', fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                            沒有模型
                        </div>
                    )}

                    {!isLoading && models.length > 0 && (
                        <ul style={{ listStyle: 'none', margin: 0, padding: '0 4px 4px' }}>
                            {models
                                .filter(m => m.modelType !== 'decorative')
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map(model => {
                                    const isSelected = selectedModelIds.includes(model.id);
                                    const isFocused = model.id === focusedModelId;
                                    const isHidden = hiddenModelIds.includes(model.id);
                                    const hasChildScene = scenes.some(s => s.parentModelId === model.id);

                                    return (
                                        <li key={model.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            {/* Checkbox for multi-select */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleModelSelection(model.id);
                                                }}
                                                title="多選"
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    padding: '2px', display: 'flex', alignItems: 'center',
                                                    flexShrink: 0, color: isSelected ? '#2563eb' : '#d1d5db',
                                                }}
                                            >
                                                <CheckSquare size={13} style={{
                                                    opacity: isSelected ? 1 : 0.4,
                                                }} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    const multi = e.metaKey || e.ctrlKey;
                                                    if (isFocused && !multi) {
                                                        selectModel(null);
                                                    } else {
                                                        selectModel(model.id, multi);
                                                        flyToModel(model.id);
                                                    }
                                                }}
                                                title={model.name}
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '7px 8px',
                                                    borderRadius: 4,
                                                    border: 'none',
                                                    background: isFocused ? '#2563eb' : isSelected ? '#dbeafe' : 'transparent',
                                                    color: isFocused ? 'white' : isHidden ? '#9ca3af' : '#374151',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'background 0.15s',
                                                    fontSize: 12,
                                                    opacity: isHidden ? 0.5 : 1,
                                                }}
                                                onMouseEnter={e => {
                                                    if (!isFocused && !isSelected) e.currentTarget.style.background = '#f3f4f6';
                                                }}
                                                onMouseLeave={e => {
                                                    if (!isFocused && !isSelected) e.currentTarget.style.background = 'transparent';
                                                    else if (isSelected && !isFocused) e.currentTarget.style.background = '#dbeafe';
                                                }}
                                            >
                                                <Box
                                                    size={13}
                                                    style={{
                                                        flexShrink: 0,
                                                        color: isFocused ? 'rgba(255,255,255,0.7)' : '#9ca3af',
                                                    }}
                                                />
                                                <span style={{
                                                    flex: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    textDecoration: isHidden ? 'line-through' : 'none',
                                                }}>
                                                    {model.name}
                                                </span>
                                                {hasChildScene && (
                                                    <ChevronRight
                                                        size={12}
                                                        style={{
                                                            flexShrink: 0,
                                                            color: isFocused ? 'rgba(255,255,255,0.5)' : '#d1d5db',
                                                        }}
                                                        title="包含子場景"
                                                    />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                        </ul>
                    )}
                </section>

                {/* 子場景入口：選取的模型有關聯子場景時顯示（支援多個） */}
                {selectedModelSubScenes.length > 0 && (
                    <section style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
                            <DoorOpen size={13} style={{ color: '#3b82f6', flexShrink: 0 }} />
                            <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                內部場景
                            </span>
                        </div>
                        <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {selectedModelSubScenes.map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => enterScene(sub.id)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '8px 12px',
                                        borderRadius: 6,
                                        border: '1px solid #bfdbfe',
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#dbeafe')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#eff6ff')}
                                >
                                    <DoorOpen size={14} style={{ flexShrink: 0 }} />
                                    <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {sub.name}
                                    </span>
                                    <ChevronRight size={13} style={{ flexShrink: 0 }} />
                                </button>
                            ))}
                        </div>
                    </section>
                )}

            </div>

            {/* 工具列：標籤開關 + 編輯模式 */}
            <div
                style={{
                    padding: '10px 16px',
                    borderTop: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    flexShrink: 0,
                    opacity: isCollapsed ? 0 : 1,
                    height: isCollapsed ? 0 : 'auto',
                    overflow: 'hidden',
                    transition: 'opacity 0.2s ease',
                }}
            >
                {/* 平面圖按鈕（有平面圖才顯示） */}
                {hasPlanImage && (
                    <button
                        onClick={togglePlanView}
                        title={showPlanView ? '關閉平面圖' : '開啟平面圖'}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '6px 0',
                            borderRadius: 6,
                            border: showPlanView ? '1px solid #0ea5e9' : '1px solid #d1d5db',
                            background: showPlanView ? '#0c2a4a' : 'white',
                            color: showPlanView ? '#38bdf8' : '#6b7280',
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            marginBottom: 6,
                        }}
                    >
                        <Map size={12} />
                        {showPlanView ? '平面圖顯示中' : '顯示平面圖'}
                    </button>
                )}

                {/* 標籤顯示開關 */}
                <button
                    onClick={toggleLabels}
                    title={showLabels ? '隱藏模型標籤' : '顯示模型標籤'}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '6px 0',
                        borderRadius: 6,
                        border: showLabels ? '1px solid #059669' : '1px solid #d1d5db',
                        background: showLabels ? '#ecfdf5' : 'white',
                        color: showLabels ? '#065f46' : '#6b7280',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        marginBottom: 6,
                    }}
                >
                    <Tag size={12} />
                    {showLabels ? '標籤顯示中' : '標籤已隱藏'}
                </button>

                {/* 編輯模式 */}
                <button
                    onClick={() => {
                        const next = !editMode;
                        setEditMode(next);
                        if (!next) setEditingModel(null);
                    }}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '7px 0',
                        borderRadius: 6,
                        border: editMode ? '1px solid #2563eb' : '1px solid #d1d5db',
                        background: editMode ? '#2563eb' : 'white',
                        color: editMode ? 'white' : '#374151',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                >
                    <Edit3 size={13} />
                    {editMode ? '退出編輯模式' : '進入編輯模式'}
                </button>
                {editMode && (
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
                        點擊模型以選取並調整位置/旋轉/縮放
                    </p>
                )}

                {/* 動畫模式 */}
                <button
                    onClick={() => {
                        const next = !animationMode;
                        setAnimationMode(next);
                        if (next && editMode) setEditMode(false);
                    }}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '7px 0',
                        borderRadius: 6,
                        border: animationMode ? '1px solid #7c3aed' : '1px solid #d1d5db',
                        background: animationMode ? '#7c3aed' : 'white',
                        color: animationMode ? 'white' : '#374151',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        marginTop: 6,
                    }}
                >
                    <Film size={13} />
                    {animationMode ? '退出動畫模式' : '進入動畫模式'}
                </button>

                {/* 動畫模式：Transform 切換（可摺疊） */}
                {animationMode && focusedModelId && selectedAnimationId && (
                    <AnimTransformSection transformMode={transformMode} setTransformMode={setTransformMode} />
                )}
            </div>

            {/* Footer */}
            <div
                style={{
                    padding: '8px 20px',
                    borderTop: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    fontSize: 11,
                    color: '#9ca3af',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    height: isCollapsed ? 0 : 'auto',
                    flexShrink: 0,
                }}
            >
                LLRWD DigitalTwin Platform v1.0
            </div>
        </aside>
        </div>
    );
};

export default FacilitySidebar;
