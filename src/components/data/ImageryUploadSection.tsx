import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, Check, ChevronDown, ChevronUp, File, Image as ImageIcon, Activity } from 'lucide-react';
import { useUploadStore, UploadedFile, ImageryMetadata } from '../../stores/uploadStore';

interface ImageryUploadSectionProps {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ImageryUploadSection: React.FC<ImageryUploadSectionProps> = ({ showToast }) => {
    const {
        imageryFiles,
        isUploading,
        uploadProgress,
        uploadError,
        fetchImageryFiles,
        uploadImagery,
        deleteImagery,
        clearError,
    } = useUploadStore();

    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [formData, setFormData] = useState<ImageryMetadata>({
        year: new Date().getFullYear(),
        name: '',
        source: '',
        description: '',
        minX: '',
        maxX: '',
        minY: '',
        maxY: '',
    });
    const [formErrors, setFormErrors] = useState<{ year?: string; name?: string }>({});

    // Delete Modal State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);

    // Detail Modal State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDetailFile, setSelectedDetailFile] = useState<UploadedFile | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchImageryFiles();
    }, [fetchImageryFiles]);

    // --- Upload Handlers ---
    const handleFileSelect = (file: File) => {
        const allowedExts = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!allowedExts.includes(ext)) {
            showToast('不支援的檔案格式。只接受 JPG, PNG, TIF', 'error');
            return;
        }

        if (file.size > 500 * 1024 * 1024) {
            showToast('檔案大小超過 500MB 限制', 'error');
            return;
        }

        setSelectedFile(file);
        setFormData(prev => ({
            ...prev,
            name: file.name.replace(/\.[^/.]+$/, ''),
        }));
        setShowUploadForm(true);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const validateForm = (): boolean => {
        const errors: { year?: string; name?: string } = {};

        if (!formData.year || formData.year < 1900 || formData.year > 2100) {
            errors.year = '請輸入有效年份 (1900-2100)';
        }
        if (!formData.name.trim()) {
            errors.name = '資料名稱為必填';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!selectedFile || !validateForm()) return;

        await uploadImagery(selectedFile, formData);

        // Check fresh state from store directly to avoid closure stale state
        const currentError = useUploadStore.getState().uploadError;

        if (!currentError) {
            showToast('上傳成功', 'success');
            setShowUploadForm(false);
            setSelectedFile(null);
            setShowAdvanced(false);
            setFormData({
                year: new Date().getFullYear(),
                name: '',
                source: '',
                description: '',
                minX: '',
                maxX: '',
                minY: '',
                maxY: '',
            });
        }
    };

    const handleCancelUpload = () => {
        setShowUploadForm(false);
        setSelectedFile(null);
        setShowAdvanced(false);
        setFormErrors({});
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // --- Delete Handlers ---
    const handleDeleteClick = (id: string) => {
        setFileToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (fileToDelete) {
            await deleteImagery(fileToDelete);
            setShowDeleteConfirm(false);
            setFileToDelete(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setFileToDelete(null);
    };

    // --- Detail Handlers ---
    const handleViewDetail = (file: UploadedFile) => {
        setSelectedDetailFile(file);
        setShowDetailModal(true);
    };

    const handleCloseDetail = () => {
        setShowDetailModal(false);
        setSelectedDetailFile(null);
    };

    return (
        <>
            <section className="dm-section">
                <div className="dm-section-header">
                    <div className="dm-section-icon">
                        <ImageIcon size={20} />
                    </div>
                    <div>
                        <h2 className="dm-section-title">航照圖管理</h2>
                        <p className="dm-section-desc">上傳與管理航照底圖，支援 JPG、PNG、TIF 格式</p>
                    </div>
                </div>

                {/* 上傳區域 (Same...) */}
                <div
                    className={`dm - upload - zone ${isDragging ? 'dragging' : ''} `}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.tif,.tiff"
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                    />
                    <div className="dm-upload-icon">
                        <UploadCloud size={48} strokeWidth={1} />
                    </div>
                    <div className="dm-upload-text">拖放檔案或點擊選擇</div>
                    <div className="dm-upload-hint">支援 JPG, PNG, TIF (最大 50MB)</div>
                </div>

                {/* 錯誤訊息 */}
                {uploadError && (
                    <div className="dm-error">
                        <span>{uploadError}</span>
                        <button onClick={clearError} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}><X size={16} /></button>
                    </div>
                )}

                {/* 已上傳檔案 */}
                {imageryFiles.length > 0 ? (
                    <div className="dm-file-grid">
                        {imageryFiles.map(file => (
                            <div key={file.id} className="dm-file-card">
                                <img
                                    className="dm-file-thumb"
                                    src={file.thumbnailUrl}
                                    alt={file.name}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.background = '#e2e8f0';
                                    }}
                                    onClick={() => handleViewDetail(file)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <div className="dm-file-info">
                                    <div className="dm-file-name">{file.name}</div>
                                    <div className="dm-file-meta">
                                        <span className="dm-file-year">{file.year}</span>
                                        {formatFileSize(file.size)}
                                        {file.minX && <span className="dm-coords-status"><Check size={10} style={{ marginRight: 2 }} /> 已定位</span>}
                                    </div>
                                    {file.source && (
                                        <div className="dm-file-meta">來源: {file.source}</div>
                                    )}
                                    <div className="dm-file-actions">
                                        <button
                                            className="dm-file-btn dm-file-btn-delete"
                                            onClick={() => handleDeleteClick(file.id)}
                                        >
                                            刪除
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="dm-empty-state">尚無上傳的航照圖</div>
                )}
            </section>

            {/* 上傳表單 Modal */}
            {showUploadForm && selectedFile && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal" onClick={e => e.stopPropagation()}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">上傳航照圖</h3>
                            <button
                                onClick={handleCancelUpload}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="dm-modal-body">
                            {/* ... upload form content specific ... */}
                            <div className="dm-file-preview">
                                <div className="dm-file-preview-icon">
                                    <File size={24} />
                                </div>
                                <div>
                                    <div className="dm-file-preview-name">{selectedFile.name}</div>
                                    <div className="dm-file-preview-size">{formatFileSize(selectedFile.size)}</div>
                                </div>
                            </div>
                            {/* ... Fields ... */}
                            <div className="dm-form-group">
                                <label className="dm-form-label">資料年份 <span className="required">*</span></label>
                                <input
                                    type="number"
                                    className={`dm - form - input ${formErrors.year ? 'error' : ''} `}
                                    value={formData.year}
                                    onChange={e => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || 0 }))}
                                    min="1900" max="2100" placeholder="例如：2024"
                                />
                                {formErrors.year && <div className="dm-form-error">{formErrors.year}</div>}
                            </div>
                            <div className="dm-form-group">
                                <label className="dm-form-label">資料名稱 <span className="required">*</span></label>
                                <input
                                    type="text"
                                    className={`dm - form - input ${formErrors.name ? 'error' : ''} `}
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="例如：廠區正射影像"
                                />
                                {formErrors.name && <div className="dm-form-error">{formErrors.name}</div>}
                            </div>
                            <div className="dm-form-group">
                                <label className="dm-form-label">資料來源</label>
                                <input type="text" className="dm-form-input" value={formData.source || ''} onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))} placeholder="例如：國土測繪中心" />
                            </div>
                            <div className="dm-form-group">
                                <label className="dm-form-label">資料說明</label>
                                <textarea className="dm-form-input dm-form-textarea" value={formData.description || ''} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="輸入資料說明..." />
                            </div>

                            <button className="dm-advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                                <span>🛠️ 進階設定 (地理座標)</span>
                                <span>{showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                            </button>

                            {showAdvanced && (
                                <div className="dm-advanced-section">
                                    <div className="dm-coords-hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ color: 'var(--primary)' }}><Activity size={16} /></div>
                                        <span>若上傳GeoTIFF檔，系統將嘗試自動解析。您也可手動輸入本地座標。</span>
                                    </div>
                                    <div className="dm-form-row">
                                        <div className="dm-form-col"><div className="dm-form-group"><label className="dm-form-label">Min X</label><input type="number" className="dm-form-input" value={formData.minX || ''} onChange={e => setFormData(prev => ({ ...prev, minX: e.target.value }))} placeholder="0.00" /></div></div>
                                        <div className="dm-form-col"><div className="dm-form-group"><label className="dm-form-label">Max X</label><input type="number" className="dm-form-input" value={formData.maxX || ''} onChange={e => setFormData(prev => ({ ...prev, maxX: e.target.value }))} placeholder="0.00" /></div></div>
                                    </div>
                                    <div className="dm-form-row">
                                        <div className="dm-form-col"><div className="dm-form-group"><label className="dm-form-label">Min Y</label><input type="number" className="dm-form-input" value={formData.minY || ''} onChange={e => setFormData(prev => ({ ...prev, minY: e.target.value }))} placeholder="0.00" /></div></div>
                                        <div className="dm-form-col"><div className="dm-form-group"><label className="dm-form-label">Max Y</label><input type="number" className="dm-form-input" value={formData.maxY || ''} onChange={e => setFormData(prev => ({ ...prev, maxY: e.target.value }))} placeholder="0.00" /></div></div>
                                    </div>
                                </div>
                            )}
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
                                    <button className="dm-btn dm-btn-secondary" onClick={handleCancelUpload}>取消</button>
                                    <button className="dm-btn dm-btn-primary" onClick={handleSubmit}>上傳</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 刪除確認 Modal - Fix for flashing issue */}
            {showDeleteConfirm && (
                <div className="dm-modal-overlay" onClick={cancelDelete}>
                    <div className="dm-modal dm-modal-delete" onClick={e => e.stopPropagation()}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title" style={{ color: '#dc2626' }}>刪除確認</h3>
                            <button onClick={cancelDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}><X size={20} /></button>
                        </div>
                        <div className="dm-modal-body">
                            <p style={{ margin: 0, color: '#374151' }}>確定要永久刪除此航照圖嗎？此動作無法復原。</p>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={cancelDelete}>
                                取消
                            </button>
                            <button className="dm-btn dm-btn-danger" onClick={confirmDelete}>
                                刪除檔案
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 詳細資料 Modal */}
            {showDetailModal && selectedDetailFile && (
                <div className="dm-modal-overlay" onClick={handleCloseDetail}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">資料詳細內容</h3>
                            <button onClick={handleCloseDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}><X size={20} /></button>
                        </div>
                        <div className="dm-modal-body">
                            <div style={{ marginBottom: '20px', textAlign: 'center', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                                <img
                                    src={selectedDetailFile.url}
                                    alt={selectedDetailFile.name}
                                    style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                                />
                            </div>

                            <div className="dm-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="dm-detail-item">
                                    <label className="dm-form-label">資料名稱</label>
                                    <div style={{ fontSize: '14px', color: '#1f2937' }}>{selectedDetailFile.name}</div>
                                </div>
                                <div className="dm-detail-item">
                                    <label className="dm-form-label">拍攝年份</label>
                                    <div style={{ fontSize: '14px', color: '#1f2937' }}>{selectedDetailFile.year}</div>
                                </div>
                                <div className="dm-detail-item">
                                    <label className="dm-form-label">檔案大小</label>
                                    <div style={{ fontSize: '14px', color: '#1f2937' }}>{formatFileSize(selectedDetailFile.size)}</div>
                                </div>
                                <div className="dm-detail-item">
                                    <label className="dm-form-label">資料來源</label>
                                    <div style={{ fontSize: '14px', color: '#1f2937' }}>{selectedDetailFile.source || '-'}</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '16px' }}>
                                <label className="dm-form-label">資料說明</label>
                                <div style={{ fontSize: '14px', color: '#4b5563', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                                    {selectedDetailFile.description || '無說明'}
                                </div>
                            </div>

                            {(selectedDetailFile.minX && selectedDetailFile.maxX) && (
                                <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                    <label className="dm-form-label">地理座標範圍 (TWD97)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                                        <div>Min X: {selectedDetailFile.minX}</div>
                                        <div>Max X: {selectedDetailFile.maxX}</div>
                                        <div>Min Y: {selectedDetailFile.minY}</div>
                                        <div>Max Y: {selectedDetailFile.maxY}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-primary" onClick={handleCloseDetail}>關閉</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
