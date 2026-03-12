/**
 * Facility Page
 * @module pages/FacilityPage
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import * as THREE from 'three';
import { useProjectStore } from '../stores/projectStore';
import { useFacilityStore } from '../stores/facilityStore';
import { useReviewStore } from '../stores/reviewStore';
import { facilityCanvasEl, facilityCameraRef, facilityControlsRef } from '../components/facility/FacilityCaptureHandler';
import { useReviewScreenshot } from '../hooks/useReviewScreenshot';
import type { FacilityScene } from '../types/facility';

const FacilityCanvas = React.lazy(() => import('../components/facility/FacilityCanvas'));
const FacilitySidebar = React.lazy(() => import('../components/facility/FacilitySidebar'));
const FacilityInfoPanel = React.lazy(() => import('../components/facility/FacilityInfoPanel'));
const TransformInputPanel = React.lazy(() => import('../components/facility/TransformInputPanel'));
const PlanViewFloating = React.lazy(() => import('../components/facility/PlanViewFloating'));
const AnimationTimeline = React.lazy(() => import('../components/facility/AnimationTimeline'));
const ReviewModePanel = React.lazy(() => import('../components/review/ReviewModePanel'));
const ReviewMarkerDetail = React.lazy(() => import('../components/review/ReviewMarkerDetail'));
const ReviewMarkerForm = React.lazy(() => import('../components/review/ReviewMarkerForm'));
const ReviewMarkerPin = React.lazy(() => import('../components/review/ReviewMarkerPin'));

interface FacilityPageProps {
    moduleId?: string;
}

export const FacilityPage: React.FC<FacilityPageProps> = ({ moduleId }) => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const [searchParams] = useSearchParams();
    const { projects, setActiveProject, activeProjectId } = useProjectStore();
    const fetchScenes = useFacilityStore(state => state.fetchScenes);
    const enterScene = useFacilityStore(state => state.enterScene);
    const selectModel = useFacilityStore(state => state.selectModel);
    const refreshCurrentScene = useFacilityStore(state => state.refreshCurrentScene);
    const scenes = useFacilityStore(state => state.scenes);
    const focusedModelId = useFacilityStore(state => state.focusedModelId);
    const selectedModel = useFacilityStore(state =>
        state.focusedModelId ? state.models.find(m => m.id === state.focusedModelId) : null
    );
    const editMode = useFacilityStore(state => state.editMode);
    const animationMode = useFacilityStore(state => state.animationMode);
    // InfoPanel 開啟條件：有選取且不是裝飾模型，且不在編輯/動畫模式
    const isInfoPanelOpen = !!selectedModel && selectedModel.modelType !== 'decorative' && !editMode && !animationMode;
    const currentScene = useFacilityStore(state => {
        const sid = state.currentSceneId;
        return sid ? state.scenes.find(s => s.id === sid) : null;
    });
    const isLobby = currentScene?.sceneType === 'lobby';
    const transitionState = useFacilityStore(state => state.transitionState);
    const advanceTransition = useFacilityStore(state => state.advanceTransition);
    const startSceneTransition = useFacilityStore(state => state.startSceneTransition);
    const isLoading = useFacilityStore(state => state.isLoading);
    const togglePlanView = useFacilityStore(state => state.togglePlanView);
    const showPlanView = useFacilityStore(state => state.showPlanView);
    const hasPlanImage = !!(currentScene?.planImageUrl || currentScene?.autoPlanImageUrl);

    // Review mode state
    const reviewModeActive = useReviewStore((s) => s.reviewMode);
    const activeSessionId = useReviewStore((s) => s.activeSessionId);
    const reviewMarkers = useReviewStore((s) => s.markers);
    const selectedMarkerId = useReviewStore((s) => s.selectedMarkerId);
    const enterReviewMode = useReviewStore((s) => s.enterReviewMode);
    const selectReviewMarker = useReviewStore((s) => s.selectMarker);

    const effectiveModuleId = moduleId || 'facility';

    const moduleMarkers = useMemo(
        () => reviewMarkers.filter((m) => m.moduleId === effectiveModuleId),
        [reviewMarkers, effectiveModuleId],
    );
    const selectedMarker = useMemo(
        () => reviewMarkers.find((m) => m.id === selectedMarkerId) ?? null,
        [reviewMarkers, selectedMarkerId],
    );

    const [showMarkerForm, setShowMarkerForm] = useState(false);
    const [reviewScreenshotBlob, setReviewScreenshotBlob] = useState<Blob | null>(null);
    const [capturedCamera, setCapturedCamera] = useState<{
        position: { x: number; y: number; z: number };
        target: { x: number; y: number; z: number };
    } | null>(null);

    // Canvas ref for screenshot
    const reviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        const interval = setInterval(() => {
            if (facilityCanvasEl && reviewCanvasRef.current !== facilityCanvasEl) {
                reviewCanvasRef.current = facilityCanvasEl;
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);
    const { capture: captureReview } = useReviewScreenshot(reviewCanvasRef);

    // URL query 自動進入審查模式
    useEffect(() => {
        const reviewSessionId = searchParams.get('review');
        const markerId = searchParams.get('marker');
        if (reviewSessionId && !reviewModeActive) {
            enterReviewMode(reviewSessionId);
            if (markerId) {
                setTimeout(() => selectReviewMarker(markerId), 500);
            }
        }
    }, [searchParams, reviewModeActive, enterReviewMode, selectReviewMarker]);

    const handleAddReviewMarker = useCallback(() => {
        const blob = captureReview();
        setReviewScreenshotBlob(blob);
        const cam = facilityCameraRef;
        const ctrl = facilityControlsRef;
        const camPos = cam ? { x: cam.position.x, y: cam.position.y, z: cam.position.z } : { x: 0, y: 0, z: 0 };
        const camTarget = ctrl?.target
            ? { x: ctrl.target.x, y: ctrl.target.y, z: ctrl.target.z }
            : { x: 0, y: 0, z: 0 };
        setCapturedCamera({ position: camPos, target: camTarget });
        setShowMarkerForm(true);
    }, [captureReview]);

    const handleReviewFlyTo = useCallback(
        (_position: [number, number, number], _target: [number, number, number]) => {
            const ctrl = facilityControlsRef;
            const cam = facilityCameraRef;
            if (ctrl && cam) {
                cam.position.set(..._position);
                if (ctrl.target) ctrl.target.set(..._target);
                ctrl.update?.();
            }
        },
        [],
    );

    // GLB 載入進度 (N6)
    const [loadProgress, setLoadProgress] = useState(100);
    const loadHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const mgr = THREE.DefaultLoadingManager;
        const prevOnStart = mgr.onStart;
        const prevOnProgress = mgr.onProgress;
        const prevOnLoad = mgr.onLoad;

        mgr.onStart = (url, loaded, total) => {
            setLoadProgress(total > 0 ? (loaded / total) * 100 : 0);
            if (loadHideTimer.current) { clearTimeout(loadHideTimer.current); loadHideTimer.current = null; }
            prevOnStart?.call(mgr, url, loaded, total);
        };
        mgr.onProgress = (url, loaded, total) => {
            setLoadProgress(total > 0 ? (loaded / total) * 100 : 50);
            prevOnProgress?.call(mgr, url, loaded, total);
        };
        mgr.onLoad = () => {
            setLoadProgress(100);
            loadHideTimer.current = setTimeout(() => setLoadProgress(100), 500);
            prevOnLoad?.call(mgr);
        };

        return () => {
            mgr.onStart = prevOnStart ?? (() => {});
            mgr.onProgress = prevOnProgress ?? (() => {});
            mgr.onLoad = prevOnLoad ?? (() => {});
            if (loadHideTimer.current) clearTimeout(loadHideTimer.current);
        };
    }, []);

    // Lobby: 選取模型的子場景清單
    const lobbyChildScenes = useMemo<FacilityScene[]>(() => {
        if (!isLobby || !focusedModelId) return [];
        return scenes.filter(s => s.parentModelId === focusedModelId);
    }, [isLobby, focusedModelId, scenes]);

    // Scene transition: fadeOut 完成 → advance; loading 完成 → advance; fadeIn 完成 → advance
    useEffect(() => {
        if (transitionState === 'fadeOut') {
            const timer = setTimeout(() => advanceTransition(), 220); // 200ms fade + 20ms buffer
            return () => clearTimeout(timer);
        }
        if (transitionState === 'fadeIn') {
            const timer = setTimeout(() => advanceTransition(), 220);
            return () => clearTimeout(timer);
        }
    }, [transitionState, advanceTransition]);

    // loading → fadeIn: 等 isLoading 變 false
    useEffect(() => {
        if (transitionState === 'loading' && !isLoading) {
            // 延遲一幀讓模型渲染，再淡入
            const timer = setTimeout(() => advanceTransition(), 50);
            return () => clearTimeout(timer);
        }
    }, [transitionState, isLoading, advanceTransition]);

    // ESC 取消選取
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') selectModel(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectModel]);

    // Tab 切回來時自動刷新場景 (N5)
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                refreshCurrentScene();
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [refreshCurrentScene]);

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
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <React.Suspense fallback={null}>
                            <FacilitySidebar />
                        </React.Suspense>
                    </div>
                    {/* 審查模式面板嵌在側邊欄底部 */}
                    {reviewModeActive && activeProjectId && (
                        <div style={{
                            borderRight: '1px solid #e5e7eb',
                            background: '#fff',
                            flexShrink: 0,
                            maxHeight: '40vh',
                            overflow: 'auto',
                        }}>
                            <React.Suspense fallback={null}>
                                <ReviewModePanel
                                    projectId={activeProjectId}
                                    moduleId={effectiveModuleId}
                                    onFlyTo={handleReviewFlyTo}
                                />
                            </React.Suspense>
                        </div>
                    )}
                </div>
            )}
            <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>載入中...</div>}>
                        <FacilityCanvas>
                            {/* 審查標記 3D Pins */}
                            {reviewModeActive && moduleMarkers.map((m) => (
                                <React.Suspense key={m.id} fallback={null}>
                                    <ReviewMarkerPin
                                        marker={m}
                                        isSelected={m.id === selectedMarkerId}
                                        onClick={() => selectReviewMarker(m.id === selectedMarkerId ? null : m.id)}
                                    />
                                </React.Suspense>
                            ))}
                        </FacilityCanvas>
                    </React.Suspense>
                </div>
                {/* GLB 載入進度條 (N6) */}
                {loadProgress < 100 && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: 3,
                        zIndex: 20,
                        background: 'rgba(0,0,0,0.1)',
                        pointerEvents: 'none',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${loadProgress}%`,
                            background: '#2563eb',
                            transition: 'width 0.3s ease-out',
                            borderRadius: '0 2px 2px 0',
                        }} />
                    </div>
                )}
                {/* 場景切換黑幕過渡 (N1) */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 15,
                    background: '#000',
                    opacity: (transitionState === 'fadeOut' || transitionState === 'loading') ? 1 : 0,
                    pointerEvents: transitionState === 'idle' ? 'none' : 'all',
                    transition: 'opacity 200ms ease-in-out',
                }} />
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
                                onClick={() => startSceneTransition(scene.id, focusedModelId)}
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

                {/* Lobby: 平面圖按鈕 — 左下角 */}
                {isLobby && hasPlanImage && !showPlanView && (
                    <button
                        onClick={togglePlanView}
                        title="開啟平面圖"
                        style={{
                            position: 'absolute',
                            bottom: 24,
                            left: 24,
                            zIndex: 50,
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
                            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                            <line x1="8" y1="2" x2="8" y2="18" />
                            <line x1="16" y1="6" x2="16" y2="22" />
                        </svg>
                        平面圖
                    </button>
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

                {/* 審查模式：toggle 按鈕（未進入審查模式時顯示，非 Lobby） */}
                {!isLobby && !reviewModeActive && (
                    <button
                        onClick={() => enterReviewMode('')}
                        title="進入審查模式"
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            zIndex: 50,
                            background: 'rgba(234,88,12,0.9)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '7px 14px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            boxShadow: '0 2px 8px rgba(234,88,12,0.3)',
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        審查模式
                    </button>
                )}

                {/* 審查模式：新增標記按鈕 */}
                {!isLobby && reviewModeActive && activeSessionId && (
                    <button
                        onClick={handleAddReviewMarker}
                        title="在目前視角新增標記"
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            zIndex: 50,
                            background: 'rgba(234,88,12,0.92)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            boxShadow: '0 2px 12px rgba(234,88,12,0.3)',
                        }}
                    >
                        + 新增標記
                    </button>
                )}

                {/* 審查標記詳情面板 */}
                {reviewModeActive && selectedMarker && (
                    <React.Suspense fallback={null}>
                        <ReviewMarkerDetail
                            marker={selectedMarker}
                            onClose={() => selectReviewMarker(null)}
                        />
                    </React.Suspense>
                )}

                {/* 新增標記表單 */}
                {showMarkerForm && activeSessionId && capturedCamera && (
                    <React.Suspense fallback={null}>
                        <ReviewMarkerForm
                            screenshotBlob={reviewScreenshotBlob}
                            position={capturedCamera.target}
                            cameraPosition={capturedCamera.position}
                            cameraTarget={capturedCamera.target}
                            moduleId={effectiveModuleId}
                            sessionId={activeSessionId}
                            onClose={() => setShowMarkerForm(false)}
                            onCreated={() => setShowMarkerForm(false)}
                        />
                    </React.Suspense>
                )}
            </div>
        </div>
    );
};

export default FacilityPage;
