/**
 * 地層資料表格
 * @module components/overlay/LayerTable
 */

import React from 'react';
import type { Layer } from '../../types/geology';
import { useLithologyStore } from '../../stores/lithologyStore';

interface LayerTableProps {
    layers: Layer[];
}

export function LayerTable({ layers }: LayerTableProps) {
    const lithologies = useLithologyStore(state => state.lithologies);

    if (layers.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                無地層資料
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                }}
            >
                <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                        <th style={thStyle}>深度 (m)</th>
                        <th style={thStyle}>岩性</th>
                        <th style={thStyle}>描述</th>
                    </tr>
                </thead>
                <tbody>
                    {layers.map((layer) => {
                        // Dynamic lookup from project settings
                        const lithology = lithologies.find(l => l.code === layer.lithologyCode);
                        const displayColor = lithology?.color || layer.color;
                        const displayName = lithology?.name || layer.lithologyName;

                        return (
                            <tr key={layer.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={tdStyle}>
                                    {layer.topDepth.toFixed(1)} - {layer.bottomDepth.toFixed(1)}
                                </td>
                                <td style={tdStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                width: '16px',
                                                height: '16px',
                                                borderRadius: '3px',
                                                background: displayColor,
                                                border: '1px solid #ddd',
                                            }}
                                        />
                                        <span>{displayName}</span>
                                    </div>
                                </td>
                                <td style={tdStyle}>{layer.description || '-'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* 柱狀圖視覺化 */}
            <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#666' }}>
                    柱狀圖
                </h4>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        overflow: 'hidden',
                    }}
                >
                    {layers.map((layer) => {
                        const lithology = lithologies.find(l => l.code === layer.lithologyCode);
                        const displayColor = lithology?.color || layer.color;
                        const displayName = lithology?.name || layer.lithologyName;

                        const height = (layer.bottomDepth - layer.topDepth) * 3; // 3px per meter
                        return (
                            <div
                                key={layer.id}
                                style={{
                                    height: `${Math.max(height, 20)}px`,
                                    background: displayColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0 8px',
                                    borderBottom: '1px solid rgba(255,255,255,0.3)',
                                    fontSize: '11px',
                                    color: getContrastColor(displayColor),
                                }}
                            >
                                <span>{displayName}</span>
                                <span>{layer.topDepth.toFixed(1)}m</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '10px 8px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#333',
    borderBottom: '2px solid #ddd',
};

const tdStyle: React.CSSProperties = {
    padding: '10px 8px',
    color: '#555',
};

/** 根據背景色計算對比文字顏色 */
function getContrastColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#333' : '#fff';
}

export default LayerTable;
