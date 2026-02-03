/**
 * AboutPage Component
 * 
 * About page for public users.
 */

import React from 'react';

export const AboutPage: React.FC = () => {
    return (
        <div className="about-page">
            <style>{`
        .about-page {
          padding: 60px 24px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .about-title {
          font-size: 36px;
          font-weight: 600;
          color: white;
          margin-bottom: 24px;
        }
        
        .about-content {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.8;
        }
        
        .about-content p {
          margin-bottom: 20px;
        }
        
        .about-content h2 {
          font-size: 24px;
          font-weight: 600;
          color: white;
          margin: 40px 0 16px;
        }
        
        .about-content ul {
          list-style: disc;
          padding-left: 24px;
        }
        
        .about-content li {
          margin-bottom: 8px;
        }
      `}</style>

            <h1 className="about-title">關於 LLRWD DigitalTwin</h1>

            <div className="about-content">
                <p>
                    LLRWD DigitalTwin 是一個工程數位孿生平台，整合地質資料、工程設計與數值模擬成果，
                    以 3D 視覺化技術呈現李爾溪水庫計畫的規劃與設計。
                </p>

                <h2>主要功能</h2>
                <ul>
                    <li>3D 地質資料展示：鑽孔、地層、地質構造</li>
                    <li>工程設計模型：壩體、廠房、隧道</li>
                    <li>4D 施工模擬：依時間序列展示施工進度</li>
                    <li>模擬分析結果：流場、應力、水位變化</li>
                </ul>

                <h2>技術架構</h2>
                <p>
                    本平台採用 CesiumJS 作為 3D GIS 引擎，搭配 React 前端框架，
                    後端使用 Node.js 與 PostgreSQL/PostGIS 地理資料庫。
                </p>

                <h2>聯絡我們</h2>
                <p>
                    如有任何問題或建議，歡迎聯繫專案團隊。
                </p>
            </div>
        </div>
    );
};

export default AboutPage;
