import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Box, X, File } from 'lucide-react';
import { useUploadStore, GeologyModelMetadata } from '../../stores/uploadStore';

interface GeologyModelSectionProps {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const GeologyModelSection: React.FC<GeologyModelSectionProps> = ({ showToast }) => {
    const {
        geologyModels,
        isUploading,
        uploadProgress,
        uploadError,
        fetchGeologyModels,
        uploadGeologyModel,
        deleteGeologyModel,
        activateGeologyModel,
        pollGeologyModelStatus,
    } = useUploadStore();

    // ===============================
    // 3D 地質模型 State
    // ===============================
    const [geoModelFile, setGeoModelFile] = useState<File | null>(null);
    const [showGeoModelForm, setShowGeoModelForm] = useState(false);
    const [geoModelFormData, setGeoModelFormData] = useState<GeologyModelMetadata>({
        version: '',
        year: new Date().getFullYear(),
        name: '',
        description: '',
        sourceData: '',
    });
    const [geoModelFormErrors, setGeoModelFormErrors] = useState<Record<string, string>>({});
    const geoModelInputRef = useRef<HTMLInputElement>(null);
    const [showGeoModelDeleteConfirm, setShowGeoModelDeleteConfirm] = useState(false);
    const [geoModelToDelete, setGeoModelToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchGeologyModels();
    }, [fetchGeologyModels]);

    // 輪詢處理中的地質模型狀態
    useEffect(() => {
        const processingModels = geologyModels.filter(
            m => m.conversionStatus === 'pending' || m.conversionStatus === 'processing'
        );

        if (processingModels.length === 0) return;

        const interval = setInterval(() => {
            processingModels.forEach(m => pollGeologyModelStatus(m.id));
        }, 3000);

        return () => clearInterval(interval);
    }, [geologyModels, pollGeologyModelStatus]);

    // ===============================
    // 3D 地質模型 Handlers
    // ===============================
    const handleGeoModelFileSelect = (file: File) => {
        const allowedExts = ['.dat'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!allowedExts.includes(ext)) {
            showToast('不支援的檔案格式。只接受 Tecplot DAT 檔案', 'error');
            return;
        }
        if (file.size > 200 * 1024 * 1024) {
            showToast('檔案大小超過 200MB 限制', 'error');
            return;
        }
        setGeoModelFile(file);
        setGeoModelFormData(prev => ({
            ...prev,
            name: file.name.replace(/\.[^/.]+$/, ''),
        }));
        setShowGeoModelForm(true);
    };

