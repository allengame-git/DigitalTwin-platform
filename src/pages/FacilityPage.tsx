/**
 * Facility Page
 * @module pages/FacilityPage
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useFacilityStore } from '../stores/facilityStore';
import { facilityCanvasEl } from '../components/facility/FacilityCaptureHandler';
import type { FacilityScene } from '../types/facility';

const FacilityCanvas = React.lazy(() => import('../components/facility/FacilityCanvas'));
const FacilitySidebar = React.lazy(() => import('../components/facility/FacilitySidebar'));
const FacilityInfoPanel = React.lazy(() => import('../components/facility/FacilityInfoPanel'));
const TransformInputPanel = React.lazy(() => import('../components/facility/TransformInputPanel'));
const PlanViewFloating = React.lazy(() => import('../components/facility/PlanViewFloating'));
const AnimationTimeline = React.lazy(() => import('../components/facility/AnimationTimeline'));

export const FacilityPage: React.FC = () => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const { projects, setActiveProject } = useProjectStore();
    const fetchScenes = useFacilityStore(state => state.fetchScenes);
    const enterScene = useFacilityStore(state => state.enterScene);
    const selectModel = useFacilityStore(state => state.selectModel);
    const scenes = useFacilityStore(state => state.scenes);
    const selectedModelId = useFacilityStore(state => state.selectedModelId);
    const selectedModel = useFacilityStore(state =>
        state.selectedModelId ? state.models.find(m => m.id === state.selectedModelId) : null
    );
    const animationMode = useFacilityStore(state => state.animationMode);
    // InfoPanel 開啟條件：有選取且不是裝飾模型，且不在動畫模式
    const isInfoPanelOpen = !!selectedModel && selectedModel.modelType !== 'decorative' && !animationMode;
    const currentScene = useFacilityStore(state => {
        const sid = state.currentSceneId;
        return sid ? state.scenes.find(s => s.id === sid) : null;
    });
    const isLobby = currentScene?.sceneType === 'lobby';

    // Lobby: 選取模型的子場景清單
    const lobbyChildScenes = useMemo<FacilityScene[]>(() => {
        if (!isLobby || !selectedModelId) return [];
        return scenes.filter(s => s.parentModelId === selectedModelId);
    }, [isLobby, selectedModelId, scenes]);

    // ESC 取消選取
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') selectModel(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectModel]);

    // Sync project and fetch scenes
    useEffect(() => {
        if (projectCode) {
            const project = projects.find(p => p.code === projectCode);
            if (project) {
                setActiveProject(project.id);
                fetchScenes(project.id);
            }
        }
    }, [projectCode, projects, setActiveProject, fetchScenes]);

    // Auto-enter root scene when scenes load
    useEffect(() => {
        if (scenes.length > 0) {
            const root = scenes.find(s => s.parentSceneId === null);
            if (root) {
                const { currentSceneId } = useFacilityStore.getState();
                if (!currentSceneId) {
                    enterScene(root.id);
                }
            }
        }
    }, [scenes, enterScene]);

    const handleScreenshot = async () => {
        const canvas = facilityCanvasEl;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/png');
        const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const suggestedName = `facility-${ts}.png`;

        // 支援 File System Access API（Chrome/Edge），不支援則 fallback
        if (typeof (window as any).showSaveFilePicker === 'function') {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName,
                    types: [{ description: 'PNG 圖片', accept: { 'image/png': ['.png'] } }],
                });
                const blob = await (await fetch(dataUrl)).blob();
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (e: any) {
                if (e.name === 'AbortError') return; // 使用者取消
            }
        }

        // Fallback: 直接下載
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = suggestedName;
        a.click();
    };

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
            {!isLobby && (
                <React.Suspense fallback={null}>
                    <FacilitySidebar />
                </React.Suspense>
            )}
            <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>載入中...</div>}>
                        <FacilityCanvas />
                    </React.Suspense>
                </div>
                <React.Suspense fallback={null}>
                    <FacilityInfoPanel />
                </React.Suspense>
                <React.Suspense fallback={null}>
                    <TransformInputPanel />
                </React.Suspense>
                <React.Suspense fallback={null}>
                    <PlanViewFloating />
                </React.Suspense>
                {animationMode && (
                    <React.Suspense fallback={null}>
                        <AnimationTimeline />
                    </React.Suspense>
                )}

                {/* Lobby: 「進入」按鈕 — 畫面上方中央 */}
                {isLobby && lobbyChildScenes.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 60,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                    }}>
                        {lobbyChildScenes.map(scene => (
                            <button
                                key={scene.id}
                                onClick={() => enterScene(scene.id)}
                                style={{
                                    background: 'rgba(37,99,235,0.92)',
                                    color: 'white',
                                    border: '1px solid rgba(147,197,253,0.6)',
                                    borderRadius: 8,
                                    padding: '8px 20px',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                                    backdropFilter: 'blur(8px)',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,1)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.92)')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                進入 {scene.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Lobby mode: back to dashboard */}
                {isLobby && (
                    <div style={{
                        position: 'absolute', top: 16, left: 16, zIndex: 50,
                    }}>
                        <a href={`/project/${projectCode}`}
                           style={{
                               background: 'rgba(255,255,255,0.88)',
                               border: '1px solid rgba(0,0,0,0.12)',
                               borderRadius: 8, padding: '7px 14px', fontSize: 13,
                               color: '#333', cursor: 'pointer',
                               backdropFilter: 'blur(8px)',
                               display: 'flex', alignItems: 'center', gap: 6,
                               boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                               textDecoration: 'none',
                           }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                            返回儀表板
                        </a>
                    </div>
                )}

                {/* Screenshot button — bottom-right corner，InfoPanel 開啟時向左滑開 */}
                {!isLobby && (
                <div style={{
                    position: 'absolute',
                    bottom: animationMode ? 270 : 24,
                    // InfoPanel (width:340, right:24) 開啟時往左移，留 12px 間距
                    right: isInfoPanelOpen ? 24 + 340 + 12 : 24,
                    zIndex: 50,
                    transition: 'right 0.25s cubic-bezier(0.4, 0, 0.2, 1), bottom 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                    <button
                        onClick={handleScreenshot}
                        title="截取目前視角"
                        style={{
                            background: 'rgba(255,255,255,0.88)',
                            border: '1px solid rgba(0,0,0,0.12)',
                            borderRadius: 8,
                            padding: '7px 14px',
                            fontSize: 12,
                            color: '#333',
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.98)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.88)')}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                        </svg>
                        截圖
                    </button>
                </div>
                )}
            </div>
        </div>
    );
};

export default FacilityPage;
