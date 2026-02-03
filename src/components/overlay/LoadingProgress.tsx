/**
 * 載入進度條元件
 * @module components/overlay/LoadingProgress
 */

import React from 'react';
import { useViewerStore } from '../../stores/viewerStore';

interface LoadingProgressProps {
    /** 自訂訊息 */
    message?: string;
}

export function LoadingProgress({ message = '載入中...' }: LoadingProgressProps) {
    const { loadingProgress } = useViewerStore();

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.9)',
                zIndex: 100,
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            {/* Spinner */}
            <div
                style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #e0e0e0',
                    borderTopColor: '#4a90d9',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }}
            />

            {/* 訊息 */}
            <p style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
                {message}
            </p>

            {/* 進度條 */}
            {loadingProgress > 0 && (
                <div
                    style={{
                        marginTop: '12px',
                        width: '200px',
                        height: '4px',
                        background: '#e0e0e0',
                        borderRadius: '2px',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            width: `${loadingProgress}%`,
                            height: '100%',
                            background: '#4a90d9',
                            transition: 'width 0.3s ease',
                        }}
                    />
                </div>
            )}

            {/* 進度文字 */}
            {loadingProgress > 0 && (
                <p style={{ marginTop: '8px', color: '#999', fontSize: '12px' }}>
                    {loadingProgress.toFixed(0)}%
                </p>
            )}

            {/* CSS Animation */}
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

export default LoadingProgress;
