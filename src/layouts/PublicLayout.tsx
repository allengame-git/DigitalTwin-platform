/**
 * PublicLayout Component
 * 
 * Simplified layout for public/tour mode without login.
 * @see specs/4-user-roles-system/spec.md FR-14, FR-18
 */

import React, { useEffect, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface PublicLayoutProps {
    children?: ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    const { setPublicUser } = useAuthStore();

    // Set public user on mount
    useEffect(() => {
        setPublicUser();
    }, [setPublicUser]);

    return (
        <div className="public-layout">
            <style>{`
        .public-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0a0a0a;
          color: white;
        }
        
        .public-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
        }
        
        .public-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .public-logo-text {
          font-size: 20px;
          font-weight: 600;
          color: white;
        }
        
        .public-logo-badge {
          font-size: 12px;
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 10px;
          border-radius: 4px;
          color: #a5b4fc;
        }
        
        .public-nav {
          display: flex;
          gap: 8px;
        }
        
        .public-nav-link {
          padding: 8px 16px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          border-radius: 6px;
          transition: all 0.2s;
        }
        
        .public-nav-link:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .public-nav-link.active {
          color: white;
          background: rgba(255, 255, 255, 0.15);
        }
        
        .public-login-btn {
          padding: 8px 20px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          background: #2563eb;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .public-login-btn:hover {
          background: #1d4ed8;
        }
        
        .public-content {
          flex: 1;
          margin-top: 64px;
        }
        
        .public-footer {
          padding: 24px;
          background: rgba(0, 0, 0, 0.8);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
        }
        
        .public-footer-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
        }
        
        .public-footer-link {
          color: #a5b4fc;
          text-decoration: none;
        }
        
        .public-footer-link:hover {
          text-decoration: underline;
        }
        
        /* Tour Controls - Simplified for public users */
        .public-tour-controls {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 100;
        }
        
        .tour-btn {
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .tour-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }
        
        .tour-btn.primary {
          background: #2563eb;
          border-color: #2563eb;
        }
        
        .tour-btn.primary:hover {
          background: #1d4ed8;
        }
      `}</style>

            <header className="public-header">
                <div className="public-logo">
                    <span className="public-logo-text">LLRWD DigitalTwin</span>
                    <span className="public-logo-badge">導覽模式</span>
                </div>

                <nav className="public-nav">
                    <a href="/public/tour" className="public-nav-link">
                        🎬 導覽介紹
                    </a>
                    <a href="/public/about" className="public-nav-link">
                        ℹ️ 關於專案
                    </a>
                </nav>

                <a href="/login" className="public-login-btn">
                    專業人員登入
                </a>
            </header>

            <main className="public-content">
                {children || <Outlet />}
            </main>

            <footer className="public-footer">
                <p className="public-footer-text">
                    © 2026 LLRWD DigitalTwin Platform ·{' '}
                    <a href="/public/about" className="public-footer-link">
                        了解更多
                    </a>
                </p>
            </footer>
        </div>
    );
};

export default PublicLayout;
