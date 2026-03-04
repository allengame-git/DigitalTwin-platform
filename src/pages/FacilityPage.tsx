/**
 * Facility Page
 * @module pages/FacilityPage
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useFacilityStore } from '../stores/facilityStore';

const FacilityCanvas = React.lazy(() => import('../components/facility/FacilityCanvas'));
const FacilitySidebar = React.lazy(() => import('../components/facility/FacilitySidebar'));
const FacilityInfoPanel = React.lazy(() => import('../components/facility/FacilityInfoPanel'));
const TransformInputPanel = React.lazy(() => import('../components/facility/TransformInputPanel'));
const PlanViewFloating = React.lazy(() => import('../components/facility/PlanViewFloating'));

export const FacilityPage: React.FC = () => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const { projects, setActiveProject } = useProjectStore();
    const { fetchScenes, enterScene, scenes, currentSceneId, setCaptureIntent } = useFacilityStore();
    const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);
    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerCapture = (intent: 'screenshot' | 'autoplan') => {
        if (!currentSceneId && intent === 'autoplan') return;
        setCaptureIntent(intent);
        const msg = intent === 'screenshot' ? '截圖已下載' : '平面圖已儲存';
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => {
            setCaptureFeedback(msg);
            feedbackTimerRef.current = setTimeout(() => setCaptureFeedback(null), 2000);
        }, 300);
    };

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

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
            <React.Suspense fallback={null}>
                <FacilitySidebar />
            </React.Suspense>
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

                {/* Capture buttons — bottom-right corner */}
                <div style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    zIndex: 50,
                    alignItems: 'flex-end',
                }}>
                    {captureFeedback && (
                        <div style={{
                            background: 'rgba(30,30,30,0.85)',
                            color: '#fff',
                            fontSize: 12,
                            padding: '5px 12px',
                            borderRadius: 6,
                            backdropFilter: 'blur(6px)',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                        }}>
                            {captureFeedback}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                        {currentSceneId && (
                            <button
                                onClick={() => triggerCapture('autoplan')}
                                title="將目前視角儲存為場景平面圖"
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
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(230,245,255,0.95)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.88)')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                    <path d="M3 9h18M9 21V9"/>
                                </svg>
                                儲存平面圖
                            </button>
                        )}
                        <button
                            onClick={() => triggerCapture('screenshot')}
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
                                transition: 'background 0.15s',
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
                </div>
            </div>
        </div>
    );
};

export default FacilityPage;
