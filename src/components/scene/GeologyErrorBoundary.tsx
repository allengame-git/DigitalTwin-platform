/**
 * GeologyErrorBoundary Component
 * @module components/scene/GeologyErrorBoundary
 * 
 * 3D 渲染錯誤邊界
 * Task: T050
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GeologyFallback2D } from './GeologyFallback2D';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class GeologyErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });
        console.error('GeologyErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // 使用自定義 fallback 或預設的 2D 降級
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f9fafb',
                    }}
                >
                    {/* 錯誤提示 */}
                    <div
                        style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '16px 24px',
                            marginBottom: '16px',
                            maxWidth: '500px',
                            textAlign: 'center',
                        }}
                    >
                        <h3 style={{ margin: '0 0 8px', color: '#dc2626', fontSize: '16px' }}>
                            3D 場景載入失敗
                        </h3>
                        <p style={{ margin: '0 0 12px', color: '#7f1d1d', fontSize: '14px' }}>
                            {this.state.error?.message || '發生未知錯誤'}
                        </p>
                        <button
                            onClick={this.handleRetry}
                            style={{
                                padding: '8px 16px',
                                background: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            重試
                        </button>
                    </div>

                    {/* 2D 降級顯示 */}
                    <div
                        style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    >
                        <GeologyFallback2D width={800} height={500} />
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GeologyErrorBoundary;
