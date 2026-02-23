/**
 * Admin Settings Page
 * 
 * System settings interface for administrators.
 * @see specs/4-user-roles-system/spec.md
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthStore } from '../stores/authStore';
import { usePageTracking } from '../hooks/usePageTracking';

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
];

const ROLE_LABELS: Record<string, string> = {
    admin: '管理員',
    engineer: '工程師',
    reviewer: '審查委員',
};

export const AdminSettingsPage: React.FC = () => {
    usePageTracking({ pageName: '系統設定' });
    const { user } = useAuth();
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
                            <p>Session 超時、密碼規則、登入限制</p>

                            <div className="settings-form">
                                <div className="form-toggle">
                                    <div>
                                        <div className="form-toggle-label">強制雙因素驗證</div>
                                        <div className="form-toggle-desc">要求所有使用者啟用雙因素驗證</div>
                                    </div>
                                    <div className="toggle-switch"></div>
                                </div>

                                <div className="form-toggle">
                                    <div>
                                        <div className="form-toggle-label">登入失敗鎖定</div>
                                        <div className="form-toggle-desc">5 次登入失敗後暫時鎖定帳號</div>
                                    </div>
                                    <div className="toggle-switch active"></div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Session 超時 (分鐘)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        defaultValue="480"
                                    />
                                    <span className="form-hint">工程師與管理員的 Session 有效時間</span>
                                </div>

                                <button className="save-btn">儲存變更</button>
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