    const handleGeoModelDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleGeoModelFileSelect(file);
    };

    const handleGeoModelInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleGeoModelFileSelect(file);
        if (geoModelInputRef.current) geoModelInputRef.current.value = '';
    };

    const validateGeoModelForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!geoModelFormData.version.trim()) errors.version = '版本號為必填';
        if (!geoModelFormData.year || geoModelFormData.year < 1900 || geoModelFormData.year > 2100) errors.year = '請輸入有效年份';
        if (!geoModelFormData.name.trim()) errors.name = '模型名稱為必填';
        setGeoModelFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleGeoModelSubmit = async () => {
        if (!geoModelFile || !validateGeoModelForm()) return;
        const submitData = { ...geoModelFormData };
        await uploadGeologyModel(geoModelFile, submitData);
        if (!uploadError) {
            setShowGeoModelForm(false);
            setGeoModelFile(null);
            setGeoModelFormData({
                version: '',
                year: new Date().getFullYear(),
                name: '',
                description: '',
                sourceData: '',
            });
        }
    };

    const handleCancelGeoModelUpload = () => {
        setShowGeoModelForm(false);
        setGeoModelFile(null);
        setGeoModelFormErrors({});
    };

    const handleGeoModelDeleteClick = (id: string) => {
        setGeoModelToDelete(id);
        setShowGeoModelDeleteConfirm(true);
    };

    const confirmGeoModelDelete = async () => {
        if (geoModelToDelete) {
            await deleteGeologyModel(geoModelToDelete);
            setShowGeoModelDeleteConfirm(false);
            setGeoModelToDelete(null);
        }
    };

    const handleActivateGeoModel = async (id: string) => {
        await activateGeologyModel(id);
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { text: string; color: string; bg: string }> = {
            pending: { text: '等待中', color: '#92400e', bg: '#fef3c7' },
            processing: { text: '轉換中', color: '#1e40af', bg: '#dbeafe' },
            completed: { text: '已完成', color: '#166534', bg: '#dcfce7' },
            failed: { text: '失敗', color: '#991b1b', bg: '#fee2e2' },
        };
        const s = statusMap[status] || statusMap.pending;
        return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: s.bg, color: s.color }}>{s.text}</span>;
    };

    return (
        <>
            <section className="dm-section">
                <div className="dm-section-header">
                    <div className="dm-section-icon">
                        <Box size={20} />
                    </div>
                    <div>
                        <h2 className="dm-section-title">3D 地質模型</h2>
                        <p className="dm-section-desc">3D 地質模型版本管理 (CSV / Tecplot DAT 格式)</p>
                    </div>
                </div>

                {/* 上傳區域 */}
                <div
                    className="dm-upload-zone"
                    onDrop={handleGeoModelDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => geoModelInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={geoModelInputRef}
                        style={{ display: 'none' }}
                        accept=".dat"
                        onChange={handleGeoModelInputChange}
                    />
                    <div className="dm-upload-icon">
                        <UploadCloud size={48} strokeWidth={1} />
                    </div>
                    <div className="dm-upload-text">
                        拖放檔案或點擊選擇
                    </div>
                    <div className="dm-upload-hint">
                        支援 Tecplot DAT 格式 (FETetrahedron)，最大 200MB
                    </div>
                </div>

                {/* 模型列表 */}
                {geologyModels.length > 0 && (
                    <div className="dm-file-list" style={{ marginTop: '16px' }}>
                        {geologyModels.map((model) => (
                            <div
                                key={model.id}
                                className="dm-file-card"
                                style={{
                                    border: model.isActive ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                                    background: model.isActive ? '#eff6ff' : 'white',
                                }}
                            >
                                <div className="dm-file-info" style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="dm-file-name">{model.name}</span>
                                        <span style={{ fontSize: '11px', color: '#6b7280', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>v{model.version}</span>
                                        {getStatusBadge(model.conversionStatus)}
                                        {model.isActive && <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 500 }}>● 使用中</span>}
                                    </div>
                                    <div className="dm-file-meta" style={{ marginTop: '4px' }}>
                                        {model.year}年 · {formatFileSize(model.size)}
                                        {model.sourceData && ` · ${model.sourceData} `}
                                    </div>
                                    {(model.conversionStatus === 'pending' || model.conversionStatus === 'processing') && (
                                        <div style={{ marginTop: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                                                <span>轉換進度...</span>
                                                <span>{model.conversionProgress}%</span>
                                            </div>
                                            <div className="dm-progress-container" style={{ marginTop: 0 }}>
                                                <div
                                                    className="dm-progress-bar"
                                                    style={{ width: `${Math.max(5, model.conversionProgress)}% ` }}
                                                >
                                                    <div className="dm-progress-shimmer"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {model.conversionError && (
                                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>
                                            錯誤: {model.conversionError}
                                        </div>
                                    )}
                                </div>
                                <div className="dm-file-actions" style={{ display: 'flex', gap: '8px' }}>
                                    {model.conversionStatus === 'completed' && !model.isActive && (
                                        <button
                                            className="dm-btn dm-btn-secondary"
                                            style={{ fontSize: '12px', padding: '4px 12px' }}
                                            onClick={() => handleActivateGeoModel(model.id)}
                                        >
                                            設為使用
                                        </button>
                                    )}
                                    <button
                                        className="dm-file-btn dm-file-btn-delete"
                                        onClick={() => handleGeoModelDeleteClick(model.id)}
                                    >
                                        刪除
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* 3D 地質模型上傳表單 Modal */}
            {showGeoModelForm && geoModelFile && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">上傳 3D 地質模型</h3>
                            <button onClick={handleCancelGeoModelUpload} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
                        </div>
                        <div className="dm-modal-body">
                            <div className="dm-file-preview">
                                <div className="dm-file-preview-icon"><File size={24} /></div>
                                <div>
                                    <div className="dm-file-preview-name">{geoModelFile.name}</div>
                                    <div className="dm-file-preview-size">{formatFileSize(geoModelFile.size)}</div>
                                </div>
                            </div>


                            {/* 必填欄位 */}
                            <div className="dm-form-row">
                                <div className="dm-form-group">
                                    <label className="dm-form-label">版本號 *</label>
                                    <input
                                        type="text"
                                        className="dm-form-input"
                                        placeholder="1.0"
                                        value={geoModelFormData.version}
                                        onChange={e => setGeoModelFormData({ ...geoModelFormData, version: e.target.value })}
                                    />
                                    {geoModelFormErrors.version && <span className="dm-form-error">{geoModelFormErrors.version}</span>}
                                </div>
                                <div className="dm-form-group">
                                    <label className="dm-form-label">資料年份 *</label>
                                    <input
                                        type="number"
                                        className="dm-form-input"
                                        value={geoModelFormData.year}
                                        onChange={e => setGeoModelFormData({ ...geoModelFormData, year: parseInt(e.target.value) })}
                                    />
                                    {geoModelFormErrors.year && <span className="dm-form-error">{geoModelFormErrors.year}</span>}
                                </div>
                            </div>

                            <div className="dm-form-group" style={{ marginTop: '12px' }}>
                                <label className="dm-form-label">模型名稱 *</label>
                                <input
                                    type="text"
                                    className="dm-form-input"
                                    placeholder="LLRWD 地質模型"
                                    value={geoModelFormData.name}
                                    onChange={e => setGeoModelFormData({ ...geoModelFormData, name: e.target.value })}
                                />
                                {geoModelFormErrors.name && <span className="dm-form-error">{geoModelFormErrors.name}</span>}
                            </div>

                            <div className="dm-form-group" style={{ marginTop: '12px' }}>
                                <label className="dm-form-label">資料來源</label>
                                <input
                                    type="text"
                                    className="dm-form-input"
                                    placeholder="地調所、模擬結果等"
                                    value={geoModelFormData.sourceData || ''}
                                    onChange={e => setGeoModelFormData({ ...geoModelFormData, sourceData: e.target.value })}
                                />
                            </div>

                            <div className="dm-form-group" style={{ marginTop: '12px' }}>
                                <label className="dm-form-label">說明</label>
                                <textarea
                                    className="dm-form-input"
                                    rows={2}
                                    placeholder="選填"
                                    value={geoModelFormData.description || ''}
                                    onChange={e => setGeoModelFormData({ ...geoModelFormData, description: e.target.value })}
                                />
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
                                    <button className="dm-btn dm-btn-secondary" onClick={handleCancelGeoModelUpload}>取消</button>
                                    <button className="dm-btn dm-btn-primary" onClick={handleGeoModelSubmit}>上傳</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 3D 地質模型刪除確認 Modal */}
            {showGeoModelDeleteConfirm && (
                <div className="dm-modal-overlay" onClick={() => setShowGeoModelDeleteConfirm(false)}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title" style={{ color: '#dc2626' }}>刪除確認</h3>
                            <button onClick={() => setShowGeoModelDeleteConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定要刪除此地質模型嗎？此操作無法復原。</p>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={() => setShowGeoModelDeleteConfirm(false)}>取消</button>
                            <button className="dm-btn dm-btn-danger" onClick={confirmGeoModelDelete}>刪除</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
