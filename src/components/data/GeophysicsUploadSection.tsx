import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, Activity } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUploadStore, GeophysicsFile, GeophysicsMetadata } from '../../stores/uploadStore';
import { useCameraStore } from '../../stores/cameraStore';
import { twd97ToWorld } from '../../utils/coordinates';

interface GeophysicsUploadSectionProps {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const GeophysicsUploadSection: React.FC<GeophysicsUploadSectionProps> = ({ showToast }) => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const navigate = useNavigate();
    const {
        geophysicsFiles,
        isUploading,
        uploadProgress,
        uploadError,
        fetchGeophysicsFiles,
        uploadGeophysics,
        deleteGeophysics,
    } = useUploadStore();

    useEffect(() => {
        fetchGeophysicsFiles();
    }, [fetchGeophysicsFiles]);

    // Geophysics Upload State
    const [geoFile, setGeoFile] = useState<File | null>(null);
    const [showGeoForm, setShowGeoForm] = useState(false);
    const [geoFormData, setGeoFormData] = useState<GeophysicsMetadata>({
        year: new Date().getFullYear(),
        name: '',
        lineId: '',
        method: 'ERT',
        description: '',
        x1: '', y1: '', z1: '',
        x2: '', y2: '', z2: '',
        depthTop: '',
        depthBottom: '',
    });
    const [geoFormErrors, setGeoFormErrors] = useState<Record<string, string>>({});
    const geoInputRef = useRef<HTMLInputElement>(null);

    // Geophysics Delete State
    const [showGeoDeleteConfirm, setShowGeoDeleteConfirm] = useState(false);
    const [geoToDelete, setGeoToDelete] = useState<string | null>(null);

    // Geophysics Detail Modal
    const [showGeoDetail, setShowGeoDetail] = useState(false);
    const [selectedGeoDetail, setSelectedGeoDetail] = useState<GeophysicsFile | null>(null);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // --- Geophysics Handlers ---
    const handleGeoFileSelect = (file: File) => {
        const allowedExts = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!allowedExts.includes(ext)) {
            showToast('不支援的檔案格式。只接受 JPG, PNG, TIF', 'error');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            showToast('檔案大小超過 50MB 限制', 'error');
            return;
        }
        setGeoFile(file);
        setGeoFormData(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
        setShowGeoForm(true);
    };

