/**
 * MultiSectionPanel Component
 * @module components/controls/MultiSectionPanel
 * 
 * 多剖面切割控制面板
 */

import React from 'react';
import { useViewerStore } from '../../stores/viewerStore';

interface MultiSectionPanelProps {
    mode?: 'floating' | 'embedded';
}

export const MultiSectionPanel: React.FC<MultiSectionPanelProps> = ({
    mode = 'embedded',
}) => {
    const { multiSection, setMultiSection, clippingPlane, setClippingPlane } = useViewerStore();

    const handleEnable = (enabled: boolean) => {
        setMultiSection({ enabled });
        // 啟用多剖面時，關閉單一剖面
        if (enabled && clippingPlane.enabled) {
            setClippingPlane({ enabled: false });
        }
    };

    const sectionStyle: React.CSSProperties = {
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '13px',
        fontWeight: 500,
        color: '#374151',
    };

    const subLabelStyle: React.CSSProperties = {
        fontSize: '10px',
        color: '#9ca3af',
    };

    const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
    };

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: '4px 12px',
        fontSize: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        background: active ? '#3b82f6' : '#fff',
        color: active ? '#fff' : '#374151',
        cursor: 'pointer',
        transition: 'all 0.15s',
    });

    return (
        <div style={sectionStyle}>
            {/* Header: 多剖面切割 */}
            <div style={rowStyle}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={labelStyle}>✂️ 多剖面切割</span>
                    <span style={subLabelStyle}>
                        {multiSection.enabled
                            ? `${multiSection.axis.toUpperCase()} 軸 × ${multiSection.count} 片`
                            : '產生多個平行剖面'}
                    </span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={multiSection.enabled}
                        onChange={(e) => handleEnable(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                </label>
            </div>

            {/* Controls (只在啟用時顯示) */}
            {multiSection.enabled && (
                <div style={{
                    padding: '10px',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    marginTop: '8px',
                }}>
                    {/* 軸向選擇 */}
                    <div style={rowStyle}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>切片軸向</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                style={buttonStyle(multiSection.axis === 'x')}
                                onClick={() => setMultiSection({ axis: 'x' })}
                            >
                                X 軸
                            </button>
                            <button
                                style={buttonStyle(multiSection.axis === 'y')}
                                onClick={() => setMultiSection({ axis: 'y' })}
                            >
                                Y 軸
                            </button>
                        </div>
                    </div>

                    {/* 剖面數量 */}
                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ ...rowStyle, marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>剖面數量</span>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#1f2937' }}>
                                {multiSection.count} 片
                            </span>
                        </div>
                        <input
                            type="range"
                            min="2"
                            max="10"
                            step="1"
                            value={multiSection.count}
                            onChange={(e) => setMultiSection({ count: parseInt(e.target.value) })}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>

                    {/* 間距 */}
                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ ...rowStyle, marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>剖面間距</span>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#1f2937' }}>
                                {multiSection.spacing} m
                            </span>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="800"
                            step="50"
                            value={multiSection.spacing}
                            onChange={(e) => setMultiSection({ spacing: parseInt(e.target.value) })}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>

                    {/* 間隙寬度 */}
                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ ...rowStyle, marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>間隙寬度</span>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#1f2937' }}>
                                {multiSection.gapWidth} m
                            </span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="200"
                            step="10"
                            value={multiSection.gapWidth}
                            onChange={(e) => setMultiSection({ gapWidth: parseInt(e.target.value) })}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>

                    {/* 起始位置 */}
                    <div>
                        <div style={{ ...rowStyle, marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>起始位置</span>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#1f2937' }}>
                                {multiSection.startPosition} m
                            </span>
                        </div>
                        <input
                            type="range"
                            min="-1000"
                            max="1000"
                            step="50"
                            value={multiSection.startPosition}
                            onChange={(e) => setMultiSection({ startPosition: parseInt(e.target.value) })}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSectionPanel;
