/**
 * CoordShiftPanel — 座標偏移設定面板
 * 編輯模式下顯示，允許調整當前場景的 TWD97 座標偏移與旋轉角度。
 * 直接呼叫 PUT /api/facility/scenes/:id，不依賴 store 專屬 action。
 */
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { MapPin, RotateCcw, Check } from 'lucide-react';
import { useFacilityStore } from '../../stores/facilityStore';
import { useAuthStore } from '../../stores/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface CoordDraft {
    coordShiftX: number;
    coordShiftY: number;
    coordShiftZ: number;
    coordRotation: number;
}

const DEFAULT_DRAFT: CoordDraft = {
    coordShiftX: 0,
    coordShiftY: 0,
    coordShiftZ: 0,
    coordRotation: 0,
};

const CoordShiftPanel: React.FC = () => {
    const { editMode, getCurrentScene, updateScene } = useFacilityStore();
    const accessToken = useAuthStore(s => s.accessToken);

    const [draft, setDraft] = useState<CoordDraft>(DEFAULT_DRAFT);
    const [saving, setSaving] = useState(false);
    const [savedOk, setSavedOk] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentScene = getCurrentScene();

    // Sync draft when current scene changes
    useEffect(() => {
        if (!currentScene) return;
        setDraft({
            coordShiftX: currentScene.coordShiftX ?? 0,
            coordShiftY: currentScene.coordShiftY ?? 0,
            coordShiftZ: currentScene.coordShiftZ ?? 0,
            coordRotation: currentScene.coordRotation ?? 0,
        });
    }, [currentScene?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = useCallback((field: keyof CoordDraft, raw: string) => {
        const value = parseFloat(raw);
        if (isNaN(value)) return;
        setDraft(prev => ({ ...prev, [field]: value }));
        setSavedOk(false);
        setError(null);
    }, []);

    const handleApply = useCallback(async () => {
        if (!currentScene) return;
        setSaving(true);
        setError(null);
        try {
            // 優先使用 store.updateScene（已存在），同步本地 scenes 狀態
            await updateScene(currentScene.id, {
                coordShiftX: draft.coordShiftX,
                coordShiftY: draft.coordShiftY,
                coordShiftZ: draft.coordShiftZ,
                coordRotation: draft.coordRotation,
            });
            setSavedOk(true);
            setTimeout(() => setSavedOk(false), 2000);
        } catch (err: any) {
            // Fallback: 直接呼叫 API（updateScene 失敗時）
            try {
                await axios.put(
                    `${API_BASE}/api/facility/scenes/${currentScene.id}`,
                    draft,
                    {
                        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
                        withCredentials: true,
                    }
                );
                setSavedOk(true);
                setTimeout(() => setSavedOk(false), 2000);
            } catch (apiErr: any) {
                setError(apiErr?.response?.data?.error ?? apiErr.message ?? '儲存失敗');
            }
        } finally {
            setSaving(false);
        }
    }, [currentScene, draft, updateScene, accessToken]);

    const handleReset = useCallback(() => {
        if (!currentScene) return;
        setDraft({
            coordShiftX: currentScene.coordShiftX ?? 0,
            coordShiftY: currentScene.coordShiftY ?? 0,
            coordShiftZ: currentScene.coordShiftZ ?? 0,
            coordRotation: currentScene.coordRotation ?? 0,
        });
        setSavedOk(false);
        setError(null);
    }, [currentScene]);

    if (!editMode) return null;

    const labelStyle: React.CSSProperties = {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 2,
        letterSpacing: '0.05em',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '5px 8px',
        borderRadius: 5,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.4)',
        color: '#f3f4f6',
        fontSize: 13,
        outline: 'none',
        boxSizing: 'border-box',
    };

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: 30,
                background: 'rgba(17, 24, 39, 0.92)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: '12px 14px',
                width: 280,
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                color: '#e5e7eb',
                fontFamily: 'inherit',
            }}
        >
            {/* 標題 */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 12,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)',
                    letterSpacing: '0.05em',
                }}
            >
                <MapPin size={13} />
                座標偏移
                {currentScene && (
                    <span style={{ marginLeft: 4, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>
                        — {currentScene.name}
                    </span>
                )}
            </div>

            {/* Shift X / Y / Z */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {(['coordShiftX', 'coordShiftY', 'coordShiftZ'] as const).map(field => {
                    const axisLabel = field.replace('coordShift', '');
                    const axisColor = axisLabel === 'X' ? '#f87171' : axisLabel === 'Y' ? '#4ade80' : '#60a5fa';
                    return (
                        <div key={field} style={{ flex: 1 }}>
                            <div style={{ ...labelStyle, color: axisColor }}>
                                Shift {axisLabel}
                            </div>
                            <input
                                type="number"
                                step={1}
                                value={draft[field]}
                                onChange={e => handleChange(field, e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Rotation */}
            <div style={{ marginBottom: 12 }}>
                <div style={labelStyle}>旋轉角度（°）</div>
                <input
                    type="number"
                    step={0.1}
                    min={-180}
                    max={180}
                    value={draft.coordRotation}
                    onChange={e => handleChange('coordRotation', e.target.value)}
                    style={{ ...inputStyle, width: '100%' }}
                />
            </div>

            {/* 錯誤訊息 */}
            {error && (
                <div
                    style={{
                        marginBottom: 8,
                        padding: '4px 8px',
                        borderRadius: 5,
                        background: 'rgba(239,68,68,0.2)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        color: '#fca5a5',
                        fontSize: 11,
                    }}
                >
                    {error}
                </div>
            )}

            {/* 操作按鈕 */}
            <div style={{ display: 'flex', gap: 6 }}>
                {/* 重設 */}
                <button
                    onClick={handleReset}
                    disabled={saving}
                    title="重設為已儲存值"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '5px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 12,
                        cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                >
                    <RotateCcw size={12} />
                </button>

                {/* 套用 */}
                <button
                    onClick={handleApply}
                    disabled={saving || !currentScene}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '5px 0',
                        borderRadius: 6,
                        border: savedOk
                            ? '1px solid rgba(74,222,128,0.5)'
                            : '1px solid rgba(59,130,246,0.5)',
                        background: savedOk
                            ? 'rgba(74,222,128,0.2)'
                            : saving
                                ? 'rgba(59,130,246,0.15)'
                                : 'rgba(59,130,246,0.3)',
                        color: savedOk ? '#4ade80' : '#93c5fd',
                        fontSize: 12,
                        cursor: (saving || !currentScene) ? 'not-allowed' : 'pointer',
                        transition: 'background 0.15s, border-color 0.15s',
                    }}
                >
                    {savedOk ? (
                        <>
                            <Check size={12} />
                            已套用
                        </>
                    ) : saving ? (
                        '套用中...'
                    ) : (
                        '套用'
                    )}
                </button>
            </div>

            {/* 提示 */}
            <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                TWD97 座標系統，單位：公尺；旋轉：度
            </div>
        </div>
    );
};

export default CoordShiftPanel;
