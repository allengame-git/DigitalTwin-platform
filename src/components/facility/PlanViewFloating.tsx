/**
 * PlanViewFloating — 浮動平面圖視窗
 * 淺色風格、四周霧化邊緣、畫面置中 70%
 * @module components/facility/PlanViewFloating
 */

import { useState, useMemo, useCallback } from 'react';
import { X, MapPin, DoorOpen, Map } from 'lucide-react';
import { useFacilityStore } from '@/stores/facilityStore';
import type { FacilityModel } from '@/types/facility';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function resolveUrl(url: string | null, bust = false): string | null {
    if (!url) return null;
    const base = url.startsWith('http') ? url : `${API_BASE}${url}`;
    return bust ? `${base}?t=${Date.now()}` : base;
}

export default function PlanViewFloating() {
    const scenes        = useFacilityStore(s => s.scenes);
    const currentSceneId = useFacilityStore(s => s.currentSceneId);
    const models        = useFacilityStore(s => s.models);
    const selectedModelId = useFacilityStore(s => s.focusedModelId);
    const selectModel   = useFacilityStore(s => s.selectModel);
    const flyToModel    = useFacilityStore(s => s.flyToModel);
    const showPlanView  = useFacilityStore(s => s.showPlanView);
    const togglePlanView = useFacilityStore(s => s.togglePlanView);

    const [hoveredId, setHoveredId]     = useState<string | null>(null);
    const [tooltipModel, setTooltipModel] = useState<FacilityModel | null>(null);

    const currentScene = useMemo(
        () => scenes.find(s => s.id === currentSceneId) ?? null,
        [scenes, currentSceneId]
    );

    const planImage = resolveUrl(
        currentScene?.planImageUrl ?? currentScene?.autoPlanImageUrl ?? null,
        !currentScene?.planImageUrl && !!currentScene?.autoPlanImageUrl  // auto-plan 加 cache-bust
    );

    // 計算座標 bounds → 標記百分比位置
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

    const getMarkerPos = useCallback((model: FacilityModel) => {
        if (!bounds) return { x: 50, y: 50 };
        const rangeX = bounds.maxX - bounds.minX;
        const rangeZ = bounds.maxZ - bounds.minZ;
        const x = rangeX === 0 ? 50 : ((model.position.x - bounds.minX) / rangeX) * 100;
        const y = rangeZ === 0 ? 50 : (1 - (model.position.z - bounds.minZ) / rangeZ) * 100;
        return { x: Math.max(3, Math.min(97, x)), y: Math.max(3, Math.min(97, y)) };
    }, [bounds]);

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
                    {/* 霧化容器：四周 mask 漸層消退 */}
                    <div
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
                            // 四周霧化遮罩：中央清晰，邊緣消退
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
                        {bounds && models.map(model => {
                            const mp = getMarkerPos(model);
                            const isSel = model.id === selectedModelId;
                            const isHov = model.id === hoveredId;
                            const hasSub = scenes.some(s => s.parentModelId === model.id);
                            const active = isSel || isHov;

                            return (
                                <button
                                    key={model.id}
                                    onClick={() => { selectModel(model.id); flyToModel(model.id); }}
                                    onMouseEnter={() => { setHoveredId(model.id); setTooltipModel(model); }}
                                    onMouseLeave={() => { setHoveredId(null); setTooltipModel(null); }}
                                    title={model.name}
                                    style={{
                                        position: 'absolute',
                                        left: `${mp.x}%`,
                                        top: `${mp.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 2,
                                    }}
                                >
                                    {/* 選取脈衝環 */}
                                    {isSel && (
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
                                        border: isSel
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
                            );
                        })}

                        {/* Tooltip */}
                        {tooltipModel && (() => {
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

                    {/* 標題列：浮在霧化層之上，置中下方 */}
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
                                · {models.length} 個模型
                            </span>
                        )}
                    </div>

                    {/* 關閉按鈕：右上角 */}
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
