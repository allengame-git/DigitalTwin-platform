/**
 * TransformInputPanel — 模型精確數值輸入面板
 * 編輯模式下選中模型後顯示，允許直接輸入 position / rotation / scale 數值。
 */
import React, { useCallback, useEffect, useState } from 'react';
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

const AXIS_COLOR: Record<Axis, string> = {
    x: '#f87171',
    y: '#4ade80',
    z: '#60a5fa',
};

const AXIS_LABEL: Record<Mode, Record<Axis, string>> = {
    translate: { x: 'X  東',  y: 'Y  高程', z: 'Z  北'    },
    rotate:    { x: 'Rx 俯仰', y: 'Ry 方位', z: 'Rz 橫滾'  },
    scale:     { x: 'X',      y: 'Y',       z: 'Z'         },
};

const HINT: Record<Mode, string> = {
    translate: 'Enter / blur 套用 · 單位：m',
    rotate:    'Enter / blur 套用 · 單位：°',
    scale:     'Enter / blur 套用',
};

const vec3ToStr = (v: Vec3): Record<Axis, string> =>
    ({ x: String(v.x), y: String(v.y), z: String(v.z) });

const TransformInputPanel: React.FC = () => {
    const {
        editMode, editingModelId, models,
        transformMode, setTransformMode, updateModelTransform,
    } = useFacilityStore();

    const editingModel = models.find(m => m.id === editingModelId) ?? null;
    const [draft, setDraft] = useState<Record<Axis, string>>({ x: '0', y: '0', z: '0' });
    const [focusedAxis, setFocusedAxis] = useState<Axis | null>(null);

    useEffect(() => {
        if (!editingModel) return;
        if (transformMode === 'translate') setDraft(vec3ToStr(editingModel.position ?? DEFAULT_VEC3));
        else if (transformMode === 'rotate') setDraft(vec3ToStr(editingModel.rotation ?? DEFAULT_VEC3));
        else setDraft(vec3ToStr(editingModel.scale ?? DEFAULT_SCALE));
    }, [editingModel?.id, transformMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAxisChange = useCallback((axis: Axis, raw: string) => {
        setDraft(prev => ({ ...prev, [axis]: raw }));
    }, []);

    const handleCommit = useCallback(() => {
        if (!editingModelId) return;
        const vec: Vec3 = {
            x: parseFloat(draft.x) || 0,
            y: parseFloat(draft.y) || 0,
            z: parseFloat(draft.z) || 0,
        };
        const transform: Transform = {};
        if (transformMode === 'translate') transform.position = vec;
        else if (transformMode === 'rotate') transform.rotation = vec;
        else transform.scale = vec;
        updateModelTransform(editingModelId, transform);
    }, [editingModelId, transformMode, draft, updateModelTransform]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { handleCommit(); (e.target as HTMLInputElement).blur(); }
    }, [handleCommit]);

    if (!editMode || !editingModelId || !editingModel) return null;

    const axes: Axis[] = ['x', 'y', 'z'];

    return (
        <div style={panel}>
            {/* Header */}
            <div style={header}>
                <div style={headerLeft}>
                    <div style={headerDot} />
                    <span style={headerTitle}>{editingModel.name}</span>
                </div>
                <span style={headerBadge}>TRANSFORM</span>
            </div>

            {/* Divider */}
            <div style={divider} />

            {/* Mode tabs */}
            <div style={modeRow}>
                {MODES.map(({ key, label, Icon }) => {
                    const active = transformMode === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setTransformMode(key)}
                            style={{ ...modeBtn, ...(active ? modeBtnActive : {}) }}
                        >
                            <Icon size={12} strokeWidth={2} opacity={active ? 1 : 0.5} />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Axis inputs */}
            <div style={axisGrid}>
                {axes.map(axis => {
                    const isFocused = focusedAxis === axis;
                    const color = AXIS_COLOR[axis];
                    return (
                        <div key={axis} style={axisCell}>
                            {/* Axis badge */}
                            <div style={{ ...axisBadge, background: `${color}18`, borderColor: `${color}40` }}>
                                <span style={{ ...axisDot, background: color }} />
                                <span style={{ ...axisLabel, color }}>
                                    {AXIS_LABEL[transformMode][axis]}
                                </span>
                            </div>
                            {/* Input */}
                            <input
                                type="text"
                                inputMode="decimal"
                                value={draft[axis]}
                                onChange={e => handleAxisChange(axis, e.target.value)}
                                onFocus={() => setFocusedAxis(axis)}
                                onBlur={() => { setFocusedAxis(null); handleCommit(); }}
                                onKeyDown={handleKeyDown}
                                style={{
                                    ...axisInput,
                                    borderColor: isFocused ? `${color}60` : 'rgba(255,255,255,0.07)',
                                    boxShadow: isFocused ? `0 0 0 1px ${color}30` : 'none',
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Hint */}
            <div style={hint}>{HINT[transformMode]}</div>
        </div>
    );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
    position: 'fixed',
    bottom: 20,
    left: 288,
    zIndex: 30,
    background: 'linear-gradient(160deg, rgba(13,17,27,0.97) 0%, rgba(10,14,22,0.97) 100%)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: '14px 16px',
    minWidth: 340,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
};

const header: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
};

const headerLeft: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
};

const headerDot: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#3b82f6',
    boxShadow: '0 0 8px #3b82f680',
    flexShrink: 0,
};

const headerTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#f1f5f9',
    letterSpacing: '-0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const headerBadge: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: '#3b82f6',
    background: 'rgba(59,130,246,0.12)',
    border: '1px solid rgba(59,130,246,0.25)',
    borderRadius: 4,
    padding: '2px 6px',
    flexShrink: 0,
};

const divider: React.CSSProperties = {
    height: 1,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
    marginBottom: 12,
};

const modeRow: React.CSSProperties = {
    display: 'flex',
    gap: 4,
    marginBottom: 14,
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 3,
    border: '1px solid rgba(255,255,255,0.05)',
};

const modeBtn: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: '6px 0',
    borderRadius: 6,
    border: 'none',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    background: 'transparent',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: '0.01em',
};

const modeBtnActive: React.CSSProperties = {
    background: 'rgba(59,130,246,0.2)',
    color: '#93c5fd',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
};

const axisGrid: React.CSSProperties = {
    display: 'flex',
    gap: 8,
};

const axisCell: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
};

const axisBadge: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 7px',
    borderRadius: 5,
    border: '1px solid',
};

const axisDot: React.CSSProperties = {
    width: 5,
    height: 5,
    borderRadius: '50%',
    flexShrink: 0,
};

const axisLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
};

const axisInput: React.CSSProperties = {
    width: '100%',
    padding: '7px 9px',
    borderRadius: 6,
    border: '1px solid',
    background: 'rgba(255,255,255,0.04)',
    color: '#f1f5f9',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    letterSpacing: '0.02em',
};

const hint: React.CSSProperties = {
    marginTop: 10,
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: '0.02em',
};

export default TransformInputPanel;
