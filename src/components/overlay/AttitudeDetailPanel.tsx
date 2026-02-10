/**
 * AttitudeDetailPanel Component
 * @module components/overlay/AttitudeDetailPanel
 * 
 * 位態資料詳細資訊面板
 */

import React from 'react';
import { useAttitudeStore } from '../../stores/attitudeStore';

export const AttitudeDetailPanel: React.FC = () => {
    const { attitudes, selectedAttitudeId, selectAttitude } = useAttitudeStore();

    const attitude = attitudes.find(a => a.id === selectedAttitudeId);

    if (!selectedAttitudeId || !attitude) return null;

    const panelStyle: React.CSSProperties = {
        width: '320px',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(8px)',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderLeft: '1px solid #e2e8f0',
        animation: 'slideIn 0.3s ease-out',
    };

    const headerStyle: React.CSSProperties = {
        padding: '20px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f8fafc',
    };

    const sectionStyle: React.CSSProperties = {
        padding: '20px',
        borderBottom: '1px solid #f1f5f9',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '12px',
        color: '#64748b',
        marginBottom: '4px',
        display: 'block',
    };

    const valueStyle: React.CSSProperties = {
        fontSize: '15px',
        color: '#0f172a',
        fontWeight: 500,
        fontFamily: 'monospace',
    };

    return (
        <div style={panelStyle}>
            <div style={headerStyle}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
                    📐 位態資料詳情
                </h3>
                <button
                    onClick={() => selectAttitude(null)}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* 座標資訊 */}
                <div style={sectionStyle}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#3b82f6', fontWeight: 600 }}>📍 座標資訊 (TWD97)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <span style={labelStyle}>X (東距)</span>
                            <span style={valueStyle}>{attitude.x.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                        </div>
                        <div>
                            <span style={labelStyle}>Y (北距)</span>
                            <span style={valueStyle}>{attitude.y.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                        </div>
                        <div>
                            <span style={labelStyle}>Z (高程)</span>
                            <span style={valueStyle}>{attitude.z.toFixed(2)} m</span>
                        </div>
                    </div>
                </div>

                {/* 位態參數 */}
                <div style={sectionStyle}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#10b981', fontWeight: 600 }}>🧭 位態參數</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <span style={labelStyle}>走向 (Strike)</span>
                            <span style={valueStyle}>N {attitude.strike.toFixed(1)}° E</span>
                        </div>
                        <div>
                            <span style={labelStyle}>傾角 (Dip)</span>
                            <span style={valueStyle}>{attitude.dip.toFixed(1)}°</span>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <span style={labelStyle}>傾向 (Dip Direction)</span>
                            <span style={valueStyle}>{attitude.dipDirection || '未填寫'}</span>
                        </div>
                    </div>
                </div>

                {/* 其他資訊 */}
                <div style={sectionStyle}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6366f1', fontWeight: 600 }}>📝 備註</h4>
                    <p style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#334155',
                        lineHeight: 1.6,
                        background: '#f8fafc',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        minHeight: '60px'
                    }}>
                        {attitude.description || '無備註內容'}
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};
