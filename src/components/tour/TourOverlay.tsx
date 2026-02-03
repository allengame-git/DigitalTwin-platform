/**
 * TourOverlay Component
 * @module components/tour/TourOverlay
 * 
 * 導覽步驟說明疊加層
 * Task: T047
 */

import React from 'react';
import type { TourStep, TourConfig } from './tourLoader';

interface TourOverlayProps {
    tourConfig: TourConfig | null;
    currentStep: TourStep | null;
    stepIndex: number;
    isPlaying: boolean;
    isActive: boolean;
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
    onStart: () => void;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({
    tourConfig,
    currentStep,
    stepIndex,
    isPlaying,
    isActive,
    onPlay,
    onPause,
    onNext,
    onPrev,
    onClose,
    onStart,
}) => {
    // 未啟動時顯示開始按鈕
    if (!isActive) {
        return (
            <button
                onClick={onStart}
                style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    zIndex: 100,
                    pointerEvents: 'auto',
                }}
            >
                🎬 開始導覽
            </button>
        );
    }

    if (!currentStep || !tourConfig) return null;

    const totalSteps = tourConfig.steps.length;
    const progress = ((stepIndex + 1) / totalSteps) * 100;

    return (
        <div
            style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                padding: '16px 20px',
                minWidth: '320px',
                maxWidth: '480px',
                zIndex: 100,
                pointerEvents: 'auto',
            }}
        >
            {/* 進度條 */}
            <div
                style={{
                    height: '4px',
                    background: '#e5e7eb',
                    borderRadius: '2px',
                    marginBottom: '12px',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #667eea, #764ba2)',
                        transition: 'width 0.3s ease',
                    }}
                />
            </div>

            {/* 步驟標題 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1f2937' }}>
                    {currentStep.title}
                </h3>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {stepIndex + 1} / {totalSteps}
                </span>
            </div>

            {/* 步驟描述 */}
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>
                {currentStep.description}
            </p>

            {/* 控制按鈕 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={onPrev}
                        disabled={stepIndex === 0}
                        style={{
                            padding: '8px 16px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            background: 'white',
                            color: stepIndex === 0 ? '#9ca3af' : '#374151',
                            cursor: stepIndex === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                        }}
                    >
                        ← 上一步
                    </button>
                    <button
                        onClick={isPlaying ? onPause : onPlay}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            background: isPlaying ? '#ef4444' : '#22c55e',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                        }}
                    >
                        {isPlaying ? '⏸ 暫停' : '▶ 播放'}
                    </button>
                    <button
                        onClick={onNext}
                        disabled={stepIndex === totalSteps - 1}
                        style={{
                            padding: '8px 16px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            background: 'white',
                            color: stepIndex === totalSteps - 1 ? '#9ca3af' : '#374151',
                            cursor: stepIndex === totalSteps - 1 ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                        }}
                    >
                        下一步 →
                    </button>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        background: 'transparent',
                        color: '#6b7280',
                        cursor: 'pointer',
                        fontSize: '13px',
                    }}
                >
                    ✕ 結束
                </button>
            </div>
        </div>
    );
};

export default TourOverlay;