    const handleGeoDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleGeoFileSelect(file);
    };

    const handleGeoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleGeoFileSelect(file);
        if (geoInputRef.current) geoInputRef.current.value = '';
    };

    const validateGeoForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!geoFormData.year || geoFormData.year < 1900 || geoFormData.year > 2100) errors.year = '請輸入有效年份';
        if (!geoFormData.name.trim()) errors.name = '資料名稱為必填';
        if (!geoFormData.method) errors.method = '探查方法為必填';
        if (!geoFormData.x1 || !geoFormData.y1 || !geoFormData.z1) errors.leftPoint = '左端點座標為必填';
        if (!geoFormData.x2 || !geoFormData.y2 || !geoFormData.z2) errors.rightPoint = '右端點座標為必填';
        setGeoFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleGeoSubmit = async () => {
        if (!geoFile || !validateGeoForm()) return;
        await uploadGeophysics(geoFile, geoFormData);
        if (!uploadError) {
            setShowGeoForm(false);
            setGeoFile(null);
            setGeoFormData({
                year: new Date().getFullYear(),
                name: '', lineId: '', method: 'ERT', description: '',
                x1: '', y1: '', z1: '', x2: '', y2: '', z2: '',
                depthTop: '', depthBottom: '',
            });
        }
    };

    const handleCancelGeoUpload = () => {
        setShowGeoForm(false);
        setGeoFile(null);
        setGeoFormErrors({});
    };

    const handleGeoDeleteClick = (id: string) => {
        setGeoToDelete(id);
        setShowGeoDeleteConfirm(true);
    };

    const confirmGeoDelete = async () => {
        if (geoToDelete) {
            await deleteGeophysics(geoToDelete);
            setShowGeoDeleteConfirm(false);
            setGeoToDelete(null);
        }
    };

    const handleViewGeoDetail = (file: GeophysicsFile) => {
        setSelectedGeoDetail(file);
        setShowGeoDetail(true);
    };

    return (
        <>
            <section className="dm-section">
                <div className="dm-section-header">
                    <div className="dm-section-icon">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h2 className="dm-section-title">地球物理探查資料</h2>
                        <p className="dm-section-desc">ERT、GPR、震測剖面圖資料管理</p>
                    </div>
                </div>

                {/* 上傳區域 */}
                <div
                    className="dm-upload-zone"
                    onDrop={handleGeoDrop}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onClick={() => geoInputRef.current?.click()}
                >
                    <input
                        ref={geoInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.tif,.tiff"
                        onChange={handleGeoInputChange}
                        style={{ display: 'none' }}
                    />
                    <div className="dm-upload-icon">
                        <UploadCloud size={48} strokeWidth={1} />
                    </div>
                    <div className="dm-upload-text">拖放探查剖面圖或點擊選擇</div>
                    <div className="dm-upload-hint">支援 JPG, PNG, TIF (最大 50MB)</div>
                </div>

                {/* 已上傳資料 */}
                {geophysicsFiles.length > 0 ? (
                    <div className="dm-file-grid">
                        {geophysicsFiles.map(gf => (
                            <div key={gf.id} className="dm-file-card">
                                <img
                                    className="dm-file-thumb"
                                    src={gf.thumbnailUrl}
                                    alt={gf.name}
                                    onClick={() => handleViewGeoDetail(gf)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <div className="dm-file-info">
                                    <div className="dm-file-name">{gf.name}</div>
                                    <div className="dm-file-meta">
                                        <span className="dm-file-year">{gf.year}</span>
                                        <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{gf.method}</span>
                                        {gf.lineId && <span style={{ color: '#64748b' }}>#{gf.lineId}</span>}
                                    </div>
                                    <div className="dm-file-actions">
                                        <button
                                            className="dm-file-btn dm-file-btn-delete"
                                            onClick={() => handleGeoDeleteClick(gf.id)}
                                        >
                                            刪除
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="dm-empty-state">尚無上傳的探查資料</div>
                )}
            </section>

            {/* 地球物理探查上傳表單 Modal */}
            {showGeoForm && geoFile && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">上傳地球物理探查資料</h3>
                            <button onClick={handleCancelGeoUpload} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}><X size={20} /></button>
                        </div>
                        <div className="dm-modal-body">
                            <div className="dm-file-preview">
                                <div className="dm-file-preview-icon">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <div className="dm-file-preview-name">{geoFile.name}</div>
                                    <div className="dm-file-preview-size">{formatFileSize(geoFile.size)}</div>
                                </div>
                            </div>

                            {/* 年份與名稱 */}
                            <div className="dm-form-row">
                                <div className="dm-form-group">
                                    <label className="dm-form-label">資料年份 *</label>
                                    <input type="number" className="dm-form-input" value={geoFormData.year} onChange={e => setGeoFormData({ ...geoFormData, year: parseInt(e.target.value) || 0 })} />
                                    {geoFormErrors.year && <span className="dm-form-error">{geoFormErrors.year}</span>}
                                </div>
                                <div className="dm-form-group">
                                    <label className="dm-form-label">資料名稱 *</label>
                                    <input type="text" className="dm-form-input" value={geoFormData.name} onChange={e => setGeoFormData({ ...geoFormData, name: e.target.value })} />
                                    {geoFormErrors.name && <span className="dm-form-error">{geoFormErrors.name}</span>}
                                </div>
                            </div>

                            {/* 測線編號與探查方法 */}
                            <div className="dm-form-row">
                                <div className="dm-form-group">
                                    <label className="dm-form-label">測線編號</label>
                                    <input type="text" className="dm-form-input" placeholder="例: L-01" value={geoFormData.lineId || ''} onChange={e => setGeoFormData({ ...geoFormData, lineId: e.target.value })} />
                                </div>
                                <div className="dm-form-group">
                                    <label className="dm-form-label">探查方法 *</label>
                                    <select className="dm-form-input" value={geoFormData.method} onChange={e => setGeoFormData({ ...geoFormData, method: e.target.value })}>
                                        <option value="ERT">ERT 電阻探測</option>
                                        <option value="GPR">GPR 透地雷達</option>
                                        <option value="Seismic">Seismic 震測</option>
                                    </select>
                                    {geoFormErrors.method && <span className="dm-form-error">{geoFormErrors.method}</span>}
                                </div>
                            </div>

                            {/* 左端點座標 */}
                            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label className="dm-form-label">左端點座標 (TWD97, 公尺) *</label>
                                <div className="dm-form-row" style={{ marginTop: '8px' }}>
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" placeholder="X1" value={geoFormData.x1} onChange={e => setGeoFormData({ ...geoFormData, x1: e.target.value })} />
                                    </div>
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" placeholder="Y1" value={geoFormData.y1} onChange={e => setGeoFormData({ ...geoFormData, y1: e.target.value })} />
                                    </div>
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" placeholder="Z1" value={geoFormData.z1} onChange={e => setGeoFormData({ ...geoFormData, z1: e.target.value })} />
                                    </div>
                                </div>
                                {geoFormErrors.leftPoint && <span className="dm-form-error">{geoFormErrors.leftPoint}</span>}
                            </div>

                            {/* 右端點座標 */}
                            <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label className="dm-form-label">右端點座標 (TWD97, 公尺) *</label>
                                <div className="dm-form-row" style={{ marginTop: '8px' }}>
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" placeholder="X2" value={geoFormData.x2} onChange={e => setGeoFormData({ ...geoFormData, x2: e.target.value })} />
                                    </div>
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" placeholder="Y2" value={geoFormData.y2} onChange={e => setGeoFormData({ ...geoFormData, y2: e.target.value })} />
                                    </div>
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" placeholder="Z2" value={geoFormData.z2} onChange={e => setGeoFormData({ ...geoFormData, z2: e.target.value })} />
                                    </div>
                                </div>
                                {geoFormErrors.rightPoint && <span className="dm-form-error">{geoFormErrors.rightPoint}</span>}
                            </div>

                            {/* 深度範圍 (選填) */}
                            <div className="dm-form-row" style={{ marginTop: '16px' }}>
                                <div className="dm-form-group">
                                    <label className="dm-form-label">頂部深度 (選填)</label>
                                    <input type="text" className="dm-form-input" placeholder="0" value={geoFormData.depthTop || ''} onChange={e => setGeoFormData({ ...geoFormData, depthTop: e.target.value })} />
                                </div>
                                <div className="dm-form-group">
                                    <label className="dm-form-label">底部深度 (選填)</label>
                                    <input type="text" className="dm-form-input" placeholder="依圖片比例換算" value={geoFormData.depthBottom || ''} onChange={e => setGeoFormData({ ...geoFormData, depthBottom: e.target.value })} />
                                </div>
                            </div>

                            {/* 說明 */}
                            <div className="dm-form-group" style={{ marginTop: '16px' }}>
                                <label className="dm-form-label">資料說明</label>
                                <textarea className="dm-form-input" rows={2} placeholder="選填" value={geoFormData.description || ''} onChange={e => setGeoFormData({ ...geoFormData, description: e.target.value })} />
                            </div>
                        </div>
                        <div className="dm-modal-footer">
                            {isUploading ? (
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                                        <span>上傳中...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="dm-progress-container" style={{ marginTop: 0 }}>
                                        <div className="dm-progress-bar" style={{ width: `${Math.max(2, uploadProgress)}% ` }}>
                                            <div className="dm-progress-shimmer"></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <button className="dm-btn dm-btn-secondary" onClick={handleCancelGeoUpload}>取消</button>
                                    <button className="dm-btn dm-btn-primary" onClick={handleGeoSubmit}>上傳</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 地球物理探查刪除確認 Modal */}
            {showGeoDeleteConfirm && (
                <div className="dm-modal-overlay" onClick={() => setShowGeoDeleteConfirm(false)}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title" style={{ color: '#dc2626' }}>刪除確認</h3>
                            <button onClick={() => setShowGeoDeleteConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定要刪除此探查資料嗎？此操作無法復原。</p>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={() => setShowGeoDeleteConfirm(false)}>取消</button>
                            <button className="dm-btn dm-btn-danger" onClick={confirmGeoDelete}>刪除</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 地球物理探查詳細資料 Modal */}
            {showGeoDetail && selectedGeoDetail && (
                <div className="dm-modal-overlay" onClick={() => setShowGeoDetail(false)}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">探查資料詳細內容</h3>
                            <button onClick={() => setShowGeoDetail(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
                        </div>
                        <div className="dm-modal-body">
                            <div style={{ marginBottom: '20px', textAlign: 'center', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                                <img src={selectedGeoDetail.url} alt={selectedGeoDetail.name} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />
                            </div>

                            <div className="dm-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div><label className="dm-form-label">資料名稱</label><div style={{ fontSize: 14, color: '#1f2937' }}>{selectedGeoDetail.name}</div></div>
                                <div><label className="dm-form-label">年份</label><div style={{ fontSize: 14, color: '#1f2937' }}>{selectedGeoDetail.year}</div></div>
                                <div><label className="dm-form-label">探查方法</label><div style={{ fontSize: 14, color: '#1f2937' }}>{selectedGeoDetail.method}</div></div>
                                <div><label className="dm-form-label">測線編號</label><div style={{ fontSize: 14, color: '#1f2937' }}>{selectedGeoDetail.lineId || '-'}</div></div>
                            </div>

                            <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '8px' }}>
                                <label className="dm-form-label">剖面座標 (TWD97, 公尺)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: 13, color: '#0369a1', marginTop: '8px' }}>
                                    <div>左端點: ({selectedGeoDetail.x1}, {selectedGeoDetail.y1}, {selectedGeoDetail.z1})</div>
                                    <div>右端點: ({selectedGeoDetail.x2}, {selectedGeoDetail.y2}, {selectedGeoDetail.z2})</div>
                                </div>
                            </div>

                            {selectedGeoDetail.description && (
                                <div style={{ marginTop: '16px' }}>
                                    <label className="dm-form-label">資料說明</label>
                                    <div style={{ fontSize: 14, color: '#4b5563', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 10, borderRadius: 6 }}>{selectedGeoDetail.description}</div>
                                </div>
                            )}
                        </div>
                        <div className="dm-modal-footer">
                            <button
                                className="dm-btn dm-btn-secondary"
                                style={{ marginRight: 'auto', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                                onClick={() => {
                                    const g = selectedGeoDetail;
                                    const midX = (Number(g.x1) + Number(g.x2)) / 2;
                                    const midY = (Number(g.y1) + Number(g.y2)) / 2;
                                    const midZ = (Number(g.z1) + Number(g.z2)) / 2;
                                    const world = twd97ToWorld({ x: midX, y: midY, z: midZ });
                                    // Camera offset: look from above and slightly offset
                                    const camPos: [number, number, number] = [world.x + 50, world.y + 80, world.z + 50];
                                    const lookAt: [number, number, number] = [world.x, world.y, world.z];
                                    useCameraStore.getState().flyTo({ position: camPos, lookAt });
                                    setShowGeoDetail(false);
                                    if (projectCode) navigate(`/ project / ${projectCode} `);
                                }}
                            >
                                在 3D 場景中定位
                            </button>
                            <button className="dm-btn dm-btn-primary" onClick={() => setShowGeoDetail(false)}>關閉</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
