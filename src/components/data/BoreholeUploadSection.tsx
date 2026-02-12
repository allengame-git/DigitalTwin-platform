/**
 * BoreholeUploadSection
 * @module components/data/BoreholeUploadSection
 * 
 * 鑽探資料上傳區塊 - 用於 DataManagementPage
 */

import React, { useState, useRef, useEffect } from 'react';
import { useBoreholeStore } from '../../stores/boreholeStore';
import { useProjectStore } from '../../stores/projectStore';
import { useLithologyStore } from '../../stores/lithologyStore';

interface BoreholeFormData {
    boreholeNo: string;
    name: string;
    x: string;
    y: string;
    elevation: string;
    totalDepth: string;
    drilledDate: string;
    contractor: string;
    area: string;
    description: string;
}

interface LayerFormData {
    topDepth: string;
    bottomDepth: string;
    lithologyCode: string;
    description: string;
}

interface PropertyFormData {
    depth: string;
    nValue: string;
    rqd: string;
}

const initialFormData: BoreholeFormData = {
    boreholeNo: '',
    name: '',
    x: '',
    y: '',
    elevation: '',
    totalDepth: '',
    drilledDate: '',
    contractor: '',
    area: '',
    description: '',
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const BoreholeUploadSection: React.FC = () => {
    const { boreholes, status, fetchBoreholes, createBorehole, updateBorehole, deleteBorehole, batchDelete, batchImport, batchImportLayers, batchImportProperties, uploadPhoto, deletePhoto, fetchBoreholePhotos } = useBoreholeStore();
    const { activeProjectId } = useProjectStore();
    const { lithologies } = useLithologyStore();

    const [showForm, setShowForm] = useState(false);
    const [editingBorehole, setEditingBorehole] = useState<string | null>(null);
    const [formData, setFormData] = useState<BoreholeFormData>(initialFormData);
    const [layers, setLayers] = useState<LayerFormData[]>([]);
    const [properties, setProperties] = useState<PropertyFormData[]>([]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [boreholeToDelete, setBoreholeToDelete] = useState<string | null>(null);

    // CSV Import dropdown
    const [showImportDropdown, setShowImportDropdown] = useState(false);
    const [showCsvImport, setShowCsvImport] = useState(false);
    const [showLayerCsvImport, setShowLayerCsvImport] = useState(false);
    const [showPropertyCsvImport, setShowPropertyCsvImport] = useState(false);
    const csvInputRef = useRef<HTMLInputElement>(null);
    const layerCsvInputRef = useRef<HTMLInputElement>(null);
    const propertyCsvInputRef = useRef<HTMLInputElement>(null);

    // Photo states
    const [boreholePhotos, setBoreholePhotos] = useState<any[]>([]);
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
    const [photoDepth, setPhotoDepth] = useState('');
    const [photoCaption, setPhotoCaption] = useState('');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [showDeletePhotoConfirm, setShowDeletePhotoConfirm] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeProjectId) {
            fetchBoreholes(activeProjectId);
        }
    }, [activeProjectId, fetchBoreholes]);

    // Selection handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === boreholes.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(boreholes.map(b => b.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        const result = await batchDelete(Array.from(selectedIds));
        alert(`批量刪除完成：成功 ${result.success} 筆，失敗 ${result.failed} 筆`);
        setSelectedIds(new Set());
        setShowBatchDeleteConfirm(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addLayer = () => {
        setLayers(prev => [...prev, { topDepth: '', bottomDepth: '', lithologyCode: 'SF', description: '' }]);
    };

    const removeLayer = (index: number) => {
        setLayers(prev => prev.filter((_, i) => i !== index));
    };

    const updateLayer = (index: number, field: keyof LayerFormData, value: string) => {
        setLayers(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
    };

    const addProperty = () => {
        setProperties(prev => [...prev, { depth: '', nValue: '', rqd: '' }]);
    };

    const removeProperty = (index: number) => {
        setProperties(prev => prev.filter((_, i) => i !== index));
    };

    const updateProperty = (index: number, field: keyof PropertyFormData, value: string) => {
        setProperties(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.boreholeNo.trim()) errors.boreholeNo = '必填';
        if (!formData.x.trim() || isNaN(parseFloat(formData.x))) errors.x = '請輸入有效數字';
        if (!formData.y.trim() || isNaN(parseFloat(formData.y))) errors.y = '請輸入有效數字';
        if (!formData.elevation.trim() || isNaN(parseFloat(formData.elevation))) errors.elevation = '請輸入有效數字';
        if (!formData.totalDepth.trim() || isNaN(parseFloat(formData.totalDepth))) errors.totalDepth = '請輸入有效數字';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        if (!activeProjectId) {
            alert('請先選擇專案');
            return;
        }

        setIsSubmitting(true);
        try {
            const boreholeData = {
                projectId: activeProjectId,
                boreholeNo: formData.boreholeNo.trim(),
                name: formData.name.trim() || undefined,
                x: parseFloat(formData.x),
                y: parseFloat(formData.y),
                elevation: parseFloat(formData.elevation),
                totalDepth: parseFloat(formData.totalDepth),
                drilledDate: formData.drilledDate || undefined,
                contractor: formData.contractor.trim() || undefined,
                area: formData.area.trim() || undefined,
                description: formData.description.trim() || undefined,
                layers: layers.length > 0 ? layers.map(l => ({
                    topDepth: parseFloat(l.topDepth),
                    bottomDepth: parseFloat(l.bottomDepth),
                    lithologyCode: l.lithologyCode,
                    description: l.description || undefined,
                })) : undefined,
                properties: properties.length > 0 ? properties.map(p => ({
                    depth: parseFloat(p.depth),
                    nValue: p.nValue ? parseInt(p.nValue) : undefined,
                    rqd: p.rqd ? parseFloat(p.rqd) : undefined,
                })) : undefined,
            };

            let result;
            if (editingBorehole) {
                result = await updateBorehole(editingBorehole, boreholeData);
            } else {
                result = await createBorehole(boreholeData);
            }

            if (result) {
                handleCancelForm();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingBorehole(null);
        setFormData(initialFormData);
        setLayers([]);
        setProperties([]);
        setFormErrors({});
    };

    const handleEdit = (bh: any) => {
        setEditingBorehole(bh.id);

        // Format date to YYYY-MM-DD for date input
        let formattedDate = '';
        if (bh.drilledDate) {
            const date = new Date(bh.drilledDate);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toISOString().split('T')[0];
            }
        }

        setFormData({
            boreholeNo: bh.boreholeNo || '',
            name: bh.name || '',
            x: bh.x.toString(),
            y: bh.y.toString(),
            elevation: bh.elevation.toString(),
            totalDepth: bh.totalDepth.toString(),
            drilledDate: formattedDate,
            contractor: bh.contractor || '',
            area: bh.area || '',
            description: bh.description || '',
        });

        // Map and set layers
        if (bh.layers && Array.isArray(bh.layers)) {
            setLayers(bh.layers.map((l: any) => ({
                topDepth: l.topDepth.toString(),
                bottomDepth: l.bottomDepth.toString(),
                lithologyCode: l.lithologyCode,
                description: l.description || '',
            })));
        } else {
            setLayers([]);
        }

        // Map and set properties
        if (bh.properties && Array.isArray(bh.properties)) {
            setProperties(bh.properties.map((p: any) => ({
                depth: p.depth.toString(),
                nValue: p.nValue ? p.nValue.toString() : '',
                rqd: p.rqd ? p.rqd.toString() : '',
            })));
        } else {
            setProperties([]);
        }

        setShowForm(true);

        // Load photos for this borehole
        loadPhotos(bh.id);
    };

    const loadPhotos = async (boreholeId: string) => {
        setIsLoadingPhotos(true);
        const photos = await fetchBoreholePhotos(boreholeId);
        setBoreholePhotos(photos);
        setIsLoadingPhotos(false);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editingBorehole) return;

        const depth = parseFloat(photoDepth);
        if (isNaN(depth)) {
            alert('請填入有效的深度值');
            return;
        }

        setIsUploadingPhoto(true);
        const success = await uploadPhoto(editingBorehole, file, depth, photoCaption || undefined);
        setIsUploadingPhoto(false);

        if (success) {
            setPhotoDepth('');
            setPhotoCaption('');
            if (photoInputRef.current) photoInputRef.current.value = '';
            loadPhotos(editingBorehole);
        } else {
            alert('上傳照片失敗');
        }
    };

    const handleDeletePhoto = async (photoId: string) => {
        if (!editingBorehole) return;
        const success = await deletePhoto(editingBorehole, photoId);
        if (success) {
            setBoreholePhotos(prev => prev.filter(p => p.id !== photoId));
        } else {
            alert('刪除照片失敗，請檢查權限或稍後再試');
        }
        setShowDeletePhotoConfirm(null);
    };

    const handleDeleteClick = (id: string) => {
        setBoreholeToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (boreholeToDelete) {
            await deleteBorehole(boreholeToDelete);
            setShowDeleteConfirm(false);
            setBoreholeToDelete(null);
        }
    };

    const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProjectId) return;

        let text = await file.text();

        // 1. 強健的 BOM 移除 (移除 UTF-8, UTF-16 等 BOM)
        text = text.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '');

        // 2. 處理換行符號 (相容 Windows \r\n, Mac \r, Linux \n) 並移除空行
        const lines = text.split(/\r?\n|\r/).map(l => l.trim()).filter(line => line.length > 0);

        if (lines.length < 2) {
            alert('CSV 檔案格式錯誤或無資料');
            return;
        }

        // 3. 解析標頭與資料
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const boreholeData = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h, idx) => {
                if (h) row[h] = values[idx];
            });

            // 基本驗證：鑽孔編號與座標為必填
            if (row.boreholeNo && row.x && row.y) {
                boreholeData.push(row);
            }
        }

        if (boreholeData.length === 0) {
            alert('無法解析任何有效的鑽孔基本資料，請檢查 CSV 標頭。');
            return;
        }

        const result = await batchImport(activeProjectId, boreholeData);
        alert(`匯入完成：成功 ${result.success} 筆，失敗 ${result.failed} 筆${result.failed > 0 ? '\n請檢查編號是否重複或格式錯誤。' : ''}`);

        if (csvInputRef.current) {
            csvInputRef.current.value = '';
        }
        setShowCsvImport(false);
    };

    const handleLayerCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProjectId) return;

        let text = await file.text();
        text = text.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '');
        const lines = text.split(/\r?\n|\r/).map(l => l.trim()).filter(line => line.length > 0);

        if (lines.length < 2) {
            alert('CSV 檔案格式錯誤');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const layerData = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h, idx) => {
                if (h) row[h] = values[idx];
            });

            // 驗證：需有鑽孔編號與地層深度
            if (row.boreholeNo && row.topDepth !== undefined && row.bottomDepth !== undefined) {
                layerData.push(row);
            }
        }

        if (layerData.length === 0) {
            alert('無法解析任何有效的地層資料。');
            return;
        }

        const result = await batchImportLayers(activeProjectId, layerData);
        alert(`地層資料匯入完成：成功 ${result.success} 筆，失敗 ${result.failed} 筆`);

        if (layerCsvInputRef.current) {
            layerCsvInputRef.current.value = '';
        }
        setShowLayerCsvImport(false);
    };

    const handlePropertyCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProjectId) return;

        let text = await file.text();
        text = text.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '');
        const lines = text.split(/\r?\n|\r/).map(l => l.trim()).filter(line => line.length > 0);

        if (lines.length < 2) {
            alert('CSV 檔案格式錯誤');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const propertyData = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h, idx) => {
                if (h) row[h] = values[idx];
            });

            // 驗證：需有鑽孔編號與深度
            if (row.boreholeNo && row.depth !== undefined) {
                propertyData.push(row);
            }
        }

        if (propertyData.length === 0) {
            alert('無法解析任何有效的物性資料。');
            return;
        }

        const result = await batchImportProperties(activeProjectId, propertyData);
        alert(`物性資料匯入完成：成功 ${result.success} 筆，失敗 ${result.failed} 筆`);

        if (propertyCsvInputRef.current) {
            propertyCsvInputRef.current.value = '';
        }
        setShowPropertyCsvImport(false);
    };

    return (
        <section className="dm-section">
            <div className="dm-section-header">
                <div>
                    <h2 className="dm-section-title">鑽探資料</h2>
                    <p className="dm-section-desc">管理鑽孔位置、地層及物性資料 (共 {boreholes.length} 筆)</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                    {selectedIds.size > 0 && (
                        <button
                            className="dm-btn"
                            style={{ background: '#dc2626', color: 'white' }}
                            onClick={() => setShowBatchDeleteConfirm(true)}
                        >
                            刪除已選 ({selectedIds.size})
                        </button>
                    )}
                    <div style={{ position: 'relative' }}>
                        <button
                            className="dm-btn dm-btn-secondary"
                            onClick={() => setShowImportDropdown(!showImportDropdown)}
                        >
                            批次匯入 CSV ▼
                        </button>
                        {showImportDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '4px',
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                zIndex: 100,
                                minWidth: '180px',
                            }}>
                                <button
                                    style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}
                                    onClick={() => { setShowCsvImport(true); setShowImportDropdown(false); }}
                                    onMouseEnter={e => (e.target as HTMLElement).style.background = '#f3f4f6'}
                                    onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
                                >
                                    鑽孔基本資料
                                </button>
                                <button
                                    style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}
                                    onClick={() => { setShowLayerCsvImport(true); setShowImportDropdown(false); }}
                                    onMouseEnter={e => (e.target as HTMLElement).style.background = '#f3f4f6'}
                                    onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
                                >
                                    地層資料
                                </button>
                                <button
                                    style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}
                                    onClick={() => { setShowPropertyCsvImport(true); setShowImportDropdown(false); }}
                                    onMouseEnter={e => (e.target as HTMLElement).style.background = '#f3f4f6'}
                                    onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
                                >
                                    物性資料 (N值/RQD)
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        className="dm-btn dm-btn-primary"
                        onClick={() => setShowForm(true)}
                    >
                        + 新增鑽孔
                    </button>
                </div>
            </div>

            {/* 鑽孔列表 - 表格形式 */}
            {status === 'loading' ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>載入中...</div>
            ) : boreholes.length === 0 ? (
                <div className="dm-empty-state">
                    <div className="dm-empty-icon">🔩</div>
                    <p>尚無鑽探資料</p>
                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>點擊「新增鑽孔」按鈕開始上傳</p>
                </div>
            ) : (
                <div className="dm-table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="dm-table" style={{ fontSize: '13px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                            <tr>
                                <th style={{ width: '40px', padding: '10px 8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === boreholes.length && boreholes.length > 0}
                                        onChange={toggleSelectAll}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </th>
                                <th style={{ padding: '10px 12px', textAlign: 'left' }}>鑽孔編號</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right' }}>X (TWD97)</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Y (TWD97)</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right' }}>高程 (m)</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right' }}>深度 (m)</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left' }}>區域</th>
                                <th style={{ padding: '10px 12px', width: '100px', textAlign: 'center' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {boreholes.map(bh => (
                                <tr
                                    key={bh.id}
                                    style={{
                                        background: selectedIds.has(bh.id) ? '#eff6ff' : 'transparent',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => { if (!selectedIds.has(bh.id)) (e.currentTarget as HTMLElement).style.background = '#f9fafb'; }}
                                    onMouseLeave={e => { if (!selectedIds.has(bh.id)) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(bh.id)}
                                            onChange={() => toggleSelect(bh.id)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{bh.boreholeNo}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>{bh.x.toFixed(2)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>{bh.y.toFixed(2)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{bh.elevation.toFixed(1)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{bh.totalDepth.toFixed(1)}</td>
                                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{bh.area || '-'}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleEdit(bh)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '12px', marginRight: '8px' }}
                                            title="編輯"
                                        >
                                            編輯
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(bh.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px' }}
                                            title="刪除"
                                        >
                                            刪除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">{editingBorehole ? '編輯鑽孔資料' : '新增鑽孔資料'}</h3>
                            <button onClick={handleCancelForm} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>✕</button>
                        </div>
                        <div className="dm-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {/* 基本資料 */}
                            <div className="dm-form-row">
                                <div className="dm-form-group">
                                    <label className="dm-form-label">鑽孔編號 *</label>
                                    <input type="text" className="dm-form-input" name="boreholeNo" placeholder="BH-001" value={formData.boreholeNo} onChange={handleInputChange} />
                                    {formErrors.boreholeNo && <span className="dm-form-error">{formErrors.boreholeNo}</span>}
                                </div>
                                <div className="dm-form-group">
                                    <label className="dm-form-label">鑽孔名稱</label>
                                    <input type="text" className="dm-form-input" name="name" placeholder="選填" value={formData.name} onChange={handleInputChange} />
                                </div>
                            </div>

                            {/* TWD97 座標 */}
                            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label className="dm-form-label">TWD97 座標 (公尺) *</label>
                                <div className="dm-form-row" style={{ marginTop: '8px' }}>
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" name="x" placeholder="X" value={formData.x} onChange={handleInputChange} />
                                        {formErrors.x && <span className="dm-form-error">{formErrors.x}</span>}
                                    </div>
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" name="y" placeholder="Y" value={formData.y} onChange={handleInputChange} />
                                        {formErrors.y && <span className="dm-form-error">{formErrors.y}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* 高程 & 深度 */}
                            <div className="dm-form-row" style={{ marginTop: '16px' }}>
                                <div className="dm-form-group">
                                    <label className="dm-form-label">孔口高程 (m) *</label>
                                    <input type="text" className="dm-form-input" name="elevation" value={formData.elevation} onChange={handleInputChange} />
                                    {formErrors.elevation && <span className="dm-form-error">{formErrors.elevation}</span>}
                                </div>
                                <div className="dm-form-group">
                                    <label className="dm-form-label">總深度 (m) *</label>
                                    <input type="text" className="dm-form-input" name="totalDepth" value={formData.totalDepth} onChange={handleInputChange} />
                                    {formErrors.totalDepth && <span className="dm-form-error">{formErrors.totalDepth}</span>}
                                </div>
                            </div>

                            {/* 其他資訊 */}
                            <div className="dm-form-row" style={{ marginTop: '16px' }}>
                                <div className="dm-form-group">
                                    <label className="dm-form-label">鑽探日期</label>
                                    <input type="date" className="dm-form-input" name="drilledDate" value={formData.drilledDate} onChange={handleInputChange} />
                                </div>
                                <div className="dm-form-group">
                                    <label className="dm-form-label">所屬區域</label>
                                    <input type="text" className="dm-form-input" name="area" placeholder="A區" value={formData.area} onChange={handleInputChange} />
                                </div>
                            </div>

                            <div className="dm-form-group" style={{ marginTop: '12px' }}>
                                <label className="dm-form-label">鑽探單位</label>
                                <input type="text" className="dm-form-input" name="contractor" value={formData.contractor} onChange={handleInputChange} />
                            </div>

                            <div className="dm-form-group" style={{ marginTop: '12px' }}>
                                <label className="dm-form-label">備註</label>
                                <textarea className="dm-form-input" name="description" rows={2} value={formData.description} onChange={handleInputChange} />
                            </div>

                            {/* 地層資料 */}
                            <div style={{ marginTop: '20px', padding: '12px', background: '#fefce8', borderRadius: '8px', border: '1px solid #fef08a' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label className="dm-form-label" style={{ margin: 0 }}>地層資料</label>
                                    <button type="button" className="dm-btn dm-btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={addLayer}>+ 新增地層</button>
                                </div>
                                {layers.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '13px' }}>尚無地層資料</div>
                                ) : (
                                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#fef3c7' }}>
                                                <th style={{ padding: '6px', textAlign: 'left' }}>頂深</th>
                                                <th style={{ padding: '6px', textAlign: 'left' }}>底深</th>
                                                <th style={{ padding: '6px', textAlign: 'left' }}>岩性</th>
                                                <th style={{ padding: '6px', textAlign: 'left' }}>描述</th>
                                                <th style={{ padding: '6px', width: '30px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {layers.map((layer, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ padding: '4px' }}>
                                                        <input type="text" className="dm-form-input" style={{ padding: '4px 8px' }} value={layer.topDepth} onChange={e => updateLayer(idx, 'topDepth', e.target.value)} />
                                                    </td>
                                                    <td style={{ padding: '4px' }}>
                                                        <input type="text" className="dm-form-input" style={{ padding: '4px 8px' }} value={layer.bottomDepth} onChange={e => updateLayer(idx, 'bottomDepth', e.target.value)} />
                                                    </td>
                                                    <td style={{ padding: '4px' }}>
                                                        <select className="dm-form-input" style={{ padding: '4px 8px' }} value={layer.lithologyCode} onChange={e => updateLayer(idx, 'lithologyCode', e.target.value)}>
                                                            {lithologies.map(l => (
                                                                <option key={l.code} value={l.code}>{l.code} - {l.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '4px' }}>
                                                        <input type="text" className="dm-form-input" style={{ padding: '4px 8px' }} value={layer.description} onChange={e => updateLayer(idx, 'description', e.target.value)} />
                                                    </td>
                                                    <td style={{ padding: '4px' }}>
                                                        <button type="button" onClick={() => removeLayer(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>✕</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* 物性資料 */}
                            <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label className="dm-form-label" style={{ margin: 0 }}>物性資料 (N值/RQD)</label>
                                    <button type="button" className="dm-btn dm-btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={addProperty}>+ 新增</button>
                                </div>
                                {properties.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '13px' }}>尚無物性資料</div>
                                ) : (
                                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#dcfce7' }}>
                                                <th style={{ padding: '6px', textAlign: 'left' }}>深度 (m)</th>
                                                <th style={{ padding: '6px', textAlign: 'left' }}>N 值</th>
                                                <th style={{ padding: '6px', textAlign: 'left' }}>RQD (%)</th>
                                                <th style={{ padding: '6px', width: '30px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {properties.map((prop, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ padding: '4px' }}>
                                                        <input type="text" className="dm-form-input" style={{ padding: '4px 8px' }} value={prop.depth} onChange={e => updateProperty(idx, 'depth', e.target.value)} />
                                                    </td>
                                                    <td style={{ padding: '4px' }}>
                                                        <input type="text" className="dm-form-input" style={{ padding: '4px 8px' }} value={prop.nValue} onChange={e => updateProperty(idx, 'nValue', e.target.value)} />
                                                    </td>
                                                    <td style={{ padding: '4px' }}>
                                                        <input type="text" className="dm-form-input" style={{ padding: '4px 8px' }} value={prop.rqd} onChange={e => updateProperty(idx, 'rqd', e.target.value)} />
                                                    </td>
                                                    <td style={{ padding: '4px' }}>
                                                        <button type="button" onClick={() => removeProperty(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>✕</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* 岩心照片 - 僅在編輯模式顯示 */}
                            {editingBorehole && (
                                <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <label className="dm-form-label" style={{ margin: 0 }}>岩心照片</label>
                                    </div>

                                    {/* 上傳表單 */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            className="dm-form-input"
                                            style={{ flex: '0 0 80px', padding: '4px 8px', fontSize: '13px' }}
                                            placeholder="深度 (m) *"
                                            value={photoDepth}
                                            onChange={e => setPhotoDepth(e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="dm-form-input"
                                            style={{ flex: 1, padding: '4px 8px', fontSize: '13px', minWidth: '100px' }}
                                            placeholder="備註 (選填)"
                                            value={photoCaption}
                                            onChange={e => setPhotoCaption(e.target.value)}
                                        />
                                        <input
                                            ref={photoInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handlePhotoUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <button
                                            type="button"
                                            className="dm-btn dm-btn-primary"
                                            style={{ fontSize: '12px', padding: '4px 12px', whiteSpace: 'nowrap' }}
                                            onClick={() => {
                                                if (!photoDepth.trim() || isNaN(parseFloat(photoDepth))) {
                                                    alert('請先填入深度');
                                                    return;
                                                }
                                                photoInputRef.current?.click();
                                            }}
                                            disabled={isUploadingPhoto}
                                        >
                                            {isUploadingPhoto ? '上傳中...' : '+ 上傳照片'}
                                        </button>
                                    </div>

                                    {/* 照片列表 */}
                                    {isLoadingPhotos ? (
                                        <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '13px' }}>載入照片中...</div>
                                    ) : boreholePhotos.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '13px' }}>尚無岩心照片</div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                            {boreholePhotos.map((photo: any) => (
                                                <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                                    <img
                                                        src={`${API_BASE}${photo.thumbnailUrl || photo.url}`}
                                                        alt={photo.caption || `${photo.depth}m`}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={e => {
                                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23eee" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23999" font-size="12">error</text></svg>';
                                                        }}
                                                    />
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '3px', fontSize: '10px', textAlign: 'center' }}>
                                                        {photo.depth.toFixed(1)}m
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDeletePhotoConfirm(photo.id)}
                                                        style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(220,38,38,0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                                        title="刪除照片"
                                                    >
                                                        x
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={handleCancelForm}>取消</button>
                            <button className="dm-btn dm-btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? '儲存中...' : '儲存鑽孔'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV 匯入 Modal */}
            {showCsvImport && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">批次匯入 CSV</h3>
                            <button onClick={() => setShowCsvImport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>✕</button>
                        </div>
                        <div className="dm-modal-body">
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                                CSV 格式：boreholeNo, x, y, elevation, totalDepth, drilledDate, area
                            </p>
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                                <pre style={{ fontSize: '11px', color: '#475569', margin: 0, overflow: 'auto' }}>
                                    {`boreholeNo,x,y,elevation,totalDepth,drilledDate,area
BH-001,224500,2429500,120.5,50.0,2024-01-15,A區
BH-002,224600,2429600,118.2,45.0,2024-01-20,A區`}
                                </pre>
                            </div>
                            <input
                                ref={csvInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleCsvImport}
                                style={{ display: 'none' }}
                            />
                            <button
                                className="dm-btn dm-btn-primary"
                                style={{ width: '100%' }}
                                onClick={() => csvInputRef.current?.click()}
                            >
                                選擇 CSV 檔案
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 刪除確認 Modal */}
            {showDeleteConfirm && (
                <div className="dm-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">確認刪除</h3>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定要刪除此鑽孔資料嗎？此操作無法復原。</p>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={() => setShowDeleteConfirm(false)}>取消</button>
                            <button className="dm-btn dm-btn-primary" style={{ background: '#dc2626' }} onClick={confirmDelete}>刪除</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 批量刪除確認 Modal */}
            {showBatchDeleteConfirm && (
                <div className="dm-modal-overlay" onClick={() => setShowBatchDeleteConfirm(false)}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">確認批量刪除</h3>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定要刪除選取的 <strong>{selectedIds.size}</strong> 筆鑽孔資料嗎？此操作無法復原。</p>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={() => setShowBatchDeleteConfirm(false)}>取消</button>
                            <button className="dm-btn dm-btn-primary" style={{ background: '#dc2626' }} onClick={handleBatchDelete}>批量刪除</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 地層資料 CSV 匯入 Modal */}
            {showLayerCsvImport && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">批次匯入地層資料 CSV</h3>
                            <button onClick={() => setShowLayerCsvImport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>✕</button>
                        </div>
                        <div className="dm-modal-body">
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                                CSV 格式：boreholeNo, topDepth, bottomDepth, lithologyCode, description
                            </p>
                            <div style={{ background: '#fefce8', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fef08a' }}>
                                <pre style={{ fontSize: '11px', color: '#475569', margin: 0, overflow: 'auto' }}>
                                    {`boreholeNo,topDepth,bottomDepth,lithologyCode,description
BH-001,0,2.5,SF,回填土
BH-001,2.5,8.0,SM,砂質粉土
BH-001,8.0,15.0,CL,低塑性黏土
BH-002,0,3.0,SF,回填土`}
                                </pre>
                            </div>
                            <input
                                ref={layerCsvInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleLayerCsvImport}
                                style={{ display: 'none' }}
                            />
                            <button
                                className="dm-btn dm-btn-primary"
                                style={{ width: '100%' }}
                                onClick={() => layerCsvInputRef.current?.click()}
                            >
                                選擇 CSV 檔案
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 物性資料 CSV 匯入 Modal */}
            {showPropertyCsvImport && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">批次匯入物性資料 CSV</h3>
                            <button onClick={() => setShowPropertyCsvImport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>✕</button>
                        </div>
                        <div className="dm-modal-body">
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                                CSV 格式：boreholeNo, depth, nValue, rqd
                            </p>
                            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #bbf7d0' }}>
                                <pre style={{ fontSize: '11px', color: '#475569', margin: 0, overflow: 'auto' }}>
                                    {`boreholeNo,depth,nValue,rqd
BH-001,1.5,5,
BH-001,4.5,12,
BH-001,10.0,,85
BH-002,2.0,8,`}
                                </pre>
                            </div>
                            <input
                                ref={propertyCsvInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handlePropertyCsvImport}
                                style={{ display: 'none' }}
                            />
                            <button
                                className="dm-btn dm-btn-primary"
                                style={{ width: '100%' }}
                                onClick={() => propertyCsvInputRef.current?.click()}
                            >
                                選擇 CSV 檔案
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 照片刪除確認 Modal */}
            {showDeletePhotoConfirm && (
                <div className="dm-modal-overlay" onClick={() => setShowDeletePhotoConfirm(null)}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">確認刪除照片</h3>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定要刪除此照片嗎？此操作無法復原。</p>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={() => setShowDeletePhotoConfirm(null)}>取消</button>
                            <button className="dm-btn dm-btn-primary" style={{ background: '#dc2626' }} onClick={() => handleDeletePhoto(showDeletePhotoConfirm)}>刪除</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default BoreholeUploadSection;
