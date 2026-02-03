/**
 * 鑽孔資訊彈出視窗
 * @module components/overlay/BoreholePopup
 */

import React from 'react';
import { Html } from '@react-three/drei';
import { useBoreholeStore } from '../../stores/boreholeStore';

interface BoreholePopupProps {
    /** 世界座標位置 */
    position: [number, number, number];
}

export function BoreholePopup({ position }: BoreholePopupProps) {
    const { selectedBorehole, clearSelection } = useBoreholeStore();

    if (!selectedBorehole) return null;

    return (
        <Html
            position={position}
            center
            distanceFactor={500}
            style={{
                transition: 'all 0.2s',
                opacity: 1,
                pointerEvents: 'auto',
            }}
        >
            <div
                style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    minWidth: '200px',
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '14px',
                }}
            >
                {/* 標題 */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #eee',
                    }}
                >
                    <strong style={{ color: '#333' }}>{selectedBorehole.name}</strong>
                    <button
                        onClick={clearSelection}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '18px',
                            color: '#999',
                            padding: '0 4px',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* 資訊列表 */}
                <div style={{ color: '#666', lineHeight: '1.6' }}>
                    <div><b>編號:</b> {selectedBorehole.id}</div>
                    <div><b>座標 X:</b> {selectedBorehole.x.toFixed(2)} m</div>
                    <div><b>座標 Y:</b> {selectedBorehole.y.toFixed(2)} m</div>
                    <div><b>孔口高程:</b> {selectedBorehole.elevation.toFixed(2)} m</div>
                    <div><b>總深度:</b> {selectedBorehole.totalDepth.toFixed(1)} m</div>
                    {selectedBorehole.area && (
                        <div><b>區域:</b> {selectedBorehole.area}</div>
                    )}
                </div>

                {/* 查看詳細按鈕 */}
                <button
                    style={{
                        marginTop: '12px',
                        width: '100%',
                        padding: '8px',
                        background: '#4a90d9',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                    }}
                    onClick={() => {
                        // TODO: 開啟詳細面板
                        console.log('View detail:', selectedBorehole.id);
                    }}
                >
                    查看詳細資料
                </button>
            </div>
        </Html>
    );
}

export default BoreholePopup;
