/**
 * 岩芯照片展示
 * @module components/overlay/PhotoGallery
 */

import React, { useState } from 'react';
import type { Photo } from '../../types/geology';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PhotoGalleryProps {
    photos: Photo[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

    // Zoom & Pan state
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Reset state when selected photo changes
    React.useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, [selectedPhoto]);

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = e.deltaY * -0.01;
        const newScale = Math.min(Math.max(1, scale + delta), 5);
        setScale(newScale);
        if (newScale === 1) setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            e.preventDefault();
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const zoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.5, 5));
    };

    const zoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newScale = Math.max(1, scale - 0.5);
        setScale(newScale);
        if (newScale === 1) setPosition({ x: 0, y: 0 });
    };

    const resetZoom = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    if (photos.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
                <p>暫無岩芯照片</p>
                <p style={{ fontSize: '12px' }}>實際資料將顯示於此處</p>
            </div>
        );
    }

    return (
        <div>
            {/* 照片網格 */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                }}
            >
                {photos.map((photo) => (
                    <div
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo)}
                        style={{
                            position: 'relative',
                            aspectRatio: '1',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: '2px solid transparent',
                            transition: 'border-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#4a90d9';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent';
                        }}
                    >
                        <img
                            src={`${API_BASE}${photo.thumbnailUrl || photo.url}`}
                            alt={photo.caption || `深度 ${photo.depth}m`}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                            onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23eee" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23999" font-size="12">無圖</text></svg>';
                            }}
                        />
                        {/* 深度標籤 */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '0',
                                left: '0',
                                right: '0',
                                background: 'rgba(0,0,0,0.6)',
                                color: 'white',
                                padding: '4px',
                                fontSize: '11px',
                                textAlign: 'center',
                            }}
                        >
                            {photo.depth.toFixed(1)}m
                        </div>
                    </div>
                ))}
            </div>

            {/* 照片預覽 Modal */}
            {selectedPhoto && (
                <div
                    onClick={() => setSelectedPhoto(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.9)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        cursor: 'default',
                    }}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* 控制列 */}
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            display: 'flex',
                            gap: '8px',
                            zIndex: 1010,
                        }}
                    >
                        <button onClick={zoomOut} style={btnStyle}>-</button>
                        <button onClick={resetZoom} style={btnStyle}>{Math.round(scale * 100)}%</button>
                        <button onClick={zoomIn} style={btnStyle}>+</button>
                        <button onClick={() => setSelectedPhoto(null)} style={{ ...btnStyle, background: '#ef4444', border: 'none' }}>✕</button>
                    </div>

                    <div
                        onClick={(e) => e.stopPropagation()}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                        }}
                    >
                        <img
                            src={`${API_BASE}${selectedPhoto.url}`}
                            alt={selectedPhoto.caption || `深度 ${selectedPhoto.depth}m`}
                            draggable={false}
                            style={{
                                maxWidth: '90vw',
                                maxHeight: '85vh',
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                transition: isDragging ? 'none' : 'transform 0.1s',
                                userSelect: 'none',
                            }}
                        />
                    </div>

                    {/* 底部資訊 */}
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            bottom: '20px',
                            background: 'rgba(0,0,0,0.6)',
                            padding: '12px 24px',
                            borderRadius: '24px',
                            color: 'white',
                            textAlign: 'center',
                            pointerEvents: 'none',
                        }}
                    >
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '16px' }}>
                            深度: {selectedPhoto.depth.toFixed(1)}m
                        </p>
                        {selectedPhoto.caption && (
                            <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9 }}>
                                {selectedPhoto.caption}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const btnStyle = {
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    color: 'white',
    width: '40px',
    height: '40px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    backdropFilter: 'blur(4px)',
};


export default PhotoGallery;
