/**
 * ReviewMarkerForm — Modal for creating a new review marker
 * Shows screenshot preview, title/description/priority inputs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useReviewStore } from '../../stores/reviewStore';
import type { MarkerPriority } from '../../types/review';

interface ReviewMarkerFormProps {
    screenshotBlob: Blob | null;
    position: { x: number; y: number; z: number };
    cameraPosition: { x: number; y: number; z: number };
    cameraTarget: { x: number; y: number; z: number };
    moduleId: string;
    sessionId: string;
    onClose: () => void;
    onCreated: () => void;
}

const PRIORITY_OPTIONS: { value: MarkerPriority; label: string; color: string }[] = [
    { value: 'low', label: '低', color: '#22c55e' },
    { value: 'medium', label: '中', color: '#eab308' },
    { value: 'high', label: '高', color: '#ef4444' },
];

export function ReviewMarkerForm({
    screenshotBlob,
    position,
    cameraPosition,
    cameraTarget,
    moduleId,
    sessionId,
    onClose,
    onCreated,
}: ReviewMarkerFormProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<MarkerPriority>('medium');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const createMarker = useReviewStore((s) => s.createMarker);

    useEffect(() => {
        if (screenshotBlob) {
            const url = URL.createObjectURL(screenshotBlob);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [screenshotBlob]);

    const handleSubmit = useCallback(async () => {
        if (!title.trim() || submitting) return;
        setSubmitting(true);
        const result = await createMarker(
            sessionId,
            {
                moduleId,
                title: title.trim(),
                description: description.trim() || undefined,
                priority,
                positionX: position.x,
                positionY: position.y,
                positionZ: position.z,
                cameraPositionX: cameraPosition.x,
                cameraPositionY: cameraPosition.y,
                cameraPositionZ: cameraPosition.z,
                cameraTargetX: cameraTarget.x,
                cameraTargetY: cameraTarget.y,
                cameraTargetZ: cameraTarget.z,
            },
            screenshotBlob ?? undefined,
        );
        setSubmitting(false);
        if (result) {
            onCreated();
        }
    }, [
        title, description, priority, position, cameraPosition, cameraTarget,
        moduleId, sessionId, screenshotBlob, submitting, createMarker, onCreated,
    ]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
            onKeyDown={handleKeyDown}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    width: 480,
                    maxWidth: '90vw',
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111' }}>
                        新增審查標記
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: 4, color: '#6b7280', fontSize: 18, lineHeight: 1,
                        }}
                    >
                        x
                    </button>
                </div>

                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Screenshot preview */}
                    {previewUrl && (
                        <div style={{
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: '1px solid #e5e7eb',
                        }}>
                            <img
                                src={previewUrl}
                                alt="截圖預覽"
                                style={{ width: '100%', display: 'block' }}
                            />
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                            標題 <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="簡述問題或意見..."
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: 14,
                                border: '1px solid #d1d5db',
                                borderRadius: 6,
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#ea580c')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                            描述
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="詳細說明（選填）..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: 14,
                                border: '1px solid #d1d5db',
                                borderRadius: 6,
                                outline: 'none',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#ea580c')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                        />
                    </div>

                    {/* Priority */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                            優先程度
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {PRIORITY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setPriority(opt.value)}
                                    style={{
                                        flex: 1,
                                        padding: '6px 0',
                                        fontSize: 13,
                                        fontWeight: priority === opt.value ? 700 : 500,
                                        border: priority === opt.value
                                            ? `2px solid ${opt.color}`
                                            : '1px solid #d1d5db',
                                        borderRadius: 6,
                                        background: priority === opt.value
                                            ? `${opt.color}18`
                                            : '#f9fafb',
                                        color: priority === opt.value ? opt.color : '#6b7280',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 20px 16px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    borderTop: '1px solid #f3f4f6',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: 500,
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                            background: '#fff',
                            color: '#374151',
                            cursor: 'pointer',
                        }}
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim() || submitting}
                        style={{
                            padding: '8px 20px',
                            fontSize: 13,
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: 6,
                            background: !title.trim() || submitting ? '#d1d5db' : '#ea580c',
                            color: '#fff',
                            cursor: !title.trim() || submitting ? 'not-allowed' : 'pointer',
                            transition: 'background 0.15s',
                        }}
                    >
                        {submitting ? '建立中...' : '建立標記'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ReviewMarkerForm;
