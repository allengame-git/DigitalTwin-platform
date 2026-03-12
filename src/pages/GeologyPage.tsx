/**
 * Geology Page
 * @module pages/GeologyPage
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { GeologyCanvas } from '../components/scene/GeologyCanvas';
import { GeologyErrorBoundary } from '../components/scene/GeologyErrorBoundary';
import { InspectorPanel } from '../components/overlay/InspectorPanel';
import { GeologySidebar } from '../components/layout/GeologySidebar';
import { useProjectStore } from '../stores/projectStore';
import { useLithologyStore } from '../stores/lithologyStore';
import { useTerrainStore } from '../stores/terrainStore';
import { useReviewStore } from '../stores/reviewStore';
import { ReviewMarkerPin } from '../components/review/ReviewMarkerPin';
import ReviewMarkerDetail from '../components/review/ReviewMarkerDetail';
import ReviewMarkerForm from '../components/review/ReviewMarkerForm';
import ReviewModePanel from '../components/review/ReviewModePanel';
import { geologyCanvasEl, geologyCameraRef, geologyControlsRef } from '../components/scene/GeologyCaptureHandler';
import { useReviewScreenshot } from '../hooks/useReviewScreenshot';

interface GeologyPageProps {
    moduleId?: string;
}

export const GeologyPage: React.FC<GeologyPageProps> = ({ moduleId }) => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const [searchParams] = useSearchParams();
    const { projects, setActiveProject, activeProjectId } = useProjectStore();
    const { fetchLithologies } = useLithologyStore();
    const { fetchTerrains } = useTerrainStore();

    // Review mode state
    const reviewMode = useReviewStore((s) => s.reviewMode);
    const activeSessionId = useReviewStore((s) => s.activeSessionId);
    const markers = useReviewStore((s) => s.markers);
    const selectedMarkerId = useReviewStore((s) => s.selectedMarkerId);
    const enterReviewMode = useReviewStore((s) => s.enterReviewMode);
    const selectMarker = useReviewStore((s) => s.selectMarker);

    const [showMarkerForm, setShowMarkerForm] = useState(false);
    const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
    const [capturedCamera, setCapturedCamera] = useState<{
        position: { x: number; y: number; z: number };
        target: { x: number; y: number; z: number };
    } | null>(null);

    // Canvas ref for screenshot
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // Sync module-level canvas el to ref
    useEffect(() => {
        const interval = setInterval(() => {
            if (geologyCanvasEl && canvasRef.current !== geologyCanvasEl) {
                canvasRef.current = geologyCanvasEl;
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const { capture } = useReviewScreenshot(canvasRef);

    // 同步專案狀態與岩性資料 / 地形資料
    useEffect(() => {
        if (projectCode) {
            const project = projects.find(p => p.code === projectCode);
            if (project) {
                setActiveProject(project.id);
                fetchLithologies(project.id);
                fetchTerrains(project.id);
            }
        }
    }, [projectCode, projects, setActiveProject, fetchLithologies, fetchTerrains]);

    // URL query 自動進入審查模式
    useEffect(() => {
        const reviewSessionId = searchParams.get('review');
        const markerId = searchParams.get('marker');
        if (reviewSessionId && !reviewMode) {
            enterReviewMode(reviewSessionId);
            if (markerId) {
                // 延遲選取 marker，等 markers 載入
                setTimeout(() => selectMarker(markerId), 500);
            }
        }
    }, [searchParams, reviewMode, enterReviewMode, selectMarker]);

    // 當前模組的 markers
    const moduleMarkers = useMemo(
        () => markers.filter((m) => m.moduleId === (moduleId || 'geology')),
        [markers, moduleId],
    );

    // 選取的 marker
    const selectedMarker = useMemo(
        () => markers.find((m) => m.id === selectedMarkerId) ?? null,
        [markers, selectedMarkerId],
    );

    // 新增標記：截圖 + 取得相機狀態
    const handleAddMarker = useCallback(() => {
        const blob = capture();
        setScreenshotBlob(blob);

        // 取得相機位置和 target
        const cam = geologyCameraRef;
        const ctrl = geologyControlsRef;
        const camPos = cam ? { x: cam.position.x, y: cam.position.y, z: cam.position.z } : { x: 0, y: 0, z: 0 };
        const camTarget = ctrl?.target
            ? { x: ctrl.target.x, y: ctrl.target.y, z: ctrl.target.z }
            : { x: 0, y: 0, z: 0 };

        setCapturedCamera({ position: camPos, target: camTarget });
        setShowMarkerForm(true);
    }, [capture]);

    // FlyTo callback for ReviewModePanel
    const handleFlyTo = useCallback(
        (_position: [number, number, number], _target: [number, number, number]) => {
            // 透過 cameraStore 或直接操作 controls
            const ctrl = geologyControlsRef;
            const cam = geologyCameraRef;
            if (ctrl && cam) {
                cam.position.set(..._position);
                if (ctrl.target) {
                    ctrl.target.set(..._target);
                }
                ctrl.update?.();
            }
        },
        [],
    );

    const effectiveModuleId = moduleId || 'geology';

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
            {/* 左側整合側邊欄 */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <GeologySidebar />
                </div>
                {/* 審查模式面板嵌在側邊欄底部 */}
                {reviewMode && activeProjectId && (
                    <div style={{
                        width: 320,
                        borderRight: '1px solid #e5e7eb',
                        background: '#fff',
                        flexShrink: 0,
                        maxHeight: '40vh',
                        overflow: 'auto',
                    }}>
                        <ReviewModePanel
                            projectId={activeProjectId}
                            moduleId={effectiveModuleId}
                            onFlyTo={handleFlyTo}
                        />
                    </div>
                )}
            </div>

            {/* 右側 3D 畫布區域 */}
            <div style={{ flex: 1, position: 'relative' }}>
                {/* 3D 場景 - 包裹 ErrorBoundary */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'auto' }}>
                    <GeologyErrorBoundary>
                        <GeologyCanvas showStats>
                            {/* 審查標記 3D Pins */}
                            {reviewMode && moduleMarkers.map((m) => (
                                <ReviewMarkerPin
                                    key={m.id}
                                    marker={m}
                                    isSelected={m.id === selectedMarkerId}
                                    onClick={() => selectMarker(m.id === selectedMarkerId ? null : m.id)}
                                />
                            ))}
                        </GeologyCanvas>
                    </GeologyErrorBoundary>
                </div>

                {/* 統一資料檢視面板 (右下角) */}
                <InspectorPanel />

                {/* 審查模式：toggle 按鈕（未進入審查模式時顯示） */}
                {!reviewMode && (
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
                {reviewMode && activeSessionId && (
                    <button
                        onClick={handleAddMarker}
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
                {reviewMode && selectedMarker && (
                    <ReviewMarkerDetail
                        marker={selectedMarker}
                        onClose={() => selectMarker(null)}
                    />
                )}

                {/* 新增標記表單 */}
                {showMarkerForm && activeSessionId && capturedCamera && (
                    <ReviewMarkerForm
                        screenshotBlob={screenshotBlob}
                        position={capturedCamera.target}
                        cameraPosition={capturedCamera.position}
                        cameraTarget={capturedCamera.target}
                        moduleId={effectiveModuleId}
                        sessionId={activeSessionId}
                        onClose={() => setShowMarkerForm(false)}
                        onCreated={() => setShowMarkerForm(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default GeologyPage;
