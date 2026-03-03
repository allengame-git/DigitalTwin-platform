/**
 * TerrainLegendControl Component
 * @module components/controls/TerrainLegendControl
 * 
 * 地形圖例設定 (Z軸範圍、顏色映射)
 */

import React, { useEffect } from 'react';
import { useLayerStore } from '../../stores/layerStore';
import { useTerrainStore } from '../../stores/terrainStore';

export const TerrainLegendControl: React.FC = () => {
    const { terrainSettings, setTerrainSettings } = useLayerStore();
    const { getActiveTerrain } = useTerrainStore();
    const activeTerrain = getActiveTerrain();
    const hasSatellite = !!activeTerrain?.satelliteTexture;

    // 自動更新範圍與地形吻合
    useEffect(() => {
        if (terrainSettings.autoRange && activeTerrain) {
            setTerrainSettings({
                minZ: activeTerrain.minZ,
                maxZ: activeTerrain.maxZ
            });
        }
    }, [activeTerrain, terrainSettings.autoRange, setTerrainSettings]);

    // 當有衛星影像時，自動切換到衛星模式
    useEffect(() => {
        if (hasSatellite && terrainSettings.textureMode === 'colorRamp') {
            setTerrainSettings({ textureMode: 'satellite' });
        }
    }, [hasSatellite]);

    // 無衛星影像時，若仍在衛星模式則重置為色階
    useEffect(() => {
        if (!hasSatellite && terrainSettings.textureMode === 'satellite') {
            setTerrainSettings({ textureMode: 'colorRamp' });
        }
    }, [hasSatellite, terrainSettings.textureMode]);

    // 可用的紋理模式（無衛星時不顯示衛星選項）
    const textureModes = [
        ...(hasSatellite ? [{ value: 'satellite', label: '衛星影像' }] : []),
        { value: 'hillshade', label: '山影圖' },
        { value: 'colorRamp', label: '色階' },
    ];

    return (
        <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
            }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                    地形圖例設定
                </span>
                {terrainSettings.textureMode === 'colorRamp' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={terrainSettings.autoRange}
                            onChange={(e) => setTerrainSettings({ autoRange: e.target.checked })}
                            style={{ width: '14px', height: '14px' }}
                        />
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>自動範圍</span>
                    </label>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Texture Mode Selector (always visible) */}
                <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                        紋理模式
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {textureModes.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setTerrainSettings({ textureMode: opt.value as any })}
                                style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    border: '1px solid',
                                    borderColor: terrainSettings.textureMode === opt.value ? '#3b82f6' : '#d1d5db',
                                    borderRadius: '4px',
                                    background: terrainSettings.textureMode === opt.value ? '#eff6ff' : 'white',
                                    color: terrainSettings.textureMode === opt.value ? '#1d4ed8' : '#374151',
                                    fontWeight: terrainSettings.textureMode === opt.value ? 600 : 400,
                                    cursor: 'pointer'
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color Ramp Selector (only in colorRamp mode) */}
                {terrainSettings.textureMode === 'colorRamp' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#6b7280' }}>
                                顏色映射 (Color Ramp)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={terrainSettings.reverse}
                                    onChange={(e) => setTerrainSettings({ reverse: e.target.checked })}
                                    style={{ width: '12px', height: '12px' }}
                                />
                                <span style={{ fontSize: '10px', color: '#6b7280' }}>反轉</span>
                            </label>
                        </div>
                        <select
                            value={terrainSettings.colorRamp}
                            onChange={(e) => setTerrainSettings({ colorRamp: e.target.value as any })}
                            style={{
                                width: '100%',
                                padding: '6px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #d1d5db',
                                background: 'white'
                            }}
                        >
                            <option value="spectral">Spectral (彩虹)</option>
                            <option value="rainbow">Rainbow (鮮豔)</option>
                            <option value="terrain">Terrain (地形色)</option>
                            <option value="viridis">Viridis (科學)</option>
                            <option value="magma">Magma (熱圖)</option>
                        </select>
                    </div>
                )}

                {/* Min/Max Z Inputs (only in colorRamp mode) */}
                {terrainSettings.textureMode === 'colorRamp' && (
                    <>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>Min Z (m)</label>
                                <input
                                    type="number"
                                    value={Math.round(terrainSettings.minZ * 100) / 100}
                                    disabled={terrainSettings.autoRange}
                                    onChange={(e) => setTerrainSettings({ minZ: parseFloat(e.target.value) })}
                                    style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        fontSize: '12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        background: terrainSettings.autoRange ? '#f3f4f6' : 'white'
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>Max Z (m)</label>
                                <input
                                    type="number"
                                    value={Math.round(terrainSettings.maxZ * 100) / 100}
                                    disabled={terrainSettings.autoRange}
                                    onChange={(e) => setTerrainSettings({ maxZ: parseFloat(e.target.value) })}
                                    style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        fontSize: '12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        background: terrainSettings.autoRange ? '#f3f4f6' : 'white'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Visual Preview Bar */}
                        <div style={{
                            width: '100%',
                            height: '12px',
                            borderRadius: '2px',
                            background: getGradientStyle(terrainSettings.colorRamp, terrainSettings.reverse),
                            marginTop: '4px',
                            border: '1px solid #e5e7eb'
                        }} />
                    </>
                )}
            </div>
        </div>
    );
};

// Helper for gradient preview
function getGradientStyle(ramp: string, reverse: boolean): string {
    const direction = reverse ? 'to left' : 'to right';
    switch (ramp) {
        case 'rainbow': return `linear-gradient(${direction}, blue, cyan, green, yellow, red)`;
        case 'spectral': return `linear-gradient(${direction}, #2b83ba, #abdda4, #ffffbf, #fdae61, #d7191c)`;
        case 'terrain': return `linear-gradient(${direction}, #006400, #F4A460, #8B4513, #FFFFFF)`;
        case 'viridis': return `linear-gradient(${direction}, #440154, #3b528b, #21918c, #5ec962, #fde725)`;
        case 'magma': return `linear-gradient(${direction}, #000004, #51127c, #b73779, #fb8761, #fcfdbf)`;
        default: return `linear-gradient(${direction}, white, black)`;
    }
}
