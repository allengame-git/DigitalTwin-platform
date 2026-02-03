/**
 * LoginPage Component
 * 
 * Full-page login with LoginForm.
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSuccess = () => {
    navigate(from, { replace: true });
  };

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc; /* Slate 50 */
          padding: 20px;
        }
        
        .login-wrapper {
          width: 100%;
          max-width: 440px;
        }
        
        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .login-logo {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a; /* Slate 900 */
          margin-bottom: 8px;
          letter-spacing: -0.025em;
        }
        
        .login-subtitle {
          font-size: 15px;
          color: #64748b; /* Slate 500 */
        }
        
        .login-footer {
          text-align: center;
          margin-top: 24px;
        }
        
        .login-public-link {
          font-size: 14px;
          color: #64748b; /* Slate 500 */
        }
        
        .login-public-link a {
          color: #334155; /* Slate 700 */
          font-weight: 500;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: all 0.2s;
        }
        
        .login-public-link a:hover {
          color: #0f172a; /* Slate 900 */
          border-bottom-color: #0f172a;
        }
      `}</style>

      <div className="login-wrapper">
        <div className="login-header">
          <h1 className="login-logo">LLRWD DigitalTwin</h1>
          <p className="login-subtitle">工程數位孿生平台</p>
        </div>

        <LoginForm onSuccess={handleSuccess} />

        <div className="login-footer">
          <p className="login-public-link">
            一般民眾？<a href="/public">進入導覽模式 →</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
