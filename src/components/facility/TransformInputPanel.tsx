/**
 * TransformInputPanel — 模型精確數值輸入面板
 * 編輯模式下選中模型後顯示，允許直接輸入 position / rotation / scale 數值。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Move, RotateCcw, Maximize2 } from 'lucide-react';
import type { FC, SVGProps } from 'react';
import { useFacilityStore } from '../../stores/facilityStore';
import type { Transform } from '../../types/facility';

type Axis = 'x' | 'y' | 'z';
type Mode = 'translate' | 'rotate' | 'scale';

interface Vec3 { x: number; y: number; z: number; }

const DEFAULT_VEC3: Vec3 = { x: 0, y: 0, z: 0 };
const DEFAULT_SCALE: Vec3 = { x: 1, y: 1, z: 1 };

type LucideIcon = FC<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;

const MODES: { key: Mode; label: string; Icon: LucideIcon }[] = [
    { key: 'translate', label: '移動', Icon: Move },
    { key: 'rotate',    label: '旋轉', Icon: RotateCcw },
    { key: 'scale',     label: '縮放', Icon: Maximize2 },
];

// 專業配色：Violet / Sky / Teal — 有差異但低飽和，避免原色 RGB
const AXIS_ACCENT: Record<Axis, string> = {
    x: '#7c3aed',   // violet-700
    y: '#0f766e',   // teal-700
    z: '#0369a1',   // sky-700
};

// 移動模式：顯示名稱 + 副標（單位/方向）
const AXIS_META: Record<Mode, Record<Axis, { key: string; sub: string }>> = {
    translate: {
        x: { key: 'X',  sub: '東' },
        y: { key: 'Y',  sub: '高程' },
        z: { key: 'Z',  sub: '北' },
    },
    rotate: {
        x: { key: 'Rx', sub: '俯仰' },
        y: { key: 'Ry', sub: '方位' },
        z: { key: 'Rz', sub: '橫滾' },
    },
    scale: {
        x: { key: 'X',  sub: '寬' },
        y: { key: 'Y',  sub: '高' },
        z: { key: 'Z',  sub: '深' },
    },
};

const UNIT: Record<Mode, string> = {
    translate: 'm',
    rotate: '°',
    scale: '×',
};

const vec3ToStr = (v: Vec3): Record<Axis, string> =>
    ({ x: String(v.x), y: String(v.y), z: String(v.z) });

// ── Component ────────────────────────────────────────────────────────────────

const TransformInputPanel: React.FC = () => {
    const {
        editMode, editingModelId, models,
        transformMode, setTransformMode, updateModelTransform,
    } = useFacilityStore();

    const editingModel = models.find(m => m.id === editingModelId) ?? null;
    const [draft, setDraft] = useState<Record<Axis, string>>({ x: '0', y: '0', z: '0' });
    const [focusedAxis, setFocusedAxis] = useState<Axis | null>(null);
    const inputRefs = useRef<Partial<Record<Axis, HTMLInputElement>>>({});

    useEffect(() => {
        if (!editingModel) return;
        if (transformMode === 'translate') {
            // Three.js +X = West, +Z = South；UI 顯示東/北，需對 X/Z 取反
            const p = editingModel.position ?? DEFAULT_VEC3;
            setDraft(vec3ToStr({ x: p.x, y: p.y, z: -p.z }));
        } else if (transformMode === 'rotate') {
            setDraft(vec3ToStr(editingModel.rotation ?? DEFAULT_VEC3));
        } else {
            setDraft(vec3ToStr(editingModel.scale ?? DEFAULT_SCALE));
        }
    }, [editingModel?.id, transformMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAxisChange = useCallback((axis: Axis, raw: string) => {
        setDraft(prev => ({ ...prev, [axis]: raw }));
    }, []);

    const handleCommit = useCallback(() => {
        if (!editingModelId) return;
        const uiX = parseFloat(draft.x) || 0;
        const uiY = parseFloat(draft.y) || 0;
        const uiZ = parseFloat(draft.z) || 0;
        const transform: Transform = {};
        if (transformMode === 'translate') {
            // UI 東/北 為正 → Three.js X/Z 需取反
            transform.position = { x: uiX, y: uiY, z: -uiZ };
        } else if (transformMode === 'rotate') {
            transform.rotation = { x: uiX, y: uiY, z: uiZ };
        } else {
            transform.scale = { x: uiX, y: uiY, z: uiZ };
        }
        updateModelTransform(editingModelId, transform);
    }, [editingModelId, transformMode, draft, updateModelTransform]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { handleCommit(); (e.target as HTMLInputElement).blur(); }
    }, [handleCommit]);

    if (!editMode || !editingModelId || !editingModel) return null;

    // 移動模式：東(x) → 北(z) → 高程(y)；其他模式：x y z
    const axes: Axis[] = transformMode === 'translate' ? ['x', 'z', 'y'] : ['x', 'y', 'z'];

    return (
        <div style={panel}>
            {/* ── Header ── */}
            <div style={header}>
                <div style={headerLeft}>
                    <div style={statusDot} />
                    <span style={modelName} title={editingModel.name}>{editingModel.name}</span>
                </div>
                <span style={badge}>TRANSFORM</span>
            </div>

            <div style={divider} />

            {/* ── Mode tabs ── */}
            <div style={tabBar}>
                {MODES.map(({ key, label, Icon }) => {
                    const active = transformMode === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setTransformMode(key)}
                            style={{ ...tab, ...(active ? tabActive : {}) }}
                        >
                            <Icon size={11} strokeWidth={active ? 2.5 : 2} opacity={active ? 1 : 0.5} />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Axis rows ── */}
            <div style={axisStack}>
                {axes.map(axis => {
                    const isFocused = focusedAxis === axis;
                    const accent = AXIS_ACCENT[axis];
                    const meta = AXIS_META[transformMode][axis];
                    return (
                        <div
                            key={axis}
                            style={{
                                ...axisRow,
                                borderLeftColor: accent,
                                borderColor: isFocused ? accent + '60' : '#e2e8f0',
                                boxShadow: isFocused ? `0 0 0 2px ${accent}18` : 'none',
                                background: isFocused ? '#fafbff' : '#f8fafc',
                            }}
                            onClick={() => inputRefs.current[axis]?.focus()}
                        >
                            {/* Label */}
                            <div style={axisLabelBlock}>
                                <span style={{ ...axisKey, color: accent }}>{meta.key}</span>
                                <span style={axisSub}>{meta.sub}</span>
                            </div>

                            {/* Input */}
                            <input
                                ref={el => { if (el) inputRefs.current[axis] = el; }}
                                type="text"
                                inputMode="decimal"
                                value={draft[axis]}
                                onChange={e => handleAxisChange(axis, e.target.value)}
                                onFocus={() => setFocusedAxis(axis)}
                                onBlur={() => { setFocusedAxis(null); handleCommit(); }}
                                onKeyDown={handleKeyDown}
                                style={axisInput}
                            />

                            {/* Unit */}
                            <span style={unitLabel}>{UNIT[transformMode]}</span>
                        </div>
                    );
                })}
            </div>

            {/* ── Hint ── */}
            <div style={hint}>Enter 或點擊其他區域套用</div>
        </div>
    );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
    position: 'fixed',
    bottom: 20,
    left: 288,
    zIndex: 30,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '14px 14px 12px',
    width: 248,
    boxShadow: '0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
    fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif",
};

