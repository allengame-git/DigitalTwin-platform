/**
 * ProtectedRoute Component
 * 
 * Route guard for role-based access control.
 * @see specs/4-user-roles-system/spec.md FR-22
 */

import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: UserRole[];
    redirectTo?: string;
    fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
    redirectTo = '/login',
    fallback,
}) => {
    const { user, isAuthenticated, isLoading } = useAuth();
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
