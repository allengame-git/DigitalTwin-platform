import { useState, useMemo } from 'react'
import { X, Edit3, Download, ExternalLink } from 'lucide-react'
import { useFacilityStore } from '@/stores/facilityStore'
import { RichTextView } from '@/components/common/RichTextView'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function resolveUrl(url: string) {
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
}

export default function FacilityInfoPanel() {
    const models = useFacilityStore(state => state.models)
    const selectedModelId = useFacilityStore(state => state.selectedModelId)
    const editMode = useFacilityStore(state => state.editMode)
    const selectModel = useFacilityStore(state => state.selectModel)
    const setEditingModel = useFacilityStore(state => state.setEditingModel)

    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

    const selectedModel = useMemo(
        () => models.find(m => m.id === selectedModelId) ?? null,
        [models, selectedModelId]
    )

    const diagrams = useMemo(() =>
        (selectedModel?.infos ?? []).filter(i => i.type === 'IMAGE' || i.type === 'DOCUMENT'),
        [selectedModel]
    )
    const customFields = useMemo(() =>
        (selectedModel?.infos ?? []).filter(i => i.type === 'TEXT' || i.type === 'LINK'),
        [selectedModel]
    )

    const hasContent = selectedModel && (
        selectedModel.introduction ||
        diagrams.length > 0 ||
        customFields.length > 0
    )

    if (!selectedModelId) return null

    return (
        <>
            {/* Lightbox */}
            {lightboxSrc && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => setLightboxSrc(null)}
                >
                    <img
                        src={lightboxSrc}
                        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Panel */}
            <div style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                width: 340,
                maxHeight: '60vh',
                background: '#fff',
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                zIndex: 40,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.08)',
            }}>
                {selectedModel && (
                    <>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {selectedModel.name}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {editMode && (
                                    <button
                                        onClick={() => setEditingModel(selectedModel.id)}
                                        style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}
                                    >
                                        <Edit3 size={12} /> 編輯
                                    </button>
                                )}
                                <button
                                    onClick={() => selectModel(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex' }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 14px' }}>
                            {!hasContent && (
                                <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>尚無資訊</p>
                            )}

                            {/* 設施介紹 */}
                            {selectedModel.introduction && (
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>設施介紹</div>
                                    <RichTextView html={selectedModel.introduction} />
                                </div>
                            )}

                            {/* 設施圖說 */}
                            {diagrams.length > 0 && (
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>設施圖說</div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {diagrams.map(d => (
                                            d.type === 'IMAGE' ? (
                                                <button key={d.id} onClick={() => setLightboxSrc(resolveUrl(d.content))} style={{ border: 'none', padding: 0, cursor: 'zoom-in', borderRadius: 6, overflow: 'hidden' }}>
                                                    <img src={resolveUrl(d.content)} alt={d.label} style={{ width: 72, height: 56, objectFit: 'cover', display: 'block' }} />
                                                </button>
                                            ) : (
                                                <a key={d.id} href={resolveUrl(d.content)} download style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#2563eb', textDecoration: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px' }}>
                                                    <Download size={12} />
                                                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                                                </a>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 自訂欄位 */}
                            {customFields.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>自訂欄位</div>
                                    {customFields.map(f => (
                                        <div key={f.id} style={{ marginBottom: 6 }}>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{f.label}</div>
                                            {f.type === 'LINK'
                                                ? <a href={f.content} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}><ExternalLink size={11} />{f.content}</a>
                                                : <div style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>{f.content}</div>
                                            }
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
