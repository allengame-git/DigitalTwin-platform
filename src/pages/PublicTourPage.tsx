/**
 * PublicTourPage Component
 * 
 * Auto-start guided tour for public users.
 * @see specs/4-user-roles-system/spec.md FR-16, FR-17
 */

import React, { useState, useEffect } from 'react';

interface TourStep {
    id: string;
    title: string;
    description: string;
    duration: number; // seconds
}

const TOUR_STEPS: TourStep[] = [
    {
        id: 'intro',
        title: '歡迎來到 LLRWD 數位孿生平台',
        description: '本平台以 3D 視覺化技術呈現李爾溪水庫計畫的工程設計與地質資料。',
        duration: 5,
    },
    {
        id: 'geology',
        title: '地質資料展示',
        description: '探索鑽孔資料、地層分布與地質構造，了解壩址區域的地質條件。',
        duration: 6,
    },
    {
        id: 'design',
        title: '工程設計模型',
        description: '檢視壩體、廠房與隧道設計，觀察施工階段的 4D 動畫展示。',
        duration: 6,
    },
    {
        id: 'simulation',
        title: '模擬分析結果',
        description: '了解流場分布、應力分析與庫區水位變化的模擬成果。',
        duration: 6,
    },
    {
        id: 'outro',
        title: '探索更多',
        description: '點擊「探索」按鈕自由瀏覽 3D 場景，或觀看更多說明資料。',
        duration: 5,
    },
];

export const PublicTourPage: React.FC = () => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    const currentStep = TOUR_STEPS[currentStepIndex];
    const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

    useEffect(() => {
        if (!isPlaying) return;

        const stepDuration = currentStep.duration * 1000;
        const interval = 50; // Update progress every 50ms
        let elapsed = 0;

        const timer = setInterval(() => {
            elapsed += interval;
            setProgress((elapsed / stepDuration) * 100);

            if (elapsed >= stepDuration) {
                if (!isLastStep) {
                    setCurrentStepIndex((prev) => prev + 1);
                    setProgress(0);
                } else {
                    setIsPlaying(false);
                }
                clearInterval(timer);
            }
        }, interval);

        return () => clearInterval(timer);
    }, [currentStepIndex, isPlaying, currentStep.duration, isLastStep]);

    const handlePrevious = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1);
            setProgress(0);
        }
    };

    const handleNext = () => {
        if (!isLastStep) {
            setCurrentStepIndex((prev) => prev + 1);
            setProgress(0);
        }
    };

    const handlePlayPause = () => {
        setIsPlaying((prev) => !prev);
    };

    const handleRestart = () => {
        setCurrentStepIndex(0);
        setProgress(0);
        setIsPlaying(true);
    };

    return (
        <div className="tour-page">
            <style>{`
        .tour-page {
          height: calc(100vh - 64px);
          display: flex;
          flex-direction: column;
          position: relative;
          background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
        }
        
        /* Placeholder for 3D scene */
        .tour-scene {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .tour-scene-placeholder {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.3);
          text-align: center;
        }
        
        /* Tour overlay */
        .tour-overlay {
          position: absolute;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 600px;
          width: 90%;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 24px;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        .tour-step-indicator {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .tour-step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.3s;
        }
        
        .tour-step-dot.active {
          background: #2563eb;
          width: 24px;
          border-radius: 4px;
        }
        
        .tour-step-dot.completed {
          background: rgba(255, 255, 255, 0.5);
        }
        
        .tour-title {
          font-size: 22px;
          font-weight: 600;
          color: white;
          margin-bottom: 8px;
        }
        
        .tour-description {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin-bottom: 20px;
        }
        
        .tour-progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 16px;
        }
        
        .tour-progress-fill {
          height: 100%;
          background: #2563eb;
          transition: width 0.05s linear;
        }
        
        .tour-actions {
          display: flex;
          gap: 12px;
          justify-content: space-between;
        }
        
        .tour-nav {
          display: flex;
          gap: 8px;
        }
        
        .tour-btn {
          padding: 10px 20px;
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
          gap: 6px;
        }
        
        .tour-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }
        
        .tour-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .tour-btn.primary {
          background: #2563eb;
          border-color: #2563eb;
        }
        
        .tour-btn.primary:hover {
          background: #1d4ed8;
        }
        
        .tour-learn-more {
          padding: 10px 20px;
          font-size: 14px;
          color: #a5b4fc;
          background: transparent;
          border: none;
          cursor: pointer;
          text-decoration: underline;
        }
        
        .tour-learn-more:hover {
          color: white;
        }
      `}</style>

            <div className="tour-scene">
                <div className="tour-scene-placeholder">
                    <p>🎬 3D 導覽場景</p>
                    <p style={{ fontSize: 14, marginTop: 8 }}>
                        (此處將顯示互動式 3D 模型)
                    </p>
                </div>
            </div>

            <div className="tour-overlay">
                <div className="tour-step-indicator">
                    {TOUR_STEPS.map((step, index) => (
                        <div
                            key={step.id}
                            className={`tour-step-dot ${index === currentStepIndex
                                    ? 'active'
                                    : index < currentStepIndex
                                        ? 'completed'
                                        : ''
                                }`}
                        />
                    ))}
                </div>

                <h2 className="tour-title">{currentStep.title}</h2>
                <p className="tour-description">{currentStep.description}</p>

                <div className="tour-progress-bar">
                    <div
                        className="tour-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="tour-actions">
                    <div className="tour-nav">
                        <button
                            className="tour-btn"
                            onClick={handlePrevious}
                            disabled={currentStepIndex === 0}
                        >
                            ← 上一步
                        </button>
                        <button className="tour-btn" onClick={handlePlayPause}>
                            {isPlaying ? '⏸ 暫停' : '▶️ 播放'}
                        </button>
                        {isLastStep ? (
                            <button className="tour-btn primary" onClick={handleRestart}>
                                🔄 重新播放
                            </button>
                        ) : (
                            <button className="tour-btn" onClick={handleNext}>
                                下一步 →
                            </button>
                        )}
                    </div>

                    <button className="tour-learn-more">
                        📖 了解更多
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublicTourPage;
