/**
 * Page Tracking Hook
 * 
 * Hook for tracking page views with Sentry breadcrumbs.
 * @see specs/4-user-roles-system/spec.md FR-18
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as Sentry from '@sentry/react';

interface PageTrackingOptions {
    /**
     * Whether to include search params in tracking
     */
    includeSearch?: boolean;
    /**
     * Custom page name override
     */
    pageName?: string;
}

/**
 * Track page views and add Sentry breadcrumbs for navigation.
 * 
 * @example
 * function MyPage() {
 *   usePageTracking();
 *   return <div>...</div>;
 * }
 * 
 * @example
 * function MyPage() {
 *   usePageTracking({ pageName: 'Dashboard' });
 *   return <div>...</div>;
 * }
 */
export function usePageTracking(options: PageTrackingOptions = {}): void {
    const location = useLocation();
    const { includeSearch = false, pageName } = options;

    useEffect(() => {
        const path = includeSearch
            ? `${location.pathname}${location.search}`
            : location.pathname;

        const name = pageName || getPageNameFromPath(location.pathname);

        // Add Sentry breadcrumb for navigation
        Sentry.addBreadcrumb({
            type: 'navigation',
            category: 'page-view',
            message: `Viewed: ${name}`,
            data: {
                path,
                referrer: document.referrer,
            },
            level: 'info',
        });

        // Log in development
        if (import.meta.env.DEV) {
            console.log(`📍 Page view: ${name} (${path})`);
        }
    }, [location.pathname, location.search, includeSearch, pageName]);
}

/**
 * Get a human-readable page name from a path
 */
function getPageNameFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
        return 'Home';
    }

    const pageNames: Record<string, string> = {
        login: '登入',
        dashboard: '儀表板',
        geology: '地質資料',
        engineering: '工程設計',
        simulation: '模擬分析',
        annotations: '審查標註',
        public: '公開導覽',
        tour: '導覽',
        about: '關於',
        admin: '系統管理',
        data: '資料探索',
        invite: '邀請連結',
        unauthorized: '無權限',
    };

    const mainSegment = segments[0];
    return pageNames[mainSegment] || mainSegment.charAt(0).toUpperCase() + mainSegment.slice(1);
}

export default usePageTracking;
