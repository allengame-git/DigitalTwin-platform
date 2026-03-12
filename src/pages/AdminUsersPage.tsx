/**
 * Admin Users Page
 *
 * User management interface for administrators.
 * @see specs/4-user-roles-system/spec.md
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAdminStore } from '../stores/adminStore';
import type { AdminUser, UserRole } from '../types/auth';
import { usePageTracking } from '../hooks/usePageTracking';
import type { Module } from '../stores/moduleStore';
import { getModuleTypeConfig } from '../config/moduleRegistry';

const ROLE_LABELS: Record<string, string> = {
    admin: '管理員',
    engineer: '工程師',
    viewer: '一般使用者',
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: '啟用', color: '#166534', bg: '#dcfce7' },
    locked: { label: '鎖定', color: '#92400e', bg: '#fef3c7' },
    disabled: { label: '停用', color: '#991b1b', bg: '#fee2e2' },
    pending_reset: { label: '待重設', color: '#854d0e', bg: '#fef9c3' },
};

export const AdminUsersPage: React.FC = () => {
    usePageTracking({ pageName: '使用者管理' });
    const { user } = useAuthStore();
    const {
        users, usersLoading, usersError,
        fetchUsers, createUser, updateUser,
        resetPassword, unlockUser, disableUser,
    } = useAdminStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Create user result
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Form State
    const [formData, setFormData] = useState<{ name: string; email: string; role: UserRole }>({
        name: '', email: '', role: 'engineer',
    });
    const [formError, setFormError] = useState<string | null>(null);

    // Viewer access modal
    const [accessModalUserId, setAccessModalUserId] = useState<string | null>(null);
    const [accessModalUserName, setAccessModalUserName] = useState('');
    const [allProjects, setAllProjects] = useState<{ id: string; name: string; code: string }[]>([]);
    const [assignments, setAssignments] = useState<Record<string, string[]>>({});
    const [accessLoading, setAccessLoading] = useState(false);
    const [accessSaving, setAccessSaving] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Dynamic modules per project (fetched when access modal opens)
    const [projectModules, setProjectModules] = useState<Record<string, Module[]>>({});

    function accessAuthHeaders(): Record<string, string> {
        const token = useAuthStore.getState().accessToken;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddClick = () => {
        setModalMode('add');
        setEditingUserId(null);
        setFormData({ name: '', email: '', role: 'engineer' });
        setFormError(null);
        setTempPassword(null);
        setCopied(false);
        setIsEditModalOpen(true);
    };

    const handleEditClick = (u: AdminUser) => {
        setModalMode('edit');
        setEditingUserId(u.id);
        setFormData({ name: u.name, email: u.email, role: u.role });
        setFormError(null);
        setTempPassword(null);
        setCopied(false);
        setIsEditModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!formData.email || !formData.name) {
            setFormError('請填寫所有欄位');
            return;
        }

        setActionLoading(true);
        try {
            if (modalMode === 'add') {
                const result = await createUser({
                    email: formData.email,
                    name: formData.name,
                    role: formData.role,
                });
                setTempPassword(result.temporaryPassword);
            } else if (editingUserId) {
                await updateUser(editingUserId, {
                    name: formData.name,
                    role: formData.role,
                } as Partial<AdminUser>);
                setIsEditModalOpen(false);
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : '操作失敗');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetPassword = async (id: string) => {
        setOpenDropdownId(null);
        if (!window.confirm('確定要重設此使用者的密碼嗎？')) return;
        setActionLoading(true);
        try {
            const result = await resetPassword(id);
            setTempPassword(result.temporaryPassword);
            setModalMode('add'); // reuse modal to show temp password
            setFormError(null);
            setCopied(false);
            setIsEditModalOpen(true);
        } catch (err) {
            alert(err instanceof Error ? err.message : '重設密碼失敗');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnlock = async (id: string) => {
        setOpenDropdownId(null);
        setActionLoading(true);
        try {
            await unlockUser(id);
        } catch (err) {
            alert(err instanceof Error ? err.message : '解鎖失敗');
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenAccessModal = async (u: AdminUser) => {
        setAccessModalUserId(u.id);
        setAccessModalUserName(u.name);
        setAccessLoading(true);
        setOpenDropdownId(null);

        try {
            const [projectsRes, accessRes] = await Promise.all([
                fetch('/api/project', { headers: accessAuthHeaders() }),
                fetch(`/api/user-access/${u.id}/projects`, { headers: accessAuthHeaders() }),
            ]);
            const projectsData = await projectsRes.json();
            const accessData = await accessRes.json();

            let projects: { id: string; name: string; code: string }[] = [];
            if (projectsData.success) {
                projects = projectsData.data.map((p: any) => ({ id: p.id, name: p.name, code: p.code }));
                setAllProjects(projects);
            }

            // Fetch modules for each project in parallel
            const modulesMap: Record<string, Module[]> = {};
            const moduleResults = await Promise.all(
                projects.map(async (p) => {
                    const res = await fetch(`/api/module?projectId=${p.id}`, { headers: accessAuthHeaders() });
                    const data = await res.json();
                    return { projectId: p.id, modules: data.success ? (data.data as Module[]) : [] };
                })
            );
            for (const result of moduleResults) {
                modulesMap[result.projectId] = result.modules;
            }
            setProjectModules(modulesMap);

            // Use moduleIds (new format) from API response
            const map: Record<string, string[]> = {};
            if (accessData.success) {
                for (const item of accessData.data) {
                    map[item.projectId] = item.moduleIds || item.modules || [];
                }
            }
            setAssignments(map);
        } catch (err) {
            console.error('Failed to load access data:', err);
        } finally {
            setAccessLoading(false);
        }
    };

    const toggleProject = (projectId: string) => {
        setAssignments(prev => {
            const copy = { ...prev };
            if (copy[projectId]) {
                delete copy[projectId];
            } else {
                // Select all module IDs for this project
                const mods = projectModules[projectId] || [];
                copy[projectId] = mods.map(m => m.id);
            }
            return copy;
        });
    };

    const toggleModule = (projectId: string, moduleId: string) => {
        setAssignments(prev => {
            const copy = { ...prev };
            const ids = copy[projectId] || [];
            if (ids.includes(moduleId)) {
                copy[projectId] = ids.filter(id => id !== moduleId);
            } else {
                copy[projectId] = [...ids, moduleId];
            }
            return copy;
        });
    };

    const handleSaveAccess = async () => {
        if (!accessModalUserId) return;
        setAccessSaving(true);

        try {
            const assignmentList = Object.entries(assignments)
                .map(([projectId, moduleIds]) => ({ projectId, moduleIds }));

            const res = await fetch(`/api/user-access/${accessModalUserId}/batch`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...accessAuthHeaders() },
                body: JSON.stringify({ assignments: assignmentList }),
            });

            const data = await res.json();
            if (data.success) {
                setAccessModalUserId(null);
            } else {
                alert(data.error || '儲存失敗');
            }
        } catch (err) {
            alert('儲存失敗');
        } finally {
            setAccessSaving(false);
        }
    };

    const handleToggleDisable = async (u: AdminUser) => {
        setOpenDropdownId(null);
        const action = u.status === 'active' ? '停用' : '啟用';
        if (!window.confirm(`確定要${action}使用者 ${u.name} 嗎？`)) return;
        setActionLoading(true);
        try {
            if (u.status === 'active') {
                await disableUser(u.id);
            } else {
                await updateUser(u.id, { status: 'active' } as Partial<AdminUser>);
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : `${action}失敗`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCopyPassword = async () => {
        if (!tempPassword) return;
        try {
            await navigator.clipboard.writeText(tempPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
            const textarea = document.createElement('textarea');
            textarea.value = tempPassword;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !roleFilter || u.role === roleFilter;
        const matchesStatus = !statusFilter || u.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <div className="admin-users-page">
            <style>{`
                .admin-users-page {
                    min-height: 100vh;
                    background: #f8fafc;
                }
                .admin-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
                .admin-header-left { display: flex; align-items: center; gap: 16px; }
                .admin-back-link { color: #64748b; text-decoration: none; font-size: 14px; }
                .admin-title { font-size: 20px; font-weight: 600; color: #0f172a; margin: 0; }
                .admin-user-info { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #64748b; }
                .admin-content { max-width: 1200px; margin: 0 auto; padding: 24px; }
                .admin-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
                .admin-toolbar-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
                .admin-search { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; width: 300px; background: white; }
                .admin-filter { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; }
                .admin-btn { padding: 10px 20px; background: #0f172a; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
                .admin-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .admin-table { width: 100%; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: visible; }
                .admin-table table { width: 100%; border-collapse: collapse; }
                .admin-table th, .admin-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #f1f5f9; }
                .admin-table th { background: #f8fafc; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
                .admin-table th:first-child { border-top-left-radius: 12px; }
                .admin-table th:last-child { border-top-right-radius: 12px; }
                .admin-table tr:last-child td:first-child { border-bottom-left-radius: 12px; }
                .admin-table tr:last-child td:last-child { border-bottom-right-radius: 12px; }
                .admin-table td { font-size: 14px; color: #334155; }
                .user-name { font-weight: 500; }
                .user-email { font-size: 12px; color: #94a3b8; margin-top: 2px; }
                .role-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
                .role-admin { background: #fef3c7; color: #92400e; }
                .role-engineer { background: #dbeafe; color: #1e40af; }
                .role-viewer { background: #dcfce7; color: #166534; }
                .status-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
                .action-btn { padding: 6px 12px; background: transparent; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; color: #475569; cursor: pointer; margin-right: 8px; }
                .action-btn:hover { background: #f1f5f9; }
                .empty-state { text-align: center; color: #94a3b8; padding: 40px 16px !important; }

                /* Dropdown */
                .action-dropdown-wrapper { position: relative; display: inline-block; }
                .action-dots-btn { padding: 6px 10px; background: transparent; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 16px; color: #475569; cursor: pointer; line-height: 1; }
                .action-dots-btn:hover { background: #f1f5f9; }
                .action-dropdown { position: absolute; right: 0; top: 100%; margin-top: 4px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; min-width: 140px; overflow: hidden; }
                .action-dropdown-item { display: block; width: 100%; padding: 10px 14px; background: none; border: none; text-align: left; font-size: 13px; color: #334155; cursor: pointer; }
                .action-dropdown-item:hover { background: #f1f5f9; }
                .action-dropdown-item-danger { color: #991b1b; }
                .action-dropdown-item-danger:hover { background: #fee2e2; }

                /* Loading & Error */
                .loading-container { display: flex; justify-content: center; align-items: center; padding: 60px 0; color: #64748b; font-size: 14px; }
                .loading-spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 10px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .error-banner { background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }

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
                .form-error { color: #991b1b; font-size: 13px; margin-bottom: 12px; }
                .modal-actions {
                    display: flex; justify-content: flex-end; gap: 12px;
                    margin-top: 24px;
                }

                /* Temp password display */
                .temp-password-box {
                    background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
                    padding: 16px; margin-top: 12px;
                }
                .temp-password-label { font-size: 13px; color: #166534; margin-bottom: 8px; font-weight: 500; }
                .temp-password-value {
                    display: flex; align-items: center; gap: 8px;
                    background: white; border: 1px solid #e2e8f0; border-radius: 6px;
                    padding: 10px 12px; font-family: monospace; font-size: 15px; color: #0f172a;
                }
                .copy-btn {
                    margin-left: auto; padding: 4px 10px;
                    background: #0f172a; color: white; border: none; border-radius: 4px;
                    font-size: 12px; cursor: pointer; white-space: nowrap;
                }
                .copy-btn:hover { background: #1e293b; }
            `}</style>

            <header className="admin-header">
                <div className="admin-header-left">
                    <Link to="/" className="admin-back-link">&larr; 返回儀表板</Link>
                    <h1 className="admin-title">使用者管理</h1>
                </div>
                <div className="admin-user-info">
                    {user?.name} ({ROLE_LABELS[user?.role || '']})
                </div>
            </header>

            <main className="admin-content">
                {usersError && (
                    <div className="error-banner">{usersError}</div>
                )}

                <div className="admin-toolbar">
                    <div className="admin-toolbar-left">
                        <input
                            type="text"
                            className="admin-search"
                            placeholder="搜尋使用者..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <select
                            className="admin-filter"
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                        >
                            <option value="">全部角色</option>
                            <option value="admin">管理員</option>
                            <option value="engineer">工程師</option>
                            <option value="viewer">一般使用者</option>
                        </select>
                        <select
                            className="admin-filter"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="">全部狀態</option>
                            <option value="active">啟用</option>
                            <option value="locked">鎖定</option>
                            <option value="disabled">停用</option>
                            <option value="pending_reset">待重設</option>
                        </select>
                    </div>
                    <button
                        className="admin-btn"
                        onClick={handleAddClick}
                    >
                        + 新增使用者
                    </button>
                </div>

                {usersLoading ? (
                    <div className="loading-container">
                        <div className="loading-spinner" />
                        載入中...
                    </div>
                ) : (
                    <div className="admin-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>使用者</th>
                                    <th>角色</th>
                                    <th>狀態</th>
                                    <th>活躍 Sessions</th>
                                    <th>最後登入</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="empty-state">
                                            找不到符合條件的使用者
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(u => {
                                        const statusInfo = STATUS_LABELS[u.status] || STATUS_LABELS.active;
                                        return (
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
                                                    <span
                                                        className="status-badge"
                                                        style={{ background: statusInfo.bg, color: statusInfo.color }}
                                                    >
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td>{u.activeSessions}</td>
                                                <td>
                                                    {u.lastLoginAt
                                                        ? new Date(u.lastLoginAt).toLocaleString('zh-TW')
                                                        : '-'}
                                                </td>
                                                <td>
                                                    <div className="action-dropdown-wrapper" ref={openDropdownId === u.id ? dropdownRef : undefined}>
                                                        <button
                                                            className="action-dots-btn"
                                                            onClick={() => setOpenDropdownId(openDropdownId === u.id ? null : u.id)}
                                                        >
                                                            ...
                                                        </button>
                                                        {openDropdownId === u.id && (
                                                            <div className="action-dropdown">
                                                                <button
                                                                    className="action-dropdown-item"
                                                                    onClick={() => handleEditClick(u)}
                                                                >
                                                                    編輯
                                                                </button>
                                                                {u.role === 'viewer' && (
                                                                    <button
                                                                        className="action-dropdown-item"
                                                                        onClick={() => handleOpenAccessModal(u)}
                                                                    >
                                                                        權限設定
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="action-dropdown-item"
                                                                    onClick={() => handleResetPassword(u.id)}
                                                                >
                                                                    重設密碼
                                                                </button>
                                                                {u.status === 'locked' && (
                                                                    <button
                                                                        className="action-dropdown-item"
                                                                        onClick={() => handleUnlock(u.id)}
                                                                    >
                                                                        解鎖
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className={`action-dropdown-item ${u.status === 'active' ? 'action-dropdown-item-danger' : ''}`}
                                                                    onClick={() => handleToggleDisable(u)}
                                                                >
                                                                    {u.status === 'active' ? '停用' : '啟用'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* User Modal (Add/Edit) or Temp Password Display */}
            {accessModalUserId && (
                <div className="modal-overlay" onClick={() => setAccessModalUserId(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '560px', maxHeight: '80vh', overflow: 'auto' }}>
                        <h3 className="modal-title">
                            權限設定 — {accessModalUserName}
                        </h3>

                        {accessLoading ? (
                            <div className="loading-container">
                                <div className="loading-spinner" />
                                載入中...
                            </div>
                        ) : (
                            <>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                                    勾選專案和模組來設定此使用者的存取權限
                                </div>

                                {allProjects.map(project => {
                                    const isChecked = !!assignments[project.id];
                                    const modules = assignments[project.id] || [];

                                    return (
                                        <div key={project.id} style={{
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            padding: '12px 16px',
                                            marginBottom: '8px',
                                            background: isChecked ? '#f8fafc' : '#fff',
                                        }}>
                                            <label style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                                fontSize: '14px',
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleProject(project.id)}
                                                />
                                                {project.name}
                                                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>
                                                    ({project.code})
                                                </span>
                                            </label>

                                            {isChecked && (
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '12px',
                                                    marginTop: '8px',
                                                    marginLeft: '24px',
                                                    flexWrap: 'wrap',
                                                }}>
                                                    {(projectModules[project.id] || []).map(mod => {
                                                        const typeConfig = getModuleTypeConfig(mod.type);
                                                        const Icon = typeConfig?.icon;
                                                        return (
                                                            <label key={mod.id} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                fontSize: '13px',
                                                                cursor: 'pointer',
                                                                color: '#475569',
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={modules.includes(mod.id)}
                                                                    onChange={() => toggleModule(project.id, mod.id)}
                                                                />
                                                                {Icon && <Icon size={14} style={{ flexShrink: 0 }} />}
                                                                {mod.name}
                                                                {typeConfig && (
                                                                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '2px' }}>
                                                                        ({typeConfig.label})
                                                                    </span>
                                                                )}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="action-btn"
                                        onClick={() => setAccessModalUserId(null)}
                                    >
                                        取消
                                    </button>
                                    <button
                                        className="admin-btn"
                                        onClick={handleSaveAccess}
                                        disabled={accessSaving}
                                    >
                                        {accessSaving ? '儲存中...' : '儲存'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="modal-overlay" onClick={() => { setIsEditModalOpen(false); setTempPassword(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        {tempPassword ? (
                            <>
                                <h3 className="modal-title">
                                    {modalMode === 'add' ? '使用者已建立' : '密碼已重設'}
                                </h3>
                                <div className="temp-password-box">
                                    <div className="temp-password-label">臨時密碼（請提供給使用者，登入後須立即變更）</div>
                                    <div className="temp-password-value">
                                        <span>{tempPassword}</span>
                                        <button className="copy-btn" onClick={handleCopyPassword}>
                                            {copied ? '已複製' : '複製'}
                                        </button>
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button
                                        className="admin-btn"
                                        onClick={() => { setIsEditModalOpen(false); setTempPassword(null); }}
                                    >
                                        確認
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="modal-title">
                                    {modalMode === 'add' ? '新增使用者' : '編輯使用者'}
                                </h3>
                                {formError && <div className="form-error">{formError}</div>}
                                <form onSubmit={handleSave}>
                                    <div className="form-group">
                                        <label className="form-label">姓名</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            disabled={modalMode === 'edit'}
                                            required
                                        />
                                        {modalMode === 'edit' && <div className="form-hint">Email 無法修改</div>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">角色</label>
                                        <select
                                            className="form-select"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                        >
                                            <option value="admin">管理員</option>
                                            <option value="engineer">工程師</option>
                                            <option value="viewer">一般使用者</option>
                                        </select>
                                    </div>
                                    {modalMode === 'add' && (
                                        <div className="form-hint">
                                            系統將自動產生臨時密碼，建立後會顯示於畫面上。
                                        </div>
                                    )}
                                    <div className="modal-actions">
                                        <button
                                            type="button"
                                            className="action-btn"
                                            onClick={() => setIsEditModalOpen(false)}
                                        >
                                            取消
                                        </button>
                                        <button type="submit" className="admin-btn" disabled={actionLoading}>
                                            {actionLoading ? '處理中...' : (modalMode === 'add' ? '新增' : '儲存')}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;
