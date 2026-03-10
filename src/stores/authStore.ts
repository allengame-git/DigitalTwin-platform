/**
 * Auth Store
 * 
 * Zustand store for authentication state management.
 * @see specs/4-user-roles-system/spec.md
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, AuthState, LoginCredentials, AuthTokens } from '../types/auth';
import { SESSION_TIMEOUT, ACCESS_TOKEN_TTL, SESSION_WARNING_THRESHOLD } from '../types/auth';
import * as authApi from '../api/auth';

interface AuthStore extends AuthState {
    // Tokens (access token in memory, refresh via httpOnly cookie)
    accessToken: string | null;
    tokenExpiresAt: number | null;
    sessionExpiresAt: number | null;
    mustChangePassword: boolean;
    _hasHydrated: boolean;

    // Actions
    login: (credentials: LoginCredentials) => Promise<void>;
    loginWithInvite: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
    checkAuth: () => Promise<void>;
    setPublicUser: () => void;
    setHasHydrated: (state: boolean) => void;

    // Password
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>;

    // Session management
    isSessionExpiringSoon: () => boolean;
    getTimeUntilExpiry: () => number;
    extendSession: () => Promise<void>;

    // Utilities
    clearError: () => void;
    hasRole: (roles: UserRole[]) => boolean;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            ...initialState,
            accessToken: null,
            tokenExpiresAt: null,
            sessionExpiresAt: null,
            mustChangePassword: false,
            _hasHydrated: false,

            login: async (credentials: LoginCredentials) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.login(credentials);
                    const sessionExpiry = Date.now() + SESSION_TIMEOUT[response.user.role as Exclude<UserRole, 'public'>];

                    set({
                        user: response.user,
                        isAuthenticated: true,
                        isLoading: false,
                        accessToken: response.tokens.accessToken,
                        tokenExpiresAt: Date.now() + response.tokens.expiresIn,
                        sessionExpiresAt: sessionExpiry,
                        mustChangePassword: response.user.mustChangePassword || false,
                        error: null,
                    });
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : '登入失敗',
                    });
                    throw error;
                }
            },

            loginWithInvite: async (token: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.validateInvite(token);
                    const sessionExpiry = Date.now() + SESSION_TIMEOUT.reviewer;

                    set({
                        user: response.user,
                        isAuthenticated: true,
                        isLoading: false,
                        accessToken: response.tokens.accessToken,
                        tokenExpiresAt: Date.now() + response.tokens.expiresIn,
                        sessionExpiresAt: sessionExpiry,
                        error: null,
                    });
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : '邀請連結無效',
                    });
                    throw error;
                }
            },

            logout: async () => {
                try {
                    await authApi.logout();
                } catch {
                    // Ignore logout API errors
                } finally {
                    set({
                        ...initialState,
                        isLoading: false,
                        accessToken: null,
                        tokenExpiresAt: null,
                        sessionExpiresAt: null,
                        mustChangePassword: false,
                    });
                }
            },

            refreshToken: async () => {
                try {
                    const response = await authApi.refresh();
                    set({
                        accessToken: response.accessToken,
                        tokenExpiresAt: Date.now() + response.expiresIn,
                    });
                } catch {
                    // Refresh failed, logout user
                    await get().logout();
                }
            },

            checkAuth: async () => {
                // 如果還沒水合完成，先跳過，等下一次調用
                if (!get()._hasHydrated) return;

                const { accessToken, tokenExpiresAt, sessionExpiresAt } = get();

                // No token or session expired
                if (!accessToken || !sessionExpiresAt || Date.now() > sessionExpiresAt) {
                    set({ ...initialState, isLoading: false });
                    return;
                }

                // Token expired but session valid, try refresh
                if (tokenExpiresAt && Date.now() > tokenExpiresAt) {
                    await get().refreshToken();
                    const newToken = get().accessToken;
                    if (!newToken) return;
                    try {
                        const user = await authApi.getCurrentUser(newToken);
                        set({ user, isAuthenticated: true, isLoading: false });
                    } catch {
                        await get().logout();
                    }
                    return;
                }

                // Token still valid, verify with server
                try {
                    const user = await authApi.getCurrentUser(accessToken);
                    set({ user, isAuthenticated: true, isLoading: false });
                } catch {
                    await get().logout();
                }
            },

            setPublicUser: () => {
                set({
                    user: {
                        id: 'public',
                        email: '',
                        name: '訪客',
                        role: 'public',
                        createdAt: new Date().toISOString(),
                        lastLoginAt: null,
                    },
                    isAuthenticated: false,
                    isLoading: false,
                    error: null,
                });
            },

            setHasHydrated: (state: boolean) => {
                set({ _hasHydrated: state });
                // 水合完成後立刻檢查一次權限
                if (state) {
                    get().checkAuth();
                }
            },

            isSessionExpiringSoon: () => {
                const { sessionExpiresAt } = get();
                if (!sessionExpiresAt) return false;
                return sessionExpiresAt - Date.now() < SESSION_WARNING_THRESHOLD;
            },

            getTimeUntilExpiry: () => {
                const { sessionExpiresAt } = get();
                if (!sessionExpiresAt) return 0;
                return Math.max(0, sessionExpiresAt - Date.now());
            },

            extendSession: async () => {
                await get().refreshToken();
                const { user } = get();
                if (user && user.role !== 'public') {
                    set({
                        sessionExpiresAt: Date.now() + SESSION_TIMEOUT[user.role as Exclude<UserRole, 'public'>],
                    });
                }
            },

            changePassword: async (oldPassword: string, newPassword: string) => {
                await authApi.changePassword(oldPassword, newPassword);
                set({
                    mustChangePassword: false,
                    user: get().user ? { ...get().user!, mustChangePassword: false } : null,
                });
            },

            clearError: () => set({ error: null }),

            hasRole: (roles: UserRole[]) => {
                const { user } = get();
                return user ? roles.includes(user.role) : false;
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                accessToken: state.accessToken,
                tokenExpiresAt: state.tokenExpiresAt,
                sessionExpiresAt: state.sessionExpiresAt,
                mustChangePassword: state.mustChangePassword,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

export default useAuthStore;
