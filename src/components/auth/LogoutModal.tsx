/**
 * LogoutModal Component
 * 
 * Confirmation modal for logout action.
 * @see specs/4-user-roles-system/spec.md
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
}) => {
    const { logout, user } = useAuth();

    if (!isOpen) return null;

    const handleLogout = async () => {
        await logout();
        onConfirm?.();
        onClose();
    };

    return (
        <div className="modal-overlay">
            <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          animation: slideIn 0.2s ease-out;
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 12px;
        }
        
        .modal-body {
          font-size: 14px;
          color: #666;
          margin-bottom: 24px;
          line-height: 1.6;
        }
        
        .modal-user {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 8px;
          margin-top: 8px;
        }
        
        .modal-user-name {
          font-weight: 500;
          color: #333;
        }
        
        .modal-user-role {
          font-size: 12px;
          color: #666;
          background: #e5e5e5;
          padding: 2px 8px;
          border-radius: 4px;
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        .btn {
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-cancel {
          background: white;
          color: #666;
          border: 1px solid #ddd;
        }
        
        .btn-cancel:hover {
          background: #f5f5f5;
        }
        
        .btn-logout {
          background: #dc2626;
          color: white;
          border: none;
        }
        
        .btn-logout:hover {
          background: #b91c1c;
        }
      `}</style>

            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal-title">確認登出</h3>
                <div className="modal-body">
                    <p>您確定要登出嗎？登出後將需要重新登入才能存取系統功能。</p>
                    {user && (
                        <div className="modal-user">
                            <span className="modal-user-name">{user.name}</span>
                            <span className="modal-user-role">
                                {user.role === 'engineer' ? '工程師' : '審查委員'}
                            </span>
                        </div>
                    )}
                </div>
                <div className="modal-actions">
                    <button className="btn btn-cancel" onClick={onClose}>
                        取消
                    </button>
                    <button className="btn btn-logout" onClick={handleLogout}>
                        登出
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
