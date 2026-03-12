/**
 * ProtectedRoute Component
 * 
 * Route guard for role-based access control.
 * @see specs/4-user-roles-system/spec.md FR-22
 */

import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import type { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: UserRole[];
    requiredModule?: string;
    redirectTo?: string;
    fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
    requiredModule,
    redirectTo = '/login',
    fallback,
}) => {
    const user = useAuthStore(state => state.user);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const isLoading = useAuthStore(state => state.isLoading);
    const mustChangePassword = useAuthStore(state => state.mustChangePassword);
    const location = useLocation();

    // Show loading state
    if (isLoading) {
        return fallback ? (
            <>{fallback}</>
        ) : (
            <div className="protected-loading">
                <style>{`
          .protected-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e5e5;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
                <div className="loading-spinner" />
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // Force password change if required
    if (mustChangePassword && location.pathname !== '/change-password') {
        return <Navigate to="/change-password" state={{ from: location }} replace />;
    }

    // Admin bypass - Admin has access to everything
    if (user.role === 'admin') {
        return <>{children}</>;
    }

    // Check role permissions
    if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
            return <Navigate to="/unauthorized" state={{ from: location }} replace />;
        }
    }

    // Check module permission for viewer
    if (requiredModule && user.role === 'viewer') {
        const pathParts = location.pathname.split('/');
        const projectIdx = pathParts.indexOf('project');
        const projectCode = projectIdx >= 0 ? pathParts[projectIdx + 1] : undefined;

        if (projectCode) {
            const { projects, loading: projectsLoading } = useProjectStore.getState();
            const project = projects.find(p => p.code === projectCode);

            // Projects not yet loaded — show loading instead of granting access
            if (!project && (projectsLoading || projects.length === 0)) {
                return fallback ? (
                    <>{fallback}</>
                ) : (
                    <div className="protected-loading">
                        <style>{`
                            .protected-loading {
                                min-height: 100vh;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                background: #f5f5f5;
                            }
                            .loading-spinner {
                                width: 48px;
                                height: 48px;
                                border: 4px solid #e5e5e5;
                                border-top-color: #2563eb;
                                border-radius: 50%;
                                animation: spin 1s linear infinite;
                            }
                            @keyframes spin {
                                to { transform: rotate(360deg); }
                            }
                        `}</style>
                        <div className="loading-spinner" />
                    </div>
                );
            }

            if (project?.allowedModules && !project.allowedModules.includes(requiredModule)) {
                return <Navigate to={`/project/${projectCode}`} replace />;
            }

            // Project found but no allowedModules — viewer has no module list → deny
            if (project && !project.allowedModules) {
                return <Navigate to={`/project/${projectCode}`} replace />;
            }
        }
    }

    return <>{children}</>;
};

/**
 * Higher-order component version for class components
 */
export function withProtectedRoute<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    allowedRoles?: UserRole[]
) {
    return function ProtectedComponent(props: P) {
        return (
            <ProtectedRoute allowedRoles={allowedRoles}>
                <WrappedComponent {...props} />
            </ProtectedRoute>
        );
    };
}

export default ProtectedRoute;
