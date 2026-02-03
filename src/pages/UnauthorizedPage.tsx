/**
 * UnauthorizedPage Component
 * 
 * Friendly unauthorized access page.
 * @see specs/4-user-roles-system/spec.md NFR-07
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="unauthorized-page">
      <style>{`
        .unauthorized-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc; /* Slate 50 */
          padding: 24px;
        }
        
        .unauthorized-card {
          background: white;
          border-radius: 16px;
          padding: 48px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
          border: 1px solid #f1f5f9;
        }
        
        .unauthorized-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: #fef2f2; /* Red 50 */
          color: #ef4444; /* Red 500 */
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .unauthorized-icon {
          width: 32px;
          height: 32px;
        }
        
        .unauthorized-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a; /* Slate 900 */
          margin-bottom: 12px;
          letter-spacing: -0.025em;
        }
        
        .unauthorized-message {
          font-size: 15px;
          color: #64748b; /* Slate 500 */
          line-height: 1.6;
          margin-bottom: 32px;
        }
        
        .unauthorized-path {
          display: inline-block;
          font-family: 'SF Mono', 'Roboto Mono', Menlo, monospace;
          font-size: 13px;
          background: #f1f5f9; /* Slate 100 */
          padding: 8px 12px;
          border-radius: 6px;
          color: #475569; /* Slate 600 */
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .unauthorized-user {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: #f8fafc; /* Slate 50 */
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 32px;
        }
        
        .unauthorized-user-name {
          font-size: 14px;
          font-weight: 600;
          color: #334155; /* Slate 700 */
        }
        
        .unauthorized-user-role {
          font-size: 12px;
          background: #e2e8f0;
          color: #475569;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .unauthorized-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.01em;
          width: 100%;
        }
        
        .btn-primary {
          background: #0f172a; /* Slate 900 */
          color: white;
          border: 1px solid transparent;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        .btn-primary:hover {
          background: #1e293b; /* Slate 800 */
          transform: translateY(-1px);
        }
        
        .btn-secondary {
          background: white;
          color: #475569; /* Slate 600 */
          border: 1px solid #e2e8f0;
        }
        
        .btn-secondary:hover {
          background: #f8fafc;
          color: #0f172a;
          border-color: #cbd5e1;
        }
        
        .btn-text {
          background: transparent;
          color: #64748b;
          border: none;
          font-weight: 500;
          font-size: 14px;
        }
        
        .btn-text:hover {
          color: #0f172a;
          text-decoration: underline;
        }
        
        .unauthorized-help {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #f1f5f9;
        }
        
        .unauthorized-help-text {
          font-size: 13px;
          color: #94a3b8; /* Slate 400 */
          line-height: 1.5;
        }
      `}</style>

      <div className="unauthorized-card">
        <div className="unauthorized-icon-wrapper">
          <svg className="unauthorized-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 className="unauthorized-title">存取被拒絕</h1>
        <p className="unauthorized-message">
          抱歉，您的帳號權限不足，無法存取此頁面功能。<br />
          這可能需要特定角色的權限才能使用。
        </p>

        <div className="unauthorized-path">
          {from}
        </div>

        {user && (
          <div className="unauthorized-user">
            <span className="unauthorized-user-name">{user.name}</span>
            <span className="unauthorized-user-role">
              {user.role === 'engineer' ? 'Engineer' :
                user.role === 'reviewer' ? 'Reviewer' :
                  user.role === 'admin' ? 'Admin' : 'Public'}
            </span>
          </div>
        )}

        <div className="unauthorized-actions">
          <button className="btn btn-primary" onClick={handleGoHome}>
            返回首頁
          </button>
          <button className="btn btn-secondary" onClick={handleGoBack}>
            回上一頁
          </button>
          <button className="btn btn-text" onClick={handleLogout}>
            切換其他帳號登入
          </button>
        </div>

        <div className="unauthorized-help">
          <p className="unauthorized-help-text">
            如果您認為這是系統錯誤，或您應當擁有此權限，
            請聯繫系統管理員協助處理。
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
