import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PlaceholderPage: React.FC<{ title: string; icon: string }> = ({ title, icon }) => {
    const { user } = useAuth();
    const { projectCode } = useParams<{ projectCode: string }>();

    return (
        <div style={{
            minHeight: '100vh',
            padding: '32px',
            textAlign: 'center',
            background: '#f5f5f5',
        }}>
            <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</h1>
            <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{title}</h2>
            <p style={{ color: '#666', marginBottom: '16px' }}>這是 {title} 的預留位置頁面。</p>
            <p style={{ color: '#999', marginBottom: '24px' }}>目前登入為：{user?.name} ({user?.role})</p>
            <Link
                to={projectCode ? `/project/${projectCode}` : '/'}
                style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: '#2563eb',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                }}
            >
                返回{projectCode ? '專案' : ''}儀表板
            </Link>
        </div>
    );
};

export const GeologyPage = () => <PlaceholderPage title="地質資料" icon="🗺️" />;
export const EngineeringPage = () => <PlaceholderPage title="工程設計" icon="🏗️" />;
export const SimulationPage = () => <PlaceholderPage title="模擬分析" icon="📊" />;
export const DataExplorerPage = () => <PlaceholderPage title="原始資料" icon="📁" />;
export const AdminPage = () => <PlaceholderPage title="系統管理" icon="⚙️" />;
export const AnnotationsPagePlaceholder = () => <PlaceholderPage title="審查標註" icon="📝" />;

export default GeologyPage; // Default export for lazy loading compatibility
