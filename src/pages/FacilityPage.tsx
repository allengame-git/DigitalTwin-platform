/**
 * Facility Page
 * @module pages/FacilityPage
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useFacilityStore } from '../stores/facilityStore';

// Placeholder components — will be implemented in later tasks
const FacilityCanvas = React.lazy(() => import('../components/facility/FacilityCanvas'));
const FacilitySidebar = React.lazy(() => import('../components/facility/FacilitySidebar'));
const FacilityInfoPanel = React.lazy(() => import('../components/facility/FacilityInfoPanel'));
const FacilityToolbar = React.lazy(() => import('../components/facility/FacilityToolbar'));
const TransformInputPanel = React.lazy(() => import('../components/facility/TransformInputPanel'));
const CoordShiftPanel = React.lazy(() => import('../components/facility/CoordShiftPanel'));

export const FacilityPage: React.FC = () => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const { projects, setActiveProject } = useProjectStore();
    const { fetchScenes, enterScene, scenes } = useFacilityStore();

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
                <React.Suspense fallback={null}>
                    <FacilityToolbar />
                </React.Suspense>
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
                    <CoordShiftPanel />
                </React.Suspense>
            </div>
        </div>
    );
};

export default FacilityPage;
