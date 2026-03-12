/**
 * Module Page Loader
 *
 * 根據 URL 的 moduleId 動態載入對應的頁面元件
 */

import React, { useEffect, Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useModuleStore } from '../stores/moduleStore';
import { useProjectStore } from '../stores/projectStore';

const PAGE_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
    geology: React.lazy(() => import('./GeologyPage')),
    facility: React.lazy(() => import('./FacilityPage')),
    engineering: React.lazy(() => import('./PlaceholderPages').then(m => ({ default: m.EngineeringPage }))),
    simulation: React.lazy(() => import('./PlaceholderPages').then(m => ({ default: m.SimulationPage }))),
};

const ModulePageLoader: React.FC = () => {
    const { projectCode, moduleId } = useParams<{ projectCode: string; moduleId: string }>();
    const { projects, activeProjectId, setActiveProject, fetchProjects, loading: projectsLoading } = useProjectStore();
    const { modules, loading: modulesLoading, fetchModules, setActiveModuleId } = useModuleStore();

    // Find project by code
    const project = projects.find(p => p.code === projectCode);

    // Set active project if needed
    useEffect(() => {
        if (project && project.id !== activeProjectId) {
            setActiveProject(project.id);
        }
    }, [project, activeProjectId, setActiveProject]);

    // Fetch projects if not loaded
    useEffect(() => {
        if (projects.length === 0 && !projectsLoading) {
            fetchProjects();
        }
    }, [projects.length, projectsLoading, fetchProjects]);

    // Fetch modules when project is available
    useEffect(() => {
        if (project && (modules.length === 0 || modules[0]?.projectId !== project.id)) {
            fetchModules(project.id);
        }
    }, [project, modules, fetchModules]);

    // Set/clear activeModuleId
    useEffect(() => {
        if (moduleId) {
            setActiveModuleId(moduleId);
        }
        return () => {
            setActiveModuleId(null);
        };
    }, [moduleId, setActiveModuleId]);

    // Loading: projects not yet loaded
    if (!project && (projectsLoading || projects.length === 0)) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>載入中...</div>
            </div>
        );
    }

    // Project not found
    if (!project) {
        return <Navigate to="/" replace />;
    }

    // Module loading
    const module = modules.find(m => m.id === moduleId);
    if (!module && modulesLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>載入模組中...</div>
            </div>
        );
    }

    // Module not found
    if (!module) {
        return <Navigate to={`/project/${projectCode}`} replace />;
    }

    // Look up page component
    const PageComponent = PAGE_MAP[module.type];
    if (!PageComponent) {
        return <Navigate to={`/project/${projectCode}`} replace />;
    }

    return (
        <Suspense
            fallback={
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div>載入頁面中...</div>
                </div>
            }
        >
            <PageComponent moduleId={moduleId} />
        </Suspense>
    );
};

export default ModulePageLoader;
