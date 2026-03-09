/**
 * RoleBasedUI Component
 * 
 * Conditional rendering based on user role.
 * @see specs/4-user-roles-system/spec.md FR-22, FR-23, FR-24, FR-25
 */

import React, { ReactNode } from 'react';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types/auth';
import { hasPermission, type FeatureKey } from '../../config/permissions';

interface RoleBasedUIProps {
    children: ReactNode;
    allowedRoles?: UserRole[];
    requiredPermission?: FeatureKey;
    fallback?: ReactNode;
    hideForRoles?: UserRole[];
}

/**
 * Conditionally render children based on user role
 */
export const RoleBasedUI: React.FC<RoleBasedUIProps> = ({
    children,
    allowedRoles,
    requiredPermission,
    fallback = null,
    hideForRoles,
}) => {
    const user = useAuthStore(state => state.user);

    // No user, show fallback
    if (!user) {
        return <>{fallback}</>;
    }

    // Hide for specific roles
    if (hideForRoles && hideForRoles.includes(user.role)) {
        return <>{fallback}</>;
    }

    // Admin bypass - Admin sees everything (unless explicitly hidden above)
    if (user.role === 'admin') {
        return <>{children}</>;
    }

    // Check allowed roles
    if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
            return <>{fallback}</>;
        }
    }

    // Check required permission
    if (requiredPermission) {
        if (!hasPermission(user.role, requiredPermission)) {
            return <>{fallback}</>;
        }
    }

    return <>{children}</>;
};

/**
 * Show content only for engineers
 */
export const EngineerOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
    children,
    fallback,
}) => (
    <RoleBasedUI allowedRoles={['engineer']} fallback={fallback}>
        {children}
    </RoleBasedUI>
);

/**
 * Show content only for reviewers
 */
export const ReviewerOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
    children,
    fallback,
}) => (
    <RoleBasedUI allowedRoles={['reviewer']} fallback={fallback}>
        {children}
    </RoleBasedUI>
);

/**
 * Show content for authenticated users (not public)
 */
export const AuthenticatedOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
    children,
    fallback,
}) => (
    <RoleBasedUI allowedRoles={['admin', 'engineer', 'reviewer']} fallback={fallback}>
        {children}
    </RoleBasedUI>
);

/**
 * Show content only for admins
 */
export const AdminOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
    children,
    fallback,
}) => (
    <RoleBasedUI allowedRoles={['admin']} fallback={fallback}>
        {children}
    </RoleBasedUI>
);

/**
 * Hide content from public users
 */
export const HideFromPublic: React.FC<{ children: ReactNode }> = ({ children }) => (
    <RoleBasedUI hideForRoles={['public']}>{children}</RoleBasedUI>
);

/**
 * Higher-order component for role-based rendering
 */
export function withRoleBasedUI<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    options: Omit<RoleBasedUIProps, 'children'>
) {
    return function RoleBasedComponent(props: P) {
        return (
            <RoleBasedUI {...options}>
                <WrappedComponent {...props} />
            </RoleBasedUI>
        );
    };
}

/**
 * Hook for checking role-based conditions
 */
export function useRoleCheck() {
    const user = useAuthStore(state => state.user);
    const hasRole = useAuthStore(state => state.hasRole);

    return {
        isAdmin: user?.role === 'admin',
        isEngineer: user?.role === 'engineer',
        isReviewer: user?.role === 'reviewer',
        isPublic: user?.role === 'public',
        hasRole,
        canView: (permission: FeatureKey) =>
            user ? hasPermission(user.role, permission) : false,
    };
}

export default RoleBasedUI;
