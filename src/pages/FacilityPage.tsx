/**
 * Facility Page
 * @module pages/FacilityPage
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useFacilityStore } from '../stores/facilityStore';
import { facilityCanvasEl } from '../components/facility/FacilityCaptureHandler';

const FacilityCanvas = React.lazy(() => import('../components/facility/FacilityCanvas'));
const FacilitySidebar = React.lazy(() => import('../components/facility/FacilitySidebar'));
const FacilityInfoPanel = React.lazy(() => import('../components/facility/FacilityInfoPanel'));
const TransformInputPanel = React.lazy(() => import('../components/facility/TransformInputPanel'));
const PlanViewFloating = React.lazy(() => import('../components/facility/PlanViewFloating'));

export const FacilityPage: React.FC = () => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const { projects, setActiveProject } = useProjectStore();
    const fetchScenes = useFacilityStore(state => state.fetchScenes);
    const enterScene = useFacilityStore(state => state.enterScene);
    const scenes = useFacilityStore(state => state.scenes);
    const isLobby = useFacilityStore(state => state.isLobbyMode)();

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

                {/* Screenshot button — bottom-right corner */}
                {!isLobby && (
                <div style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    zIndex: 50,
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
