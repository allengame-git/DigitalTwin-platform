/**
 * App Routes Configuration
 * 
 * Main router configuration with protected routes.
 * @see specs/4-user-roles-system/spec.md FR-22
 */

import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { publicRoutes } from './publicRoutes';
import { useProjectStore } from '../stores/projectStore';
import { setOrigin } from '../utils/coordinates';

// --- Lazy loaded components ---
const LoginPage = React.lazy(() => import('../pages/LoginPage'));
const UnauthorizedPage = React.lazy(() => import('../pages/UnauthorizedPage'));
const DashboardPage = React.lazy(() => import('../pages/DashboardPage'));

// Dynamic module loaders
const ModulePageLoader = React.lazy(() => import('../pages/ModulePageLoader'));
const ModuleDataPageLoader = React.lazy(() => import('../pages/ModuleDataPageLoader'));

// Lazy load placeholder pages
const DataManagementPage = React.lazy(() => import('../pages/DataManagementPage'));
const GeologyPage = React.lazy(() => import('../pages/GeologyPage'));
const EngineeringPage = React.lazy(() => import('../pages/PlaceholderPages').then(m => ({ default: m.EngineeringPage })));
const SimulationPage = React.lazy(() => import('../pages/PlaceholderPages').then(m => ({ default: m.SimulationPage })));
const AnnotationsPage = React.lazy(() => import('../pages/AnnotationsPage'));
const ProjectDashboardPage = React.lazy(() => import('../pages/ProjectDashboardPage'));
const FacilityPage = React.lazy(() => import('../pages/FacilityPage'));
const FacilityDataPage = React.lazy(() => import('../pages/FacilityDataPage'));
const ChangePasswordPage = React.lazy(() => import('../pages/ChangePasswordPage'));

// Admin pages
const AdminUsersPage = React.lazy(() => import('../pages/AdminUsersPage'));
const AdminSettingsPage = React.lazy(() => import('../pages/AdminSettingsPage'));
const AdminInvitesPage = React.lazy(() => import('../pages/PlaceholderPages').then(m => ({ default: m.AdminPage })));

// --- Regular components (must be defined BEFORE 'router') ---

// Loading screen component
const LoadingScreen: React.FC = () => (
    <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
    }}>
        <div style={{
            width: 48,
            height: 48,
            border: '4px solid #e5e5e5',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
        }} />
        <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
    </div>
);

// Simple 404 page
const NotFoundPage: React.FC = () => (
    <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
    }}>
        <h1 style={{ fontSize: 72, margin: 0 }}>404</h1>
        <p style={{ fontSize: 18, color: '#666' }}>頁面不存在</p>
        <a href="/" style={{ color: '#2563eb', marginTop: 16 }}>返回首頁</a>
    </div>
);

// Layout (Zustand doesn't need a Provider)
const RootLayout: React.FC = () => {
    return (
        <React.Suspense fallback={<LoadingScreen />}>
            <Outlet />
        </React.Suspense>
    );
};

// --- Router configuration ---
const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            // Public routes (no auth required)
            ...publicRoutes,

            // Auth routes
            {
                path: '/login',
                element: <LoginPage />,
            },
            {
                path: '/unauthorized',
                element: <UnauthorizedPage />,
            },
            {
                path: '/change-password',
                element: <ChangePasswordPage />,
            },

            // Dashboard (專案列表)
            {
                path: '/',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']}>
                        <DashboardPage />
                    </ProtectedRoute>
                ),
            },

            // ============================================
            // Project-scoped routes (新版)
            // ============================================
            {
                path: '/project/:projectCode',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']}>
                        <ProjectDashboardPage />
                    </ProtectedRoute>
                ),
            },
            // Module-based routes (new dynamic loader)
            {
                path: '/project/:projectCode/module/:moduleId',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']} requiredModuleId>
                        <ModulePageLoader />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/project/:projectCode/module/:moduleId/data',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <ModuleDataPageLoader />
                    </ProtectedRoute>
                ),
            },

            // Legacy project-scoped routes (kept for backward compatibility)
            {
                path: '/project/:projectCode/geology',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']} requiredModule="geology">
                        <GeologyPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/project/:projectCode/facility',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']} requiredModule="facility">
                        <FacilityPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/project/:projectCode/engineering',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']} requiredModule="engineering">
                        <EngineeringPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/project/:projectCode/simulation',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']} requiredModule="simulation">
                        <SimulationPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/project/:projectCode/data',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <DataManagementPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/project/:projectCode/facility-data',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <FacilityDataPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/project/:projectCode/annotations',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'viewer', 'engineer']}>
                        <AnnotationsPage />
                    </ProtectedRoute>
                ),
            },

            // ============================================
            // Legacy routes (向後相容，無專案範圍 — viewer 不可用)
            // ============================================
            {
                path: '/data',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <DataManagementPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/geology',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <GeologyPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/engineering',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <EngineeringPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/simulation',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <SimulationPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/annotations',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <AnnotationsPage />
                    </ProtectedRoute>
                ),
            },

            // ============================================
            // Admin routes
            // ============================================
            {
                path: '/admin/invites',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <AdminInvitesPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/admin/users',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <AdminUsersPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/admin/settings',
                element: (
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminSettingsPage />
                    </ProtectedRoute>
                ),
            },

            // Catch-all 404
            {
                path: '*',
                element: <NotFoundPage />,
            },
        ],
    },
]);

/**
 * App Routes Provider
 */
export const AppRoutes: React.FC = () => {
    const { activeProjectId, projects } = useProjectStore();

    // 監聽專案切換，更新全域座標系原點
    React.useEffect(() => {
        if (activeProjectId) {
            const project = projects.find(p => p.id === activeProjectId);
            if (project) {
                // 更新座標轉換工具的原點
                setOrigin(project.originX, project.originY);
                console.log(`🌍 Project Origin updated to: (${project.originX}, ${project.originY})`);
            }
        }
    }, [activeProjectId, projects]);

    return <RouterProvider router={router} />;
};

export default AppRoutes;
