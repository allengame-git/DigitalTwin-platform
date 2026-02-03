/**
 * Public Routes Configuration
 * 
 * Routes accessible without authentication.
 * @see specs/4-user-roles-system/spec.md FR-14
 */

import type { RouteObject } from 'react-router-dom';

/**
 * Public route paths that don't require authentication
 */
export const PUBLIC_PATHS = [
    '/public',
    '/public/tour',
    '/public/about',
    '/invite',
] as const;

/**
 * Check if a path is public (no auth required)
 */
export function isPublicPath(path: string): boolean {
    return PUBLIC_PATHS.some(
        (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`)
    );
}

/**
 * Public route configuration
 */
export const publicRoutes: RouteObject[] = [
    {
        path: '/public',
        lazy: () => import('../layouts/PublicLayout').then((m) => ({ Component: m.default })),
        children: [
            {
                index: true,
                lazy: () => import('../pages/PublicTourPage').then((m) => ({ Component: m.default })),
            },
            {
                path: 'tour',
                lazy: () => import('../pages/PublicTourPage').then((m) => ({ Component: m.default })),
            },
            {
                path: 'about',
                lazy: () => import('../pages/AboutPage').then((m) => ({ Component: m.default })),
            },
        ],
    },
    {
        path: '/invite/:token',
        lazy: () => import('../pages/InvitePage').then((m) => ({ Component: m.default })),
    },
];

export default publicRoutes;
