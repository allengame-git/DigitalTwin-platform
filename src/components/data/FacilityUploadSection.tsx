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
import { RichTextEditor } from '../common/RichTextEditor';

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
    introduction?: string;
    infos?: RichContentItem[];
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

    // 主場景編輯
    const [isEditingRoot, setIsEditingRoot] = useState(false);
    const [editRootForm, setEditRootForm] = useState({ name: '', description: '', sceneType: 'normal' as string });
    // 建立主場景
    const [isCreatingRoot, setIsCreatingRoot] = useState(false);
    const [createRootForm, setCreateRootForm] = useState({ name: '', description: '' });
    // 新增子場景
    const [showAddSub, setShowAddSub] = useState(false);
    const [addSubForm, setAddSubForm] = useState({ name: '', description: '', parentModelId: '' });
    // 編輯子場景
    const [editingSubId, setEditingSubId] = useState<string | null>(null);
    const [editSubForm, setEditSubForm] = useState({ name: '', description: '', parentModelId: '' });
    // 刪除確認
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    // 平面圖
    const [planUploadSceneId, setPlanUploadSceneId] = useState<string | null>(null);
    const [isPlanUploading, setIsPlanUploading] = useState(false);
    const planInputRef = useRef<HTMLInputElement>(null);
    // 主場景下的模型（供子場景選擇關聯）
    const [rootModels, setRootModels] = useState<FacilityModelItem[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (projectId) fetchScenes(projectId);
    }, [projectId, fetchScenes]);

    const rootScene = scenes.find(s => !s.parentSceneId) ?? null;
    const subScenes = scenes.filter(s => !!s.parentSceneId).sort((a, b) => a.sortOrder - b.sortOrder);

    // 主場景建立後，載入其模型供子場景關聯選擇
    useEffect(() => {
        if (!rootScene) { setRootModels([]); return; }
        axios.get<FacilityModelItem[]>(`${API_BASE}/api/facility/models`, {
            params: { sceneId: rootScene.id },
            headers: getAuthHeaders(),
            withCredentials: true,
        }).then(r => setRootModels(Array.isArray(r.data) ? r.data : [])).catch(() => setRootModels([]));
    }, [rootScene?.id]);

    const handleCreateRoot = async () => {
        if (!createRootForm.name.trim()) { setError('場景名稱為必填'); return; }
        setIsSaving(true); setError(null);
        try {
            await createScene({ projectId, name: createRootForm.name.trim(), description: createRootForm.description.trim() || undefined });
            setIsCreatingRoot(false);
            setCreateRootForm({ name: '', description: '' });
        } catch (e: any) {
            setError(e?.response?.data?.error || '建立失敗');
        } finally { setIsSaving(false); }
    };

    const handleEditRootSave = async () => {
        if (!rootScene || !editRootForm.name.trim()) { setError('場景名稱為必填'); return; }
        setIsSaving(true); setError(null);
        try {
            await updateScene(rootScene.id, { name: editRootForm.name.trim(), description: editRootForm.description.trim(), sceneType: editRootForm.sceneType as 'lobby' | 'normal' });
            setIsEditingRoot(false);
        } catch (e: any) {
            setError(e?.response?.data?.error || '更新失敗');
        } finally { setIsSaving(false); }
    };

    const handleAddSubScene = async () => {
        if (!rootScene || !addSubForm.name.trim()) { setError('子場景名稱為必填'); return; }
        setIsSaving(true); setError(null);
        try {
            await createScene({
                projectId,
                parentSceneId: rootScene.id,
                parentModelId: addSubForm.parentModelId || undefined,
                name: addSubForm.name.trim(),
                description: addSubForm.description.trim() || undefined,
            });
            setShowAddSub(false);
            setAddSubForm({ name: '', description: '', parentModelId: '' });
        } catch (e: any) {
            setError(e?.response?.data?.error || '新增失敗');
        } finally { setIsSaving(false); }
    };

    const handleEditSubSave = async (id: string) => {
        if (!editSubForm.name.trim()) { setError('名稱為必填'); return; }
        setIsSaving(true); setError(null);
        try {
            await updateScene(id, {
                name: editSubForm.name.trim(),
                description: editSubForm.description.trim(),
                // @ts-ignore — updateScene 型別需對應 parentModelId
                parentModelId: editSubForm.parentModelId || null,
            });
            setEditingSubId(null);
        } catch (e: any) {
            setError(e?.response?.data?.error || '更新失敗');
        } finally { setIsSaving(false); }
    };

    const handleDeleteSub = async (id: string) => {
        try {
            await deleteScene(id);
            setDeleteConfirmId(null);
        } catch (e: any) {
            setError(e?.response?.data?.error || '刪除失敗');
        }
    };

    const handlePlanUpload = async (file: File, sceneId: string) => {
        setIsPlanUploading(true); setError(null);
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
        } finally { setIsPlanUploading(false); setPlanUploadSceneId(null); }
    };

    const ModelSelect: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
        <select className="dm-form-input" value={value} onChange={e => onChange(e.target.value)}>
            <option value="">（不關聯模型）</option>
            {rootModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
    );

    return (
        <div>
            {error && <div className="dm-error" style={{ marginBottom: 8 }}>{error}</div>}

            {/* ── 主場景 ── */}
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>主場景</div>

            {rootScene ? (
                <div className="dm-file-card" style={{ marginBottom: 16 }}>
                    {isEditingRoot ? (
                        <div style={{ flex: 1 }}>
                            <div className="dm-form-group" style={{ marginBottom: 6 }}>
                                <label className="dm-form-label">場景名稱 *</label>
                                <input className="dm-form-input" value={editRootForm.name} onChange={e => setEditRootForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="dm-form-group" style={{ marginBottom: 8 }}>
                                <label className="dm-form-label">描述（可選）</label>
                                <input className="dm-form-input" value={editRootForm.description} onChange={e => setEditRootForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            {rootScene && !rootScene.parentSceneId && (
                                <div className="dm-form-group" style={{ marginBottom: 8 }}>
                                    <label className="dm-form-label">場景類型</label>
                                    <select
                                        className="dm-form-input"
                                        value={editRootForm.sceneType || 'normal'}
                                        onChange={e => setEditRootForm(f => ({ ...f, sceneType: e.target.value }))}
                                        style={{ width: '100%', maxWidth: 320, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
                                    >
                                        <option value="lobby">導覽場景（全螢幕沉浸，點模型進入子場景）</option>
                                        <option value="normal">一般場景（含側邊欄，標準互動模式）</option>
                                    </select>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="dm-btn-confirm" style={{ padding: '4px 12px', fontSize: 12 }} onClick={handleEditRootSave} disabled={isSaving}>儲存</button>
                                <button className="dm-btn-cancel" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setIsEditingRoot(false)}>取消</button>
                            </div>
                        </div>
                    ) : (
                        <div className="dm-file-info" style={{ flex: 1 }}>
                            <div className="dm-file-name">{rootScene.name}</div>
                            {rootScene.description && <div className="dm-file-meta">{rootScene.description}</div>}
                            {/* 平面圖狀態 */}
                            {(rootScene.planImageUrl || rootScene.autoPlanImageUrl) ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '3px 8px', borderRadius: 4, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                    <span style={{ fontSize: 11, color: '#15803d', fontWeight: 500 }}>✓ 已有平面圖</span>
                                    {rootScene.planImageUrl && <span style={{ fontSize: 10, color: '#86efac' }}>（手動上傳）</span>}
                                    {!rootScene.planImageUrl && rootScene.autoPlanImageUrl && <span style={{ fontSize: 10, color: '#86efac' }}>（自動生成）</span>}
                                </div>
                            ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '3px 8px', borderRadius: 4, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>尚未上傳平面圖</span>
                                </div>
                            )}
                            <div className="dm-file-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                <button className="dm-file-btn" onClick={() => { setIsEditingRoot(true); setEditRootForm({ name: rootScene.name, description: rootScene.description || '', sceneType: rootScene.sceneType || 'normal' }); }}>編輯名稱</button>
                                <button className="dm-file-btn" onClick={() => { setPlanUploadSceneId(rootScene.id); planInputRef.current?.click(); }} disabled={isPlanUploading}>{isPlanUploading ? '上傳中...' : (rootScene.planImageUrl || rootScene.autoPlanImageUrl) ? '更換平面圖' : '上傳平面圖'}</button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ marginBottom: 16 }}>
                    <div className="dm-empty">尚未建立主場景</div>
                    {isCreatingRoot ? (
                        <div style={{ marginTop: 8, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            <div className="dm-form-group">
                                <label className="dm-form-label">場景名稱 *</label>
                                <input className="dm-form-input" value={createRootForm.name} onChange={e => setCreateRootForm(f => ({ ...f, name: e.target.value }))} placeholder="例：廠區主場景" />
                            </div>
                            <div className="dm-form-group">
                                <label className="dm-form-label">描述（可選）</label>
                                <input className="dm-form-input" value={createRootForm.description} onChange={e => setCreateRootForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="dm-btn-confirm" onClick={handleCreateRoot} disabled={isSaving}>{isSaving ? '建立中...' : '建立主場景'}</button>
                                <button className="dm-btn-cancel" onClick={() => { setIsCreatingRoot(false); setError(null); }}>取消</button>
                            </div>
                        </div>
                    ) : (
                        <button className="dm-btn-confirm" style={{ marginTop: 8 }} onClick={() => setIsCreatingRoot(true)}>+ 建立主場景</button>
                    )}
                </div>
            )}

            {/* ── 子場景（僅主場景存在時顯示）── */}
            {rootScene && (
                <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>子場景</div>

                    <div className="dm-file-list" style={{ marginBottom: 8 }}>
                        {subScenes.length === 0 && <div className="dm-empty">尚無子場景</div>}
                        {subScenes.map(sub => {
                            const linkedModel = rootModels.find(m => m.id === sub.parentModelId);
                            return (
                                <div key={sub.id} className="dm-file-card">
                                    {editingSubId === sub.id ? (
                                        <div style={{ flex: 1 }}>
                                            <div className="dm-form-group" style={{ marginBottom: 6 }}>
                                                <label className="dm-form-label">子場景名稱 *</label>
                                                <input className="dm-form-input" value={editSubForm.name} onChange={e => setEditSubForm(f => ({ ...f, name: e.target.value }))} />
                                            </div>
                                            <div className="dm-form-group" style={{ marginBottom: 6 }}>
                                                <label className="dm-form-label">描述（可選）</label>
                                                <input className="dm-form-input" value={editSubForm.description} onChange={e => setEditSubForm(f => ({ ...f, description: e.target.value }))} />
                                            </div>
                                            <div className="dm-form-group" style={{ marginBottom: 8 }}>
                                                <label className="dm-form-label">關聯模型</label>
                                                <ModelSelect value={editSubForm.parentModelId} onChange={v => setEditSubForm(f => ({ ...f, parentModelId: v }))} />
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="dm-btn-confirm" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleEditSubSave(sub.id)} disabled={isSaving}>儲存</button>
                                                <button className="dm-btn-cancel" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setEditingSubId(null)}>取消</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="dm-file-info" style={{ flex: 1 }}>
                                            <div className="dm-file-name">{sub.name}</div>
                                            {linkedModel && (
                                                <div className="dm-file-meta" style={{ color: '#2563eb' }}>
                                                    關聯模型：{linkedModel.name}
                                                </div>
                                            )}
                                            {!linkedModel && <div className="dm-file-meta">未關聯模型</div>}
                                            {sub.description && <div className="dm-file-meta">{sub.description}</div>}
                                            {/* 平面圖狀態 */}
                                            {(sub.planImageUrl || sub.autoPlanImageUrl) ? (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '3px 8px', borderRadius: 4, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                                    <span style={{ fontSize: 11, color: '#15803d', fontWeight: 500 }}>✓ 已有平面圖</span>
                                                    {sub.planImageUrl && <span style={{ fontSize: 10, color: '#86efac' }}>（手動上傳）</span>}
                                                    {!sub.planImageUrl && sub.autoPlanImageUrl && <span style={{ fontSize: 10, color: '#86efac' }}>（自動生成）</span>}
                                                </div>
                                            ) : (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '3px 8px', borderRadius: 4, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>尚未上傳平面圖</span>
                                                </div>
                                            )}
                                            <div className="dm-file-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                                <button className="dm-file-btn" onClick={() => { setEditingSubId(sub.id); setEditSubForm({ name: sub.name, description: sub.description || '', parentModelId: sub.parentModelId || '' }); }}>編輯</button>
                                                <button className="dm-file-btn" onClick={() => { setPlanUploadSceneId(sub.id); planInputRef.current?.click(); }} disabled={isPlanUploading}>{(sub.planImageUrl || sub.autoPlanImageUrl) ? '更換平面圖' : '上傳平面圖'}</button>
                                                <button className="dm-file-btn dm-file-btn-delete" onClick={() => setDeleteConfirmId(sub.id)}>刪除</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {showAddSub ? (
                        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            <div className="dm-form-group">
                                <label className="dm-form-label">子場景名稱 *</label>
                                <input className="dm-form-input" value={addSubForm.name} onChange={e => setAddSubForm(f => ({ ...f, name: e.target.value }))} placeholder="例：操作室、試驗室" autoFocus />
                            </div>
                            <div className="dm-form-group">
                                <label className="dm-form-label">描述（可選）</label>
                                <input className="dm-form-input" value={addSubForm.description} onChange={e => setAddSubForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            <div className="dm-form-group">
                                <label className="dm-form-label">關聯模型（點擊該模型時顯示入口）</label>
                                <ModelSelect value={addSubForm.parentModelId} onChange={v => setAddSubForm(f => ({ ...f, parentModelId: v }))} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="dm-btn-confirm" onClick={handleAddSubScene} disabled={isSaving}>{isSaving ? '新增中...' : '新增子場景'}</button>
                                <button className="dm-btn-cancel" onClick={() => { setShowAddSub(false); setError(null); }}>取消</button>
                            </div>
                        </div>
                    ) : (
                        <button className="dm-btn-confirm" onClick={() => setShowAddSub(true)}>+ 新增子場景</button>
                    )}
                </>
            )}

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

            {deleteConfirmId && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal dm-modal-delete">
                        <div className="dm-modal-header"><h3 className="dm-modal-title">確認刪除子場景</h3></div>
                        <div className="dm-modal-body">
                            <p>確定刪除「{subScenes.find(s => s.id === deleteConfirmId)?.name}」？場景內的模型資料將一併移除，此操作無法復原。</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                                <button className="dm-btn-cancel" onClick={() => setDeleteConfirmId(null)}>取消</button>
                                <button style={{ background: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }} onClick={() => handleDeleteSub(deleteConfirmId)}>確認刪除</button>
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

// ─── Tab 3: ModelInfoDashboard ────────────────────────────────────────────────

function resolveInfoUrl(url: string) {
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
}

interface ModelCardProps {
    model: FacilityModelItem;
    onClick: () => void;
}

function ModelCard({ model, onClick }: ModelCardProps) {
    const diagrams = (model.infos ?? []).filter(i => i.type === 'IMAGE' || i.type === 'DOCUMENT');
    const customFields = (model.infos ?? []).filter(i => i.type === 'TEXT' || i.type === 'LINK');
    const thumbInfo = (model.infos ?? []).find(i => i.type === 'IMAGE');
    const introText = model.introduction
        ? model.introduction.replace(/<[^>]+>/g, '').slice(0, 80)
        : null;

    return (
        <div
            onClick={onClick}
            style={{
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 'pointer',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.15s, transform 0.15s',
                display: 'flex',
                flexDirection: 'column',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.12)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
        >
            <div style={{ height: 120, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {thumbInfo?.content ? (
                    <img src={resolveInfoUrl(thumbInfo.content)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    </svg>
                )}
            </div>
            <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{model.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, flex: 1 }}>
                    {introText || <span style={{ color: '#94a3b8' }}>尚未填寫介紹</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {diagrams.length > 0 && (
                        <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', borderRadius: 4, padding: '2px 6px' }}>
                            圖說 {diagrams.length}
                        </span>
                    )}
                    {customFields.length > 0 && (
                        <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', borderRadius: 4, padding: '2px 6px' }}>
                            欄位 {customFields.length}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

interface ModelInfoModalProps {
    model: FacilityModelItem;
    onClose: () => void;
    onSaved: (updated: FacilityModelItem) => void;
}

function ModelInfoModal({ model, onClose, onSaved }: ModelInfoModalProps) {
    const [intro, setIntro] = useState(model.introduction || '');
    const [isSavingIntro, setIsSavingIntro] = useState(false);
    const introDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [diagrams, setDiagrams] = useState<RichContentItem[]>(
        (model.infos ?? []).filter(i => i.type === 'IMAGE' || i.type === 'DOCUMENT')
    );
    const [isDiagramUploading, setIsDiagramUploading] = useState(false);
    const diagramInputRef = useRef<HTMLInputElement>(null);

    const [customFields, setCustomFields] = useState<RichContentItem[]>(
        (model.infos ?? []).filter(i => i.type === 'TEXT' || i.type === 'LINK')
    );
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldContent, setNewFieldContent] = useState('');
    const [newFieldType, setNewFieldType] = useState<'TEXT' | 'LINK'>('TEXT');
    const [isSavingField, setIsSavingField] = useState(false);
    const [fieldError, setFieldError] = useState<string | null>(null);

    useEffect(() => {
        setIntro(model.introduction || '');
        setDiagrams((model.infos ?? []).filter(i => i.type === 'IMAGE' || i.type === 'DOCUMENT'));
        setCustomFields((model.infos ?? []).filter(i => i.type === 'TEXT' || i.type === 'LINK'));
    }, [model.id]);

    useEffect(() => {
        return () => {
            if (introDebounceRef.current) clearTimeout(introDebounceRef.current);
        };
    }, []);

    const saveIntro = async (html: string) => {
        setIsSavingIntro(true);
        try {
            const res = await axios.put<FacilityModelItem>(
                `${API_BASE}/api/facility/models/${model.id}`,
                { introduction: html },
                { headers: getAuthHeaders(), withCredentials: true }
            );
            onSaved(res.data);
        } catch (e) {
            console.error('intro save failed', e);
        } finally {
            setIsSavingIntro(false);
        }
    };

    const handleIntroChange = (html: string) => {
        setIntro(html);
        if (introDebounceRef.current) clearTimeout(introDebounceRef.current);
        introDebounceRef.current = setTimeout(() => saveIntro(html), 2000);
    };

    const handleDiagramFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsDiagramUploading(true);
        for (const file of Array.from(files)) {
            const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
            const type = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'IMAGE' : 'DOCUMENT';
            const fd = new FormData();
            fd.append('type', type);
            fd.append('label', file.name);
            fd.append('file', file);
            try {
                const res = await axios.post<RichContentItem>(
                    `${API_BASE}/api/facility/models/${model.id}/info`,
                    fd,
                    { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }, withCredentials: true }
                );
                setDiagrams(prev => [...prev, res.data]);
            } catch (e) {
                console.error('diagram upload failed', e);
            }
        }
        setIsDiagramUploading(false);
    };

    const handleDeleteDiagram = async (id: string) => {
        try {
            await axios.delete(`${API_BASE}/api/facility/info/${id}`, {
                headers: getAuthHeaders(), withCredentials: true,
            });
            setDiagrams(prev => prev.filter(d => d.id !== id));
        } catch (e) {
            console.error('delete diagram failed', e);
        }
    };

    const handleAddField = async () => {
        if (!newFieldLabel.trim()) { setFieldError('標籤為必填'); return; }
        if (!newFieldContent.trim()) { setFieldError('內容為必填'); return; }
        setIsSavingField(true);
        setFieldError(null);
        try {
            const fd = new FormData();
            fd.append('type', newFieldType);
            fd.append('label', newFieldLabel.trim());
            fd.append('content', newFieldContent.trim());
            const res = await axios.post<RichContentItem>(
                `${API_BASE}/api/facility/models/${model.id}/info`,
                fd,
                { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }, withCredentials: true }
            );
            setCustomFields(prev => [...prev, res.data]);
            setNewFieldLabel('');
            setNewFieldContent('');
        } catch (e: any) {
            setFieldError(e?.response?.data?.error || '新增失敗');
        } finally {
            setIsSavingField(false);
        }
    };

    const handleDeleteField = async (id: string) => {
        try {
            await axios.delete(`${API_BASE}/api/facility/info/${id}`, {
                headers: getAuthHeaders(), withCredentials: true,
            });
            setCustomFields(prev => prev.filter(f => f.id !== id));
        } catch (e) {
            console.error('delete field failed', e);
        }
    };

    const sectionStyle: React.CSSProperties = {
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ background: '#f8fafc', borderRadius: 16, width: '100%', maxWidth: 800, minHeight: '80vh' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff', borderRadius: '16px 16px 0 0', position: 'sticky', top: 0, zIndex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: '#1e293b' }}>{model.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isSavingIntro && <span style={{ fontSize: 12, color: '#94a3b8' }}>儲存中...</span>}
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b', fontSize: 20, lineHeight: 1 }}>×</button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: 24 }}>
                    {/* 設施介紹 */}
                    <div style={sectionStyle}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>設施介紹</div>
                        <RichTextEditor value={intro} onChange={handleIntroChange} placeholder="輸入設施介紹文字..." />
                        <div style={{ textAlign: 'right', marginTop: 8 }}>
                            <button
                                onClick={() => { if (introDebounceRef.current) clearTimeout(introDebounceRef.current); saveIntro(intro); }}
                                disabled={isSavingIntro}
                                style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 13, cursor: 'pointer', opacity: isSavingIntro ? 0.6 : 1 }}
                            >
                                {isSavingIntro ? '儲存中...' : '儲存介紹'}
                            </button>
                        </div>
                    </div>

                    {/* 設施圖說 */}
                    <div style={sectionStyle}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>設施圖說</div>
                        <div
                            onClick={() => diagramInputRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); handleDiagramFiles(e.dataTransfer.files); }}
                            style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, color: '#64748b', fontSize: 13, background: '#f8fafc' }}
                        >
                            {isDiagramUploading ? '上傳中...' : '點擊或拖曳上傳（JPG/PNG/PDF/CAD/DWG）'}
                        </div>
                        <input ref={diagramInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.dwg,.dxf" style={{ display: 'none' }} onChange={e => handleDiagramFiles(e.target.files)} />
                        {diagrams.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                                {diagrams.map(d => (
                                    <div key={d.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                                        {d.type === 'IMAGE' ? (
                                            <img src={resolveInfoUrl(d.content ?? '')} alt={d.label} style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: 12, color: '#475569', padding: 8, textAlign: 'center' }}>
                                                {d.label}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleDeleteDiagram(d.id)}
                                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 自訂欄位 */}
                    <div style={sectionStyle}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>自訂欄位</div>
                        {customFields.map(f => (
                            <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 6 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{f.type === 'LINK' ? '[連結]' : '[文字]'} {f.label}</div>
                                    {f.type === 'LINK'
                                        ? <a href={f.content} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#2563eb', wordBreak: 'break-all' }}>{f.content}</a>
                                        : <div style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>{f.content}</div>
                                    }
                                </div>
                                <button onClick={() => handleDeleteField(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, padding: 2 }}>×</button>
                            </div>
                        ))}
                        <div style={{ borderTop: customFields.length > 0 ? '1px solid #e2e8f0' : 'none', paddingTop: customFields.length > 0 ? 12 : 0, marginTop: customFields.length > 0 ? 4 : 0 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as 'TEXT' | 'LINK')} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, minWidth: 70 }}>
                                    <option value="TEXT">文字</option>
                                    <option value="LINK">連結</option>
                                </select>
                                <input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="欄位名稱" style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input value={newFieldContent} onChange={e => setNewFieldContent(e.target.value)} placeholder={newFieldType === 'LINK' ? 'https://...' : '內容'} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                <button onClick={handleAddField} disabled={isSavingField} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}>新增</button>
                            </div>
                            {fieldError && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{fieldError}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const ModelInfoDashboard: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { scenes, fetchScenes } = useFacilityStore();
    const [sceneId, setSceneId] = useState('');
    const [models, setModels] = useState<FacilityModelItem[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [selectedModel, setSelectedModel] = useState<FacilityModelItem | null>(null);

    useEffect(() => { if (projectId) fetchScenes(projectId); }, [projectId, fetchScenes]);

    useEffect(() => {
        if (!sceneId) { setModels([]); return; }
        setIsLoadingModels(true);
        axios.get<FacilityModelItem[]>(`${API_BASE}/api/facility/models`, {
            params: { sceneId },
            headers: getAuthHeaders(),
            withCredentials: true,
        }).then(r => setModels(Array.isArray(r.data) ? r.data : []))
          .catch(() => setModels([]))
          .finally(() => setIsLoadingModels(false));
    }, [sceneId]);

    const handleModelSaved = (updated: FacilityModelItem) => {
        setModels(prev => prev.map(m => m.id === updated.id ? updated : m));
        setSelectedModel(updated);
    };

    return (
        <div style={{ padding: '16px 0' }}>
            <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 4 }}>選擇場景</label>
                <select
                    value={sceneId}
                    onChange={e => { setSceneId(e.target.value); setSelectedModel(null); }}
                    style={{ width: '100%', maxWidth: 320, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
                >
                    <option value="">-- 請選擇場景 --</option>
                    {scenes.map(s => (
                        <option key={s.id} value={s.id}>{(s as any).parentSceneId ? '　└ ' : ''}{s.name}</option>
                    ))}
                </select>
            </div>

            {isLoadingModels && <div style={{ color: '#64748b', fontSize: 13 }}>載入中...</div>}
            {!isLoadingModels && sceneId && models.length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>此場景尚無模型</div>
            )}
            {!isLoadingModels && models.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {models.map(m => (
                        <ModelCard key={m.id} model={m} onClick={() => setSelectedModel(m)} />
                    ))}
                </div>
            )}

            {selectedModel && (
                <ModelInfoModal
                    model={selectedModel}
                    onClose={() => setSelectedModel(null)}
                    onSaved={handleModelSaved}
                />
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
    const { scenes, fetchScenes, createScene } = useFacilityStore();

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
    const [creatingSubSceneForModelId, setCreatingSubSceneForModelId] = useState<string | null>(null);
    const [subSceneNameInput, setSubSceneNameInput] = useState('');

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

    // 為模型建立新子場景並自動連結
    const handleCreateSubScene = async (modelId: string) => {
        const name = subSceneNameInput.trim();
        if (!name) { setError('請輸入子場景名稱'); return; }
        const rootScene = scenes.find(s => !s.parentSceneId);
        if (!rootScene) { setError('請先建立主場景'); return; }
        setSavingId(modelId);
        setError(null);
        try {
            const newScene = await createScene({ projectId, name, parentSceneId: rootScene.id });
            // 同步更新 childSceneId 欄位並儲存
            setField(modelId, 'childSceneId', newScene.id);
            await axios.put(`${API_BASE}/api/facility/models/${modelId}`, {
                name: editState[modelId]?.name ?? '',
                childSceneId: newScene.id,
            }, { headers: getAuthHeaders(), withCredentials: true });
            setModels(prev => prev.map(m => m.id === modelId ? { ...m, childSceneId: newScene.id } : m));
            setCreatingSubSceneForModelId(null);
            setSubSceneNameInput('');
            setSuccessMsg('子場景已建立並連結');
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            successTimerRef.current = setTimeout(() => setSuccessMsg(null), 2500);
        } catch (e: any) {
            setError(e?.response?.data?.error || '建立子場景失敗');
        } finally {
            setSavingId(null);
        }
    };

    // 取消連結子場景（不刪除場景）
    const handleUnlinkSubScene = async (modelId: string) => {
        setSavingId(modelId);
        setError(null);
        try {
            await axios.put(`${API_BASE}/api/facility/models/${modelId}`, {
                name: editState[modelId]?.name ?? '',
                childSceneId: null,
            }, { headers: getAuthHeaders(), withCredentials: true });
            setField(modelId, 'childSceneId', '');
            setModels(prev => prev.map(m => m.id === modelId ? { ...m, childSceneId: null } : m));
            setSuccessMsg('已取消連結子場景');
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            successTimerRef.current = setTimeout(() => setSuccessMsg(null), 2500);
        } catch (e: any) {
            setError(e?.response?.data?.error || '操作失敗');
        } finally {
            setSavingId(null);
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
                                </div>

                                {([
                                    {
                                        label: '位置 (m)　• 水平面 X-Z，Y 為高程',
                                        fields: ['posX', 'posY', 'posZ'] as const,
                                        // Three.js: x=東, y=高程, z=北(TWD97-Y)
                                        axisLabels: ['X 東', 'Z 高程', 'Y 北'] as const,
                                    },
                                    {
                                        label: '旋轉 (deg)　• Ry 為水平方位旋轉',
                                        fields: ['rotX', 'rotY', 'rotZ'] as const,
                                        axisLabels: ['Rx 俯仰', 'Ry 方位', 'Rz 橫滾'] as const,
                                    },
                                    {
                                        label: '縮放 Scale',
                                        fields: ['sclX', 'sclY', 'sclZ'] as const,
                                        axisLabels: ['X', 'Y', 'Z'] as const,
                                    },
                                ] as const).map(({ label, fields, axisLabels }) => (
                                    <div key={label} style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                            {axisLabels.map((axisLabel, i) => (
                                                <div key={axisLabel} className="dm-form-group" style={{ margin: 0 }}>
                                                    <label className="dm-form-label">{axisLabel}</label>
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

interface GlbQueueItem {
    id: string;
    file: File;
    name: string;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress: number;
    errorMsg?: string;
}

const SceneTerrainUploader: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { scenes, fetchScenes } = useFacilityStore();

    const [sceneId, setSceneId] = useState('');

    // ── 地形 CSV / 衛星 ──
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [satelliteFile, setSatelliteFile] = useState<File | null>(null);
    const [shiftX, setShiftX] = useState('0');
    const [shiftY, setShiftY] = useState('0');
    const [shiftZ, setShiftZ] = useState('0');
    const [rotation, setRotation] = useState('0');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [terrainError, setTerrainError] = useState<string | null>(null);
    const [terrainSuccess, setTerrainSuccess] = useState<string | null>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);
    const satInputRef = useRef<HTMLInputElement>(null);

    // ── GLB 批次上傳 ──
    const [glbQueue, setGlbQueue] = useState<GlbQueueItem[]>([]);
    const [isGlbUploading, setIsGlbUploading] = useState(false);
    const [glbIsDragging, setGlbIsDragging] = useState(false);
    const [glbError, setGlbError] = useState<string | null>(null);
    const glbInputRef = useRef<HTMLInputElement>(null);

    // ── 場景模型清單 ──
    const [sceneModels, setSceneModels] = useState<FacilityModelItem[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [deleteConfirmModelId, setDeleteConfirmModelId] = useState<string | null>(null);
    const [modelListError, setModelListError] = useState<string | null>(null);

    useEffect(() => {
        if (projectId) fetchScenes(projectId);
    }, [projectId, fetchScenes]);

    // 切換場景時載入現有模型
    useEffect(() => {
        if (!sceneId) { setSceneModels([]); return; }
        setIsLoadingModels(true);
        setModelListError(null);
        axios.get<FacilityModelItem[]>(`${API_BASE}/api/facility/models`, {
            params: { sceneId },
            headers: getAuthHeaders(),
            withCredentials: true,
        }).then(r => setSceneModels(Array.isArray(r.data) ? r.data : []))
          .catch(() => setModelListError('載入模型清單失敗'))
          .finally(() => setIsLoadingModels(false));
    }, [sceneId]);

    // ── 地形上傳 ──
    const handleTerrainSubmit = async () => {
        if (!sceneId) { setTerrainError('請選擇場景'); return; }
        if (!csvFile) { setTerrainError('請選擇地形 CSV 檔案'); return; }

        setIsUploading(true);
        setTerrainError(null);
        setTerrainSuccess(null);
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

            setTerrainSuccess('地形上傳成功');
            setCsvFile(null);
            setSatelliteFile(null);
            setUploadProgress(0);
        } catch (e: any) {
            setTerrainError(e?.response?.data?.error || '上傳失敗');
        } finally {
            setIsUploading(false);
        }
    };

    // ── GLB 多檔加入佇列 ──
    const addGlbFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files);
        const valid: GlbQueueItem[] = [];
        for (const f of arr) {
            const ext = f.name.split('.').pop()?.toLowerCase();
            if (!['glb', 'gltf'].includes(ext || '')) continue;
            if (f.size > 200 * 1024 * 1024) continue; // 200MB limit
            valid.push({
                id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
                file: f,
                name: f.name.replace(/\.(glb|gltf)$/i, ''),
                status: 'pending',
                progress: 0,
            });
        }
        if (valid.length === 0) {
            setGlbError('未找到有效的 .glb / .gltf 檔案（每檔上限 200MB）');
            return;
        }
        setGlbError(null);
        setGlbQueue(prev => [...prev, ...valid]);
    }, []);

    const removeGlbItem = (id: string) => {
        setGlbQueue(prev => prev.filter(q => q.id !== id));
    };

    const updateQueueItem = (id: string, patch: Partial<GlbQueueItem>) => {
        setGlbQueue(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
    };

    // ── GLB 批次上傳（逐檔序列上傳）──
    const handleGlbUploadAll = async () => {
        if (!sceneId) { setGlbError('請先選擇目標場景'); return; }
        const pending = glbQueue.filter(q => q.status === 'pending' || q.status === 'error');
        if (pending.length === 0) return;

        setIsGlbUploading(true);
        setGlbError(null);

        for (const item of pending) {
            updateQueueItem(item.id, { status: 'uploading', progress: 0, errorMsg: undefined });
            try {
                const fd = new FormData();
                fd.append('file', item.file);
                fd.append('name', item.name.trim() || item.file.name);
                fd.append('sceneId', sceneId);

                await axios.post(`${API_BASE}/api/facility/models`, fd, {
                    headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
                    withCredentials: true,
                    onUploadProgress: (e) => {
                        if (e.total) updateQueueItem(item.id, { progress: Math.round((e.loaded / e.total) * 100) });
                    },
                });

                updateQueueItem(item.id, { status: 'done', progress: 100 });
            } catch (e: any) {
                updateQueueItem(item.id, {
                    status: 'error',
                    errorMsg: e?.response?.data?.error || '上傳失敗',
                });
            }
        }

        setIsGlbUploading(false);

        // 重新整理模型清單
        axios.get<FacilityModelItem[]>(`${API_BASE}/api/facility/models`, {
            params: { sceneId },
            headers: getAuthHeaders(),
            withCredentials: true,
        }).then(r => setSceneModels(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    };

    // ── 刪除模型 ──
    const handleDeleteModel = async (modelId: string) => {
        try {
            await axios.delete(`${API_BASE}/api/facility/models/${modelId}`, {
                headers: getAuthHeaders(),
                withCredentials: true,
            });
            setSceneModels(prev => prev.filter(m => m.id !== modelId));
            setDeleteConfirmModelId(null);
        } catch (e: any) {
            setModelListError(e?.response?.data?.error || '刪除失敗');
            setDeleteConfirmModelId(null);
        }
    };

    const pendingCount = glbQueue.filter(q => q.status === 'pending' || q.status === 'error').length;
    const doneCount = glbQueue.filter(q => q.status === 'done').length;

    const statusColor: Record<GlbQueueItem['status'], string> = {
        pending: '#64748b',
        uploading: '#2563eb',
        done: '#16a34a',
        error: '#dc2626',
    };
    const statusLabel: Record<GlbQueueItem['status'], string> = {
        pending: '待上傳',
        uploading: '上傳中',
        done: '完成',
        error: '失敗',
    };

    return (
        <div>
            {/* ── 場景選擇 ── */}
            <div className="dm-form-group">
                <label className="dm-form-label">目標場景 *</label>
                <SceneSelect scenes={scenes} value={sceneId} onChange={v => { setSceneId(v); setGlbQueue([]); }} />
            </div>

            {/* ══ 地形資料區塊 ══ */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>地形資料</div>

                {terrainError && <div className="dm-error" style={{ marginBottom: 8 }}>{terrainError}</div>}
                {terrainSuccess && <div style={{ color: '#16a34a', background: '#f0fdf4', padding: '6px 10px', borderRadius: 6, marginBottom: 8, fontSize: 12 }}>{terrainSuccess}</div>}

                {/* CSV */}
                <div className="dm-form-group">
                    <label className="dm-form-label">地形 CSV（x, y, elevation）*</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="dm-btn-cancel" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => csvInputRef.current?.click()}>選擇 CSV</button>
                        {csvFile ? <span style={{ fontSize: 12, color: '#059669' }}>{csvFile.name}</span> : <span style={{ fontSize: 12, color: '#9ca3af' }}>未選取</span>}
                        {csvFile && <button onClick={() => setCsvFile(null)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>移除</button>}
                    </div>
                    <input ref={csvInputRef} type="file" hidden accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
                </div>

                {/* 衛星影像 */}
                <div className="dm-form-group">
                    <label className="dm-form-label">衛星影像（可選）</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="dm-btn-cancel" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => satInputRef.current?.click()}>選擇影像</button>
                        {satelliteFile ? <span style={{ fontSize: 12, color: '#059669' }}>{satelliteFile.name}</span> : <span style={{ fontSize: 12, color: '#9ca3af' }}>未選取</span>}
                        {satelliteFile && <button onClick={() => setSatelliteFile(null)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>移除</button>}
                    </div>
                    <input ref={satInputRef} type="file" hidden accept=".tif,.tiff,.jpg,.jpeg,.png" onChange={e => setSatelliteFile(e.target.files?.[0] || null)} />
                </div>

                {/* 座標偏移 */}
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>座標偏移設定</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                            { label: 'Shift X', value: shiftX, onChange: setShiftX },
                            { label: 'Shift Y', value: shiftY, onChange: setShiftY },
                            { label: 'Shift Z', value: shiftZ, onChange: setShiftZ },
                            { label: 'Rotation (deg)', value: rotation, onChange: setRotation },
                        ].map(({ label, value, onChange }) => (
                            <div key={label} className="dm-form-group" style={{ margin: 0 }}>
                                <label className="dm-form-label">{label}</label>
                                <input className="dm-form-input" type="number" value={value} onChange={e => onChange(e.target.value)} step="0.1" />
                            </div>
                        ))}
                    </div>
                </div>

                {isUploading && (
                    <>
                        <div className="dm-progress-container" style={{ marginBottom: 4 }}>
                            <div className="dm-progress-bar" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>上傳中 {uploadProgress}%...</div>
                    </>
                )}

                <button className="dm-btn-confirm" onClick={handleTerrainSubmit} disabled={isUploading}>
                    {isUploading ? '上傳中...' : '上傳地形'}
                </button>
            </div>

            {/* ══ GLB / GLTF 模型批次上傳區塊 ══ */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>GLB / GLTF 模型上傳</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>可同時選取多個檔案，依序批次上傳至選取場景</div>

                {glbError && <div className="dm-error" style={{ marginBottom: 8 }}>{glbError}</div>}

                {/* 拖放區 */}
                <div
                    className={`dm-upload-zone${glbIsDragging ? ' dragging' : ''}`}
                    style={{ marginBottom: 10 }}
                    onDragOver={e => { e.preventDefault(); setGlbIsDragging(true); }}
                    onDragLeave={() => setGlbIsDragging(false)}
                    onDrop={e => {
                        e.preventDefault();
                        setGlbIsDragging(false);
                        addGlbFiles(e.dataTransfer.files);
                    }}
                    onClick={() => glbInputRef.current?.click()}
                >
                    <input
                        ref={glbInputRef}
                        type="file"
                        hidden
                        multiple
                        accept=".glb,.gltf"
                        onChange={e => {
                            if (e.target.files?.length) addGlbFiles(e.target.files);
                            e.target.value = '';
                        }}
                    />
                    <div className="dm-upload-icon">📦</div>
                    <div className="dm-upload-text">拖曳或點擊選取 GLB / GLTF 模型</div>
                    <div className="dm-upload-hint">支援多選，每檔上限 200 MB</div>
                </div>

                {/* 佇列清單 */}
                {glbQueue.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
                                {glbQueue.length} 個檔案
                                {doneCount > 0 && <span style={{ color: '#16a34a', marginLeft: 6 }}>（{doneCount} 完成）</span>}
                            </span>
                            <button
                                onClick={() => setGlbQueue(prev => prev.filter(q => q.status !== 'done'))}
                                style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                清除已完成
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                            {glbQueue.map(item => (
                                <div
                                    key={item.id}
                                    style={{
                                        background: 'white',
                                        border: `1px solid ${item.status === 'done' ? '#bbf7d0' : item.status === 'error' ? '#fecaca' : '#e2e8f0'}`,
                                        borderRadius: 6,
                                        padding: '8px 10px',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                        {/* 名稱可編輯 */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {item.status === 'pending' || item.status === 'error' ? (
                                                <input
                                                    className="dm-form-input"
                                                    style={{ fontSize: 12, padding: '3px 6px', marginBottom: 2 }}
                                                    value={item.name}
                                                    onChange={e => updateQueueItem(item.id, { name: e.target.value })}
                                                    placeholder="模型名稱"
                                                />
                                            ) : (
                                                <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.name}
                                                </div>
                                            )}
                                            <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                                {item.file.name} · {(item.file.size / 1024 / 1024).toFixed(1)} MB
                                            </div>
                                        </div>

                                        {/* 狀態標籤 */}
                                        <span style={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: statusColor[item.status],
                                            background: item.status === 'done' ? '#f0fdf4' : item.status === 'error' ? '#fef2f2' : item.status === 'uploading' ? '#eff6ff' : '#f8fafc',
                                            border: `1px solid ${statusColor[item.status]}30`,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            flexShrink: 0,
                                        }}>
                                            {statusLabel[item.status]}
                                        </span>

                                        {/* 移除按鈕 */}
                                        {item.status !== 'uploading' && (
                                            <button
                                                onClick={() => removeGlbItem(item.id)}
                                                style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 4px' }}
                                            >✕</button>
                                        )}
                                    </div>

                                    {/* 進度條 */}
                                    {item.status === 'uploading' && (
                                        <div style={{ marginTop: 6, background: '#e2e8f0', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: '#2563eb', borderRadius: 3, width: `${item.progress}%`, transition: 'width 0.2s' }} />
                                        </div>
                                    )}

                                    {/* 錯誤訊息 */}
                                    {item.status === 'error' && item.errorMsg && (
                                        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{item.errorMsg}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 上傳按鈕 */}
                {pendingCount > 0 && (
                    <button
                        className="dm-btn-confirm"
                        onClick={handleGlbUploadAll}
                        disabled={isGlbUploading || !sceneId}
                        title={!sceneId ? '請先選擇目標場景' : ''}
                    >
                        {isGlbUploading ? '上傳中...' : `批次上傳 ${pendingCount} 個模型`}
                    </button>
                )}
            </div>

            {/* ══ 已上傳模型清單 ══ */}
            {sceneId && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                        已上傳模型
                        {!isLoadingModels && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>（{sceneModels.length} 個）</span>}
                    </div>

                    {modelListError && <div className="dm-error" style={{ marginBottom: 8 }}>{modelListError}</div>}

                    {isLoadingModels && <div style={{ fontSize: 12, color: '#9ca3af' }}>載入中...</div>}

                    {!isLoadingModels && sceneModels.length === 0 && (
                        <div className="dm-empty">此場景尚無模型</div>
                    )}

                    {!isLoadingModels && sceneModels.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {sceneModels.map(m => (
                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px' }}>
                                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {m.name}
                                    </span>
                                    <button
                                        className="dm-file-btn dm-file-btn-delete"
                                        style={{ flexShrink: 0 }}
                                        onClick={() => setDeleteConfirmModelId(m.id)}
                                    >
                                        刪除
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 刪除確認 modal */}
            {deleteConfirmModelId && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal dm-modal-delete">
                        <div className="dm-modal-header"><h3 className="dm-modal-title">確認刪除模型</h3></div>
                        <div className="dm-modal-body">
                            <p>確定刪除「{sceneModels.find(m => m.id === deleteConfirmModelId)?.name}」？此操作無法復原。</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                                <button className="dm-btn-cancel" onClick={() => setDeleteConfirmModelId(null)}>取消</button>
                                <button
                                    style={{ background: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
                                    onClick={() => handleDeleteModel(deleteConfirmModelId)}
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
            {activeTab === 'info' && <ModelInfoDashboard projectId={projectId} />}
            {activeTab === 'terrain' && <SceneTerrainUploader projectId={projectId} />}
            {activeTab === 'manager' && <ModelManager projectId={projectId} />}
        </div>
    );
}
