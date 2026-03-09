/**
 * WaterLevelUploadSection Component
 * @module components/data/WaterLevelUploadSection
 *
 * 地下水位面資料上傳與管理
 */

import React, { useState, useRef } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useWaterLevelStore, WaterLevel } from '../../stores/waterLevelStore';
import { UploadCloud, Droplets, X, File } from 'lucide-react';

export function WaterLevelUploadSection() {
    const { activeProjectId } = useProjectStore();
    const {
        waterLevels,
        activeWaterLevelId,
        isLoading,
        error,
        uploadWaterLevel,
        deleteWaterLevel,
        setActiveWaterLevel,
        fetchWaterLevels,
    } = useWaterLevelStore();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [sourceType, setSourceType] = useState<'well' | 'simulation'>('well');
    const [method, setMethod] = useState('linear');
    const [boundsEnabled, setBoundsEnabled] = useState(false);
    const [bounds, setBounds] = useState({ minX: '', maxX: '', minY: '', maxY: '' });

    const handleFileSelect = (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['csv', 'dat', 'txt'].includes(ext || '')) {
            alert('僅支援 .csv, .dat, .txt 檔案');
            return;
        }
        setSelectedFile(file);
        setName(file.name.replace(/\.[^.]+$/, ''));
        setShowModal(true);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || !activeProjectId) return;

        let boundsStr: string | undefined;
        if (sourceType === 'well' && boundsEnabled) {
            const { minX, maxX, minY, maxY } = bounds;
            if (minX && maxX && minY && maxY) {
                boundsStr = `${minX},${maxX},${minY},${maxY}`;
            }
        }

        try {
            await uploadWaterLevel(activeProjectId, selectedFile, name, sourceType, method, boundsStr);
            resetForm();
        } catch (err) {
            // error handled by store
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setShowModal(false);
        setName('');
        setSourceType('well');
        setMethod('linear');
        setBoundsEnabled(false);
        setBounds({ minX: '', maxX: '', minY: '', maxY: '' });
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteWaterLevel(id);
            setDeleteId(null);
        } catch (err) {
            alert('刪除失敗');
        }
    };

    return (
        <section className="dm-section">
            <div className="dm-section-header">
                <div className="dm-section-icon">
                    <Droplets size={20} />
                </div>
                <div>
                    <h2 className="dm-section-title">地下水位面</h2>
                    <p className="dm-section-desc">上傳地下水井觀測資料或數值模擬結果 (CSV/DAT/TXT)，自動內插地下水位面</p>
                </div>
            </div>

            {/* Upload Zone */}
            <div
                className="dm-upload-zone"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.dat,.txt"
                    onChange={e => {
                        if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                        e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                />
                <div className="dm-upload-icon">
                    <UploadCloud size={48} strokeWidth={1} />
                </div>
                <div className="dm-upload-text">拖放檔案或點擊選擇</div>
                <div className="dm-upload-hint">支援 CSV, DAT, TXT (X, Y, 水位高程)</div>
            </div>

            {/* Error */}
            {error && (
                <div className="dm-error" style={{ marginTop: 8 }}>
                    <span>{error}</span>
                </div>
            )}

            {/* Uploaded List */}
            {waterLevels.length > 0 ? (
                <div className="dm-file-list" style={{ marginTop: 16 }}>
                    {waterLevels.map(wl => (
                        <div
                            key={wl.id}
                            className="dm-file-card"
                            style={{
                                border: wl.id === activeWaterLevelId ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                                background: wl.id === activeWaterLevelId ? '#eff6ff' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 16px',
                                cursor: 'pointer',
                            }}
                            onClick={() => setActiveWaterLevel(wl.id)}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Droplets size={16} color="var(--primary)" />
                                    <span className="dm-file-name" style={{ marginBottom: 0 }}>{wl.name}</span>
                                    <span className="dm-badge" style={{
                                        background: wl.sourceType === 'well' ? '#dbeafe' : '#fef3c7',
                                        color: wl.sourceType === 'well' ? '#1e40af' : '#92400e',
                                    }}>
                                        {wl.sourceType === 'well' ? '水井觀測' : '數值模擬'}
                                    </span>
                                    {wl.id === activeWaterLevelId && (
                                        <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>
                                            ● 使用中
                                        </span>
                                    )}
                                </div>
                                <div className="dm-file-meta" style={{ marginTop: 4 }}>
                                    {wl.pointCount} 點 · 水位 {wl.minZ.toFixed(1)}m ~ {wl.maxZ.toFixed(1)}m · {wl.width}x{wl.height}px
                                </div>
                            </div>
                            <button
                                className="dm-file-btn dm-file-btn-delete"
                                onClick={e => { e.stopPropagation(); setDeleteId(wl.id); }}
                            >
                                刪除
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="dm-empty-state">尚無上傳的地下水位面資料</div>
            )}

            {/* Upload Modal */}
            {showModal && selectedFile && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal" onClick={e => e.stopPropagation()}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">上傳地下水位面資料</h3>
                            <button
                                onClick={resetForm}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="dm-modal-body">
                            {/* File Preview */}
                            <div className="dm-file-preview">
                                <div className="dm-file-preview-icon"><File size={24} /></div>
                                <div>
                                    <div className="dm-file-preview-name">{selectedFile.name}</div>
                                    <div className="dm-file-preview-size">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                            </div>

                            {/* Name */}
                            <div className="dm-form-group">
                                <label className="dm-form-label">資料名稱 *</label>
                                <input
                                    type="text"
                                    className="dm-form-input"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="例如：第一含水層水位面"
                                />
                            </div>

                            {/* Source Type */}
                            <div className="dm-form-group">
                                <label className="dm-form-label">資料類型 *</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {[
                                        { value: 'well' as const, label: '水井觀測' },
                                        { value: 'simulation' as const, label: '數值模擬' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            className="dm-btn"
                                            onClick={() => {
                                                setSourceType(opt.value);
                                                if (opt.value === 'simulation') setBoundsEnabled(false);
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                background: sourceType === opt.value ? 'var(--primary)' : '#f1f5f9',
                                                color: sourceType === opt.value ? '#fff' : '#374151',
                                                border: sourceType === opt.value ? '1px solid var(--primary-hover, #1d4ed8)' : '1px solid #e2e8f0',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                fontWeight: sourceType === opt.value ? 600 : 400,
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Interpolation Method */}
                            <div className="dm-form-group">
                                <label className="dm-form-label">插值方法</label>
                                <select
                                    className="dm-form-input"
                                    value={method}
                                    onChange={e => setMethod(e.target.value)}
                                >
                                    <option value="linear">線性插值 (Linear)</option>
                                    <option value="nearest">最近鄰 (Nearest)</option>
                                    <option value="cubic">三次插值 (Cubic)</option>
                                </select>
                            </div>

                            {/* Bounds (well mode only) */}
                            {sourceType === 'well' && (
                                <div className="dm-form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={boundsEnabled}
                                            onChange={e => setBoundsEnabled(e.target.checked)}
                                        />
                                        <span className="dm-form-label" style={{ marginBottom: 0 }}>
                                            手動指定範圍 (TWD97)
                                        </span>
                                    </label>
                                    {boundsEnabled && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                                            <div>
                                                <label className="dm-form-label">Min X</label>
                                                <input
                                                    type="number"
                                                    className="dm-form-input"
                                                    value={bounds.minX}
                                                    onChange={e => setBounds(b => ({ ...b, minX: e.target.value }))}
                                                    placeholder="例: 223000"
                                                />
                                            </div>
                                            <div>
                                                <label className="dm-form-label">Max X</label>
                                                <input
                                                    type="number"
                                                    className="dm-form-input"
                                                    value={bounds.maxX}
                                                    onChange={e => setBounds(b => ({ ...b, maxX: e.target.value }))}
                                                    placeholder="例: 225000"
                                                />
                                            </div>
                                            <div>
                                                <label className="dm-form-label">Min Y</label>
                                                <input
                                                    type="number"
                                                    className="dm-form-input"
                                                    value={bounds.minY}
                                                    onChange={e => setBounds(b => ({ ...b, minY: e.target.value }))}
                                                    placeholder="例: 2728000"
                                                />
                                            </div>
                                            <div>
                                                <label className="dm-form-label">Max Y</label>
                                                <input
                                                    type="number"
                                                    className="dm-form-input"
                                                    value={bounds.maxY}
                                                    onChange={e => setBounds(b => ({ ...b, maxY: e.target.value }))}
                                                    placeholder="例: 2730000"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {!boundsEnabled && (
                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                                            未指定範圍時，將使用資料點涵蓋區域（含 5% padding）
                                        </div>
                                    )}
                                </div>
                            )}

                            {sourceType === 'simulation' && (
                                <div style={{ fontSize: 12, color: '#64748b', background: '#f0f9ff', padding: '8px 12px', borderRadius: 6, border: '1px solid #bae6fd' }}>
                                    數值模擬結果將自動以資料涵蓋範圍建立水位面
                                </div>
                            )}
                        </div>

                        <div className="dm-modal-footer">
                            {isLoading ? (
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 6 }}>
                                        <span>處理中...</span>
                                    </div>
                                    <div className="dm-progress-container" style={{ marginTop: 0 }}>
                                        <div className="dm-progress-bar" style={{ width: '80%' }}>
                                            <div className="dm-progress-shimmer"></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <button className="dm-btn dm-btn-secondary" onClick={resetForm}>取消</button>
                                    <button
                                        className="dm-btn dm-btn-primary"
                                        onClick={handleUpload}
                                        disabled={!name.trim()}
                                    >
                                        上傳並處理
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <div className="dm-modal-overlay" onClick={() => setDeleteId(null)}>
                    <div className="dm-modal dm-modal-delete" onClick={e => e.stopPropagation()}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title" style={{ color: '#dc2626' }}>刪除確認</h3>
                            <button onClick={() => setDeleteId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="dm-modal-body">
                            <p style={{ margin: 0, color: '#374151' }}>確定要刪除此水位面資料嗎？此動作無法復原。</p>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={() => setDeleteId(null)}>取消</button>
                            <button className="dm-btn dm-btn-danger" onClick={() => handleDelete(deleteId)}>刪除</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default WaterLevelUploadSection;
