/**
 * SessionWarning Component
 * 
 * Modal warning for session expiry (5 minutes before).
 * @see specs/4-user-roles-system/spec.md FR-21
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SessionWarningProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SessionWarning: React.FC<SessionWarningProps> = ({
    isOpen,
    onClose,
}) => {
    const { extendSession, logout, user } = useAuth();
    const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes in seconds
    const [isExtending, setIsExtending] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTimeLeft(5 * 60);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    logout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, logout]);

    if (!isOpen) return null;

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleExtend = async () => {
        setIsExtending(true);
        try {
            await extendSession();
            onClose();
        } catch {
            // Handle error
        } finally {
            setIsExtending(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        onClose();
    };

    return (
        <div className="session-warning-overlay">
            <style>{`
        .session-warning-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .session-warning-modal {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 420px;
          width: 90%;
          text-align: center;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .warning-icon {
          font-size: 56px;
          margin-bottom: 16px;
        }
        
        .warning-title {
          font-size: 22px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
        }
        
        .warning-message {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
          line-height: 1.6;
        }
        
        .warning-timer {
          display: inline-block;
          font-size: 48px;
          font-weight: 700;
          color: #dc2626;
          font-family: 'SF Mono', 'Menlo', monospace;
          background: #fef2f2;
          padding: 12px 24px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        
        .warning-role {
          display: inline-block;
          font-size: 12px;
          color: #666;
          background: #f5f5f5;
          padding: 4px 12px;
          border-radius: 4px;
          margin-bottom: 24px;
        }
        
        .warning-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .btn {
          flex: 1;
          max-width: 160px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-extend {
          background: #2563eb;
          color: white;
          border: none;
        }
        
        .btn-extend:hover:not(:disabled) {
          background: #1d4ed8;
        }
        
        .btn-extend:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }
        
        .btn-logout {
          background: white;
          color: #666;
          border: 1px solid #ddd;
        }
        
        .btn-logout:hover {
          background: #f5f5f5;
        }
      `}</style>

            <div className="session-warning-modal">
                <div className="warning-icon">⚠️</div>
                <h3 className="warning-title">Session 即將到期</h3>
                <p className="warning-message">
                    您的登入 Session 即將到期，請選擇延長或登出。
                </p>

                <div className="warning-timer">{formatTime(timeLeft)}</div>

                {user && (
                    <div className="warning-role">
                        {user.role === 'engineer' ? '工程師 (8 小時 Session)' : '審查委員 (1 小時 Session)'}
                    </div>
                )}

                <div className="warning-actions">
                    <button
                        className="btn btn-extend"
                        onClick={handleExtend}
                        disabled={isExtending}
                    >
                        {isExtending ? '延長中...' : '延長 Session'}
                    </button>
                    <button className="btn btn-logout" onClick={handleLogout}>
                        立即登出
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionWarning;
