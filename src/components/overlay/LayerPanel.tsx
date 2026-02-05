/**
 * LayerPanel Component
 * @module components/overlay/LayerPanel
 * 
 * 圖層控制面板 - 用於切換圖層顯示與調整透明度
 * Tasks: T033, T034, T035
 */

import React, { useState } from 'react';
import { useLayerStore, LayerType } from '../../stores/layerStore';
import { useViewerStore } from '../../stores/viewerStore';
import { MultiSectionPanel } from '../controls/MultiSectionPanel';
import { ImagerySelector } from '../controls/ImagerySelector';
import { useAuth } from '../../contexts/AuthContext';

interface LayerPanelProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    defaultCollapsed?: boolean;
    mode?: 'floating' | 'embedded';
}

const LAYER_ICONS: Record<LayerType, string> = {
    boreholes: '⚫',
    geology3d: '🧊',
    faults: '➖',
    attitudes: '📐',
    terrain: '⛰️',
    imagery: '🛰️',
    geophysics: '📡',
};

export const LayerPanel: React.FC<LayerPanelProps> = ({
    position = 'top-right',
    defaultCollapsed = false,
    mode = 'floating',
}) => {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const {
        layers,
        undergroundTransparency,
        toggleLayer,
        setOpacity,
        setUndergroundTransparency,
    } = useLayerStore();

    const positionStyles: Record<string, React.CSSProperties> = {
        'top-left': { top: 80, left: 16 },
        'top-right': { top: 16, right: 16 },
        'bottom-left': { bottom: 16, left: 16 },
        'bottom-right': { bottom: 16, right: 16 },
    };

    const containerStyle: React.CSSProperties = mode === 'floating'
        ? {
            position: 'absolute',
            ...positionStyles[position],
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            minWidth: collapsed ? 'auto' : '240px',
            zIndex: 100,
            pointerEvents: 'auto',
            fontFamily: 'system-ui, sans-serif',
        }
        : {
            position: 'relative',
            width: '100%',
            background: 'transparent',
            borderRadius: 0,
            boxShadow: 'none',
            borderBottom: '1px solid #e5e7eb',
            zIndex: 'auto',
            pointerEvents: 'auto',
            fontFamily: 'system-ui, sans-serif',
        };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderBottom: collapsed ? 'none' : '1px solid #e5e7eb',
                    cursor: 'pointer',
                }}
                onClick={() => setCollapsed(!collapsed)}
            >
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>
                    🗂️ 圖層控制
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {collapsed ? '▼' : '▲'}
                </span>
            </div>

            {/* Content */}
            {!collapsed && (
                <div style={{ padding: '8px 12px 12px' }}>
                    {/* Layer Toggles */}
                    {Object.values(layers).map((layer) => (
                        <div
                            key={layer.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                                borderBottom: '1px solid #f3f4f6',
                            }}
                        >
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    flex: 1,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={layer.visible}
                                    onChange={() => toggleLayer(layer.id)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '13px' }}>
                                    {LAYER_ICONS[layer.id]} {layer.name}
                                </span>
                            </label>

                            {/* Opacity Slider (只在可見時顯示) */}
                            {layer.visible && (
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={layer.opacity}
                                    onChange={(e) => setOpacity(layer.id, parseFloat(e.target.value))}
                                    style={{ width: '60px', cursor: 'pointer' }}
                                    title={`透明度: ${Math.round(layer.opacity * 100)}%`}
                                />
                            )}
                        </div>
                    ))}

                    {/* Underground Transparency */}
                    <div
                        style={{
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid #e5e7eb',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '6px',
                            }}
                        >
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                                🌐 地下透視
                            </span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {Math.round(undergroundTransparency * 100)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={undergroundTransparency}
                            onChange={(e) => setUndergroundTransparency(parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>

                    {/* Background Color Picker */}
                    <BackgroundColorPicker />

                    {/* Auto LOD Toggle */}
                    <AutoLodToggle />

                    {/* Multi Section Panel */}
                    <MultiSectionPanel mode="embedded" />

                    {/* Imagery Selector - Admin/Engineer only */}
                    <ImagerySelectorTrigger />
                </div>
            )}
        </div>
    );
};

// Sub-component for Background Color
const BackgroundColorPicker: React.FC = () => {
    const { config, setConfig } = useViewerStore();

    return (
        <div
            style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                🎨 背景顏色
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => setConfig({ backgroundColor: e.target.value })}
                    style={{
                        width: '24px',
                        height: '24px',
                        padding: 0,
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: 'none'
                    }}
                />
                <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
                    {config.backgroundColor}
                </span>
            </div>
        </div>
    );
};

// Sub-component for Auto LOD
const AutoLodToggle: React.FC = () => {
    const { config, setConfig, setLODLevel } = useViewerStore();

    const handleToggle = (checked: boolean) => {
        setConfig({ autoLOD: checked });
        if (!checked) {
            // 關閉自動 LOD 時，強制切換到詳細模式
            setLODLevel('detail');
        }
    };

    return (
        <div
            style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                    👁️ 自動 LOD
                </span>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                    {config.autoLOD ? '根據距離切換細節' : '強制顯示詳細模型'}
                </span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={config.autoLOD}
                    onChange={(e) => handleToggle(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
            </label>
        </div>
    );
};

// Sub-component for Imagery Selector (Admin/Engineer only)
const ImagerySelectorTrigger: React.FC = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // 權限檢查
    const canAccess = user?.role === 'admin' || user?.role === 'engineer';
    if (!canAccess) return null;

    return (
        <div
            style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
            }}
        >
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#374151',
                }}
            >
                <span>⚙️ 圖資設定</span>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>admin/engineer</span>
            </button>

            <ImagerySelector isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </div>
    );
};

export default LayerPanel;
