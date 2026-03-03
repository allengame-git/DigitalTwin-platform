/**
 * FacilityUploadSection
 * @module components/data/FacilityUploadSection
 *
 * 設施導覽模組的資料管理上傳區塊
 * 包含：場景管理 / 模型上傳 / 模型資訊編輯 / 場景地形
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { useFacilityStore } from '../../stores/facilityStore';
import type { FacilityScene } from '../../types/facility';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
    const token = useAuthStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface RichContentItem {
    id: string;
    type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'LINK';
    label: string;
    content?: string;
    fileUrl?: string;
    createdAt: string;
}

interface FacilityModelItem {
    id: string;
    name: string;
    sceneId: string;
    childSceneId?: string | null;
    glbUrl?: string;
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SceneSelect({
    scenes,
    value,
    onChange,
    placeholder = '選擇場景',
}: {
    scenes: FacilityScene[];
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <select
            className="dm-form-input"
            value={value}
            onChange={e => onChange(e.target.value)}
        >
            <option value="">{placeholder}</option>
            {scenes.map(s => (
                <option key={s.id} value={s.id}>
                    {s.parentSceneId ? '　└ ' : ''}{s.name}
                </option>
            ))}
        </select>
    );
}

// ─── Tab 1: SceneManager ─────────────────────────────────────────────────────

const SceneManager: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { scenes, fetchScenes, createScene, updateScene, deleteScene } = useFacilityStore();

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [planUploadSceneId, setPlanUploadSceneId] = useState<string | null>(null);
    const planInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({ name: '', description: '', parentSceneId: '' });
    const [editForm, setEditForm] = useState({ name: '', description: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isPlanUploading, setIsPlanUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (projectId) fetchScenes(projectId);
    }, [projectId, fetchScenes]);

    const rootScenes = scenes.filter(s => !s.parentSceneId);
    const childScenes = scenes.filter(s => !!s.parentSceneId);

    const handleAddScene = async () => {
        if (!form.name.trim()) { setError('場景名稱為必填'); return; }
        setIsSaving(true);
        setError(null);
        try {
            await createScene({
                projectId,
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                parentSceneId: form.parentSceneId || undefined,
            });
            setForm({ name: '', description: '', parentSceneId: '' });
            setShowAddForm(false);
        } catch (e: any) {
            setError(e?.response?.data?.error || '新增失敗');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditSave = async (id: string) => {
        if (!editForm.name.trim()) { setError('場景名稱為必填'); return; }
        setIsSaving(true);
        setError(null);
        try {
            await updateScene(id, { name: editForm.name.trim(), description: editForm.description.trim() });
            setEditingId(null);
        } catch (e: any) {
            setError(e?.response?.data?.error || '更新失敗');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteScene(id);
            setDeleteConfirmId(null);
        } catch (e: any) {
            setError(e?.response?.data?.error || '刪除失敗');
        }
    };

    const handlePlanUpload = async (file: File, sceneId: string) => {
        setIsPlanUploading(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await axios.post(`${API_BASE}/api/facility/scenes/${sceneId}/plan-image`, fd, {
                headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
                withCredentials: true,
            });
            await fetchScenes(projectId);
        } catch (e: any) {
            setError(e?.response?.data?.error || '平面圖上傳失敗');
        } finally {
            setIsPlanUploading(false);
            setPlanUploadSceneId(null);
        }
    };

    const renderScene = (scene: FacilityScene, indent = false) => (
        <div
            key={scene.id}
            className="dm-file-card"
            style={{ marginLeft: indent ? 20 : 0, borderLeft: indent ? '2px solid #e2e8f0' : undefined }}
        >
            {editingId === scene.id ? (
                <div style={{ flex: 1 }}>
                    <div className="dm-form-group" style={{ marginBottom: 6 }}>
                        <input
                            className="dm-form-input"
                            value={editForm.name}
                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="場景名稱"
                        />
                    </div>
                    <div className="dm-form-group" style={{ marginBottom: 6 }}>
                        <input
                            className="dm-form-input"
                            value={editForm.description}
                            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="描述（可選）"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="dm-btn-confirm" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleEditSave(scene.id)} disabled={isSaving}>儲存</button>
                        <button className="dm-btn-cancel" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setEditingId(null)}>取消</button>
                    </div>
                </div>
            ) : (
                <div className="dm-file-info" style={{ flex: 1 }}>
                    <div className="dm-file-name">{scene.name}</div>
                    {scene.description && <div className="dm-file-meta">{scene.description}</div>}
                    <div className="dm-file-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                        <button
                            className="dm-file-btn"
                            onClick={() => { setEditingId(scene.id); setEditForm({ name: scene.name, description: scene.description || '' }); }}
                        >編輯</button>
                        <button
                            className="dm-file-btn"
                            onClick={() => { setPlanUploadSceneId(scene.id); planInputRef.current?.click(); }}
                            disabled={isPlanUploading}
                        >上傳平面圖</button>
                        <button
                            className="dm-file-btn dm-file-btn-delete"
                            onClick={() => setDeleteConfirmId(scene.id)}
                        >刪除</button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div>
            {error && <div className="dm-error" style={{ marginBottom: 8 }}>{error}</div>}

            {/* Scene list */}
            <div className="dm-file-list">
                {rootScenes.map(s => (
                    <React.Fragment key={s.id}>
                        {renderScene(s, false)}
                        {childScenes.filter(c => c.parentSceneId === s.id).map(c => renderScene(c, true))}
                    </React.Fragment>
                ))}
                {scenes.length === 0 && <div className="dm-empty">尚無場景，請新增</div>}
            </div>

            {/* Add form */}
            {showAddForm ? (
                <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div className="dm-form-group">
                        <label className="dm-form-label">場景名稱 *</label>
                        <input
                            className="dm-form-input"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="例：地面層、B1 層"
                        />
                    </div>
                    <div className="dm-form-group">
                        <label className="dm-form-label">描述（可選）</label>
                        <input
                            className="dm-form-input"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        />
                    </div>
                    <div className="dm-form-group">
                        <label className="dm-form-label">父場景（可選）</label>
                        <SceneSelect scenes={scenes} value={form.parentSceneId} onChange={v => setForm(f => ({ ...f, parentSceneId: v }))} placeholder="（無，作為根場景）" />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="dm-btn-confirm" onClick={handleAddScene} disabled={isSaving}>{isSaving ? '儲存中...' : '新增場景'}</button>
                        <button className="dm-btn-cancel" onClick={() => { setShowAddForm(false); setError(null); }}>取消</button>
                    </div>
                </div>
            ) : (
                <button
                    className="dm-btn-confirm"
                    style={{ marginTop: 12 }}
                    onClick={() => setShowAddForm(true)}
                >
                    + 新增場景
                </button>
            )}

            {/* Hidden file input for plan image */}
            <input
                ref={planInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={e => {
                    const f = e.target.files?.[0];
                    if (f && planUploadSceneId) handlePlanUpload(f, planUploadSceneId);
                    e.target.value = '';
                }}
            />

            {/* Delete confirm modal */}
            {deleteConfirmId && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal dm-modal-delete">
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">確認刪除場景</h3>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定刪除此場景？子場景與相關模型資料將一併移除，此操作無法復原。</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                                <button className="dm-btn-cancel" onClick={() => setDeleteConfirmId(null)}>取消</button>
                                <button style={{ background: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }} onClick={() => handleDelete(deleteConfirmId)}>確認刪除</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Tab 2: ModelUploader ─────────────────────────────────────────────────────

const ModelUploader: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { scenes, fetchScenes } = useFacilityStore();

    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [sceneId, setSceneId] = useState('');
    const [modelName, setModelName] = useState('');
    const [childSceneId, setChildSceneId] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (projectId) fetchScenes(projectId);
    }, [projectId, fetchScenes]);

    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

    const handleFile = (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['glb', 'gltf'].includes(ext || '')) {
            setError('僅支援 .glb / .gltf 格式');
            return;
        }
        if (file.size > MAX_SIZE) {
            setError('檔案大小不得超過 100MB');
            return;
        }
        setSelectedFile(file);
        setModelName(file.name.replace(/\.(glb|gltf)$/i, ''));
        setError(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const handleSubmit = async () => {
        if (!selectedFile || !sceneId || !modelName.trim()) {
            setError('請選擇場景、填寫模型名稱並選取檔案');
            return;
        }
        setIsUploading(true);
        setError(null);
        setSuccess(null);
        setUploadProgress(0);

        try {
            const fd = new FormData();
            fd.append('file', selectedFile);
            fd.append('name', modelName.trim());
            fd.append('sceneId', sceneId);
            if (childSceneId) fd.append('childSceneId', childSceneId);

            await axios.post(`${API_BASE}/api/facility/models`, fd, {
                headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
                withCredentials: true,
                onUploadProgress: (e) => {
                    if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
                },
            });

            setSuccess('模型上傳成功');
            setSelectedFile(null);
            setModelName('');
            setChildSceneId('');
            setUploadProgress(0);
        } catch (e: any) {
            setError(e?.response?.data?.error || '上傳失敗');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            {error && <div className="dm-error" style={{ marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ color: '#16a34a', background: '#f0fdf4', padding: '8px 12px', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>{success}</div>}

            {/* Scene selector */}
            <div className="dm-form-group">
                <label className="dm-form-label">目標場景 *</label>
                <SceneSelect scenes={scenes} value={sceneId} onChange={setSceneId} />
            </div>

            {/* Drop zone */}
            <div
                className={`dm-upload-zone${isDragging ? ' dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".glb,.gltf"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                />
                <div className="dm-upload-icon">⬆️</div>
                {selectedFile ? (
                    <div className="dm-upload-text" style={{ color: '#2563eb' }}>{selectedFile.name}</div>
                ) : (
                    <>
                        <div className="dm-upload-text">拖曳或點擊上傳 3D 模型</div>
                        <div className="dm-upload-hint">支援 .glb / .gltf，最大 100MB</div>
                    </>
                )}
            </div>

            {/* Model name */}
            <div className="dm-form-group" style={{ marginTop: 12 }}>
                <label className="dm-form-label">模型名稱 *</label>
                <input
                    className="dm-form-input"
                    value={modelName}
                    onChange={e => setModelName(e.target.value)}
                    placeholder="例：廠區主建築"
                />
            </div>

            {/* Child scene link */}
            <div className="dm-form-group">
                <label className="dm-form-label">點擊進入的子場景（可選）</label>
                <SceneSelect scenes={scenes} value={childSceneId} onChange={setChildSceneId} placeholder="（無）" />
            </div>

            {/* Progress */}
            {isUploading && (
                <div className="dm-progress-container" style={{ marginTop: 8 }}>
                    <div className="dm-progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
            )}
            {isUploading && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>上傳中 {uploadProgress}%...</div>
            )}

            <button
                className="dm-btn-confirm"
                style={{ marginTop: 12 }}
                onClick={handleSubmit}
                disabled={isUploading}
            >
                {isUploading ? '上傳中...' : '上傳模型'}
            </button>
        </div>
    );
};

// ─── Tab 3: ModelInfoEditor ───────────────────────────────────────────────────

const ModelInfoEditor: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { scenes, fetchScenes } = useFacilityStore();

    const [sceneId, setSceneId] = useState('');
    const [models, setModels] = useState<FacilityModelItem[]>([]);
    const [modelId, setModelId] = useState('');
    const [infoItems, setInfoItems] = useState<RichContentItem[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [newType, setNewType] = useState<'TEXT' | 'IMAGE' | 'DOCUMENT' | 'LINK'>('TEXT');
    const [newLabel, setNewLabel] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newFile, setNewFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (projectId) fetchScenes(projectId);
    }, [projectId, fetchScenes]);

    useEffect(() => {
        if (!sceneId) { setModels([]); setModelId(''); return; }
        setIsLoadingModels(true);
        axios.get<FacilityModelItem[]>(`${API_BASE}/api/facility/models`, {
            params: { sceneId },
            headers: getAuthHeaders(),
            withCredentials: true,
        }).then(r => setModels(Array.isArray(r.data) ? r.data : []))
          .catch(() => setModels([]))
          .finally(() => setIsLoadingModels(false));
    }, [sceneId]);

    useEffect(() => {
        if (!modelId) { setInfoItems([]); return; }
        setIsLoadingInfo(true);
        axios.get<RichContentItem[]>(`${API_BASE}/api/facility/models/${modelId}/info`, {
            headers: getAuthHeaders(),
            withCredentials: true,
        }).then(r => setInfoItems(Array.isArray(r.data) ? r.data : []))
          .catch(() => setInfoItems([]))
          .finally(() => setIsLoadingInfo(false));
    }, [modelId]);

    const handleAddInfo = async () => {
        if (!newLabel.trim()) { setError('標籤為必填'); return; }
        if (newType === 'TEXT' && !newContent.trim()) { setError('內容為必填'); return; }
        if ((newType === 'IMAGE' || newType === 'DOCUMENT') && !newFile) { setError('請選擇檔案'); return; }
        if (newType === 'LINK' && !newContent.trim()) { setError('連結網址為必填'); return; }

        setIsSaving(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append('type', newType);
            fd.append('label', newLabel.trim());
            if (newType === 'TEXT' || newType === 'LINK') {
                fd.append('content', newContent.trim());
            } else if (newFile) {
                fd.append('file', newFile);
            }

            const res = await axios.post<RichContentItem>(
                `${API_BASE}/api/facility/models/${modelId}/info`,
                fd,
                {
                    headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
                    withCredentials: true,
                }
            );
            setInfoItems(prev => [...prev, res.data]);
            setNewLabel('');
            setNewContent('');
            setNewFile(null);
            setNewType('TEXT');
        } catch (e: any) {
            setError(e?.response?.data?.error || '新增失敗');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteInfo = async (id: string) => {
        try {
            await axios.delete(`${API_BASE}/api/facility/info/${id}`, {
                headers: getAuthHeaders(),
                withCredentials: true,
            });
            setInfoItems(prev => prev.filter(i => i.id !== id));
        } catch (e: any) {
            setError(e?.response?.data?.error || '刪除失敗');
        }
    };

    const typeLabel: Record<string, string> = { TEXT: '文字', IMAGE: '圖片', DOCUMENT: '文件', LINK: '連結' };

    return (
        <div>
            {error && <div className="dm-error" style={{ marginBottom: 8 }}>{error}</div>}

            {/* Scene + model selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="dm-form-group" style={{ margin: 0 }}>
                    <label className="dm-form-label">場景</label>
                    <SceneSelect scenes={scenes} value={sceneId} onChange={v => { setSceneId(v); setModelId(''); }} />
                </div>
                <div className="dm-form-group" style={{ margin: 0 }}>
                    <label className="dm-form-label">模型</label>
                    <select
                        className="dm-form-input"
                        value={modelId}
                        onChange={e => setModelId(e.target.value)}
                        disabled={!sceneId || isLoadingModels}
                    >
                        <option value="">{isLoadingModels ? '載入中...' : '選擇模型'}</option>
                        {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Info list */}
            {modelId && (
                <>
                    {isLoadingInfo && <div className="dm-loading">載入中...</div>}
                    {!isLoadingInfo && infoItems.length === 0 && <div className="dm-empty">尚無 Rich Content 條目</div>}
                    {infoItems.map(item => (
                        <div key={item.id} className="dm-file-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div>
                                <span style={{ fontSize: 11, background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 4, marginRight: 8 }}>{typeLabel[item.type]}</span>
                                <span style={{ fontWeight: 500, fontSize: 13 }}>{item.label}</span>
                                {item.content && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.content.slice(0, 80)}{item.content.length > 80 ? '...' : ''}</div>}
                                {item.fileUrl && <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>檔案已上傳</div>}
                            </div>
                            <button
                                className="dm-file-btn dm-file-btn-delete"
                                style={{ flexShrink: 0 }}
                                onClick={() => handleDeleteInfo(item.id)}
                            >刪除</button>
                        </div>
                    ))}

                    {/* Add new info */}
                    <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>新增條目</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                            <div className="dm-form-group" style={{ margin: 0 }}>
                                <label className="dm-form-label">類型</label>
                                <select
                                    className="dm-form-input"
                                    value={newType}
                                    onChange={e => setNewType(e.target.value as typeof newType)}
                                >
                                    <option value="TEXT">文字</option>
                                    <option value="IMAGE">圖片</option>
                                    <option value="DOCUMENT">文件</option>
                                    <option value="LINK">連結</option>
                                </select>
                            </div>
                            <div className="dm-form-group" style={{ margin: 0 }}>
                                <label className="dm-form-label">標籤 *</label>
                                <input className="dm-form-input" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="例：說明、圖片標題" />
                            </div>
                        </div>

                        {(newType === 'TEXT' || newType === 'LINK') && (
                            <div className="dm-form-group">
                                <label className="dm-form-label">{newType === 'LINK' ? '網址' : '內容'} *</label>
                                <input className="dm-form-input" value={newContent} onChange={e => setNewContent(e.target.value)} placeholder={newType === 'LINK' ? 'https://...' : '文字內容'} />
                            </div>
                        )}
                        {(newType === 'IMAGE' || newType === 'DOCUMENT') && (
                            <div className="dm-form-group">
                                <label className="dm-form-label">檔案 *</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={newType === 'IMAGE' ? 'image/*' : '*/*'}
                                    onChange={e => setNewFile(e.target.files?.[0] || null)}
                                    style={{ width: '100%', padding: '6px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, background: '#f9fafb' }}
                                />
                                {newFile && <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>{newFile.name}</div>}
                            </div>
                        )}

                        <button className="dm-btn-confirm" onClick={handleAddInfo} disabled={isSaving}>
                            {isSaving ? '儲存中...' : '新增條目'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Tab 5: ModelManager ──────────────────────────────────────────────────────

interface ModelEditState {
    name: string;
    childSceneId: string;
    posX: string; posY: string; posZ: string;
    rotX: string; rotY: string; rotZ: string;
    sclX: string; sclY: string; sclZ: string;
}

const DEFAULT_EDIT = (m: FacilityModelItem): ModelEditState => ({
    name: m.name,
    childSceneId: m.childSceneId ?? '',
    posX: String(m.position?.x ?? 0), posY: String(m.position?.y ?? 0), posZ: String(m.position?.z ?? 0),
    rotX: String(m.rotation?.x ?? 0), rotY: String(m.rotation?.y ?? 0), rotZ: String(m.rotation?.z ?? 0),
    sclX: String(m.scale?.x ?? 1),    sclY: String(m.scale?.y ?? 1),    sclZ: String(m.scale?.z ?? 1),
});

const ModelManager: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { scenes, fetchScenes } = useFacilityStore();

    const [sceneId, setSceneId] = useState('');
    const [models, setModels] = useState<FacilityModelItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editState, setEditState] = useState<Record<string, ModelEditState>>({});
    const [savingId, setSavingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const pf = (v: string, fallback: number) => {
        const n = parseFloat(v);
        return isNaN(n) ? fallback : n;
    };

    useEffect(() => { if (projectId) fetchScenes(projectId); }, [projectId, fetchScenes]);

    useEffect(() => {
        return () => {
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!sceneId) { setModels([]); return; }
        setIsLoading(true);
        setError(null);
        axios.get<FacilityModelItem[]>(`${API_BASE}/api/facility/models`, {
            params: { sceneId },
            headers: getAuthHeaders(),
            withCredentials: true,
        })
            .then(r => {
                const list = Array.isArray(r.data) ? r.data : [];
                setModels(list);
                const initEdit: Record<string, ModelEditState> = {};
                list.forEach(m => { initEdit[m.id] = DEFAULT_EDIT(m); });
                setEditState(initEdit);
            })
            .catch(() => setError('載入模型失敗'))
            .finally(() => setIsLoading(false));
    }, [sceneId]);

    const setField = (id: string, field: keyof ModelEditState, value: string) => {
        setEditState(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const handleSave = async (modelId: string) => {
        const s = editState[modelId];
        if (!s) return;
        setSavingId(modelId);
        setError(null);
        try {
            await axios.put(`${API_BASE}/api/facility/models/${modelId}`, {
                name: s.name.trim(),
                childSceneId: s.childSceneId || null,
            }, { headers: getAuthHeaders(), withCredentials: true });

            await axios.put(`${API_BASE}/api/facility/models/${modelId}/transform`, {
                position: { x: pf(s.posX, 0), y: pf(s.posY, 0), z: pf(s.posZ, 0) },
                rotation: { x: pf(s.rotX, 0), y: pf(s.rotY, 0), z: pf(s.rotZ, 0) },
                scale:    { x: pf(s.sclX, 1), y: pf(s.sclY, 1), z: pf(s.sclZ, 1) },
            }, { headers: getAuthHeaders(), withCredentials: true });

            setModels(prev => prev.map(m => m.id === modelId ? { ...m, name: s.name.trim() } : m));
            setSuccessMsg('儲存成功');
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            successTimerRef.current = setTimeout(() => setSuccessMsg(null), 2500);
        } catch (e: any) {
            setError(e?.response?.data?.error || '儲存失敗');
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (modelId: string) => {
        try {
            await axios.delete(`${API_BASE}/api/facility/models/${modelId}`, {
                headers: getAuthHeaders(),
                withCredentials: true,
            });
            setModels(prev => prev.filter(m => m.id !== modelId));
            setDeleteConfirmId(null);
            if (expandedId === modelId) setExpandedId(null);
        } catch (e: any) {
            setError(e?.response?.data?.error || '刪除失敗');
            setDeleteConfirmId(null);
        }
    };

    return (
        <div>
            {error && <div className="dm-error" style={{ marginBottom: 8 }}>{error}</div>}
            {successMsg && <div style={{ color: '#16a34a', background: '#f0fdf4', padding: '8px 12px', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>{successMsg}</div>}

            <div className="dm-form-group">
                <label className="dm-form-label">場景</label>
                <SceneSelect scenes={scenes} value={sceneId} onChange={v => { setSceneId(v); setExpandedId(null); }} />
            </div>

            {isLoading && <div style={{ color: '#64748b', fontSize: 13 }}>載入中...</div>}

            {!isLoading && sceneId && models.length === 0 && (
                <div className="dm-empty">此場景尚無模型</div>
            )}

            {models.map(model => {
                const s = editState[model.id];
                const isExpanded = expandedId === model.id;
                const isSaving = savingId === model.id;

                return (
                    <div key={model.id} className="dm-file-card" style={{ marginBottom: 8, padding: 0, overflow: 'hidden' }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: isExpanded ? '#f0f7ff' : undefined }}
                            onClick={() => setExpandedId(isExpanded ? null : model.id)}
                        >
                            <span style={{ fontWeight: 500, fontSize: 14 }}>{model.name}</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>

                        {isExpanded && s && (
                            <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', background: '#fafafa' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                    <div className="dm-form-group" style={{ margin: 0 }}>
                                        <label className="dm-form-label">模型名稱</label>
                                        <input
                                            className="dm-form-input"
                                            value={s.name}
                                            onChange={e => setField(model.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="dm-form-group" style={{ margin: 0 }}>
                                        <label className="dm-form-label">子場景</label>
                                        <SceneSelect
                                            scenes={scenes}
                                            value={s.childSceneId}
                                            onChange={v => setField(model.id, 'childSceneId', v)}
                                            placeholder="（無）"
                                        />
                                    </div>
                                </div>

                                {([
                                    { label: '位置 Position (m)', fields: ['posX', 'posY', 'posZ'] as const },
                                    { label: '旋轉 Rotation (deg)', fields: ['rotX', 'rotY', 'rotZ'] as const },
                                    { label: '縮放 Scale', fields: ['sclX', 'sclY', 'sclZ'] as const },
                                ] as const).map(({ label, fields }) => (
                                    <div key={label} style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                            {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                                                <div key={axis} className="dm-form-group" style={{ margin: 0 }}>
                                                    <label className="dm-form-label">{axis}</label>
                                                    <input
                                                        className="dm-form-input"
                                                        type="number"
                                                        step="0.1"
                                                        value={s[fields[i]]}
                                                        onChange={e => setField(model.id, fields[i], e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                    <button
                                        className="dm-btn-confirm"
                                        onClick={() => handleSave(model.id)}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? '儲存中...' : '儲存變更'}
                                    </button>
                                    <button
                                        className="dm-file-btn dm-file-btn-delete"
                                        onClick={() => setDeleteConfirmId(model.id)}
                                    >
                                        刪除模型
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {deleteConfirmId && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal dm-modal-delete">
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">確認刪除模型</h3>
                        </div>
                        <div className="dm-modal-body">
                            <p>確定刪除「{models.find(m => m.id === deleteConfirmId)?.name}」？此操作無法復原，相關資訊條目也將一併移除。</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                                <button className="dm-btn-cancel" onClick={() => setDeleteConfirmId(null)}>取消</button>
                                <button
                                    style={{ background: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
                                    onClick={() => handleDelete(deleteConfirmId)}
                                >
                                    確認刪除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Tab 4: TerrainUploader ───────────────────────────────────────────────────

const SceneTerrainUploader: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { scenes, fetchScenes } = useFacilityStore();

    const [sceneId, setSceneId] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [satelliteFile, setSatelliteFile] = useState<File | null>(null);
    const [shiftX, setShiftX] = useState('0');
    const [shiftY, setShiftY] = useState('0');
    const [shiftZ, setShiftZ] = useState('0');
    const [rotation, setRotation] = useState('0');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);
    const satInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (projectId) fetchScenes(projectId);
    }, [projectId, fetchScenes]);

    const handleSubmit = async () => {
        if (!sceneId) { setError('請選擇場景'); return; }
        if (!csvFile) { setError('請選擇地形 CSV 檔案'); return; }

        setIsUploading(true);
        setError(null);
        setSuccess(null);
        setUploadProgress(0);

        try {
            const fd = new FormData();
            fd.append('csv', csvFile);
            if (satelliteFile) fd.append('satellite', satelliteFile);
            fd.append('shiftX', shiftX);
            fd.append('shiftY', shiftY);
            fd.append('shiftZ', shiftZ);
            fd.append('rotation', rotation);

            await axios.post(`${API_BASE}/api/facility/scenes/${sceneId}/terrain`, fd, {
                headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
                withCredentials: true,
                onUploadProgress: (e) => {
                    if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
                },
            });

            setSuccess('地形上傳成功');
            setCsvFile(null);
            setSatelliteFile(null);
            setUploadProgress(0);
        } catch (e: any) {
            setError(e?.response?.data?.error || '上傳失敗');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            {error && <div className="dm-error" style={{ marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ color: '#16a34a', background: '#f0fdf4', padding: '8px 12px', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>{success}</div>}

            <div className="dm-form-group">
                <label className="dm-form-label">目標場景 *</label>
                <SceneSelect scenes={scenes} value={sceneId} onChange={setSceneId} />
            </div>

            {/* CSV terrain */}
            <div className="dm-form-group">
                <label className="dm-form-label">地形 CSV（x, y, elevation）*</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="dm-btn-cancel" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => csvInputRef.current?.click()}>選擇 CSV</button>
                    {csvFile && <span style={{ fontSize: 12, color: '#059669' }}>{csvFile.name}</span>}
                </div>
                <input ref={csvInputRef} type="file" hidden accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
            </div>

            {/* Satellite image */}
            <div className="dm-form-group">
                <label className="dm-form-label">衛星影像（可選）</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="dm-btn-cancel" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => satInputRef.current?.click()}>選擇影像</button>
                    {satelliteFile && <span style={{ fontSize: 12, color: '#059669' }}>{satelliteFile.name}</span>}
                    {satelliteFile && <button onClick={() => setSatelliteFile(null)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>移除</button>}
                </div>
                <input ref={satInputRef} type="file" hidden accept=".tif,.tiff,.jpg,.jpeg,.png" onChange={e => setSatelliteFile(e.target.files?.[0] || null)} />
            </div>

            {/* Coordinate offsets */}
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>座標偏移設定</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                        { label: 'Shift X', value: shiftX, onChange: setShiftX },
                        { label: 'Shift Y', value: shiftY, onChange: setShiftY },
                        { label: 'Shift Z', value: shiftZ, onChange: setShiftZ },
                        { label: 'Rotation (deg)', value: rotation, onChange: setRotation },
                    ].map(({ label, value, onChange }) => (
                        <div key={label} className="dm-form-group" style={{ margin: 0 }}>
                            <label className="dm-form-label">{label}</label>
                            <input
                                className="dm-form-input"
                                type="number"
                                value={value}
                                onChange={e => onChange(e.target.value)}
                                step="0.1"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {isUploading && (
                <>
                    <div className="dm-progress-container">
                        <div className="dm-progress-bar" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>上傳中 {uploadProgress}%...</div>
                </>
            )}

            <button className="dm-btn-confirm" style={{ marginTop: 8 }} onClick={handleSubmit} disabled={isUploading}>
                {isUploading ? '上傳中...' : '上傳地形'}
            </button>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FacilityUploadSection({ projectId }: { projectId: string }) {
    const [activeTab, setActiveTab] = useState<'scenes' | 'models' | 'info' | 'terrain' | 'manager'>('scenes');

    const tabs: { key: typeof activeTab; label: string }[] = [
        { key: 'scenes', label: '場景管理' },
        { key: 'models', label: '模型上傳' },
        { key: 'info', label: '模型資訊' },
        { key: 'terrain', label: '場景地形' },
        { key: 'manager', label: '模型管理' },
    ];

    return (
        <div className="dm-section">
            <div className="dm-section-header">
                <div className="dm-section-icon">🏗️</div>
                <div>
                    <h3 className="dm-section-title">設施導覽</h3>
                    <p className="dm-section-desc">管理設施場景、3D 模型、Rich Content 與地形資料</p>
                </div>
            </div>

            {/* Tab navigation */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 0 }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        style={{
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: activeTab === t.key ? 600 : 400,
                            color: activeTab === t.key ? '#2563eb' : '#64748b',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === t.key ? '2px solid #2563eb' : '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            marginBottom: -1,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'scenes' && <SceneManager projectId={projectId} />}
            {activeTab === 'models' && <ModelUploader projectId={projectId} />}
            {activeTab === 'info' && <ModelInfoEditor projectId={projectId} />}
            {activeTab === 'terrain' && <SceneTerrainUploader projectId={projectId} />}
            {activeTab === 'manager' && <ModelManager projectId={projectId} />}
        </div>
    );
}
