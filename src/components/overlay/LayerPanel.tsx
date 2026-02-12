/**
 * LayerPanel Component
 * @module components/overlay/LayerPanel
 * 
 * 圖層控制面板 - 分頁設計
 * - 圖層頁: 所有使用者 - 圖層開關與透明度
 * - 設定頁: admin/engineer - 自動 LOD、背景顏色、圖資設定
 */

import React, { useState } from 'react';
import { useLayerStore, LayerType } from '../../stores/layerStore';
import { useViewerStore } from '../../stores/viewerStore';
import { ImagerySelector } from '../controls/ImagerySelector';
import { ModelVersionSelector } from '../controls/ModelVersionSelector';
import { useAuth } from '../../contexts/AuthContext';
import { useProjectStore } from '../../stores/projectStore';
import { setOrigin } from '../../utils/coordinates';
import { TerrainLegendControl } from '../controls/TerrainLegendControl';

interface LayerPanelProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    defaultCollapsed?: boolean;
    mode?: 'floating' | 'embedded';
}

type TabType = 'layers' | 'settings';

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
    const [activeTab, setActiveTab] = useState<TabType>('layers');
    const { user } = useAuth();

    const canAccessSettings = user?.role === 'admin' || user?.role === 'engineer';

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
            minWidth: collapsed ? 'auto' : '260px',
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
                    🗂️ 控制面板
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {collapsed ? '▼' : '▲'}
                </span>
            </div>

            {/* Content */}
            {!collapsed && (
                <>
                    {/* Tab Navigation */}
                    {canAccessSettings && (
                        <div style={{
                            display: 'flex',
                            borderBottom: '1px solid #e5e7eb',
                        }}>
                            <TabButton
                                active={activeTab === 'layers'}
                                onClick={() => setActiveTab('layers')}
                            >
                                🗂️ 圖層
                            </TabButton>
                            <TabButton
                                active={activeTab === 'settings'}
                                onClick={() => setActiveTab('settings')}
                            >
                                ⚙️ 設定
                            </TabButton>
                        </div>
                    )}

                    {/* Tab Content */}
                    <div style={{ padding: '8px 12px 12px' }}>
                        {activeTab === 'layers' && <LayersTab />}
                        {activeTab === 'settings' && canAccessSettings && <SettingsTab />}
                    </div>
                </>
            )}
        </div>
    );
};

// Tab Button Component
const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        style={{
            flex: 1,
            padding: '8px 12px',
            background: active ? '#f8fafc' : 'transparent',
            border: 'none',
            borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: active ? 600 : 400,
            color: active ? '#1f2937' : '#6b7280',
            transition: 'all 0.2s',
        }}
    >
        {children}
    </button>
);

// ===============================
// 圖層頁面
// ===============================
const LayersTab: React.FC = () => {
    const {
        layers,
        toggleLayer,
        setOpacity,
    } = useLayerStore();

    return (
        <>
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

                    {layer.visible && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {layer.id === 'attitudes' && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginRight: '4px' }}>
                                    <input
                                        type="checkbox"
                                        checked={useViewerStore.getState().config.showAttitudeLabels}
                                        onChange={(e) => useViewerStore.getState().setConfig({ showAttitudeLabels: e.target.checked })}
                                        style={{ width: '12px', height: '12px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>標籤</span>
                                </label>
                            )}
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
                        </div>
                    )}
                </div>
            ))}

        </>
    );
};

