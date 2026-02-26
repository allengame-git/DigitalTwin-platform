import React, { useState, useRef, useEffect } from 'react';
import { useTerrainStore, Terrain } from '../../stores/terrainStore';
import { useProjectStore } from '../../stores/projectStore';

export const TerrainUploadSection: React.FC = () => {
    const { activeProjectId } = useProjectStore();
    const {
        terrains,
        fetchTerrains,
        uploadTerrain,
        deleteTerrain,
        activeTerrainId,
        setActiveTerrain,
        isLoading,
        error
    } = useTerrainStore();

    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [satelliteFile, setSatelliteFile] = useState<File | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        method: 'linear' // linear, nearest, cubic
    });

    // Delete Confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [terrainToDelete, setTerrainToDelete] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeProjectId) {
            fetchTerrains(activeProjectId);
        }
    }, [activeProjectId, fetchTerrains]);

    const handleFileSelect = (file: File) => {
        const allowedExts = ['.tif', '.tiff', '.csv'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

        if (!allowedExts.includes(ext)) {
            alert('不支援的檔案格式。只接受 .tif, .tiff, .csv');
            return;
        }

        setSelectedFile(file);
        setFormData(prev => ({ ...prev, name: file.name.split('.')[0] }));
        setShowUploadModal(true);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleSubmit = async () => {
        if (!selectedFile || !activeProjectId) return;

        try {
            await uploadTerrain(activeProjectId, selectedFile, formData.name, formData.method, satelliteFile || undefined);
            setShowUploadModal(false);
            setSelectedFile(null);
            setSatelliteFile(null);
            setFormData({ name: '', method: 'linear' });
        } catch (err) {
            alert(err instanceof Error ? err.message : '上傳失敗');
        }
    };

    const handleDelete = async () => {
        if (terrainToDelete) {
            await deleteTerrain(terrainToDelete);
            setShowDeleteConfirm(false);
            setTerrainToDelete(null);
        }
    };

    return (
        <div className="dm-section">
            <div className="dm-section-header">
                <div className="dm-section-icon">🏔️</div>
                <div>
                    <h3 className="dm-section-title">DEM 地形資料</h3>
                    <p className="dm-section-desc">上傳 GeoTIFF 或 CSV (X, Y, Z) 地形高程數據</p>
                </div>
            </div>

            {/* Upload Zone */}
            <div
                className={`dm-upload-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    accept=".tif,.tiff,.csv"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <div className="dm-upload-icon">⬆️</div>
                <div className="dm-upload-text">點擊或拖僅檔案至此處上傳</div>
                <div className="dm-upload-hint">支援 .tif, .tiff, .csv (X,Y,Z) 格式</div>
            </div>

            {/* Error Message */}
            {error && <div className="dm-error">{error}</div>}

            {/* Loading Indicator */}
            {isLoading && <div className="dm-loading">處理中...</div>}

            {/* File Components */}
            <div className="dm-file-grid">
                {Array.isArray(terrains) && terrains.length > 0 ? (
                    terrains.map(terrain => (
                        <div key={terrain.id} className={`dm-file-card ${activeTerrainId === terrain.id ? 'active-card' : ''}`}>
                            <div className="dm-file-info">
                                <div className="dm-file-name">{terrain.name}</div>
                                <div className="dm-file-meta">
                                    {terrain.width}x{terrain.height} • {((terrain.maxZ - terrain.minZ)).toFixed(1)}m 高差
                                    {terrain.satelliteTexture && (
                                        <span style={{ marginLeft: '6px', padding: '1px 6px', borderRadius: '3px', background: '#dbeafe', color: '#1d4ed8', fontSize: '10px', fontWeight: 600 }}>衛星影像</span>
                                    )}
                                </div>
                                <div className="dm-file-actions">
                                    <button
                                        className={`dm-file-btn ${activeTerrainId === terrain.id ? 'dm-file-btn-active' : ''}`}
                                        onClick={() => setActiveTerrain(terrain.id)}
                                    >
                                        {activeTerrainId === terrain.id ? '使用中' : '啟用'}
                                    </button>
                                    <button
                                        className="dm-file-btn dm-file-btn-delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTerrainToDelete(terrain.id);
                                            setShowDeleteConfirm(true);
                                        }}
                                    >
                                        刪除
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="dm-empty">尚無地形資料</div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal">
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">上傳地形資料</h3>
                            <button onClick={() => setShowUploadModal(false)}>✕</button>
                        </div>
                        <div className="dm-modal-body">
                            <div className="dm-form-group">
                                <label className="dm-form-label">資料名稱</label>
                                <input
                                    className="dm-form-input"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            {selectedFile?.name?.endsWith('.csv') && (
                                <div className="dm-form-group">
                                    <label className="dm-form-label">插值方法</label>
                                    <select
                                        className="dm-form-input"
                                        value={formData.method}
                                        onChange={e => setFormData({ ...formData, method: e.target.value })}
                                    >
                                        <option value="linear">線性插值 (Linear)</option>
                                        <option value="nearest">最近鄰 (Nearest)</option>
                                        <option value="cubic">三次樣條 (Cubic)</option>
                                    </select>
                                </div>
                            )}
                            {/* 衛星影像 (可選) */}
                            <div className="dm-form-group">
                                <label className="dm-form-label">衛星影像 (可選)</label>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
                                    上傳衛星影像 TIFF 以貼合在 DEM 地形上顯示 3D 立體影像
                                </div>
                                <input
                                    type="file"
                                    accept=".tif,.tiff,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setSatelliteFile(e.target.files[0]);
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '6px',
                                        fontSize: '12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        background: '#f9fafb'
                                    }}
                                />
                                {satelliteFile && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '11px', color: '#059669' }}>{satelliteFile.name}</span>
                                        <button
                                            onClick={() => setSatelliteFile(null)}
                                            style={{ fontSize: '10px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >移除</button>
                                    </div>
                                )}
                            </div>
                            <div className="dm-modal-footer">
                                <button className="dm-btn-cancel" onClick={() => setShowUploadModal(false)}>取消</button>
                                <button className="dm-btn-confirm" onClick={handleSubmit} disabled={isLoading}>
                                    {isLoading ? '處理中...' : '開始上傳'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal dm-modal-delete">
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">確認刪除</h3>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定要刪除此地形資料嗎？此操作無法復原。</p>
                            <div className="dm-modal-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button className="dm-btn-cancel" onClick={() => setShowDeleteConfirm(false)}>取消</button>
                                <button className="dm-btn-delete-confirm" onClick={handleDelete} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px' }}>確認刪除</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .active-card {
                    border: 2px solid #3b82f6;
                    background: #eff6ff;
                }
                .dm-file-btn-active {
                    background: #3b82f6;
                    color: white;
                }
                .dm-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 24px;
                }
                .dm-btn-cancel {
                    padding: 8px 16px;
                    background: #f1f5f9;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .dm-btn-confirm {
                    padding: 8px 16px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .dm-btn-confirm:disabled {
                    background: #94a3b8;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
};
