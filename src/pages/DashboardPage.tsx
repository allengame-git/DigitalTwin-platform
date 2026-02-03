/**
 * DashboardPage Component
 * 
 * Main dashboard for authenticated users.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RoleBasedUI, EngineerOnly, AdminOnly } from '../components/auth/RoleBasedUI';

const ROLE_LABELS: Record<string, string> = {
  admin: '管理員',
  engineer: '工程師',
  reviewer: '審查委員',
  public: '訪客',
};

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-page">
      <style>{`
        .dashboard-page {
          min-height: 100vh;
          background: #f8fafc;
        }
        
        .dashboard-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .dashboard-logo {
          font-size: 20px;
          font-weight: 600;
          color: #0f172a;
          text-decoration: none;
        }
        
        .dashboard-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .dashboard-user-name {
          font-weight: 500;
          color: #334155;
        }
        
        .dashboard-user-role {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 4px;
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
        
        .dashboard-logout-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .dashboard-logout-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        
        .dashboard-content {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .dashboard-welcome {
          margin-bottom: 32px;
        }
        
        .dashboard-welcome h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
        
        .dashboard-welcome p {
          font-size: 16px;
          color: #64748b;
        }
        
        .dashboard-section {
          margin-bottom: 32px;
        }
        
        .dashboard-section-title {
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        
        .dashboard-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        
        .dashboard-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .dashboard-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 24px;
        }
        
        .icon-geology { background: #dcfce7; }
        .icon-engineering { background: #dbeafe; }
        .icon-simulation { background: #fef3c7; }
        .icon-data { background: #e0e7ff; }
        .icon-annotation { background: #fce7f3; }
        .icon-invite { background: #f3e8ff; }
        .icon-users { background: #fee2e2; }
        .icon-settings { background: #f1f5f9; }
        
        .dashboard-card-title {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 8px;
        }
        
        .dashboard-card-desc {
          font-size: 14px;
          color: #64748b;
          line-height: 1.5;
        }
        
        .dashboard-card-link {
          display: inline-block;
          margin-top: 16px;
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
          text-decoration: none;
        }
        
        .dashboard-card-link:hover {
          color: #475569;
        }
      `}</style>

      <header className="dashboard-header">
        <Link to="/" className="dashboard-logo">LLRWD DigitalTwin</Link>
        {user && (
          <div className="dashboard-user">
            <span className="dashboard-user-name">{user.name}</span>
            <span className={`dashboard-user-role role-${user.role}`}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
            <button className="dashboard-logout-btn" onClick={() => logout()}>
              登出
            </button>
          </div>
        )}
      </header>

      <main className="dashboard-content">
        <div className="dashboard-welcome">
          <h1>歡迎回來，{user?.name}</h1>
          <p>選擇下方功能開始使用</p>
        </div>

        {/* 檢視功能區 */}
        <div className="dashboard-section">
          <h2 className="dashboard-section-title">檢視功能</h2>
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="dashboard-card-icon icon-geology">🗺️</div>
              <h3 className="dashboard-card-title">地質資料</h3>
              <p className="dashboard-card-desc">
                檢視鑽孔資料、地層分布與地質構造
              </p>
              <Link to="/geology" className="dashboard-card-link">
                進入 →
              </Link>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-icon icon-engineering">🏗️</div>
              <h3 className="dashboard-card-title">工程設計</h3>
              <p className="dashboard-card-desc">
                檢視壩體、廠房與隧道設計模型
              </p>
              <Link to="/engineering" className="dashboard-card-link">
                進入 →
              </Link>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-icon icon-simulation">📊</div>
              <h3 className="dashboard-card-title">模擬分析</h3>
              <p className="dashboard-card-desc">
                檢視流場、應力與水位模擬結果
              </p>
              <Link to="/simulation" className="dashboard-card-link">
                進入 →
              </Link>
            </div>
          </div>
        </div>

        {/* 工具功能區 - Engineer & Admin */}
        <RoleBasedUI allowedRoles={['admin', 'engineer']}>
          <div className="dashboard-section">
            <h2 className="dashboard-section-title">資料管理</h2>
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <div className="dashboard-card-icon icon-data">📁</div>
                <h3 className="dashboard-card-title">原始資料</h3>
                <p className="dashboard-card-desc">
                  存取與匯出原始數據檔案
                </p>
                <Link to="/data" className="dashboard-card-link">
                  進入 →
                </Link>
              </div>
            </div>
          </div>
        </RoleBasedUI>

        {/* 審查功能區 */}
        <RoleBasedUI allowedRoles={['admin', 'reviewer', 'engineer']}>
          <div className="dashboard-section">
            <h2 className="dashboard-section-title">審查功能</h2>
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <div className="dashboard-card-icon icon-annotation">📝</div>
                <h3 className="dashboard-card-title">審查標註</h3>
                <p className="dashboard-card-desc">
                  檢視與管理審查標註
                </p>
                <Link to="/annotations" className="dashboard-card-link">
                  進入 →
                </Link>
              </div>

              <EngineerOnly>
                <div className="dashboard-card">
                  <div className="dashboard-card-icon icon-invite">👥</div>
                  <h3 className="dashboard-card-title">邀請審查委員</h3>
                  <p className="dashboard-card-desc">
                    產生邀請連結供審查委員使用
                  </p>
                  <Link to="/admin/invites" className="dashboard-card-link">
                    進入 →
                  </Link>
                </div>
              </EngineerOnly>
            </div>
          </div>
        </RoleBasedUI>

        {/* 系統管理區 - Admin Only */}
        <AdminOnly>
          <div className="dashboard-section">
            <h2 className="dashboard-section-title">系統管理</h2>
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <div className="dashboard-card-icon icon-users">👤</div>
                <h3 className="dashboard-card-title">使用者管理</h3>
                <p className="dashboard-card-desc">
                  管理系統使用者帳號與權限
                </p>
                <Link to="/admin/users" className="dashboard-card-link">
                  進入 →
                </Link>
              </div>

              <div className="dashboard-card">
                <div className="dashboard-card-icon icon-settings">⚙️</div>
                <h3 className="dashboard-card-title">系統設定</h3>
                <p className="dashboard-card-desc">
                  調整系統參數與整合設定
                </p>
                <Link to="/admin/settings" className="dashboard-card-link">
                  進入 →
                </Link>
              </div>
            </div>
          </div>
        </AdminOnly>
      </main>
    </div>
  );
};

export default DashboardPage;
