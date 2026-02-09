/**
 * 岩性設定區塊
 * @module components/data/LithologySection
 */

import React, { useState, useEffect } from 'react';
import { useLithologyStore, ProjectLithology } from '../../stores/lithologyStore';
import { useProjectStore } from '../../stores/projectStore';

const LithologySection: React.FC = () => {
    const { lithologies, status, fetchLithologies, createLithology, updateLithology, deleteLithology, initDefaults, error } = useLithologyStore();
    const { activeProjectId } = useProjectStore();

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        lithId: '',
        code: '',
        name: '',
        color: '#888888'
    });

    useEffect(() => {
        if (activeProjectId) {
            fetchLithologies(activeProjectId);
        }
    }, [activeProjectId, fetchLithologies]);

    const handleSubmit = async () => {
        if (!activeProjectId) return;

        const data = {
            lithId: parseInt(formData.lithId),
            code: formData.code.toUpperCase(),
            name: formData.name,
            color: formData.color
        };

        if (editingId) {
            await updateLithology(editingId, data);
        } else {
            await createLithology(activeProjectId, data);
        }

        resetForm();
    };

    const handleEdit = (lith: ProjectLithology) => {
        setEditingId(lith.id);
        setFormData({
            lithId: lith.lithId.toString(),
            code: lith.code,
            name: lith.name,
            color: lith.color
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('確定要刪除此岩性嗎？')) {
            await deleteLithology(id);
        }
    };

    const handleInitDefaults = async () => {
        if (!activeProjectId) return;
        if (lithologies.length > 0) {
            alert('專案已有岩性資料，無法載入預設值');
            return;
        }
        await initDefaults(activeProjectId);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ lithId: '', code: '', name: '', color: '#888888' });
    };

    const getNextLithId = () => {
        if (lithologies.length === 0) return 1;
        return Math.max(...lithologies.map(l => l.lithId)) + 1;
    };

    return (
        <section className="dm-section">
            <div className="dm-section-header">
                <div>
                    <h2 className="dm-section-title">岩性設定</h2>
                    <p className="dm-section-desc">自訂專案岩性代碼、名稱與顏色</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {lithologies.length === 0 && (
                        <button
                            className="dm-btn dm-btn-secondary"
                            onClick={handleInitDefaults}
                        >
                            載入預設值
                        </button>
                    )}
                    <button
                        className="dm-btn dm-btn-primary"
                        onClick={() => {
                            setFormData(prev => ({ ...prev, lithId: getNextLithId().toString() }));
                            setShowForm(true);
                        }}
                    >
                        + 新增岩性
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '16px' }}>
                    {error}
                </div>
            )}

            {status === 'loading' ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>載入中...</div>
            ) : lithologies.length === 0 ? (
                <div className="dm-empty-state">
                    <p>尚無岩性資料，請點擊「載入預設值」或手動新增</p>
                </div>
            ) : (
                <div className="dm-table-wrapper">
                    <table className="dm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>ID</th>
                                <th style={{ width: '80px' }}>代碼</th>
                                <th>名稱</th>
                                <th style={{ width: '100px' }}>顏色</th>
                                <th style={{ width: '100px' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lithologies.map(lith => (
                                <tr key={lith.id}>
                                    <td>{lith.lithId}</td>
                                    <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{lith.code}</code></td>
                                    <td>{lith.name}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '4px',
                                                background: lith.color,
                                                border: '1px solid #e5e7eb'
                                            }} />
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>{lith.color}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                onClick={() => handleEdit(lith)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '13px' }}
                                            >
                                                編輯
                                            </button>
                                            <button
                                                onClick={() => handleDelete(lith.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px' }}
                                            >
                                                刪除
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 新增/編輯 Modal */}
            {showForm && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="dm-modal-header">
                            <h3 className="dm-modal-title">{editingId ? '編輯岩性' : '新增岩性'}</h3>
                            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>✕</button>
                        </div>
                        <div className="dm-modal-body">
                            <div className="dm-form-group">
                                <label className="dm-form-label">岩性 ID *</label>
                                <input
                                    type="number"
                                    className="dm-form-input"
                                    value={formData.lithId}
                                    onChange={e => setFormData(prev => ({ ...prev, lithId: e.target.value }))}
                                    placeholder="1"
                                />
                            </div>
                            <div className="dm-form-group">
                                <label className="dm-form-label">岩性代碼 *</label>
                                <input
                                    type="text"
                                    className="dm-form-input"
                                    value={formData.code}
                                    onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="CL"
                                    maxLength={10}
                                />
                            </div>
                            <div className="dm-form-group">
                                <label className="dm-form-label">岩性名稱 *</label>
                                <input
                                    type="text"
                                    className="dm-form-input"
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="黏土"
                                />
                            </div>
                            <div className="dm-form-group">
                                <label className="dm-form-label">顏色 *</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                        style={{ width: '48px', height: '36px', padding: '2px', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer' }}
                                    />
                                    <input
                                        type="text"
                                        className="dm-form-input"
                                        value={formData.color}
                                        onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                        placeholder="#8b4513"
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="dm-modal-footer">
                            <button className="dm-btn dm-btn-secondary" onClick={resetForm}>取消</button>
                            <button
                                className="dm-btn dm-btn-primary"
                                onClick={handleSubmit}
                                disabled={!formData.lithId || !formData.code || !formData.name}
                            >
                                {editingId ? '更新' : '新增'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default LithologySection;
