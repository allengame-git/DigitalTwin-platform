/**
 * Admin Store
 *
 * Zustand store for admin user management and audit logs.
 */

import { create } from 'zustand';
import type {
    AdminUser, CreateUserRequest, CreateUserResponse,
    AuditLogEntry, AuditLogFilters, UserSession
} from '../types/auth';
import * as adminApi from '../api/admin';

interface AdminStore {
    // Users
    users: AdminUser[];
    usersLoading: boolean;
    usersError: string | null;

    // Audit logs
    auditLogs: AuditLogEntry[];
    auditLogsTotal: number;
    auditLogsLoading: boolean;

    // User sessions
    userSessions: UserSession[];
    userSessionsLoading: boolean;

    // Actions
    fetchUsers: () => Promise<void>;
    createUser: (data: CreateUserRequest) => Promise<CreateUserResponse>;
    updateUser: (id: string, data: Partial<AdminUser>) => Promise<void>;
    resetPassword: (id: string) => Promise<{ temporaryPassword: string }>;
    unlockUser: (id: string) => Promise<void>;
    disableUser: (id: string) => Promise<void>;
    fetchAuditLogs: (filters: AuditLogFilters) => Promise<void>;
    fetchUserSessions: (userId: string) => Promise<void>;
    revokeUserSessions: (userId: string) => Promise<void>;
}

export const useAdminStore = create<AdminStore>()((set, get) => ({
    users: [],
    usersLoading: false,
    usersError: null,
    auditLogs: [],
    auditLogsTotal: 0,
    auditLogsLoading: false,
    userSessions: [],
    userSessionsLoading: false,

    fetchUsers: async () => {
        set({ usersLoading: true, usersError: null });
        try {
            const users = await adminApi.fetchUsers();
            set({ users, usersLoading: false });
        } catch (error) {
            set({ usersLoading: false, usersError: error instanceof Error ? error.message : '載入失敗' });
        }
    },

    createUser: async (data) => {
        const response = await adminApi.createUser(data);
        await get().fetchUsers();
        return response;
    },

    updateUser: async (id, data) => {
        await adminApi.updateUser(id, data);
        await get().fetchUsers();
    },

    resetPassword: async (id) => {
        const result = await adminApi.resetPassword(id);
        await get().fetchUsers();
        return result;
    },

    unlockUser: async (id) => {
        await adminApi.unlockUser(id);
        await get().fetchUsers();
    },

    disableUser: async (id) => {
        await adminApi.disableUser(id);
        await get().fetchUsers();
    },

    fetchAuditLogs: async (filters) => {
        set({ auditLogsLoading: true });
        try {
            const result = await adminApi.fetchAuditLogs(filters);
            set({
                auditLogs: result.data,
                auditLogsTotal: result.total,
                auditLogsLoading: false,
            });
        } catch {
            set({ auditLogsLoading: false });
        }
    },

    fetchUserSessions: async (userId) => {
        set({ userSessionsLoading: true });
        try {
            const sessions = await adminApi.fetchUserSessions(userId);
            set({ userSessions: sessions, userSessionsLoading: false });
        } catch {
            set({ userSessionsLoading: false });
        }
    },

    revokeUserSessions: async (userId) => {
        await adminApi.revokeUserSessions(userId);
        await get().fetchUserSessions(userId);
        await get().fetchUsers();
    },
}));
