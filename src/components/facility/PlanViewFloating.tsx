/**
 * PlanViewFloating — 科技感浮動平面圖視窗
 * 拖曳移動、模型標記覆蓋層
 * @module components/facility/PlanViewFloating
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { X, MapPin, DoorOpen, Maximize2, Minimize2, Map } from 'lucide-react';
import { useFacilityStore } from '@/stores/facilityStore';
import type { FacilityModel } from '@/types/facility';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function resolveUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
}

// Corner bracket SVG
function CornerBracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
    const size = 14;
    const thick = 2;
    const color = '#00d4ff';
    const style: React.CSSProperties = {
        position: 'absolute',
        width: size,
        height: size,
        ...(pos === 'tl' ? { top: 0, left: 0 } : {}),
        ...(pos === 'tr' ? { top: 0, right: 0 } : {}),
        ...(pos === 'bl' ? { bottom: 0, left: 0 } : {}),
        ...(pos === 'br' ? { bottom: 0, right: 0 } : {}),
    };
    const lines: React.CSSProperties[] = pos === 'tl' ? [
        { top: 0, left: 0, width: size, height: thick },
        { top: 0, left: 0, width: thick, height: size },
    ] : pos === 'tr' ? [
        { top: 0, right: 0, width: size, height: thick },
        { top: 0, right: 0, width: thick, height: size },
    ] : pos === 'bl' ? [
        { bottom: 0, left: 0, width: size, height: thick },
        { bottom: 0, left: 0, width: thick, height: size },
    ] : [
        { bottom: 0, right: 0, width: size, height: thick },
        { bottom: 0, right: 0, width: thick, height: size },
    ];
    return (
        <div style={style}>
            {lines.map((l, i) => (
                <div key={i} style={{ position: 'absolute', background: color, ...l }} />
            ))}
        </div>
    );
}

export default function PlanViewFloating() {
    const scenes = useFacilityStore(state => state.scenes);
    const currentSceneId = useFacilityStore(state => state.currentSceneId);
    const models = useFacilityStore(state => state.models);
    const selectedModelId = useFacilityStore(state => state.selectedModelId);
    const selectModel = useFacilityStore(state => state.selectModel);
    const flyToModel = useFacilityStore(state => state.flyToModel);
    const showPlanView = useFacilityStore(state => state.showPlanView);
    const togglePlanView = useFacilityStore(state => state.togglePlanView);

    const [expanded, setExpanded] = useState(false); // false = 標準, true = 展開
    const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
    const [tooltipModel, setTooltipModel] = useState<FacilityModel | null>(null);

    // 拖曳狀態
    const [pos, setPos] = useState({ x: 24, y: 24 });
    const dragging = useRef(false);
    const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

    const currentScene = useMemo(
        () => scenes.find(s => s.id === currentSceneId) ?? null,
        [scenes, currentSceneId]
    );

    const planImage = resolveUrl(currentScene?.planImageUrl ?? currentScene?.autoPlanImageUrl ?? null);

    // 計算 bounds
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
        return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
    }, [bounds]);

    // 拖曳處理
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
        dragging.current = true;
        dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
        e.preventDefault();
    }, [pos]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            const dx = e.clientX - dragStart.current.mx;
            const dy = e.clientY - dragStart.current.my;
            setPos({
                x: Math.max(0, dragStart.current.px + dx),
                y: Math.max(0, dragStart.current.py + dy),
            });
        };
        const onUp = () => { dragging.current = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    if (!showPlanView || !planImage) return null;

    const panelW = expanded ? 520 : 320;
    const imgH = expanded ? 400 : 240;

    return (
        <div
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: panelW,
                zIndex: 200,
                userSelect: 'none',
                fontFamily: '"JetBrains Mono", "Consolas", monospace',
                filter: 'drop-shadow(0 0 20px rgba(0,180,255,0.15))',
            }}
        >
            {/* 外框 */}
            <div
                style={{
                    background: 'rgba(6, 12, 22, 0.95)',
                    border: '1px solid rgba(0, 180, 255, 0.35)',
                    borderRadius: 2,
                    overflow: 'visible',
                    backdropFilter: 'blur(12px)',
                    position: 'relative',
                }}
            >
                {/* 四角裝飾 */}
                <CornerBracket pos="tl" />
                <CornerBracket pos="tr" />
                <CornerBracket pos="bl" />
                <CornerBracket pos="br" />

                {/* 標題列 */}
                <div
                    onMouseDown={onMouseDown}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderBottom: '1px solid rgba(0, 180, 255, 0.2)',
                        cursor: 'grab',
                        background: 'rgba(0, 180, 255, 0.04)',
                    }}
                >
                    {/* 狀態指示燈 */}
                    <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#00d4ff',
                        boxShadow: '0 0 6px #00d4ff',
                        flexShrink: 0,
                    }} />

                    <Map size={12} style={{ color: '#00d4ff', flexShrink: 0 }} />

                    <span style={{
                        flex: 1,
                        fontSize: 11,
                        color: '#7dd3fc',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                    }}>
                        FLOOR PLAN
                    </span>

                    <span style={{
                        fontSize: 10,
                        color: 'rgba(0,180,255,0.4)',
                        letterSpacing: '0.05em',
                    }}>
                        {currentScene?.name ?? '—'}
                    </span>

                    {/* 展開/縮小 */}
                    <button
                        data-no-drag="1"
                        onClick={() => setExpanded(e => !e)}
                        title={expanded ? '縮小' : '展開'}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'rgba(0,180,255,0.5)', padding: '2px 4px',
                            display: 'flex', alignItems: 'center',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#00d4ff')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,180,255,0.5)')}
                    >
                        {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </button>

                    {/* 關閉 */}
                    <button
                        data-no-drag="1"
                        onClick={togglePlanView}
                        title="關閉平面圖"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'rgba(255,80,80,0.5)', padding: '2px 4px',
                            display: 'flex', alignItems: 'center',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ff5050')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,80,80,0.5)')}
                    >
                        <X size={12} />
                    </button>
                </div>

                {/* 平面圖區域 */}
                <div style={{ padding: '8px', position: 'relative' }}>
                    {/* 網格背景 */}
                    <div style={{
                        position: 'absolute', inset: 8,
                        backgroundImage: `
                            linear-gradient(rgba(0,180,255,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,180,255,0.04) 1px, transparent 1px)
                        `,
                        backgroundSize: '20px 20px',
                        pointerEvents: 'none',
                    }} />

                    {/* 圖片 + 標記 */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: imgH,
                        overflow: 'hidden',
                        border: '1px solid rgba(0,180,255,0.15)',
                        borderRadius: 1,
                    }}>
                        <img
                            src={planImage}
                            alt="平面圖"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: 'block',
                                background: 'rgba(0,8,20,0.8)',
                                filter: 'brightness(0.9) contrast(1.05)',
                            }}
                            draggable={false}
                        />

                        {/* scan line 掃描效果 */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
                            pointerEvents: 'none',
                        }} />

                        {/* 模型標記 */}
                        {bounds && models.map(model => {
                            const markerPos = getMarkerPos(model);
                            const isSelected = model.id === selectedModelId;
                            const isHovered = model.id === hoveredMarkerId;
                            const hasSubScene = scenes.some(s => s.parentModelId === model.id);
                            const active = isSelected || isHovered;

                            return (
                                <button
                                    key={model.id}
                                    data-no-drag="1"
                                    onClick={() => {
                                        selectModel(model.id);
                                        flyToModel(model.id);
                                    }}
                                    onMouseEnter={() => {
                                        setHoveredMarkerId(model.id);
                                        setTooltipModel(model);
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredMarkerId(null);
                                        setTooltipModel(null);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: `${markerPos.x}%`,
                                        top: `${markerPos.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'transform 0.15s',
                                    }}
                                    title={model.name}
                                >
                                    {/* 脈衝圓環（選取中） */}
                                    {isSelected && (
                                        <div style={{
                                            position: 'absolute',
                                            width: 24, height: 24,
                                            border: '1px solid rgba(0,212,255,0.6)',
                                            borderRadius: '50%',
                                            animation: 'facilityPulse 1.5s ease-out infinite',
                                        }} />
                                    )}

                                    {hasSubScene ? (
                                        <DoorOpen
                                            size={active ? 18 : 14}
                                            style={{
                                                color: isSelected ? '#00d4ff' : isHovered ? '#fbbf24' : '#f59e0b',
                                                filter: active ? 'drop-shadow(0 0 4px currentColor)' : 'none',
                                                transition: 'all 0.15s',
                                            }}
                                        />
                                    ) : (
                                        <MapPin
                                            size={active ? 18 : 14}
                                            style={{
                                                color: isSelected ? '#00d4ff' : isHovered ? '#86efac' : '#4ade80',
                                                filter: active ? 'drop-shadow(0 0 4px currentColor)' : 'none',
                                                transition: 'all 0.15s',
                                            }}
                                        />
                                    )}
                                </button>
                            );
                        })}

                        {/* Tooltip */}
                        {tooltipModel && (() => {
                            const tp = getMarkerPos(tooltipModel);
                            const left = tp.x > 60;
                            return (
                                <div style={{
                                    position: 'absolute',
                                    left: `${tp.x}%`,
                                    top: `${tp.y}%`,
                                    transform: `translate(${left ? 'calc(-100% - 8px)' : '12px'}, -50%)`,
                                    background: 'rgba(6,12,22,0.95)',
                                    border: '1px solid rgba(0,180,255,0.4)',
                                    padding: '4px 8px',
                                    borderRadius: 2,
                                    pointerEvents: 'none',
                                    whiteSpace: 'nowrap',
                                    zIndex: 10,
                                }}>
                                    <div style={{ fontSize: 10, color: '#7dd3fc', letterSpacing: '0.05em' }}>
                                        {tooltipModel.name}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* 底部統計列 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 6,
                        padding: '4px 2px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 4px #4ade80' }} />
                            <span style={{ fontSize: 10, color: 'rgba(0,180,255,0.5)', letterSpacing: '0.05em' }}>
                                MODELS {models.length}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 6, height: 6, background: '#f59e0b', borderRadius: '50%', boxShadow: '0 0 4px #f59e0b' }} />
                            <span style={{ fontSize: 10, color: 'rgba(0,180,255,0.5)', letterSpacing: '0.05em' }}>
                                SCENES {scenes.filter(s => s.parentModelId !== null).length}
                            </span>
                        </div>
                        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(0,180,255,0.3)', letterSpacing: '0.05em' }}>
                            DRAG TO MOVE
                        </div>
                    </div>
                </div>
            </div>

            {/* 脈衝動畫 CSS */}
            <style>{`
                @keyframes facilityPulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
