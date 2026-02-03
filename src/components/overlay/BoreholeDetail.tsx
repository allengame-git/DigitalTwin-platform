/**
 * 鑽孔詳細資訊面板
 * @module components/overlay/BoreholeDetail
 */

import React, { useState } from 'react';
import { useBoreholeStore } from '../../stores/boreholeStore';
import { LayerTable } from './LayerTable';
import { PropertyChart } from './PropertyChart';
import { PhotoGallery } from './PhotoGallery';

type TabType = 'layers' | 'properties' | 'photos';

export function BoreholeDetail() {
    const { selectedBorehole, clearSelection, status } = useBoreholeStore();
    const [activeTab, setActiveTab] = useState<TabType>('layers');

    if (!selectedBorehole) return null;

    const tabs: { key: TabType; label: string }[] = [
        { key: 'layers', label: '地層資料' },
        { key: 'properties', label: '物性曲線' },
        { key: 'photos', label: '岩芯照片' },
    ];

    return (
        <div
            style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '400px',
                maxHeight: 'calc(100vh - 32px)',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                fontFamily: 'system-ui, sans-serif',
                zIndex: 100,
            }}
        >
            {/* 標題列 */}
            <div
                style={{
                    padding: '16px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8f9fa',
                }}
            >
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                        {selectedBorehole.name}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                        深度: {selectedBorehole.totalDepth.toFixed(1)}m | 高程: {selectedBorehole.elevation.toFixed(1)}m
                    </p>
                </div>
                <button
                    onClick={clearSelection}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: '#999',
                        padding: '4px 8px',
                    }}
                >
                    ×
                </button>
            </div>

            {/* Tab 標籤 */}
            <div
                style={{
                    display: 'flex',
                    borderBottom: '1px solid #eee',
                }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            border: 'none',
                            background: activeTab === tab.key ? 'white' : '#f8f9fa',
                            borderBottom: activeTab === tab.key ? '2px solid #4a90d9' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: activeTab === tab.key ? 600 : 400,
                            color: activeTab === tab.key ? '#4a90d9' : '#666',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab 內容 */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                {status === 'loading' ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        載入中...
                    </div>
                ) : (
                    <>
                        {activeTab === 'layers' && (
                            <LayerTable layers={selectedBorehole.layers} />
                        )}
                        {activeTab === 'properties' && (
                            <PropertyChart properties={selectedBorehole.properties} />
                        )}
                        {activeTab === 'photos' && (
                            <PhotoGallery photos={selectedBorehole.photos} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default BoreholeDetail;
