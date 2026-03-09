/**
 * Admin Settings Page
 * 
 * System settings interface for administrators.
 * @see specs/4-user-roles-system/spec.md
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAdminStore } from '../stores/adminStore';
import { usePageTracking } from '../hooks/usePageTracking';
import type { AuditLogEntry } from '../types/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface SettingSection {
    id: string;
    title: string;
    description: string;
}

const settingSections: SettingSection[] = [
    { id: 'general', title: '一般設定', description: '平台名稱、Logo、語言等基本設定' },
    { id: 'security', title: '安全性設定', description: 'Session 超時、密碼規則、登入限制' },
    { id: 'notifications', title: '通知設定', description: 'Email 通知、系統提醒' },
    { id: 'integration', title: '整合設定', description: 'API 金鑰、第三方服務連接' },
    { id: 'storage', title: '儲存空間管理', description: '清理未使用的上傳檔案與垃圾桶' },
    { id: 'audit', title: '稽核日誌', description: '認證事件與帳號操作記錄' },
];

const ROLE_LABELS: Record<string, string> = {
    admin: '管理員',
    engineer: '工程師',
    reviewer: '審查委員',
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
    LOGIN_SUCCESS: '登入成功',
    LOGIN_FAILED: '登入失敗',
    LOGOUT: '登出',
    TOKEN_REFRESH: 'Token 刷新',
    PASSWORD_CHANGE: '密碼變更',
    PASSWORD_RESET: '密碼重設',
    ACCOUNT_CREATE: '建立帳號',
    ACCOUNT_UPDATE: '更新帳號',
    ACCOUNT_DISABLE: '停用帳號',
    ACCOUNT_UNLOCK: '解鎖帳號',
    SESSION_REVOKED: 'Session 撤銷',
};

export const AdminSettingsPage: React.FC = () => {
    usePageTracking({ pageName: '系統設定' });
    const user = useAuthStore(state => state.user);
    const [activeSection, setActiveSection] = useState('general');

    // Storage Management States
    const [scanResult, setScanResult] = useState<{ files: any[], totalFiles: number, totalSize: number } | null>(null);
    const [trashStatus, setTrashStatus] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [scanError, setScanError] = useState('');
    const [confirmAction, setConfirmAction] = useState<'cleanup' | 'purge' | null>(null);
    const [resultMessage, setResultMessage] = useState('');

    // Audit Log States
    const { fetchAuditLogs, auditLogs, auditLogsTotal, auditLogsLoading } = useAdminStore();
    const [auditPage, setAuditPage] = useState(1);
    const [auditStartDate, setAuditStartDate] = useState('');
    const [auditEndDate, setAuditEndDate] = useState('');
    const [auditAction, setAuditAction] = useState('');
    const auditLimit = 50;

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const handleScan = async () => {
        setIsScanning(true);
        setScanError('');
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${API_BASE}/api/cleanup/scan`, {
                headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
                credentials: 'include',
            });
            if (!res.ok) throw new Error('掃描失敗');
            const data = await res.json();
            setScanResult(data.data);
            fetchTrashStatus();
        } catch (error: any) {
            setScanError(error.message);
        } finally {
            setIsScanning(false);
        }
    };

    const handleExecuteCleanup = async () => {
        setConfirmAction(null);
        setIsExecuting(true);
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${API_BASE}/api/cleanup/execute`, {
                method: 'POST',
                headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
                credentials: 'include',
            });
            if (!res.ok) throw new Error('清理失敗');
            const data = await res.json();
            setResultMessage(data.message);
            setScanResult(null);
            fetchTrashStatus();
        } catch (error: any) {
            setResultMessage(error.message);
        } finally {
            setIsExecuting(false);
        }
    };

    const fetchTrashStatus = async () => {
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${API_BASE}/api/cleanup/trash`, {
                headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setTrashStatus(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch trash status:', error);
        }
    };

    const handlePurgeTrash = async () => {
        setConfirmAction(null);
        setIsPurging(true);
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${API_BASE}/api/cleanup/purge`, {
                method: 'POST',
                headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
                credentials: 'include',
            });
            if (!res.ok) throw new Error('清除失敗');
            const data = await res.json();
            setResultMessage(data.message);
            fetchTrashStatus();
        } catch (error: any) {
            setResultMessage(error.message);
        } finally {
            setIsPurging(false);
        }
    };

    React.useEffect(() => {
        if (activeSection === 'storage') {
            fetchTrashStatus();
        }
    }, [activeSection]);

    useEffect(() => {
        if (activeSection === 'audit') {
            fetchAuditLogs({
                page: auditPage,
                limit: auditLimit,
                ...(auditStartDate && { startDate: auditStartDate }),
                ...(auditEndDate && { endDate: auditEndDate }),
                ...(auditAction && { action: auditAction }),
            });
        }
    }, [activeSection, auditPage, auditStartDate, auditEndDate, auditAction]);

    return (
        <div className="admin-settings-page">
            <style>{`
                .admin-settings-page {
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
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 24px;
                }

                .settings-nav {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    padding: 8px;
                }

                .settings-nav-item {
                    display: block;
                    width: 100%;
                    padding: 12px 16px;
                    text-align: left;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .settings-nav-item:hover {
                    background: #f1f5f9;
                }

                .settings-nav-item.active {
                    background: #0f172a;
                    color: white;
                }

                .settings-panel {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    padding: 32px;
                }

                .settings-panel h2 {
                    font-size: 20px;
                    font-weight: 600;
                    color: #0f172a;
                    margin: 0 0 8px 0;
                }

                .settings-panel p {
                    font-size: 14px;
                    color: #64748b;
                    margin: 0 0 32px 0;
                }

                .settings-form {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .form-label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #334155;
                }

                .form-input {
                    padding: 10px 14px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 14px;
                }

                .form-input:focus {
                    outline: none;
                    border-color: #0f172a;
                }

                .form-hint {
                    font-size: 12px;
                    color: #94a3b8;
                }

                .form-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px;
                    background: #f8fafc;
                    border-radius: 8px;
                }

                .form-toggle-label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #334155;
                }

                .form-toggle-desc {
                    font-size: 13px;
                    color: #64748b;
                    margin-top: 4px;
                }

                .toggle-switch {
                    width: 44px;
                    height: 24px;
                    background: #e2e8f0;
                    border-radius: 12px;
                    position: relative;
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .toggle-switch.active {
                    background: #0f172a;
                }

                .toggle-switch::after {
                    content: '';
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: white;
                    border-radius: 10px;
                    top: 2px;
                    left: 2px;
                    transition: transform 0.15s;
                }

                .toggle-switch.active::after {
                    transform: translateX(20px);
                }

                .save-btn {
                    align-self: flex-start;
                    padding: 12px 24px;
                    background: #0f172a;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                }

                .save-btn:hover {
                    background: #1e293b;
                }

                .save-btn:disabled {
                    background: #cbd5e1;
                    cursor: not-allowed;
                }

                .danger-btn {
                    background: #ef4444;
                }

                .danger-btn:hover {
                    background: #dc2626;
                }

                .placeholder-notice {
                    padding: 24px;
                    background: #fef3c7;
                    border: 1px solid #fcd34d;
                    border-radius: 8px;
                    color: #92400e;
                    font-size: 14px;
                    text-align: center;
                }
                
                .storage-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .storage-card h3 {
                    margin: 0 0 16px 0;
                    font-size: 16px;
                    color: #1e293b;
                }

                .storage-stats {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                    margin-bottom: 20px;
                }

                .stat-box {
                    background: white;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }

                .stat-box-label {
                    font-size: 12px;
                    color: #64748b;
                    margin-bottom: 4px;
                }

                .stat-box-value {
                    font-size: 24px;
                    font-weight: 600;
                    color: #0f172a;
                }

                .audit-filters {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .audit-filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .audit-table-wrap {
                    overflow-x: auto;
                    margin-bottom: 16px;
                }

                .admin-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 14px;
                }

                .admin-table th {
                    text-align: left;
                    padding: 10px 12px;
                    background: #f1f5f9;
                    color: #475569;
                    font-weight: 500;
                    border-bottom: 1px solid #e2e8f0;
                    white-space: nowrap;
                }

                .admin-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                }

                .admin-table tbody tr:hover {
                    background: #f8fafc;
                }

                .audit-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .audit-badge--success {
                    background: #dcfce7;
                    color: #166534;
                }

                .audit-badge--danger {
                    background: #fee2e2;
                    color: #991b1b;
                }

                .audit-badge--neutral {
                    background: #f1f5f9;
                    color: #475569;
                }

                .audit-pagination {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    padding-top: 8px;
                }
            `}</style>

            <header className="admin-header">
                <div className="admin-header-left">
                    <Link to="/" className="admin-back-link">← 返回儀表板</Link>
                    <h1 className="admin-title">系統設定</h1>
                </div>
                <div className="admin-user-info">
                    {user?.name} ({ROLE_LABELS[user?.role || '']})
                </div>
            </header>

            <main className="admin-content">
                <nav className="settings-nav">
                    {settingSections.map(section => (
                        <button
                            key={section.id}
                            className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            {section.title}
                        </button>
                    ))}
                </nav>

                <div className="settings-panel">
                    {activeSection === 'general' && (
                        <>
                            <h2>一般設定</h2>
                            <p>平台名稱、Logo、語言等基本設定</p>

                            <div className="settings-form">
                                <div className="form-group">
                                    <label className="form-label">平台名稱</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        defaultValue="LLRWD DigitalTwin"
                                    />
                                    <span className="form-hint">顯示在頁面標題與 Header 的名稱</span>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">預設語言</label>
                                    <select className="form-input" defaultValue="zh-TW">
                                        <option value="zh-TW">繁體中文</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>

                                <button className="save-btn">儲存變更</button>
                            </div>
                        </>
                    )}

                    {activeSection === 'security' && (
                        <>
                            <h2>安全性設定</h2>
                            <p>目前系統安全性規則（唯讀顯示）</p>

                            <div className="settings-form">
                                <div className="form-toggle">
                                    <div>
                                        <div className="form-toggle-label">登入失敗鎖定</div>
                                        <div className="form-toggle-desc">連續 5 次登入失敗後，帳號自動鎖定 15 分鐘</div>
                                    </div>
                                    <div className="toggle-switch active" style={{ cursor: 'default' }}></div>
                                </div>

                                <div className="form-toggle">
                                    <div>
                                        <div className="form-toggle-label">密碼強度規則</div>
                                        <div className="form-toggle-desc">最少 8 字元，需含大寫字母、小寫字母、數字</div>
                                    </div>
                                    <div className="toggle-switch active" style={{ cursor: 'default' }}></div>
                                </div>

                                <div className="form-toggle">
                                    <div>
                                        <div className="form-toggle-label">Session 併發限制</div>
                                        <div className="form-toggle-desc">同帳號最多 3 個同時登入的 Session</div>
                                    </div>
                                    <div className="toggle-switch active" style={{ cursor: 'default' }}></div>
                                </div>

                                <div className="form-toggle">
                                    <div>
                                        <div className="form-toggle-label">Session 超時</div>
                                        <div className="form-toggle-desc">工程師/管理員 8 小時，審查委員 1 小時</div>
                                    </div>
                                    <div className="toggle-switch active" style={{ cursor: 'default' }}></div>
                                </div>

                                <div className="form-toggle">
                                    <div>
                                        <div className="form-toggle-label">CSRF 保護</div>
                                        <div className="form-toggle-desc">Double Submit Cookie 模式，所有 mutating 操作需驗證</div>
                                    </div>
                                    <div className="toggle-switch active" style={{ cursor: 'default' }}></div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeSection === 'notifications' && (
                        <>
                            <h2>通知設定</h2>
                            <p>Email 通知、系統提醒</p>

                            <div className="placeholder-notice">
                                此功能尚在開發中，敬請期待。
                            </div>
                        </>
                    )}

                    {activeSection === 'integration' && (
                        <>
                            <h2>整合設定</h2>
                            <p>API 金鑰、第三方服務連接</p>

                            <div className="settings-form">
                                <div className="form-group">
                                    <label className="form-label">Cesium Ion Token</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="••••••••••••••••"
                                    />
                                    <span className="form-hint">用於地圖與 3D 地形服務</span>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Sentry DSN</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="••••••••••••••••"
                                    />
                                    <span className="form-hint">錯誤追蹤與效能監控</span>
                                </div>

                                <button className="save-btn">儲存變更</button>
                            </div>
                        </>
                    )}

                    {activeSection === 'storage' && (
                        <>
                            <h2>儲存空間管理</h2>
                            <p>清理未使用的上傳檔案與過期的垃圾桶</p>

                            <div className="storage-card">
                                <h3>孤兒檔案掃描</h3>
                                <p style={{ marginBottom: 16, fontSize: 13 }}>將掃描所有建立時間超過 48 小時，且沒有紀錄在資料庫中的上傳檔案。</p>

                                <button type="button" className="save-btn" onClick={handleScan} disabled={isScanning}>
                                    {isScanning ? '掃描中...' : '執行掃描'}
                                </button>

                                {scanError && <p style={{ color: '#ef4444', marginTop: 12 }}>{scanError}</p>}

                                {scanResult && (
                                    <div style={{ marginTop: 24 }}>
                                        <div className="storage-stats">
                                            <div className="stat-box">
                                                <div className="stat-box-label">發現檔案數</div>
                                                <div className="stat-box-value">{scanResult.totalFiles}</div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="stat-box-label">總共占用空間</div>
                                                <div className="stat-box-value">{formatBytes(scanResult.totalSize)}</div>
                                            </div>
                                        </div>

                                        {scanResult.totalFiles > 0 && (
                                            <button
                                                type="button"
                                                className="save-btn danger-btn"
                                                onClick={() => setConfirmAction('cleanup')}
                                                disabled={isExecuting}
                                            >
                                                {isExecuting ? '清理中...' : '將檔案移至垃圾桶'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="storage-card">
                                <h3>垃圾桶狀態</h3>
                                <p style={{ marginBottom: 16, fontSize: 13 }}>被清理的檔案會暫存在此，需由管理員手動永久刪除。</p>

                                {trashStatus ? (
                                    <>
                                        <div className="storage-stats">
                                            <div className="stat-box">
                                                <div className="stat-box-label">垃圾桶檔案數</div>
                                                <div className="stat-box-value">{trashStatus.totalFiles}</div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="stat-box-label">總共占用空間</div>
                                                <div className="stat-box-value">{formatBytes(trashStatus.totalSize)}</div>
                                            </div>
                                        </div>

                                        {trashStatus.totalFiles > 0 && (
                                            <button
                                                type="button"
                                                className="save-btn danger-btn"
                                                onClick={() => setConfirmAction('purge')}
                                                disabled={isPurging}
                                            >
                                                {isPurging ? '處理中...' : '徹底清除垃圾桶'}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <p style={{ fontSize: 13 }}>載入中...</p>
                                )}
                            </div>
                        </>
                    )}

                    {activeSection === 'audit' && (
                        <>
                            <h2>稽核日誌</h2>
                            <p>認證事件與帳號操作記錄</p>

                            <div className="audit-filters">
                                <div className="audit-filter-group">
                                    <label className="form-label">開始日期</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={auditStartDate}
                                        onChange={(e) => { setAuditStartDate(e.target.value); setAuditPage(1); }}
                                    />
                                </div>
                                <div className="audit-filter-group">
                                    <label className="form-label">結束日期</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={auditEndDate}
                                        onChange={(e) => { setAuditEndDate(e.target.value); setAuditPage(1); }}
                                    />
                                </div>
                                <div className="audit-filter-group">
                                    <label className="form-label">事件類型</label>
                                    <select
                                        className="form-input"
                                        value={auditAction}
                                        onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
                                    >
                                        <option value="">全部</option>
                                        {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {auditLogsLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>載入中...</div>
                            ) : (
                                <>
                                    <div className="audit-table-wrap">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>時間</th>
                                                    <th>事件</th>
                                                    <th>使用者</th>
                                                    <th>IP</th>
                                                    <th>詳情</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditLogs.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                                                            無符合條件的日誌記錄
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    auditLogs.map((log: AuditLogEntry) => (
                                                        <tr key={log.id}>
                                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                                {new Date(log.createdAt).toLocaleString('zh-TW')}
                                                            </td>
                                                            <td>
                                                                <span className={`audit-badge audit-badge--${log.action.includes('FAILED') || log.action.includes('DISABLE') ? 'danger' : log.action.includes('SUCCESS') || log.action.includes('CREATE') || log.action.includes('UNLOCK') ? 'success' : 'neutral'}`}>
                                                                    {AUDIT_ACTION_LABELS[log.action] || log.action}
                                                                </span>
                                                            </td>
                                                            <td>{log.user?.name || log.userId || '-'}</td>
                                                            <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{log.ipAddress || '-'}</td>
                                                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {log.details ? JSON.stringify(log.details) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="audit-pagination">
                                        <button
                                            className="save-btn"
                                            disabled={auditPage <= 1}
                                            onClick={() => setAuditPage(p => p - 1)}
                                            style={{ padding: '8px 16px' }}
                                        >
                                            上一頁
                                        </button>
                                        <span style={{ fontSize: 14, color: '#64748b' }}>
                                            第 {auditPage} 頁 / 共 {Math.max(1, Math.ceil(auditLogsTotal / auditLimit))} 頁（{auditLogsTotal} 筆）
                                        </span>
                                        <button
                                            className="save-btn"
                                            disabled={auditPage >= Math.ceil(auditLogsTotal / auditLimit)}
                                            onClick={() => setAuditPage(p => p + 1)}
                                            style={{ padding: '8px 16px' }}
                                        >
                                            下一頁
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* Confirm Modal */}
                    {confirmAction && (
                        <div style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                        }}>
                            <div style={{
                                background: 'white', borderRadius: 12, padding: 24,
                                maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                            }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
                                    {confirmAction === 'cleanup' ? '確認移至垃圾桶' : '確認清除垃圾桶'}
                                </h3>
                                <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>
                                    {confirmAction === 'cleanup'
                                        ? '確定要將掃描到的孤兒檔案移至垃圾桶嗎？'
                                        : '確定要永久刪除垃圾桶中所有的檔案嗎？此操作無法還原。'}
                                </p>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => setConfirmAction(null)}
                                        style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
                                        取消
                                    </button>
                                    <button type="button"
                                        onClick={confirmAction === 'cleanup' ? handleExecuteCleanup : handlePurgeTrash}
                                        style={{ padding: '8px 16px', border: 'none', borderRadius: 6, background: '#ef4444', color: 'white', cursor: 'pointer' }}>
                                        確認
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Result Toast */}
                    {resultMessage && (
                        <div style={{
                            position: 'fixed', bottom: 24, right: 24, zIndex: 1001,
                            background: '#0f172a', color: 'white', padding: '12px 20px',
                            borderRadius: 8, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            display: 'flex', alignItems: 'center', gap: 12
                        }}>
                            {resultMessage}
                            <button type="button" onClick={() => setResultMessage('')}
                                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}>
                                x
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminSettingsPage;
