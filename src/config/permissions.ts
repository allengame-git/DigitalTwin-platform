/**
 * Permissions Configuration
 * 
 * Role-to-feature permission mapping.
 * @see specs/4-user-roles-system/spec.md FR-04 to FR-18
 */

import type { UserRole } from '../types/auth';

/**
 * Feature permission keys
 */
export type FeatureKey =
    // View features
    | 'view:geology'
    | 'view:engineering'
    | 'view:simulation'
    | 'view:layers'
    | 'view:rawData'
    // Tool features
    | 'tool:measure'
    | 'tool:export'
    | 'tool:layerControl'
    | 'tool:annotation'
    | 'tool:slicing'
    // Admin features
    | 'admin:users'
    | 'admin:invites'
    | 'admin:settings';

/**
 * Permission configuration by role
 */
export const ROLE_PERMISSIONS: Record<UserRole, FeatureKey[]> = {
    admin: [
        // Full access to everything
        'view:geology',
        'view:engineering',
        'view:simulation',
        'view:layers',
        'view:rawData',
        'tool:measure',
        'tool:export',
        'tool:layerControl',
        'tool:annotation',
        'tool:slicing',
        'admin:users',
        'admin:invites',
        'admin:settings',
    ],
    engineer: [
        // Full access except user management
        'view:geology',
        'view:engineering',
        'view:simulation',
        'view:layers',
        'view:rawData',
        'tool:measure',
        'tool:export',
        'tool:layerControl',
        'tool:annotation',
        'tool:slicing',
        'admin:invites',
    ],
    reviewer: [
        // View + Annotation only
        'view:geology',
        'view:engineering',
        'view:simulation',
        'view:layers',
        'tool:layerControl',
        'tool:annotation',
    ],
    public: [
        // Tour mode only - minimal permissions
        'view:geology',
        'view:engineering',
        'view:simulation',
    ],
};

/**
 * Features hidden from specific roles
 */
export const HIDDEN_FEATURES: Partial<Record<UserRole, FeatureKey[]>> = {
    reviewer: [
        'view:rawData',
        'tool:measure',
        'tool:export',
        'tool:slicing',
        'admin:users',
        'admin:invites',
        'admin:settings',
    ],
    public: [
        'view:rawData',
        'view:layers',
        'tool:measure',
        'tool:export',
        'tool:layerControl',
        'tool:annotation',
        'tool:slicing',
        'admin:users',
        'admin:invites',
        'admin:settings',
    ],
};

/**
 * Check if a role has permission for a feature
 */
export function hasPermission(role: UserRole, feature: FeatureKey): boolean {
    return ROLE_PERMISSIONS[role]?.includes(feature) ?? false;
}

/**
 * Check if a feature is hidden for a role
 */
export function isFeatureHidden(role: UserRole, feature: FeatureKey): boolean {
    return HIDDEN_FEATURES[role]?.includes(feature) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): FeatureKey[] {
    return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Feature UI labels (for display)
 */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
    'view:geology': '地質資料',
    'view:engineering': '工程設計',
    'view:simulation': '模擬分析',
    'view:layers': '圖層控制',
    'view:rawData': '原始數據',
    'tool:measure': '量測工具',
    'tool:export': '資料匯出',
    'tool:layerControl': '圖層設定',
    'tool:annotation': '標註工具',
    'tool:slicing': '切片工具',
    'admin:users': '使用者管理',
    'admin:invites': '邀請連結',
    'admin:settings': '系統設定',
};

/**
 * Route-to-permission mapping
 */
export const ROUTE_PERMISSIONS: Record<string, FeatureKey[]> = {
    '/geology': ['view:geology'],
    '/engineering': ['view:engineering'],
    '/simulation': ['view:simulation'],
    '/data': ['view:rawData'],
    '/admin/users': ['admin:users'],
    '/admin/invites': ['admin:invites'],
    '/admin/settings': ['admin:settings'],
};

/**
 * Get required permissions for a route
 */
export function getRoutePermissions(path: string): FeatureKey[] {
    return ROUTE_PERMISSIONS[path] ?? [];
}

/**
 * Check if a role can access a route
 */
export function canAccessRoute(role: UserRole, path: string): boolean {
    const required = getRoutePermissions(path);
    if (required.length === 0) return true; // No restrictions
    return required.some((feature) => hasPermission(role, feature));
}
