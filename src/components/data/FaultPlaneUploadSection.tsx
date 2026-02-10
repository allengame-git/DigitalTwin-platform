/**
 * FaultPlaneUploadSection
 * @module components/data/FaultPlaneUploadSection
 * 
 * 斷層面資料管理區塊
 */

import React, { useState, useRef, useEffect } from 'react';
import { useFaultPlaneStore, FaultPlane, FaultCoordinate, CreateFaultPlaneData, FaultPlaneImportRow } from '../../stores/faultPlaneStore';
import { useProjectStore } from '../../stores/projectStore';

interface FaultPlaneFormData {
    name: string;
    type: 'normal' | 'reverse' | 'strike-slip';
    dipAngle: string;
    dipDirection: string;
    depth: string;
    color: string;
}

const initialFormData: FaultPlaneFormData = {
    name: '',
    type: 'normal',
    dipAngle: '',
    dipDirection: '',
    depth: '',
    color: '#ff4444',
};

const typeLabels: Record<string, string> = {
    'normal': '正斷層',
    'reverse': '逆斷層',
    'strike-slip': '走滑斷層',
};

export const FaultPlaneUploadSection: React.FC = () => {
    const { faultPlanes, status, fetchFaultPlanes, createFaultPlane, updateFaultPlane, deleteFaultPlane, batchImport } = useFaultPlaneStore();
    const { activeProjectId } = useProjectStore();

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FaultPlaneFormData>(initialFormData);
    const [coordinates, setCoordinates] = useState<{ x: string; y: string; z: string }[]>([
        { x: '', y: '', z: '' },
        { x: '', y: '', z: '' },
    ]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [faultToDelete, setFaultToDelete] = useState<string | null>(null);

    // CSV Import
    const [showCsvImport, setShowCsvImport] = useState(false);
    const [csvData, setCsvData] = useState('');
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeProjectId) {
            fetchFaultPlanes(activeProjectId);
        }
    }, [activeProjectId, fetchFaultPlanes]);

    // Validation
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.name.trim()) errors.name = '請輸入斷層名稱';
        if (!formData.dipAngle || isNaN(Number(formData.dipAngle))) errors.dipAngle = '請輸入有效傾角';
        if (!formData.dipDirection || isNaN(Number(formData.dipDirection))) errors.dipDirection = '請輸入有效傾向';
        if (!formData.depth || isNaN(Number(formData.depth))) errors.depth = '請輸入有效深度';

        const validCoords = coordinates.filter(c => c.x && c.y && c.z);
        if (validCoords.length < 2) {
            errors.coordinates = '至少需要 2 個座標點';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Submit handler
    const handleSubmit = async () => {
        if (!validateForm() || !activeProjectId) return;

        setIsSubmitting(true);

        const coordsData = coordinates
            .filter(c => c.x && c.y && c.z)
            .map(c => ({
                x: parseFloat(c.x),
                y: parseFloat(c.y),
                z: parseFloat(c.z),
            }));

        const data: CreateFaultPlaneData = {
            name: formData.name,
            type: formData.type,
            dipAngle: parseFloat(formData.dipAngle),
            dipDirection: parseFloat(formData.dipDirection),
            depth: parseFloat(formData.depth),
            color: formData.color,
            coordinates: coordsData,
        };

        let success = false;
        if (editingId) {
            const result = await updateFaultPlane(editingId, data);
            success = result !== null;
        } else {
            const result = await createFaultPlane(activeProjectId, data);
            success = result !== null;
        }

        setIsSubmitting(false);

        if (success) {
            resetForm();
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData(initialFormData);
        setCoordinates([{ x: '', y: '', z: '' }, { x: '', y: '', z: '' }]);
        setFormErrors({});
    };

    const handleEdit = (fault: FaultPlane) => {
        setEditingId(fault.id);
        setFormData({
            name: fault.name,
            type: fault.type,
            dipAngle: String(fault.dipAngle),
            dipDirection: String(fault.dipDirection),
            depth: String(fault.depth),
            color: fault.color,
        });
        setCoordinates(
            fault.coordinates.map((c) => ({
                x: String(c.x),
                y: String(c.y),
                z: String(c.z),
            }))
        );
        setShowForm(true);
    };

    const handleDelete = async () => {
        if (!faultToDelete) return;
        await deleteFaultPlane(faultToDelete);
        setShowDeleteConfirm(false);
        setFaultToDelete(null);
    };

    // Coordinate handlers
    const addCoordinate = () => {
        setCoordinates([...coordinates, { x: '', y: '', z: '' }]);
    };

    const removeCoordinate = (index: number) => {
        if (coordinates.length > 2) {
            setCoordinates(coordinates.filter((_, i) => i !== index));
        }
    };

    const updateCoordinate = (index: number, field: 'x' | 'y' | 'z', value: string) => {
        const newCoords = [...coordinates];
        newCoords[index][field] = value;
        setCoordinates(newCoords);
    };

    // CSV Import
    const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            let text = event.target?.result as string;
            // Remove UTF-8 BOM if present
            if (text.startsWith('\uFEFF')) {
                text = text.substring(1);
            }
            setCsvData(text);
        };
        reader.readAsText(file);
    };

    const handleCsvImport = async () => {
        if (!csvData.trim() || !activeProjectId) return;

        const lines = csvData.trim().split('\n');
        if (lines.length < 2) {
            setImportResult({ success: 0, failed: 0 });
            return;
        }

        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows: FaultPlaneImportRow[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const row: any = {};
            header.forEach((h, idx) => {
                row[h] = values[idx]?.trim() || '';
            });
            if (row.name && row.coordinates) {
                rows.push(row as FaultPlaneImportRow);
            }
        }

        const result = await batchImport(activeProjectId, rows);
        setImportResult(result);
    };

    // Parse CSV line (handle quoted fields)
    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    // Styles
    const sectionStyle: React.CSSProperties = {
        background: '#fff',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0',
    };

    const buttonStyle: React.CSSProperties = {
        padding: '8px 16px',
        background: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
    };

    return (
        <div style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>斷層面資料</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowCsvImport(true)} style={{ ...buttonStyle, background: '#10b981' }}>
                        CSV 匯入
                    </button>
                    <button onClick={() => { resetForm(); setShowForm(true); }} style={buttonStyle}>
                        + 新增斷層
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
                共 {faultPlanes.length} 筆斷層資料
            </div>

            {/* Table */}
            {status === 'loading' ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>載入中...</div>
            ) : faultPlanes.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>尚無斷層資料</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>名稱</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>類型</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>傾角</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>傾向</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>深度</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>顏色</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faultPlanes.map((fault) => (
                                <tr key={fault.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '10px', fontWeight: 500 }}>{fault.name}</td>
                                    <td style={{ padding: '10px' }}>{typeLabels[fault.type] || fault.type}</td>
                                    <td style={{ padding: '10px', textAlign: 'right' }}>{fault.dipAngle}°</td>
                                    <td style={{ padding: '10px', textAlign: 'right' }}>{fault.dipDirection}°</td>
                                    <td style={{ padding: '10px', textAlign: 'right' }}>{fault.depth} m</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: fault.color, margin: '0 auto', border: '1px solid #ddd' }} />
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        <button onClick={() => handleEdit(fault)} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>編輯</button>
                                        <button onClick={() => { setFaultToDelete(fault.id); setShowDeleteConfirm(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>刪除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                            {editingId ? '編輯斷層' : '新增斷層'}
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>名稱 *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
                                {formErrors.name && <span style={{ fontSize: '12px', color: '#ef4444' }}>{formErrors.name}</span>}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>類型 *</label>
                                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} style={inputStyle}>
                                    <option value="normal">正斷層</option>
                                    <option value="reverse">逆斷層</option>
                                    <option value="strike-slip">走滑斷層</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>傾角 (°) *</label>
                                <input type="number" value={formData.dipAngle} onChange={(e) => setFormData({ ...formData, dipAngle: e.target.value })} style={inputStyle} min="0" max="90" />
                                {formErrors.dipAngle && <span style={{ fontSize: '12px', color: '#ef4444' }}>{formErrors.dipAngle}</span>}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>傾向 (°) *</label>
                                <input type="number" value={formData.dipDirection} onChange={(e) => setFormData({ ...formData, dipDirection: e.target.value })} style={inputStyle} min="0" max="360" />
                                {formErrors.dipDirection && <span style={{ fontSize: '12px', color: '#ef4444' }}>{formErrors.dipDirection}</span>}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>延伸深度 (m) *</label>
                                <input type="number" value={formData.depth} onChange={(e) => setFormData({ ...formData, depth: e.target.value })} style={inputStyle} min="0" />
                                {formErrors.depth && <span style={{ fontSize: '12px', color: '#ef4444' }}>{formErrors.depth}</span>}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>顏色</label>
                                <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} style={{ ...inputStyle, padding: '2px', height: '38px' }} />
                            </div>
                        </div>

                        {/* Coordinates */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 500 }}>座標點 (TWD97) * (至少 2 點)</label>
                                <button onClick={addCoordinate} style={{ padding: '4px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>+ 新增</button>
                            </div>
                            {formErrors.coordinates && <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>{formErrors.coordinates}</div>}
                            {coordinates.map((coord, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', width: '24px' }}>{idx + 1}.</span>
                                    <input type="number" placeholder="X (E)" value={coord.x} onChange={(e) => updateCoordinate(idx, 'x', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                                    <input type="number" placeholder="Y (N)" value={coord.y} onChange={(e) => updateCoordinate(idx, 'y', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                                    <input type="number" placeholder="Z (高程)" value={coord.z} onChange={(e) => updateCoordinate(idx, 'z', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                                    {coordinates.length > 2 && (
                                        <button onClick={() => removeCoordinate(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={resetForm} style={{ ...buttonStyle, background: '#f1f5f9', color: '#475569' }}>取消</button>
                            <button onClick={handleSubmit} disabled={isSubmitting} style={{ ...buttonStyle, opacity: isSubmitting ? 0.7 : 1 }}>
                                {isSubmitting ? '處理中...' : (editingId ? '儲存' : '新增')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '400px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#ef4444' }}>確認刪除</h3>
                        <p style={{ marginBottom: '24px', color: '#64748b' }}>確定要刪除這筆斷層資料嗎？此操作無法復原。</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowDeleteConfirm(false); setFaultToDelete(null); }} style={{ ...buttonStyle, background: '#f1f5f9', color: '#475569' }}>取消</button>
                            <button onClick={handleDelete} style={{ ...buttonStyle, background: '#ef4444' }}>刪除</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Import Modal */}
            {showCsvImport && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '600px', maxWidth: '90vw' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>CSV 批次匯入</h2>

                        <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                            <strong>CSV 格式規範：</strong>
                            <div style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                                name,type,dipAngle,dipDirection,depth,color,coordinates{'\n'}
                                主斷層,normal,70,90,200,#ff4444,&quot;[&#123;&quot;x&quot;:250000,&quot;y&quot;:2600000,&quot;z&quot;:0&#125;,...]&quot;
                            </div>
                        </div>

                        <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCsvFileSelect} style={{ marginBottom: '16px' }} />

                        {csvData && (
                            <div style={{ marginBottom: '16px' }}>
                                <textarea value={csvData} onChange={(e) => setCsvData(e.target.value)} style={{ ...inputStyle, height: '150px', fontFamily: 'monospace', fontSize: '12px' }} />
                            </div>
                        )}

                        {importResult && (
                            <div style={{ marginBottom: '16px', padding: '12px', background: importResult.failed > 0 ? '#fef3c7' : '#dcfce7', borderRadius: '8px' }}>
                                成功匯入 {importResult.success} 筆，失敗 {importResult.failed} 筆
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowCsvImport(false); setCsvData(''); setImportResult(null); }} style={{ ...buttonStyle, background: '#f1f5f9', color: '#475569' }}>關閉</button>
                            <button onClick={handleCsvImport} disabled={!csvData.trim()} style={{ ...buttonStyle, opacity: csvData.trim() ? 1 : 0.5 }}>匯入</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaultPlaneUploadSection;
