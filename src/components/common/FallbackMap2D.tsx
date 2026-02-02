/**
 * FallbackMap2D
 *
 * 3D 場景載入失敗時的降級 2D 地圖顯示
 * 提供簡易的靜態地圖 + 重試按鈕
 *
 * @module src/components/common/FallbackMap2D
 * @see NFR-09 (所有展示模組的降級顯示需求)
 */

import React from 'react';
import type { FallbackProps } from './SceneErrorBoundary';

interface FallbackMap2DProps extends FallbackProps {
    /** 降級地圖的類型 */
    fallbackType?: 'geology' | 'engineering' | 'simulation';
    /** 自訂錯誤訊息 */
    customMessage?: string;
}

/**
 * 降級 2D 地圖元件
 *
 * 根據模組類型顯示不同的降級內容：
 * - geology: 2D 地質圖
 * - engineering: 2D 平面圖
 * - simulation: 2D 熱圖
 */
export const FallbackMap2D: React.FC<FallbackMap2DProps> = ({
    error,
    onRetry,
    fallbackType = 'geology',
    customMessage,
}) => {
    const getDefaultMessage = (): string => {
        switch (fallbackType) {
            case 'geology':
                return '3D 地質模型載入失敗，目前顯示 2D 地圖。';
            case 'engineering':
                return '3D 工程模型載入失敗，目前顯示 2D 平面圖。';
            case 'simulation':
                return '體積渲染無法執行，目前顯示 2D 熱圖。';
            default:
                return '3D 場景載入失敗。';
        }
    };

    return (
        <div className="fallback-map-container">
            <style>{`
        .fallback-map-container {
          width: 100%;
          height: 100%;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
          color: white;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .fallback-icon {
          font-size: 64px;
          margin-bottom: 24px;
          opacity: 0.8;
        }
        
        .fallback-message {
          font-size: 18px;
          text-align: center;
          max-width: 400px;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        
        .fallback-error-detail {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 24px;
          max-width: 500px;
          text-align: center;
        }
        
        .fallback-retry-btn {
          padding: 12px 32px;
          font-size: 16px;
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .fallback-retry-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.6);
        }
        
        .fallback-2d-placeholder {
          width: 100%;
          max-width: 600px;
          height: 300px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(255, 255, 255, 0.3);
        }
      `}</style>

            <div className="fallback-icon">🗺️</div>

            <p className="fallback-message">
                {customMessage || getDefaultMessage()}
            </p>

            <p className="fallback-error-detail">
                錯誤詳情: {error.message}
            </p>

            <button className="fallback-retry-btn" onClick={onRetry}>
                🔄 重新載入 3D 場景
            </button>

            <div className="fallback-2d-placeholder">
                <span style={{ opacity: 0.5 }}>2D 降級顯示區域</span>
            </div>
        </div>
    );
};

export default FallbackMap2D;
