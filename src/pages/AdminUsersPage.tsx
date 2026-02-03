/**
 * Admin Users Page
 * 
 * User management interface for administrators.
 * @see specs/4-user-roles-system/spec.md
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTracking } from '../hooks/usePageTracking';

interface MockUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'engineer' | 'reviewer';
    status: 'active' | 'inactive';
    lastLogin: string | null;
}

// Mock data for demonstration
const mockUsers: MockUser[] = [
    { id: '1', email: 'admin@example.com', name: '管理員 Demo', role: 'admin', status: 'active', lastLogin: '2026-02-03T08:00:00Z' },
    { id: '2', email: 'engineer@example.com', name: '工程師 Demo', role: 'engineer', status: 'active', lastLogin: '2026-02-03T07:30:00Z' },
    { id: '3', email: 'reviewer@example.com', name: '審查委員 Demo', role: 'reviewer', status: 'active', lastLogin: '2026-02-02T15:00:00Z' },
];

const ROLE_LABELS: Record<string, string> = {
    admin: '管理員',
    engineer: '工程師',
    reviewer: '審查委員',
};

const STATUS_LABELS: Record<string, string> = {
    active: '啟用',
    inactive: '停用',
};

export const AdminUsersPage: React.FC = () => {
    usePageTracking({ pageName: '使用者管理' });
    const { user } = useAuth();
    const [users] = useState<MockUser[]>(mockUsers);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-users-page">
            <style>{`
                .admin-users-page {
                    min-height: 100vh;
                    background: #f8fafc;
                }

                .admin-header {
                    background: white;
                    border-bottom: 1px solid #e2e8f0;
                    padding: 16px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .admin-header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .admin-back-link {
                    color: #64748b;
                    text-decoration: none;
                    font-size: 14px;
                }

                .admin-back-link:hover {
                    color: #0f172a;
                }

                .admin-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #0f172a;
                    margin: 0;
                }

                .admin-user-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    color: #64748b;
                }

                .admin-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 24px;
                }

                .admin-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .admin-search {
                    padding: 10px 14px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 14px;
                    width: 300px;
                    background: white;
                }

                .admin-search:focus {
                    outline: none;
                    border-color: #0f172a;
                }

                .admin-btn {
                    padding: 10px 20px;
                    background: #0f172a;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                }

                .admin-btn:hover {
                    background: #1e293b;
                }

                .admin-table {
                    width: 100%;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                }

                .admin-table table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .admin-table th,
                .admin-table td {
                    padding: 14px 16px;
                    text-align: left;
                    border-bottom: 1px solid #f1f5f9;
                }

                .admin-table th {
                    background: #f8fafc;
                    font-size: 12px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .admin-table td {
                    font-size: 14px;
                    color: #334155;
                }

                .admin-table tr:last-child td {
                    border-bottom: none;
                }

                .admin-table tr:hover td {
                    background: #f8fafc;
                }

                .user-name {
                    font-weight: 500;
                    color: #0f172a;
                }

                .user-email {
                    font-size: 13px;
                    color: #64748b;
                }

                .role-badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .role-admin {
                    background: #fef3c7;
                    color: #92400e;
                }

                .role-engineer {
                    background: #dbeafe;
                    color: #1e40af;
                }

                .role-reviewer {
                    background: #dcfce7;
                    color: #166534;
                }

                .status-badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .status-active {
                    background: #dcfce7;
                    color: #166534;
                }

                .status-inactive {
                    background: #fee2e2;
                    color: #991b1b;
                }

                .action-btn {
                    padding: 6px 12px;
                    background: transparent;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    font-size: 13px;
                    color: #475569;
                    cursor: pointer;
                    margin-right: 8px;
                }

                .action-btn:hover {
                    background: #f1f5f9;
                }

                .empty-state {
                    text-align: center;
                    padding: 48px;
                    color: #64748b;
                }
            `}</style>

            <header className="admin-header">
                <div className="admin-header-left">
                    <Link to="/" className="admin-back-link">← 返回儀表板</Link>
                    <h1 className="admin-title">使用者管理</h1>
                </div>
                <div className="admin-user-info">
                    {user?.name} ({ROLE_LABELS[user?.role || '']})
                </div>
            </header>

            <main className="admin-content">
                <div className="admin-toolbar">
                    <input
                        type="text"
                        className="admin-search"
                        placeholder="搜尋使用者..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="admin-btn">
                        + 新增使用者
                    </button>
                </div>

                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>使用者</th>
                                <th>角色</th>
                                <th>狀態</th>
                                <th>最後登入</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="empty-state">
                                        找不到符合條件的使用者
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="user-name">{u.name}</div>
                                            <div className="user-email">{u.email}</div>
                                        </td>
                                        <td>
                                            <span className={`role-badge role-${u.role}`}>
                                                {ROLE_LABELS[u.role]}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${u.status}`}>
                                                {STATUS_LABELS[u.status]}
                                            </span>
                                        </td>
                                        <td>
                                            {u.lastLogin
                                                ? new Date(u.lastLogin).toLocaleString('zh-TW')
                                                : '-'}
                                        </td>
                                        <td>
                                            <button className="action-btn">編輯</button>
                                            <button className="action-btn">停用</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default AdminUsersPage;