const header: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
};

const headerLeft: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    overflow: 'hidden',
    flex: 1,
};

const statusDot: React.CSSProperties = {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#2563eb',
    flexShrink: 0,
};

const modelName: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
    letterSpacing: '-0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const badge: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#64748b',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '2px 6px',
    flexShrink: 0,
};

const divider: React.CSSProperties = {
    height: 1,
    background: '#f1f5f9',
    marginBottom: 10,
};

const tabBar: React.CSSProperties = {
    display: 'flex',
    gap: 3,
    marginBottom: 12,
    background: '#f1f5f9',
    borderRadius: 7,
    padding: 3,
    border: '1px solid #e2e8f0',
};

const tab: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '5px 0',
    borderRadius: 5,
    border: 'none',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.12s, color 0.12s, box-shadow 0.12s',
    background: 'transparent',
    color: '#94a3b8',
    letterSpacing: '0.01em',
    userSelect: 'none',
};

const tabActive: React.CSSProperties = {
    background: '#ffffff',
    color: '#1e40af',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    fontWeight: 600,
};

const axisStack: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
};

const axisRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px 8px 12px',
    borderRadius: 8,
    border: '1px solid',
    borderLeft: '3px solid',
    cursor: 'text',
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
};

const axisLabelBlock: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 32,
    flexShrink: 0,
};

const axisKey: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    lineHeight: 1,
};

const axisSub: React.CSSProperties = {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: 400,
    lineHeight: 1,
};

const axisInput: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: '#1e293b',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    fontWeight: 500,
    outline: 'none',
    textAlign: 'right',
    letterSpacing: '0.01em',
};

const unitLabel: React.CSSProperties = {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: 500,
    flexShrink: 0,
    userSelect: 'none',
};

const hint: React.CSSProperties = {
    marginTop: 10,
    fontSize: 10,
    color: '#cbd5e1',
    textAlign: 'center',
    letterSpacing: '0.01em',
};

export default TransformInputPanel;
