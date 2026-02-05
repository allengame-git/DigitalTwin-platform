/**
 * ImagerySelector Component
 * @module components/controls/ImagerySelector
 * 
 * 航照圖選擇器 Modal
 * 權限：admin/engineer only
 */

import React, { useEffect } from 'react';
import { useUploadStore } from '../../stores/uploadStore';
import { useAuth } from '../../contexts/AuthContext';

interface ImagerySelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ImagerySelector({ isOpen, onClose }: ImagerySelectorProps) {
    const { user } = useAuth();
    const {
        imageryFiles,
        activeImageryId,
        fetchImageryFiles,
        setActiveImagery,
    } = useUploadStore();

    useEffect(() => {
        if (isOpen) {
            fetchImageryFiles();
        }
    }, [isOpen, fetchImageryFiles]);

    // 權限檢查
    const canAccess = user?.role === 'admin' || user?.role === 'engineer';
    if (!canAccess || !isOpen) return null;

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>選擇航照圖</h3>
                    <button onClick={onClose} style={closeButtonStyle}>✕</button>
                </div>

                <div style={contentStyle}>
                    {imageryFiles.length === 0 ? (
                        <div style={emptyStyle}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                            <div>尚無上傳的航照圖</div>
                            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                                請至「資料管理」頁面上傳
                            </div>
                        </div>
                    ) : (
                        <div style={gridStyle}>
                            {/* 無航照圖選項 */}
                            <div
                                style={{
                                    ...cardStyle,
                                    border: !activeImageryId ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                }}
                                onClick={() => {
                                    setActiveImagery(null);
                                    onClose();
                                }}
                            >
                                <div style={{
                                    height: 80,
                                    background: '#f3f4f6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 24,
                                }}>
                                    🚫
                                </div>
                                <div style={cardInfoStyle}>
                                    <div style={{ fontWeight: 500 }}>不使用航照圖</div>
                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>顯示預設底圖</div>
                                </div>
                            </div>

                            {/* 已上傳的航照圖 */}
                            {imageryFiles.map(file => (
                                <div
                                    key={file.id}
                                    style={{
                                        ...cardStyle,
                                        border: activeImageryId === file.id
                                            ? '2px solid #3b82f6'
                                            : '1px solid #e5e7eb',
                                    }}
                                    onClick={() => {
                                        setActiveImagery(file.id);
                                        onClose();
                                    }}
                                >
                                    <img
                                        src={file.thumbnailUrl}
                                        alt={file.name}
                                        style={thumbStyle}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.background = '#e5e7eb';
                                        }}
                                    />
                                    <div style={cardInfoStyle}>
                                        <div style={{
                                            fontWeight: 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {file.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#9ca3af' }}>
                                            <span style={{
                                                background: '#dbeafe',
                                                color: '#1e40af',
                                                padding: '1px 4px',
                                                borderRadius: 3,
                                                marginRight: 4,
                                            }}>
                                                {file.year}
                                            </span>
                                            {formatFileSize(file.size)}
                                        </div>
                                    </div>
                                    {activeImageryId === file.id && (
                                        <div style={activeTagStyle}>使用中</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Styles
const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
};

const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#6b7280',
    padding: 4,
};

const contentStyle: React.CSSProperties = {
    padding: 20,
    overflowY: 'auto',
    flex: 1,
};

const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: 40,
    color: '#6b7280',
};

const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
};

const cardStyle: React.CSSProperties = {
    borderRadius: 8,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
};

const thumbStyle: React.CSSProperties = {
    width: '100%',
    height: 80,
    objectFit: 'cover',
    background: '#f3f4f6',
};

const cardInfoStyle: React.CSSProperties = {
    padding: 8,
    fontSize: 13,
};

const activeTagStyle: React.CSSProperties = {
    position: 'absolute',
    top: 4,
    right: 4,
    background: '#3b82f6',
    color: 'white',
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
};

export default ImagerySelector;
