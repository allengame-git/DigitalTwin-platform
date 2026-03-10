/**
 * PlanViewFloating — 浮動平面圖視窗
 * 淺色風格、四周霧化邊緣、畫面置中 70%
 * 支援編輯模式：拖曳標記位置、切換可見性
 * @module components/facility/PlanViewFloating
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, DoorOpen, Map, Pencil, Eye, EyeOff } from 'lucide-react';
import { useFacilityStore } from '@/stores/facilityStore';
import type { FacilityModel } from '@/types/facility';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function resolveUrl(url: string | null, bust = false): string | null {
    if (!url) return null;
    const base = url.startsWith('http') ? url : `${API_BASE}${url}`;
    return bust ? `${base}?t=${Date.now()}` : base;
}

/** PUT /api/facility/models/:id/plan-marker */
async function updatePlanMarker(
    modelId: string,
    body: { planX?: number | null; planY?: number | null; planVisible?: boolean },
    token: string | null,
) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/facility/models/${modelId}/plan-marker`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to update plan marker');
    return res.json();
}

export default function PlanViewFloating() {
    const scenes        = useFacilityStore(s => s.scenes);
    const currentSceneId = useFacilityStore(s => s.currentSceneId);
    const models        = useFacilityStore(s => s.models);
    const setModels     = useFacilityStore(s => s.setModels);
    const selectedModelId = useFacilityStore(s => s.focusedModelId);
    const selectModel   = useFacilityStore(s => s.selectModel);
    const flyToModel    = useFacilityStore(s => s.flyToModel);
    const showPlanView  = useFacilityStore(s => s.showPlanView);
    const togglePlanView = useFacilityStore(s => s.togglePlanView);

    const [hoveredId, setHoveredId]     = useState<string | null>(null);
    const [tooltipModel, setTooltipModel] = useState<FacilityModel | null>(null);
    const [editMode, setEditMode]       = useState(false);

    // Drag state
    const [draggingId, setDraggingId]   = useState<string | null>(null);
    const imageContainerRef             = useRef<HTMLDivElement>(null);
    const debounceRef                   = useRef<ReturnType<typeof setTimeout>>(undefined);

    const currentScene = useMemo(
        () => scenes.find(s => s.id === currentSceneId) ?? null,
        [scenes, currentSceneId]
    );

    const planImage = resolveUrl(
        currentScene?.planImageUrl ?? currentScene?.autoPlanImageUrl ?? null,
        !currentScene?.planImageUrl && !!currentScene?.autoPlanImageUrl
    );

    // 計算座標 bounds → 標記百分比位置（fallback 用）
    const bounds = useMemo(() => {
        if (currentScene?.terrainBounds) {
            const b = currentScene.terrainBounds;
            return { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ };
        }
        if (models.length === 0) return null;
        const xs = models.map(m => m.position.x);
        const zs = models.map(m => m.position.z);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minZ = Math.min(...zs), maxZ = Math.max(...zs);
        const padX = (maxX - minX) * 0.2 || 50;
        const padZ = (maxZ - minZ) * 0.2 || 50;
        return { minX: minX - padX, maxX: maxX + padX, minZ: minZ - padZ, maxZ: maxZ + padZ };
    }, [currentScene, models]);

    /** 取得標記位置：優先用 planX/planY，否則 fallback 到 3D 映射 */
    const getMarkerPos = useCallback((model: FacilityModel) => {
        if (model.planX != null && model.planY != null) {
            return { x: model.planX, y: model.planY };
        }
        if (!bounds) return { x: 50, y: 50 };
        const rangeX = bounds.maxX - bounds.minX;
        const rangeZ = bounds.maxZ - bounds.minZ;
        const x = rangeX === 0 ? 50 : ((model.position.x - bounds.minX) / rangeX) * 100;
        const y = rangeZ === 0 ? 50 : (1 - (model.position.z - bounds.minZ) / rangeZ) * 100;
        return { x: Math.max(3, Math.min(97, x)), y: Math.max(3, Math.min(97, y)) };
    }, [bounds]);

    /** 篩選顯示的模型：decorative 不顯示，planVisible===false 不顯示（編輯模式例外） */
    const visibleModels = useMemo(() => {
        return models.filter(m => {
            if (m.modelType === 'decorative') return false;
            if (editMode) return true; // 編輯模式顯示全部（含隱藏的）
            return m.planVisible !== false;
        });
    }, [models, editMode]);

    /** 拖曳：pointer → 百分比座標 */
    const pointerToPercent = useCallback((clientX: number, clientY: number) => {
        const el = imageContainerRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        return { x: Math.max(1, Math.min(99, x)), y: Math.max(1, Math.min(99, y)) };
    }, []);

    // Unmount 清理 debounce timer
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    /** 更新本地 model 的 planX/planY（樂觀更新）— 用 getState() 避免 stale closure */
    const updateModelLocal = useCallback((modelId: string, patch: Partial<FacilityModel>) => {
        const current = useFacilityStore.getState().models;
        setModels(current.map(m => m.id === modelId ? { ...m, ...patch } : m));
    }, [setModels]);

    /** 拖曳結束 → debounce 寫入 API */
    const savePlanMarker = useCallback((modelId: string, planX: number, planY: number) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const { useAuthStore } = await import('@/stores/authStore');
                const token = useAuthStore.getState().accessToken;
                await updatePlanMarker(modelId, { planX, planY }, token);
            } catch (e) {
                console.error('Failed to save plan marker:', e);
            }
        }, 300);
    }, []);

    /** 切換可見性 — rollback 用 store 最新值避免 stale closure */
    const toggleVisibility = useCallback(async (model: FacilityModel) => {
        const oldVisible = model.planVisible;
        const newVisible = oldVisible === false ? true : false;
        updateModelLocal(model.id, { planVisible: newVisible });
        try {
            const { useAuthStore } = await import('@/stores/authStore');
            const token = useAuthStore.getState().accessToken;
            await updatePlanMarker(model.id, { planVisible: newVisible }, token);
        } catch (e) {
            console.error('Failed to toggle visibility:', e);
            // rollback：用呼叫時捕捉的 oldVisible，不依賴 closure 中的 model 物件
            updateModelLocal(model.id, { planVisible: oldVisible });
        }
    }, [updateModelLocal]);

    const handlePointerDown = useCallback((e: React.PointerEvent, modelId: string) => {
        if (!editMode) return;
        e.preventDefault();
        e.stopPropagation();
        setDraggingId(modelId);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [editMode]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!draggingId) return;
        const pos = pointerToPercent(e.clientX, e.clientY);
        if (pos) {
            updateModelLocal(draggingId, { planX: pos.x, planY: pos.y });
        }
    }, [draggingId, pointerToPercent, updateModelLocal]);

    const handlePointerUp = useCallback(() => {
        if (!draggingId) return;
        // 用 getState() 取最新 models，避免拖曳過程中 stale closure
        const current = useFacilityStore.getState().models;
        const model = current.find(m => m.id === draggingId);
        if (model && model.planX != null && model.planY != null) {
            savePlanMarker(draggingId, model.planX, model.planY);
        }
        setDraggingId(null);
    }, [draggingId, savePlanMarker]);

    if (!showPlanView || !planImage) return null;

    return (
        <>
            {/* 半透明遮罩（點擊可關閉） */}
            <div
                onClick={togglePlanView}
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 190,
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(1px)',
                }}
            />

            {/* 主面板：置中，70% */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        width: '70%',
                        height: '70%',
                        pointerEvents: 'auto',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* 霧化容器 */}
                    <div
                        ref={imageContainerRef}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        style={{
                            flex: 1,
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.82)',
                            backdropFilter: 'blur(24px) saturate(1.4)',
                            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
                            boxShadow: `
                                0 32px 80px rgba(0,0,0,0.12),
                                0 8px 24px rgba(0,0,0,0.08),
                                inset 0 1px 0 rgba(255,255,255,0.9)
                            `,
                            cursor: draggingId ? 'crosshair' : undefined,
                            WebkitMaskImage: `radial-gradient(
                                ellipse 88% 88% at 50% 50%,
                                black 52%,
                                rgba(0,0,0,0.85) 62%,
                                rgba(0,0,0,0.5) 74%,
                                rgba(0,0,0,0.15) 86%,
                                transparent 100%
                            )`,
                            maskImage: `radial-gradient(
                                ellipse 88% 88% at 50% 50%,
                                black 52%,
                                rgba(0,0,0,0.85) 62%,
                                rgba(0,0,0,0.5) 74%,
                                rgba(0,0,0,0.15) 86%,
                                transparent 100%
                            )`,
                        }}
                    >
                        {/* 圖片 */}
                        <img
                            src={planImage}
                            alt="平面圖"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: 'block',
                            }}
                            draggable={false}
                        />

                        {/* 模型標記 */}
                        {visibleModels.map(model => {
                            const mp = getMarkerPos(model);
                            const isSel = model.id === selectedModelId;
                            const isHov = model.id === hoveredId;
                            const hasSub = scenes.some(s => s.parentModelId === model.id);
                            const active = isSel || isHov;
                            const hidden = model.planVisible === false;
                            const isDragging = model.id === draggingId;

                            return (
                                <div
                                    key={model.id}
                                    style={{
                                        position: 'absolute',
                                        left: `${mp.x}%`,
                                        top: `${mp.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        zIndex: isDragging ? 20 : 2,
                                        opacity: hidden ? 0.35 : 1,
                                    }}
                                >
                                    <button
                                        onClick={() => {
                                            if (!editMode) {
                                                selectModel(model.id);
                                                flyToModel(model.id);
                                            }
                                        }}
                                        onPointerDown={(e) => handlePointerDown(e, model.id)}
                                        onMouseEnter={() => { setHoveredId(model.id); setTooltipModel(model); }}
                                        onMouseLeave={() => { setHoveredId(null); setTooltipModel(null); }}
                                        title={model.name}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: editMode ? (isDragging ? 'crosshair' : 'grab') : 'pointer',
                                            padding: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            touchAction: 'none',
                                        }}
                                    >
                                        {/* 選取脈衝環 */}
                                        {isSel && !editMode && (
                                            <div style={{
                                                position: 'absolute',
                                                width: 28, height: 28,
                                                borderRadius: '50%',
                                                border: '1.5px solid rgba(37,99,235,0.5)',
                                                animation: 'fpulse 1.6s ease-out infinite',
                                            }} />
                                        )}

                                        {/* 標記底圓 */}
                                        <div style={{
                                            width: active ? 32 : 26,
                                            height: active ? 32 : 26,
                                            borderRadius: '50%',
                                            background: isSel
                                                ? 'rgba(37,99,235,0.9)'
                                                : isHov
                                                    ? 'rgba(37,99,235,0.75)'
                                                    : 'rgba(255,255,255,0.88)',
                                            border: editMode
                                                ? '2px dashed rgba(37,99,235,0.6)'
                                                : isSel
                                                    ? '2px solid #1d4ed8'
                                                    : '1.5px solid rgba(37,99,235,0.4)',
                                            boxShadow: isSel
                                                ? '0 2px 12px rgba(37,99,235,0.45)'
                                                : '0 1px 6px rgba(0,0,0,0.12)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.18s ease',
                                            position: 'relative',
                                        }}>
                                            {hasSub ? (
                                                <DoorOpen
                                                    size={active ? 15 : 12}
                                                    style={{
                                                        color: isSel ? 'white' : '#2563eb',
                                                        transition: 'all 0.18s',
                                                    }}
                                                />
                                            ) : (
                                                <MapPin
                                                    size={active ? 15 : 12}
                                                    style={{
                                                        color: isSel ? 'white' : '#2563eb',
                                                        transition: 'all 0.18s',
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </button>

                                    {/* 編輯模式：眼睛按鈕 */}
                                    {editMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleVisibility(model); }}
                                            title={hidden ? '顯示標記' : '隱藏標記'}
                                            style={{
                                                background: 'rgba(255,255,255,0.9)',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                borderRadius: '50%',
                                                width: 20, height: 20,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                padding: 0,
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            }}
                                        >
                                            {hidden
                                                ? <EyeOff size={10} style={{ color: '#94a3b8' }} />
                                                : <Eye size={10} style={{ color: '#2563eb' }} />
                                            }
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        {/* Tooltip */}
                        {tooltipModel && !draggingId && (() => {
                            const tp = getMarkerPos(tooltipModel);
                            const goLeft = tp.x > 65;
                            return (
                                <div style={{
                                    position: 'absolute',
                                    left: `${tp.x}%`,
                                    top: `${tp.y}%`,
                                    transform: `translate(${goLeft ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
                                    background: 'rgba(255,255,255,0.92)',
                                    border: '1px solid rgba(37,99,235,0.2)',
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    pointerEvents: 'none',
                                    whiteSpace: 'nowrap',
                                    zIndex: 10,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    backdropFilter: 'blur(8px)',
                                }}>
                                    <span style={{
                                        fontSize: 12,
                                        color: '#1e3a5f',
                                        fontWeight: 500,
                                        letterSpacing: '0.02em',
                                    }}>
                                        {tooltipModel.name}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* 標題列 */}
                    <div style={{
                        position: 'absolute',
                        top: '7%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.8)',
                        borderRadius: 24,
                        padding: '6px 16px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                        pointerEvents: 'auto',
                        zIndex: 5,
                        whiteSpace: 'nowrap',
                    }}>
                        <Map size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                        <span style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#1e3a5f',
                            letterSpacing: '0.04em',
                        }}>
                            {currentScene?.name ?? '平面圖'}
                        </span>
                        {models.length > 0 && (
                            <span style={{
                                fontSize: 11,
                                color: '#6b7280',
                                fontWeight: 400,
                            }}>
                                · {visibleModels.length} 個模型
                            </span>
                        )}
                    </div>

                    {/* 編輯標記按鈕：關閉按鈕左側 */}
                    <button
                        onClick={() => setEditMode(v => !v)}
                        title={editMode ? '結束編輯標記' : '編輯標記'}
                        style={{
                            position: 'absolute',
                            top: '7%',
                            right: 'calc(8% + 40px)',
                            height: 32,
                            borderRadius: 16,
                            border: editMode
                                ? '1px solid rgba(37,99,235,0.5)'
                                : '1px solid rgba(255,255,255,0.7)',
                            background: editMode
                                ? 'rgba(37,99,235,0.15)'
                                : 'rgba(255,255,255,0.65)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '0 12px',
                            color: editMode ? '#2563eb' : '#374151',
                            fontSize: 11,
                            fontWeight: 500,
                            zIndex: 5,
                            transition: 'all 0.15s',
                        }}
                    >
                        <Pencil size={12} />
                        {editMode ? '完成' : '編輯標記'}
                    </button>

                    {/* 關閉按鈕 */}
                    <button
                        onClick={togglePlanView}
                        title="關閉平面圖"
                        style={{
                            position: 'absolute',
                            top: '7%',
                            right: '8%',
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.7)',
                            background: 'rgba(255,255,255,0.65)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#374151',
                            zIndex: 5,
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.85)';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.borderColor = 'transparent';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.65)';
                            e.currentTarget.style.color = '#374151';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)';
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fpulse {
                    0%   { transform: scale(1);   opacity: 0.7; }
                    100% { transform: scale(2.8); opacity: 0; }
                }
            `}</style>
        </>
    );
}
