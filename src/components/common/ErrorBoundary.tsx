/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and reports to Sentry.
 * @see specs/4-user-roles-system/spec.md FR-18
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Report to Sentry
        Sentry.captureException(error, {
            extra: {
                componentStack: errorInfo.componentStack,
            },
        });

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);

        // Log to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="error-boundary">
                    <style>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 24px;
              background: #0a0a0a;
              color: white;
              text-align: center;
            }

            .error-boundary-icon {
              font-size: 64px;
              margin-bottom: 24px;
            }

            .error-boundary-title {
              font-size: 24px;
              font-weight: 600;
              margin: 0 0 12px 0;
            }

            .error-boundary-message {
              font-size: 16px;
              color: rgba(255, 255, 255, 0.7);
              margin: 0 0 24px 0;
              max-width: 400px;
            }

            .error-boundary-actions {
              display: flex;
              gap: 12px;
            }

            .error-boundary-btn {
              padding: 12px 24px;
              font-size: 14px;
              font-weight: 500;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
            }

            .error-boundary-btn-primary {
              background: #2563eb;
              border: none;
              color: white;
            }

            .error-boundary-btn-primary:hover {
              background: #1d4ed8;
            }

            .error-boundary-btn-secondary {
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: white;
            }

            .error-boundary-btn-secondary:hover {
              background: rgba(255, 255, 255, 0.15);
            }

            .error-boundary-details {
              margin-top: 24px;
              padding: 16px;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 8px;
              max-width: 600px;
              text-align: left;
            }

            .error-boundary-details-title {
              font-size: 12px;
              color: rgba(255, 255, 255, 0.5);
              margin: 0 0 8px 0;
            }

            .error-boundary-details-text {
              font-family: monospace;
              font-size: 12px;
              color: #f87171;
              white-space: pre-wrap;
              word-break: break-word;
            }
          `}</style>

                    <div className="error-boundary-icon">⚠️</div>
                    <h1 className="error-boundary-title">發生錯誤</h1>
                    <p className="error-boundary-message">
                        應用程式發生了未預期的錯誤。錯誤已自動回報給我們的技術團隊。
                    </p>

                    <div className="error-boundary-actions">
                        <button
                            className="error-boundary-btn error-boundary-btn-primary"
                            onClick={this.handleRetry}
                        >
                            重試
                        </button>
                        <button
                            className="error-boundary-btn error-boundary-btn-secondary"
                            onClick={() => window.location.href = '/'}
                        >
                            返回首頁
                        </button>
                    </div>

                    {import.meta.env.DEV && this.state.error && (
                        <div className="error-boundary-details">
                            <p className="error-boundary-details-title">錯誤詳情 (僅開發環境顯示)</p>
                            <pre className="error-boundary-details-text">
                                {this.state.error.message}
                                {'\n\n'}
                                {this.state.error.stack}
                            </pre>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
