/**
 * GeologySidebar Component
 * @module components/layout/GeologySidebar
 * 
 * 整合式地質模組側邊欄
 * 包含：標題、圖層控制、工具列
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { LayerPanel } from '../overlay/LayerPanel';
import { ClippingTool } from '../overlay/ClippingTool';
import { usePerformanceStore } from '../../stores/performanceStore';
import { useCameraStore } from '../../stores/cameraStore';

export const GeologySidebar: React.FC = () => {
    // 收合狀態
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const { fps, memory, triangles } = usePerformanceStore();
    const { resetCamera } = useCameraStore();

    return (
        <div
            style={{
                width: isCollapsed ? '50px' : '320px',
                height: '100%',
                background: 'white',
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
                zIndex: 50,
                transition: 'width 0.3s ease',
                position: 'relative',
            }}
        >
            {/* 收合按鈕 */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{
                    position: 'absolute',
                    top: '12px',
                    right: isCollapsed ? '50%' : '-15px',
                    transform: isCollapsed ? 'translateX(50%)' : 'none',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'white',
                    border: '1px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 60,
                    transition: 'all 0.3s ease',
                    color: '#4b5563',
                }}
                title={isCollapsed ? "展開側邊欄" : "收合側邊欄"}
            >
                {isCollapsed ? '›' : '‹'}
            </button>

            {/* 1. Module Header */}
            <div
                style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    height: isCollapsed ? '0px' : 'auto',
                    transition: 'all 0.2s ease',
                }}
            >
                <div style={{ marginBottom: '8px' }}>
                    <Link
                        to="/"
                        style={{
                            textDecoration: 'none',
                            color: '#4b5563',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 500
                        }}
                    >
                        ← 回到儀表板
                    </Link>
                </div>
                <h1 style={{ margin: 0, fontSize: '18px', color: '#111827', fontWeight: 700 }}>
                    地質資料展示
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    TWD97 座標系統 | 800+ 鑽孔
                </p>
            </div>

            {/* 收合時的圖標 */}
            <div
                style={{
                    display: isCollapsed ? 'flex' : 'none',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: '60px',
                    opacity: isCollapsed ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
            >
                <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', color: '#4b5563', letterSpacing: '2px', fontWeight: 600 }}>
                    地質資料模組
                </div>
            </div>

            {/* 2. Scrollable Content Area */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    pointerEvents: isCollapsed ? 'none' : 'auto',
                    transition: 'opacity 0.2s ease',
                }}
            >
                {/* Layer Control Section */}
                <LayerPanel mode="embedded" />

                {/* Analysis Tools Section */}
                <ClippingTool mode="embedded" />

                {/* Camera Tools Section */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        📷 相機控制
                    </div>
                    <button
                        onClick={resetCamera}
                        style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'background 0.2s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#2563eb')}
                        onMouseOut={(e) => (e.currentTarget.style.background = '#3b82f6')}
                    >
                        🎯 重置相機位置
                    </button>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                        將相機移動到當前模型的中心位置
                    </div>
                </div>
            </div>

            {/* 3. Footer */}
            <div
                style={{
                    padding: '12px 20px',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '11px',
                    color: '#9ca3af',
                    textAlign: 'center',
                    background: '#f9fafb',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    height: isCollapsed ? '0px' : 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                    <span>FPS: {fps}</span>
                    <span>Mem: {memory} MB</span>
                    <span>Tris: {(triangles / 1000).toFixed(1)}k</span>
                </div>
                <div>LLRWD DigitalTwin Platform v1.0</div>
            </div>
        </div>
    );
};

export default GeologySidebar;
