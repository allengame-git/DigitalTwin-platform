/**
 * AuthContext Provider
 * 
 * Context provider for authentication state and actions.
 * Handles token refresh timer and session expiry warnings.
 * @see specs/4-user-roles-system/spec.md FR-21
 */

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { User, UserRole } from '../types/auth';
import { ACCESS_TOKEN_TTL, SESSION_WARNING_THRESHOLD } from '../types/auth';

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    loginWithInvite: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    hasRole: (roles: UserRole[]) => boolean;
    isSessionExpiringSoon: boolean;
    extendSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
    children: ReactNode;
    onSessionWarning?: () => void;
    onSessionExpired?: () => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
    children,
    onSessionWarning,
    onSessionExpired,
}) => {
    const {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        loginWithInvite,
        logout,
        refreshToken,
        checkAuth,
        hasRole,
        isSessionExpiringSoon,
        getTimeUntilExpiry,
        extendSession,
    } = useAuthStore();

    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
    const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Check auth on mount
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Setup token refresh timer
    useEffect(() => {
        if (!isAuthenticated) {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
            return;
        }

        // Refresh token 2 minutes before expiry
        const refreshInterval = ACCESS_TOKEN_TTL - 2 * 60 * 1000;

        refreshTimerRef.current = setInterval(() => {
            refreshToken();
        }, refreshInterval);

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
        };
    }, [isAuthenticated, refreshToken]);

    // Setup session warning timer
    useEffect(() => {
        if (!isAuthenticated) {
            if (warningTimerRef.current) {
                clearTimeout(warningTimerRef.current);
                warningTimerRef.current = null;
            }
            if (expiryTimerRef.current) {
                clearTimeout(expiryTimerRef.current);
                expiryTimerRef.current = null;
            }
            return;
        }

        const timeUntilExpiry = getTimeUntilExpiry();
        const timeUntilWarning = timeUntilExpiry - SESSION_WARNING_THRESHOLD;

        if (timeUntilWarning > 0) {
            warningTimerRef.current = setTimeout(() => {
                onSessionWarning?.();
            }, timeUntilWarning);
        }

        if (timeUntilExpiry > 0) {
            expiryTimerRef.current = setTimeout(() => {
                logout();
                onSessionExpired?.();
            }, timeUntilExpiry);
        }

        return () => {
            if (warningTimerRef.current) {
                clearTimeout(warningTimerRef.current);
            }
            if (expiryTimerRef.current) {
                clearTimeout(expiryTimerRef.current);
            }
        };
    }, [isAuthenticated, getTimeUntilExpiry, logout, onSessionWarning, onSessionExpired]);

    const value: AuthContextValue = {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        loginWithInvite,
        logout,
        hasRole,
        isSessionExpiringSoon: isSessionExpiringSoon(),
        extendSession,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