// ===============================
// 設定頁面 (admin/engineer only)
// ===============================
const SettingsTab: React.FC = () => {
    const [imageryOpen, setImageryOpen] = useState(false);
    const { activeProjectId, projects, updateProject } = useProjectStore();
    const activeProject = projects.find(p => p.id === activeProjectId);

    // Origin State
    const [originForm, setOriginForm] = useState({ x: '', y: '' });
    const [isEditingOrigin, setIsEditingOrigin] = useState(false);

    React.useEffect(() => {
        if (activeProject) {
            setOriginForm({
                x: activeProject.originX.toString(),
                y: activeProject.originY.toString()
            });
        }
    }, [activeProject]);

    const handleOriginUpdate = async () => {
        if (!activeProject) return;
        const x = parseFloat(originForm.x);
        const y = parseFloat(originForm.y);

        if (!isNaN(x) && !isNaN(y)) {
            await updateProject(activeProject.id, { originX: x, originY: y });
            setOrigin(x, y);
            setIsEditingOrigin(false);
        }
    };

    return (
        <>
            {/* Model Version Selector */}
            <ModelVersionSelector />

            {/* Project Origin Settings */}
            <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                        📍 座標原點 (TWD97)
                    </span>
                    <button
                        onClick={() => {
                            if (isEditingOrigin) handleOriginUpdate();
                            else setIsEditingOrigin(true);
                        }}
                        style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            background: isEditingOrigin ? '#3b82f6' : 'transparent',
                            color: isEditingOrigin ? 'white' : '#3b82f6',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {isEditingOrigin ? '儲存' : '修改'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>X (東距)</label>
                        <input
                            type="number"
                            value={originForm.x}
                            disabled={!isEditingOrigin}
                            onChange={e => setOriginForm(prev => ({ ...prev, x: e.target.value }))}
                            style={{
                                width: '100%',
                                padding: '4px 6px',
                                fontSize: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                background: isEditingOrigin ? 'white' : '#f9fafb'
                            }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>Y (北距)</label>
                        <input
                            type="number"
                            value={originForm.y}
                            disabled={!isEditingOrigin}
                            onChange={e => setOriginForm(prev => ({ ...prev, y: e.target.value }))}
                            style={{
                                width: '100%',
                                padding: '4px 6px',
                                fontSize: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                background: isEditingOrigin ? 'white' : '#f9fafb'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Model Offset Settings */}
            <ModelOffsetControls />

            {/* Auto LOD Toggle */}
            <AutoLodToggle />

            {/* Fog Toggle */}
            <FogToggle />

            {/* Background Color Picker */}
            <BackgroundColorPicker />

            {/* Imagery Selector */}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                <button
                    onClick={() => setImageryOpen(true)}
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
                    <span>🛰️ 圖資管理</span>
                    <span style={{ fontSize: '18px' }}>→</span>
                </button>
                <ImagerySelector isOpen={imageryOpen} onClose={() => setImageryOpen(false)} />
                <ImagerySelector isOpen={imageryOpen} onClose={() => setImageryOpen(false)} />
            </div>

            {/* Terrain Legend Control */}
            <TerrainLegendControl />

            {/* Model Management Link */}
            <div style={{ marginTop: '12px' }}>
                <a
                    href="/data"
                    style={{
                        display: 'flex',
                        width: '100%',
                        padding: '10px 12px',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151',
                    }}
                >
                    <span>🗄️ 資料管理</span>
                    <span style={{ fontSize: '18px' }}>→</span>
                </a>
            </div>
        </>
    );
};

// Sub-component for Background Color
const BackgroundColorPicker: React.FC = () => {
    const { config, setConfig } = useViewerStore();

    return (
        <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
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
            setLODLevel('detail');
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
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

// Sub-component for Fog
const FogToggle: React.FC = () => {
    const { config, setConfig } = useViewerStore();

    return (
        <div style={{
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                    🌫️ 霧氣效果
                </span>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                    {config.showFog ? '開啟遠景霧化' : '關閉霧化 (視覺較清晰)'}
                </span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={config.showFog}
                    onChange={(e) => setConfig({ showFog: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
            </label>
        </div>
    );
};

// Sub-component for Model Offset
const ModelOffsetControls: React.FC = () => {
    const { config, setConfig } = useViewerStore();
    const offset = config.modelOffset || [0, 0, 0];

    const handleChange = (index: number, value: string) => {
        const newVal = parseFloat(value) || 0;
        const newOffset = [...offset] as [number, number, number];
        newOffset[index] = newVal;
        setConfig({ modelOffset: newOffset });
    };

    return (
        <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                    📐 模型位移微調 (XYZ)
                </span>
                <button
                    onClick={() => setConfig({ modelOffset: [0, 0, 0] })}
                    style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        background: 'transparent',
                        color: '#6b7280',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    重設
                </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                {[
                    { label: 'X (東)', color: '#ef4444' },
                    { label: 'Y (北)', color: '#22c55e' },
                    { label: 'Z (高)', color: '#3b82f6' }
                ].map((axis, i) => (
                    <div key={axis.label} style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '9px', color: axis.color, marginBottom: '2px', fontWeight: 600 }}>
                            {axis.label}
                        </label>
                        <input
                            type="number"
                            value={offset[i]}
                            step="1"
                            onChange={e => handleChange(i, e.target.value)}
                            style={{
                                width: '100%',
                                padding: '4px 6px',
                                fontSize: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                background: 'white'
                            }}
                        />
                    </div>
                ))}
            </div>
            <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>
                用於校正模型與鑽孔之間的小幅度偏差。
            </p>
        </div>
    );
};

export default LayerPanel;
