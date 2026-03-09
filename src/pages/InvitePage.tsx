/**
 * InvitePage Component
 * 
 * Landing page for invite link access.
 * @see specs/4-user-roles-system/spec.md FR-20
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'success' | 'error';

interface InviteInfo {
    valid: boolean;
    isExpired: boolean;
    isUsed: boolean;
    expiresAt: string;
}

export const InvitePage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const loginWithInvite = useAuthStore(state => state.loginWithInvite);
    const [status, setStatus] = useState<InviteStatus>('loading');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (!token) {
            setStatus('invalid');
            return;
        }

        // Check invite link validity
        checkInvite(token);
    }, [token]);

    const checkInvite = async (inviteToken: string) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || '/api'}/invite/${inviteToken}/info`
            );
            const info: InviteInfo = await response.json();

            if (!response.ok) {
                setStatus('invalid');
                return;
            }

            if (info.isExpired) {
                setStatus('expired');
            } else if (info.isUsed) {
                setStatus('used');
            } else if (info.valid) {
                setStatus('valid');
            } else {
                setStatus('invalid');
            }
        } catch {
            setStatus('invalid');
        }
    };

    const handleAcceptInvite = async () => {
        if (!token) return;

        setStatus('loading');
        try {
            await loginWithInvite(token);
            setStatus('success');
            // Redirect to main app after short delay
            setTimeout(() => navigate('/'), 1500);
        } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : '接受邀請失敗');
        }
    };

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <div className="invite-status">
                        <div className="spinner" />
                        <p>驗證邀請連結中...</p>
                    </div>
                );

            case 'valid':
                return (
                    <div className="invite-valid">
                        <div className="invite-icon">✉️</div>
                        <h2>您已受邀成為審查委員</h2>
                        <p>點擊下方按鈕進入系統，開始審查工作。</p>
                        <button className="btn btn-primary" onClick={handleAcceptInvite}>
                            進入審查系統
                        </button>
                        <p className="invite-note">
                            ⏱️ 登入後您將有 1 小時的Session時間
                        </p>
                    </div>
                );

            case 'success':
                return (
                    <div className="invite-success">
                        <div className="invite-icon">✅</div>
                        <h2>歡迎！</h2>
                        <p>正在為您載入審查系統...</p>
                    </div>
                );

            case 'expired':
                return (
                    <div className="invite-error">
                        <div className="invite-icon">⏰</div>
                        <h2>邀請連結已過期</h2>
                        <p>請聯繫系統管理員取得新的邀請連結。</p>
                    </div>
                );

            case 'used':
                return (
                    <div className="invite-error">
                        <div className="invite-icon">🔒</div>
                        <h2>邀請連結已被使用</h2>
                        <p>每個邀請連結只能使用一次。如需再次存取，請聯繫系統管理員。</p>
                    </div>
                );

            case 'error':
                return (
                    <div className="invite-error">
                        <div className="invite-icon">❌</div>
                        <h2>發生錯誤</h2>
                        <p>{error || '無法處理邀請連結'}</p>
                        <button className="btn btn-secondary" onClick={() => checkInvite(token!)}>
                            重試
                        </button>
                    </div>
                );

            default:
                return (
                    <div className="invite-error">
                        <div className="invite-icon">❓</div>
                        <h2>邀請連結無效</h2>
                        <p>請確認您的連結是否正確，或聯繫系統管理員。</p>
                    </div>
                );
        }
    };

    return (
        <div className="invite-page">
            <style>{`
        .invite-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
          padding: 20px;
        }
        
        .invite-card {
          background: white;
          border-radius: 16px;
          padding: 48px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .invite-icon {
          font-size: 64px;
          margin-bottom: 24px;
        }
        
        .invite-card h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 12px;
        }
        
        .invite-card p {
          font-size: 16px;
          color: #666;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        
        .invite-note {
          font-size: 14px !important;
          color: #999 !important;
          margin-top: 16px !important;
        }
        
        .btn {
          display: inline-block;
          padding: 14px 32px;
          font-size: 16px;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        
        .btn-primary {
          background: #2563eb;
          color: white;
        }
        
        .btn-primary:hover {
          background: #1d4ed8;
        }
        
        .btn-secondary {
          background: #f5f5f5;
          color: #333;
        }
        
        .btn-secondary:hover {
          background: #e5e5e5;
        }
        
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e5e5;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 24px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .invite-status {
          padding: 24px 0;
        }
        
        .invite-valid,
        .invite-success,
        .invite-error {
          padding: 12px 0;
        }
        
        .invite-logo {
          margin-bottom: 32px;
        }
        
        .invite-logo img {
          height: 48px;
        }
      `}</style>

            <div className="invite-card">
                <div className="invite-logo">
                    <span style={{ fontSize: '32px', fontWeight: 700, color: '#1e3a5f' }}>
                        LLRWD DigitalTwin
                    </span>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default InvitePage;
