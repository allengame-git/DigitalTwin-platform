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
    const [users, setUsers] = useState<MockUser[]>(mockUsers);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);

    // Form State (Extended to include password)
    const [formData, setFormData] = useState<Partial<MockUser> & { password?: string }>({});

    const handleAddClick = () => {
        setModalMode('add');
        setEditingUserId(null);
        setFormData({
            name: '',
            email: '',
            role: 'engineer',
            status: 'active',
            password: ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditClick = (user: MockUser) => {
        setModalMode('edit');
        setEditingUserId(user.id);
        setFormData({ ...user, password: '' }); // Clear password for security/placeholder
        setIsEditModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (modalMode === 'add') {
            // Validate Add
            if (!formData.email || !formData.name || !formData.password) {
                alert('請填寫所有欄位');
                return;
            }
            if (users.some(u => u.email === formData.email)) {
                alert('此 Email 已被使用');
                return;
            }

            const newUser: MockUser = {
                id: Date.now().toString(),
                email: formData.email!,
                name: formData.name!,
                role: formData.role || 'engineer',
                status: 'active',
                lastLogin: null
            };
            setUsers([...users, newUser]);

        } else {
            // Validate Edit
            if (!editingUserId) return;

            setUsers(users.map(u =>
                u.id === editingUserId
                    ? {
                        ...u,
                        name: formData.name!,
                        role: formData.role!,
                        // In a real app, we'd handle password update here
                        // password: formData.password ? formData.password : u.password
                    } as MockUser
                    : u
            ));
        }

        setIsEditModalOpen(false);
    };

    const handleDisableClick = (user: MockUser) => {
        const action = user.status === 'active' ? '停用' : '啟用';
        if (window.confirm(`確定要${action}使用者 ${user.name} 嗎？`)) {
            setUsers(users.map(u =>
                u.id === user.id
                    ? { ...u, status: user.status === 'active' ? 'inactive' : 'active' }
                    : u
            ));
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-users-page">
            <style>{`
                /* ... existing styles ... */
                .admin-users-page {
                    min-height: 100vh;
                    background: #f8fafc;
                }
                /* ... keep previously defined styles ... */
                /* Need to ensure we don't accidentally remove existing styles in this abbreviated block via Search/Replace tool */
                /* Retaining core layout styles */
                
                .admin-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
                .admin-header-left { display: flex; align-items: center; gap: 16px; }
                .admin-back-link { color: #64748b; text-decoration: none; font-size: 14px; }
                .admin-title { font-size: 20px; font-weight: 600; color: #0f172a; margin: 0; }
                .admin-user-info { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #64748b; }
                .admin-content { max-width: 1200px; margin: 0 auto; padding: 24px; }
                .admin-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .admin-search { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; width: 300px; background: white; }
                .admin-btn { padding: 10px 20px; background: #0f172a; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
                .admin-table { width: 100%; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
                .admin-table table { width: 100%; border-collapse: collapse; }
                .admin-table th, .admin-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #f1f5f9; }
                .admin-table th { background: #f8fafc; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
                .admin-table td { font-size: 14px; color: #334155; }
                .role-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
                .role-admin { background: #fef3c7; color: #92400e; }
                .role-engineer { background: #dbeafe; color: #1e40af; }
                .role-reviewer { background: #dcfce7; color: #166534; }
                .status-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
                .status-active { background: #dcfce7; color: #166534; }
                .status-inactive { background: #fee2e2; color: #991b1b; }
                .action-btn { padding: 6px 12px; background: transparent; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; color: #475569; cursor: pointer; margin-right: 8px; }
                .action-btn:hover { background: #f1f5f9; }
                .action-btn-danger:hover { background: #fee2e2; color: #991b1b; border-color: #fee2e2; }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex; justify-content: center; align-items: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    width: 400px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }
                .modal-title { margin-top: 0; margin-bottom: 20px; font-size: 18px; font-weight: 600; }
                .form-group { margin-bottom: 16px; }
                .form-label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #64748b; }
                .form-hint { font-size: 12px; color: #94a3b8; margin-top: 4px; }
                .form-input, .form-select {
                    width: 100%; padding: 8px 12px;
                    border: 1px solid #e2e8f0; border-radius: 6px;
                    font-size: 14px;
                    box-sizing: border-box;
                }
                .form-input:disabled { background: #f1f5f9; cursor: not-allowed; }
                .modal-actions {
                    display: flex; justify-content: flex-end; gap: 12px;
                    margin-top: 24px;
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
                    <button
                        className="admin-btn"
                        onClick={handleAddClick}
                    >
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
                                            <button
                                                className="action-btn"
                                                onClick={() => handleEditClick(u)}
                                            >
                                                編輯
                                            </button>
                                            <button
                                                className={`action-btn ${u.status === 'active' ? 'action-btn-danger' : ''}`}
                                                onClick={() => handleDisableClick(u)}
                                            >
                                                {u.status === 'active' ? '停用' : '啟用'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* User Modal (Add/Edit) */}
            {isEditModalOpen && (
                <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">
                            {modalMode === 'add' ? '新增使用者' : '編輯使用者'}
                        </h3>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">姓名</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    disabled={modalMode === 'edit'}
                                    required
                                />
                                {modalMode === 'edit' && <div className="form-hint">Email 無法修改</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    {modalMode === 'add' ? '密碼' : '重設密碼'}
                                </label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={formData.password || ''}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={modalMode === 'edit' ? '若不修改請留空' : '請輸入密碼'}
                                    required={modalMode === 'add'}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">角色</label>
                                <select
                                    className="form-select"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                >
                                    <option value="admin">管理員</option>
                                    <option value="engineer">工程師</option>
                                    <option value="reviewer">審查委員</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="action-btn"
                                    onClick={() => setIsEditModalOpen(false)}
                                >
                                    取消
                                </button>
                                <button type="submit" className="admin-btn">
                                    {modalMode === 'add' ? '新增' : '儲存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;
