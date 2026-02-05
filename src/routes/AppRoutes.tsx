/**
 * App Routes Configuration
 * 
 * Main router configuration with protected routes.
 * @see specs/4-user-roles-system/spec.md FR-22
 */

import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { publicRoutes } from './publicRoutes';

// --- Lazy loaded components ---
const LoginPage = React.lazy(() => import('../pages/LoginPage'));
const UnauthorizedPage = React.lazy(() => import('../pages/UnauthorizedPage'));
const DashboardPage = React.lazy(() => import('../pages/DashboardPage'));

// Lazy load placeholder pages
const DataManagementPage = React.lazy(() => import('../pages/DataManagementPage'));
const GeologyPage = React.lazy(() => import('../pages/GeologyPage'));
const EngineeringPage = React.lazy(() => import('../pages/PlaceholderPages').then(m => ({ default: m.EngineeringPage })));
const SimulationPage = React.lazy(() => import('../pages/PlaceholderPages').then(m => ({ default: m.SimulationPage })));
const AnnotationsPage = React.lazy(() => import('../pages/AnnotationsPage'));

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

// Layout with AuthProvider
const RootLayout: React.FC = () => {
    return (
        <AuthProvider>
            <React.Suspense fallback={<LoadingScreen />}>
                <Outlet />
            </React.Suspense>
        </AuthProvider>
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

            // Protected routes - All authenticated users (admin bypasses automatically)
            {
                path: '/',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'reviewer']}>
                        <DashboardPage />
                    </ProtectedRoute>
                ),
            },

            // Protected routes - Admin and Engineers
            {
                path: '/data',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <DataManagementPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/admin/invites',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                        <AdminInvitesPage />
                    </ProtectedRoute>
                ),
            },

            // Protected routes - Admin only
            {
                path: '/admin/users',
                element: (
                    <ProtectedRoute allowedRoles={['admin']}>
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

            // Protected routes - All authenticated roles
            {
                path: '/geology',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'reviewer']}>
                        <GeologyPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/engineering',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'reviewer']}>
                        <EngineeringPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/simulation',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'engineer', 'reviewer']}>
                        <SimulationPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/annotations',
                element: (
                    <ProtectedRoute allowedRoles={['admin', 'reviewer', 'engineer']}>
                        <AnnotationsPage />
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
    return <RouterProvider router={router} />;
};

export default AppRoutes;
