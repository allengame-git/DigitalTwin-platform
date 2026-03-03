/**
 * TransformInputPanel — 模型精確數值輸入面板
 * 編輯模式下選中模型後顯示，允許直接輸入 position / rotation / scale 數值。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useFacilityStore } from '../../stores/facilityStore';
import type { Transform } from '../../types/facility';

type Axis = 'x' | 'y' | 'z';
type Mode = 'translate' | 'rotate' | 'scale';

interface Vec3 {
    x: number;
    y: number;
    z: number;
}

const MODE_LABELS: Record<Mode, string> = {
    translate: '移動',
    rotate: '旋轉',
    scale: '縮放',
};

const DEFAULT_VEC3: Vec3 = { x: 0, y: 0, z: 0 };
const DEFAULT_SCALE: Vec3 = { x: 1, y: 1, z: 1 };

const TransformInputPanel: React.FC = () => {
    const {
        editMode,
        editingModelId,
        models,
        transformMode,
        setTransformMode,
        updateModelTransform,
    } = useFacilityStore();

    const editingModel = models.find(m => m.id === editingModelId) ?? null;

    // Local draft values (to avoid calling API on every keystroke)
    const [draft, setDraft] = useState<Vec3>(DEFAULT_VEC3);

    // Sync draft when editing model or transform mode changes
    useEffect(() => {
        if (!editingModel) return;
        if (transformMode === 'translate') {
            setDraft(editingModel.position ?? DEFAULT_VEC3);
        } else if (transformMode === 'rotate') {
            setDraft(editingModel.rotation ?? DEFAULT_VEC3);
        } else {
            setDraft(editingModel.scale ?? DEFAULT_SCALE);
        }
    }, [editingModel?.id, transformMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAxisChange = useCallback((axis: Axis, raw: string) => {
        const value = parseFloat(raw);
        if (isNaN(value)) return;
        setDraft(prev => ({ ...prev, [axis]: value }));
    }, []);

    const handleCommit = useCallback(() => {
        if (!editingModelId) return;
        const transform: Transform = {};
        if (transformMode === 'translate') transform.position = draft;
        else if (transformMode === 'rotate') transform.rotation = draft;
        else transform.scale = draft;
        updateModelTransform(editingModelId, transform);
    }, [editingModelId, transformMode, draft, updateModelTransform]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleCommit();
    }, [handleCommit]);

    // 不顯示條件
    if (!editMode || !editingModelId || !editingModel) return null;

    const axes: Axis[] = ['x', 'y', 'z'];

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 16,
                left: 280,
                zIndex: 30,
                background: 'rgba(17, 24, 39, 0.92)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: '12px 14px',
                minWidth: 320,
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                color: '#e5e7eb',
                fontFamily: 'inherit',
            }}
        >
            {/* 標題 + 模型名稱 */}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.05em' }}>
                TRANSFORM — {editingModel.name}
            </div>

            {/* 模式切換 */}
            <div
                style={{
                    display: 'flex',
                    gap: 4,
                    marginBottom: 12,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 6,
                    padding: 3,
                }}
            >
                {(Object.keys(MODE_LABELS) as Mode[]).map(mode => (
                    <button
                        key={mode}
                        onClick={() => setTransformMode(mode)}
                        style={{
                            flex: 1,
                            padding: '4px 0',
                            borderRadius: 4,
                            border: 'none',
                            fontSize: 12,
                            cursor: 'pointer',
                            transition: 'background 0.15s, color 0.15s',
                            background: transformMode === mode
                                ? 'rgba(59,130,246,0.7)'
                                : 'transparent',
                            color: transformMode === mode ? '#fff' : 'rgba(255,255,255,0.45)',
                        }}
                    >
                        {MODE_LABELS[mode]}
                    </button>
                ))}
            </div>

            {/* XYZ 輸入框 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {axes.map(axis => (
                    <div key={axis} style={{ flex: 1 }}>
                        <label
                            style={{
                                display: 'block',
                                fontSize: 10,
                                color: axis === 'x' ? '#f87171' : axis === 'y' ? '#4ade80' : '#60a5fa',
                                marginBottom: 3,
                                fontWeight: 600,
                                letterSpacing: '0.05em',
                            }}
                        >
                            {transformMode === 'translate'
                                ? axis === 'x' ? 'X 東' : axis === 'y' ? 'Z 高程' : 'Y 北'
                                : transformMode === 'rotate'
                                    ? axis === 'x' ? 'Rx 俯仰' : axis === 'y' ? 'Ry 方位' : 'Rz 橫滾'
                                    : axis.toUpperCase()
                            }
                        </label>
                        <input
                            type="number"
                            step={transformMode === 'rotate' ? 1 : transformMode === 'scale' ? 0.01 : 0.1}
                            value={draft[axis]}
                            onChange={e => handleAxisChange(axis, e.target.value)}
                            onBlur={handleCommit}
                            onKeyDown={handleKeyDown}
                            style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: 5,
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: 'rgba(0,0,0,0.4)',
                                color: '#f3f4f6',
                                fontSize: 13,
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* 提示文字 */}
            <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                {transformMode === 'translate' && '按 Enter 或失去焦點後套用（m）• 水平面 X-Z，Y 為高程'}
                {transformMode === 'rotate' && '按 Enter 或失去焦點後套用（度）• Ry 為水平方位旋轉'}
                {transformMode === 'scale' && '按 Enter 或失去焦點後套用'}
            </div>
        </div>
    );
};

export default TransformInputPanel;
