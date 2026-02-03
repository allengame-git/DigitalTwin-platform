/**
 * 岩芯照片展示
 * @module components/overlay/PhotoGallery
 */

import React, { useState } from 'react';
import type { Photo } from '../../types/geology';

interface PhotoGalleryProps {
    photos: Photo[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

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
                            src={photo.thumbnailUrl || photo.url}
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
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        cursor: 'pointer',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            background: 'white',
                            borderRadius: '8px',
                            overflow: 'hidden',
                        }}
                    >
                        <img
                            src={selectedPhoto.url}
                            alt={selectedPhoto.caption || `深度 ${selectedPhoto.depth}m`}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '80vh',
                                display: 'block',
                            }}
                        />
                        <div style={{ padding: '12px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>
                                深度: {selectedPhoto.depth.toFixed(1)}m
                            </p>
                            {selectedPhoto.caption && (
                                <p style={{ margin: '8px 0 0', color: '#666' }}>
                                    {selectedPhoto.caption}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PhotoGallery;
