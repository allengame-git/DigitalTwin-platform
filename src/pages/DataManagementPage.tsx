/**
 * DataManagementPage
 * @module pages/DataManagementPage
 * 
 * 資料管理頁面 - 統一管理所有模組所需資料
 * 權限：admin/engineer only
 */

import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    useUploadStore,
    UploadedFile,
    ImageryMetadata,
    GeophysicsFile,
    GeophysicsMetadata,
    GeologyModelFile,
    GeologyModelMetadata
} from '../stores/uploadStore';

export const DataManagementPage: React.FC = () => {
    const { user } = useAuth();
    const {
        imageryFiles,
        geophysicsFiles,
        geologyModels,
        isUploading,
        uploadError,
        fetchImageryFiles,
        fetchGeophysicsFiles,
        fetchGeologyModels,
        uploadImagery,
        uploadGeophysics,
        uploadGeologyModel,
        deleteImagery,
        deleteGeophysics,
        deleteGeologyModel,
        activateGeologyModel,
        pollGeologyModelStatus,
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
        fetchGeophysicsFiles();
        fetchGeologyModels();
    }, [fetchImageryFiles, fetchGeophysicsFiles, fetchGeologyModels]);

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
        cellSizeX: '',
        cellSizeY: '',
        cellSizeZ: '',
    });
    const [geoModelFormErrors, setGeoModelFormErrors] = useState<Record<string, string>>({});
    const geoModelInputRef = useRef<HTMLInputElement>(null);
    const [showGeoModelDeleteConfirm, setShowGeoModelDeleteConfirm] = useState(false);
    const [geoModelToDelete, setGeoModelToDelete] = useState<string | null>(null);

    // --- Upload Handlers ---
    const handleFileSelect = (file: File) => {
        const allowedExts = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

        if (!allowedExts.includes(ext)) {
            alert('不支援的檔案格式。只接受 JPG, PNG, TIF');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            alert('檔案大小超過 50MB 限制');
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

        if (!uploadError) {
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

    // --- Geophysics Handlers ---
    const handleGeoFileSelect = (file: File) => {
        const allowedExts = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!allowedExts.includes(ext)) {
            alert('不支援的檔案格式。只接受 JPG, PNG, TIF');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            alert('檔案大小超過 50MB 限制');
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

    // ===============================
    // 3D 地質模型 Handlers
    // ===============================
    const handleGeoModelFileSelect = (file: File) => {
        const allowedExts = ['.csv', '.json'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!allowedExts.includes(ext)) {
            alert('不支援的檔案格式。只接受 CSV 或 JSON');
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            alert('檔案大小超過 100MB 限制');
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
        await uploadGeologyModel(geoModelFile, geoModelFormData);
        if (!uploadError) {
            setShowGeoModelForm(false);
            setGeoModelFile(null);
            setGeoModelFormData({
                version: '',
                year: new Date().getFullYear(),
                name: '',
                description: '',
                sourceData: '',
                cellSizeX: '',
                cellSizeY: '',
                cellSizeZ: '',
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
        <div className="data-management-page">
            <style>{`
                /* ... (existing styles) ... */
                @keyframes progress-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .dm-progress-container {
                    width: 100%;
                    height: 4px;
                    background: #f1f5f9;
                    border-radius: 2px;
                    overflow: hidden;
                    margin-top: 10px;
                }
                .dm-progress-bar {
                    height: 100%;
                    background: #3b82f6;
                    border-radius: 2px;
                    transition: width 0.3s ease-out;
                }
                .dm-progress-shimmer {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.4) 50%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    animation: progress-shimmer 1.5s infinite linear;
                }
                .data-management-page {
                    min-height: 100vh;
                    background: #f8fafc;
                }
                .dm-header {
                    background: white;
                    border-bottom: 1px solid #e2e8f0;
                    padding: 16px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .dm-header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .dm-back-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: #f1f5f9;
                    border: none;
                    border-radius: 6px;
                    color: #475569;
                    font-size: 14px;
                    cursor: pointer;
                    text-decoration: none;
                }
                .dm-back-btn:hover {
                    background: #e2e8f0;
                }
                .dm-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #0f172a;
                }
                .dm-content {
                    padding: 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .dm-section {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 24px;
                    border: 1px solid #e2e8f0;
                }
                .dm-section-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .dm-section-icon {
                    width: 40px;
                    height: 40px;
                    background: #dbeafe;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }
                .dm-section-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #0f172a;
                }
                .dm-section-desc {
                    font-size: 14px;
                    color: #64748b;
                }
                .dm-upload-zone {
                    border: 2px dashed #d1d5db;
                    border-radius: 12px;
                    padding: 40px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-bottom: 24px;
                }
                .dm-upload-zone:hover,
                .dm-upload-zone.dragging {
                    border-color: #3b82f6;
                    background: rgba(59,130,246,0.05);
                }
                .dm-upload-icon {
                    font-size: 48px;
                    margin-bottom: 12px;
                }
                .dm-upload-text {
                    font-size: 16px;
                    color: #374151;
                    margin-bottom: 8px;
                }
                .dm-upload-hint {
                    font-size: 14px;
                    color: #9ca3af;
                }
                .dm-error {
                    background: #fef2f2;
                    color: #dc2626;
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .dm-file-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 16px;
                }
                .dm-file-card {
                    background: #f8fafc;
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    transition: all 0.2s;
                }
                .dm-file-card:hover {
                    border-color: #cbd5e1;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }
                .dm-file-thumb {
                    width: 100%;
                    height: 140px;
                    object-fit: cover;
                    background: #e2e8f0;
                }
                .dm-file-info {
                    padding: 12px;
                }
                .dm-file-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: #0f172a;
                    margin-bottom: 4px;
                }
                .dm-file-meta {
                    font-size: 12px;
                    color: #64748b;
                    margin-bottom: 4px;
                }
                .dm-file-year {
                    display: inline-block;
                    background: #dbeafe;
                    color: #1e40af;
                    font-size: 11px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    margin-right: 6px;
                }
                .dm-file-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                }
                .dm-file-btn {
                    flex: 1;
                    padding: 6px 12px;
                    border: none;
                    border-radius: 6px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .dm-file-btn-delete {
                    background: #fef2f2;
                    color: #dc2626;
                }
                .dm-file-btn-delete:hover {
                    background: #fee2e2;
                }
                .dm-empty {
                    text-align: center;
                    padding: 40px;
                    color: #9ca3af;
                }
                .dm-coming-soon {
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 40px;
                    text-align: center;
                    color: #9ca3af;
                }
                /* Upload Form Modal */
                .dm-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .dm-modal {
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
                .dm-modal-delete {
                    max-width: 400px;
                    height: auto;
                }
                .dm-modal-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }
                .dm-modal-title {
                    font-size: 16px;
                    font-weight: 600;
                }
                .dm-modal-body {
                    padding: 20px;
                    overflow-y: auto;
                }
                .dm-form-group {
                    margin-bottom: 16px;
                }
                .dm-form-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 6px;
                }
                .dm-form-label .required {
                    color: #dc2626;
                }
                .dm-form-input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 14px;
                    box-sizing: border-box;
                }
                .dm-form-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
                }
                .dm-form-input.error {
                    border-color: #dc2626;
                }
                .dm-form-error {
                    color: #dc2626;
                    font-size: 12px;
                    margin-top: 4px;
                }
                .dm-form-textarea {
                    resize: vertical;
                    min-height: 80px;
                }
                .dm-form-row {
                    display: flex;
                    gap: 12px;
                }
                .dm-form-col {
                    flex: 1;
                }
                .dm-modal-footer {
                    padding: 16px 20px;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    flex-shrink: 0;
                }
                .dm-btn {
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .dm-btn-primary {
                    background: #3b82f6;
                    color: white;
                    border: none;
                }
                .dm-btn-primary:hover {
                    background: #2563eb;
                }
                .dm-btn-primary:disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                }
                .dm-btn-danger {
                    background: #dc2626;
                    color: white;
                    border: none;
                }
                .dm-btn-danger:hover {
                    background: #b91c1c;
                }
                .dm-btn-secondary {
                    background: white;
                    color: #374151;
                    border: 1px solid #d1d5db;
                }
                .dm-btn-secondary:hover {
                    background: #f9fafb;
                }
                .dm-file-preview {
                    background: #f3f4f6;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .dm-file-preview-icon {
                    font-size: 24px;
                }
                .dm-file-preview-name {
                    font-weight: 500;
                    font-size: 14px;
                }
                .dm-file-preview-size {
                    font-size: 12px;
                    color: #6b7280;
                }
                .dm-advanced-toggle {
                    width: 100%;
                    text-align: left;
                    background: white;
                    border: 1px solid #e2e8f0;
                    padding: 10px 12px;
                    border-radius: 8px;
                    color: #374151;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                .dm-advanced-toggle:hover {
                    background: #f8fafc;
                }
                .dm-coords-hint {
                    font-size: 12px;
                    color: #64748b;
                    margin-bottom: 12px;
                    background: #f0f9ff;
                    padding: 8px;
                    border-radius: 6px;
                    border: 1px solid #e0f2fe;
                }
                .dm-coords-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: #f0fdf4;
                    color: #166534;
                    border: 1px solid #dcfce7;
                    margin-left: 6px;
                }
            `}</style>

            {/* Same header... */}
            <header className="dm-header">
                <div className="dm-header-left">
                    <Link to="/" className="dm-back-btn">
                        ← 返回首頁
                    </Link>
                    <h1 className="dm-title">資料管理</h1>
                </div>
                <div>
                    <span style={{ marginRight: 12, color: '#64748b' }}>
                        {user?.name}
                    </span>
                </div>
            </header>

            <main className="dm-content">
                {/* 航照圖管理 */}
                <section className="dm-section">
                    <div className="dm-section-header">
                        <div className="dm-section-icon">📷</div>
                        <div>
                            <h2 className="dm-section-title">航照圖管理</h2>
                            <p className="dm-section-desc">上傳與管理航照底圖，支援 JPG、PNG、TIF 格式</p>
                        </div>
                    </div>

                    {/* 上傳區域 (Same...) */}
                    <div
                        className={`dm-upload-zone ${isDragging ? 'dragging' : ''}`}
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
                        <div className="dm-upload-icon">📁</div>
                        <div className="dm-upload-text">拖放檔案或點擊選擇</div>
                        <div className="dm-upload-hint">支援 JPG, PNG, TIF (最大 50MB)</div>
                    </div>

                    {/* 錯誤訊息 */}
                    {uploadError && (
                        <div className="dm-error">
                            <span>{uploadError}</span>
                            <button onClick={clearError} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
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
                                            {file.minX && <span className="dm-coords-status">📍 已定位</span>}
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
                        <div className="dm-empty">尚無上傳的航照圖</div>
                    )}
                </section>

                {/* Other sections... */}
                <section className="dm-section">
                    <div className="dm-section-header">
                        <div className="dm-section-icon" style={{ background: '#dcfce7' }}>⛰️</div>
                        <div>
                            <h2 className="dm-section-title">DEM 地形資料</h2>
                            <p className="dm-section-desc">高程模型資料管理</p>
                        </div>
                    </div>
                    <div className="dm-coming-soon">🚧 功能開發中</div>
                </section>

                <section className="dm-section">
                    <div className="dm-section-header">
                        <div className="dm-section-icon" style={{ background: '#fef3c7' }}>⚫</div>
                        <div>
                            <h2 className="dm-section-title">鑽孔資料</h2>
                            <p className="dm-section-desc">鑽孔位置與岩性資料管理</p>
                        </div>
                    </div>
                    <div className="dm-coming-soon">🚧 功能開發中</div>
                </section>

                {/* 3D 地質模型 */}
                <section className="dm-section">
                    <div className="dm-section-header">
                        <div className="dm-section-icon" style={{ background: '#dcfce7' }}>🧊</div>
                        <div>
                            <h2 className="dm-section-title">3D 地質模型</h2>
                            <p className="dm-section-desc">Voxel 地質模型版本管理 (CSV 格式: x,y,z,lith_id)</p>
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
                            accept=".csv,.json"
                            onChange={handleGeoModelInputChange}
                        />
                        <div className="dm-upload-icon">📤</div>
                        <div className="dm-upload-text">
                            拖曳或點擊上傳 Voxel 資料
                        </div>
                        <div className="dm-upload-hint">
                            支援 CSV 或 JSON 格式，最大 100MB
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
                                        border: model.isActive ? '2px solid #22c55e' : '1px solid #e2e8f0',
                                        background: model.isActive ? '#f0fdf4' : 'white',
                                    }}
                                >
                                    <div className="dm-file-info" style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="dm-file-name">{model.name}</span>
                                            <span style={{ fontSize: '11px', color: '#6b7280', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>v{model.version}</span>
                                            {getStatusBadge(model.conversionStatus)}
                                            {model.isActive && <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>● 使用中</span>}
                                        </div>
                                        <div className="dm-file-meta" style={{ marginTop: '4px' }}>
                                            {model.year}年 · {formatFileSize(model.size)}
                                            {model.sourceData && ` · ${model.sourceData}`}
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
                                                        style={{ width: `${Math.max(5, model.conversionProgress)}%` }}
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
                                            className="dm-btn dm-btn-secondary"
                                            style={{ fontSize: '12px', padding: '4px 8px', color: '#dc2626' }}
                                            onClick={() => handleGeoModelDeleteClick(model.id)}
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* 地球物理探查資料 */}
                <section className="dm-section">
                    <div className="dm-section-header">
                        <div className="dm-section-icon" style={{ background: '#e0e7ff' }}>📡</div>
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
                        <div className="dm-upload-icon">📊</div>
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
                        <div className="dm-empty">尚無上傳的探查資料</div>
                    )}
                </section>
            </main>

            {/* 上傳表單 Modal */}
            {showUploadForm && selectedFile && (
                <div className="dm-modal-overlay" onClick={handleCancelUpload}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">上傳航照圖</h3>
                            <button
                                onClick={handleCancelUpload}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="dm-modal-body">
                            {/* ... upload form content specific ... */}
                            <div className="dm-file-preview">
                                <span className="dm-file-preview-icon">📄</span>
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
                                    className={`dm-form-input ${formErrors.year ? 'error' : ''}`}
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
                                    className={`dm-form-input ${formErrors.name ? 'error' : ''}`}
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
                                <span>{showAdvanced ? '▲' : '▼'}</span>
                            </button>

                            {showAdvanced && (
                                <div className="dm-advanced-section">
                                    <div className="dm-coords-hint">💡 若上傳GeoTIFF檔，系統將嘗試自動解析。您也可手動輸入本地座標。</div>
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
                            <button className="dm-btn dm-btn-secondary" onClick={handleCancelUpload}>取消</button>
                            <button className="dm-btn dm-btn-primary" onClick={handleSubmit} disabled={isUploading}>{isUploading ? '上傳中...' : '上傳'}</button>
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
                            <button onClick={cancelDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>✕</button>
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
                            <button onClick={handleCloseDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>✕</button>
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

            {/* 地球物理探查上傳表單 Modal */}
            {showGeoForm && geoFile && (
                <div className="dm-modal-overlay" onClick={handleCancelGeoUpload}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">上傳地球物理探查資料</h3>
                            <button onClick={handleCancelGeoUpload} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>✕</button>
                        </div>
                        <div className="dm-modal-body">
                            <div className="dm-file-preview">
                                <span className="dm-file-preview-icon">📊</span>
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
                            <button className="dm-btn dm-btn-secondary" onClick={handleCancelGeoUpload}>取消</button>
                            <button className="dm-btn dm-btn-primary" onClick={handleGeoSubmit} disabled={isUploading}>
                                {isUploading ? '上傳中...' : '上傳'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 地球物理探查刪除確認 Modal */}
            {showGeoDeleteConfirm && (
                <div className="dm-modal-overlay" onClick={() => setShowGeoDeleteConfirm(false)}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">確認刪除</h3>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定要刪除此探查資料嗎？此操作無法復原。</p>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={() => setShowGeoDeleteConfirm(false)}>取消</button>
                            <button className="dm-btn dm-btn-primary" style={{ background: '#dc2626' }} onClick={confirmGeoDelete}>刪除</button>
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
                            <button onClick={() => setShowGeoDetail(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>✕</button>
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
                            <button className="dm-btn dm-btn-primary" onClick={() => setShowGeoDetail(false)}>關閉</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3D 地質模型上傳表單 Modal */}
            {showGeoModelForm && geoModelFile && (
                <div className="dm-modal-overlay" onClick={handleCancelGeoModelUpload}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">上傳 3D 地質模型</h3>
                        </div>
                        <div className="dm-modal-body">
                            <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '16px' }}>
                                <div style={{ fontSize: 13, color: '#64748b' }}>已選擇檔案</div>
                                <div style={{ fontWeight: 500, color: '#1f2937' }}>{geoModelFile.name}</div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{formatFileSize(geoModelFile.size)}</div>
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

                            {/* 網格解析度 (選填) */}
                            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                <label className="dm-form-label" style={{ marginBottom: '8px', display: 'block' }}>網格解析度 (選填)</label>
                                <div className="dm-form-row">
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" placeholder="X (m)" value={geoModelFormData.cellSizeX || ''} onChange={e => setGeoModelFormData({ ...geoModelFormData, cellSizeX: e.target.value })} />
                                    </div>
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" placeholder="Y (m)" value={geoModelFormData.cellSizeY || ''} onChange={e => setGeoModelFormData({ ...geoModelFormData, cellSizeY: e.target.value })} />
                                    </div>
                                    <div className="dm-form-group">
                                        <input type="text" className="dm-form-input" placeholder="Z (m)" value={geoModelFormData.cellSizeZ || ''} onChange={e => setGeoModelFormData({ ...geoModelFormData, cellSizeZ: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={handleCancelGeoModelUpload}>取消</button>
                            <button className="dm-btn dm-btn-primary" onClick={handleGeoModelSubmit} disabled={isUploading}>
                                {isUploading ? '上傳中...' : '上傳'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3D 地質模型刪除確認 Modal */}
            {showGeoModelDeleteConfirm && (
                <div className="dm-modal-overlay" onClick={() => setShowGeoModelDeleteConfirm(false)}>
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">確認刪除</h3>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定要刪除此地質模型嗎？此操作無法復原。</p>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={() => setShowGeoModelDeleteConfirm(false)}>取消</button>
                            <button className="dm-btn dm-btn-primary" style={{ background: '#dc2626' }} onClick={confirmGeoModelDelete}>刪除</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataManagementPage;
