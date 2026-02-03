/**
 * LoginForm Component
 * 
 * Login form for engineers and reviewers.
 * @see specs/4-user-roles-system/spec.md FR-19
 */

import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface LoginFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({ email, password });
      onSuccess?.();
    } catch {
      // Error is handled by store
    }
  };

  return (
    <div className="login-form-container">
      <style>{`
        .login-form-container {
          max-width: 400px;
          margin: 0 auto;
          padding: 40px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
          border: 1px solid #f1f5f9;
        }
        
        .login-form-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a; /* Slate 900 */
          margin-bottom: 8px;
          text-align: center;
          letter-spacing: -0.025em;
        }
        
        .login-form-subtitle {
          font-size: 14px;
          color: #64748b; /* Slate 500 */
          margin-bottom: 32px;
          text-align: center;
        }
        
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-label {
          font-size: 14px;
          font-weight: 500;
          color: #334155; /* Slate 700 */
        }
        
        .form-input {
          padding: 12px 14px;
          font-size: 15px;
          border: 1px solid #e2e8f0; /* Slate 200 */
          border-radius: 8px;
          background: #ffffff;
          color: #0f172a;
          transition: all 0.2s;
        }
        
        .form-input:focus {
          outline: none;
          background: #ffffff;
          border-color: #0f172a; /* Slate 900 */
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
        }
        
        .form-input::placeholder {
          color: #94a3b8; /* Slate 400 */
        }
        
        .form-error {
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: 8px;
          color: #ef4444; /* Red 500 */
          font-size: 14px;
        }
        
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        
        .btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        
        .btn-primary {
          background: #0f172a; /* Slate 900 */
          color: white;
          border: 1px solid transparent;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #1e293b; /* Slate 800 */
          transform: translateY(-1px);
        }
        
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .btn-primary:disabled {
          background: #94a3b8;
          cursor: not-allowed;
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
        
        .demo-hint {
          margin-top: 24px;
          padding: 16px;
          background: #f8fafc; /* Slate 50 */
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          font-size: 12px;
          color: #64748b; /* Slate 500 */
          line-height: 1.6;
        }
        
        .demo-hint strong {
          color: #334155;
          display: block;
          margin-bottom: 4px;
        }
        
        .demo-hint code {
          background: #ffffff;
          padding: 2px 6px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-family: 'SF Mono', 'Roboto Mono', Menlo, monospace;
          color: #0f172a;
        }
      `}</style>

      <h2 className="login-form-title">登入系統</h2>
      <p className="login-form-subtitle">請輸入您的帳號密碼以繼續</p>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            電子郵件
          </label>
          <input
            id="email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">
            密碼
          </label>
          <input
            id="password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              取消
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? '驗證中...' : '登入'}
          </button>
        </div>
      </form>

      <div className="demo-hint">
        <strong>💡 Demo 測試帳號</strong>
        管理員: <code>admin@example.com</code> / <code>admin123</code><br />
        工程師: <code>engineer@example.com</code> / <code>engineer123</code><br />
        審查委員: <code>reviewer@example.com</code> / <code>reviewer123</code>
      </div>
    </div>
  );
};

export default LoginForm;
