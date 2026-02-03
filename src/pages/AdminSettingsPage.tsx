/**
 * Admin Settings Page
 * 
 * System settings interface for administrators.
 * @see specs/4-user-roles-system/spec.md
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTracking } from '../hooks/usePageTracking';

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

                .placeholder-notice {
                    padding: 24px;
                    background: #fef3c7;
                    border: 1px solid #fcd34d;
                    border-radius: 8px;
                    color: #92400e;
                    font-size: 14px;
                    text-align: center;
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
                </div>
            </main>
        </div>
    );
};

export default AdminSettingsPage;
