/**
 * AttitudeUploadSection
 * @module components/data/AttitudeUploadSection
 *
 * 位態資料管理區塊
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAttitudeStore, AttitudeData, CreateAttitudeData, AttitudeImportRow } from '../../stores/attitudeStore';
import { useProjectStore } from '../../stores/projectStore';

interface AttitudeFormData {
    x: string;
    y: string;
    z: string;
    strike: string;
    dip: string;
    dipDirection: string;
    description: string;
}

const initialFormData: AttitudeFormData = {
    x: '',
    y: '',
    z: '',
    strike: '',
    dip: '',
    dipDirection: '',
    description: '',
};

const dipDirectionOptions = ['', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const AttitudeUploadSection: React.FC = () => {
    const { attitudes, status, fetchAttitudes, createAttitude, updateAttitude, deleteAttitude, batchImport } = useAttitudeStore();
    const { activeProjectId } = useProjectStore();

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<AttitudeFormData>(initialFormData);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [attitudeToDelete, setAttitudeToDelete] = useState<string | null>(null);

    // CSV Import
    const [showCsvImport, setShowCsvImport] = useState(false);
    const [csvData, setCsvData] = useState('');
    const [importResult, setImportResult] = useState<{ success: number; failed: number; duplicates: number } | null>(null);
    const [hasImported, setHasImported] = useState(false);
    const csvInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeProjectId) {
            fetchAttitudes(activeProjectId);
        }
    }, [activeProjectId, fetchAttitudes]);

    // Validation
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.x || isNaN(Number(formData.x))) errors.x = '請輸入有效 X 座標';
        if (!formData.y || isNaN(Number(formData.y))) errors.y = '請輸入有效 Y 座標';
        if (!formData.z || isNaN(Number(formData.z))) errors.z = '請輸入有效高程';
        if (!formData.strike || isNaN(Number(formData.strike))) errors.strike = '請輸入走向';
        else if (Number(formData.strike) < 0 || Number(formData.strike) > 360) errors.strike = '走向需介於 0-360';
        if (!formData.dip || isNaN(Number(formData.dip))) errors.dip = '請輸入傾角';
        else if (Number(formData.dip) < 0 || Number(formData.dip) > 90) errors.dip = '傾角需介於 0-90';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Submit handler
    const handleSubmit = async () => {
        if (!validateForm() || !activeProjectId) return;

        setIsSubmitting(true);

        const data: CreateAttitudeData = {
            x: parseFloat(formData.x),
            y: parseFloat(formData.y),
            z: parseFloat(formData.z),
            strike: parseFloat(formData.strike),
            dip: parseFloat(formData.dip),
            dipDirection: formData.dipDirection || undefined,
            description: formData.description || undefined,
        };

        let success = false;
        if (editingId) {
            const result = await updateAttitude(editingId, data);
            success = result !== null;
        } else {
            const result = await createAttitude(activeProjectId, data);
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
        setFormErrors({});
    };

    const handleEdit = (att: AttitudeData) => {
        setEditingId(att.id);
        setFormData({
            x: String(att.x),
            y: String(att.y),
            z: String(att.z),
            strike: String(att.strike),
            dip: String(att.dip),
            dipDirection: att.dipDirection || '',
            description: att.description || '',
        });
        setShowForm(true);
    };

    const handleDelete = async () => {
        if (!attitudeToDelete) return;
        await deleteAttitude(attitudeToDelete);
        setShowDeleteConfirm(false);
        setAttitudeToDelete(null);
    };

    // CSV Import
    const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            let content = event.target?.result as string;
            // Remove BOM if present
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
            }
            setCsvData(content);
            setHasImported(false); // Reset imported state on new file
            setImportResult(null);
        };
        reader.readAsText(file);
    };

    const handleCsvImport = async () => {
        if (!csvData.trim() || !activeProjectId) return;

        const lines = csvData.trim().split('\n');
        if (lines.length < 2) {
            setImportResult({ success: 0, failed: 0, duplicates: 0 });
            return;
        }

        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows: AttitudeImportRow[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 5) continue;

            const row: any = {};
            header.forEach((h, idx) => {
                row[h] = values[idx]?.trim() || '';
            });

            // 必填欄位檢查
            if (row.x && row.y && row.z && row.strike && row.dip) {
                rows.push({
                    x: row.x,
                    y: row.y,
                    z: row.z,
                    strike: row.strike,
                    dip: row.dip,
                    dipDirection: row.dipdirection || row.dipDirection || '',
                    description: row.description || '',
                } as AttitudeImportRow);
            }
        }

        if (rows.length === 0) {
            setImportResult({ success: 0, failed: 0, duplicates: 0 });
            return;
        }

        const result = await batchImport(activeProjectId, rows);
        setImportResult(result);

        if (result.success > 0 || result.duplicates > 0) {
            setHasImported(true);
        }
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
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>位態資料 (Strike/Dip)</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                        共 {attitudes.length} 筆位態資料
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowCsvImport(true)} style={{ ...buttonStyle, background: '#10b981' }}>
                        CSV 匯入
                    </button>
                    <button onClick={() => { resetForm(); setShowForm(true); }} style={buttonStyle}>
                        + 新增位態
                    </button>
                </div>
            </div>

            {/* Table */}
            {status === 'loading' ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>載入中...</div>
            ) : attitudes.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>尚無位態資料，請新增或匯入 CSV</div>
            ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '14px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>X</th>
                                <th style={{ padding: '12px 10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Y</th>
                                <th style={{ padding: '12px 10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Z</th>
                                <th style={{ padding: '12px 10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>走向</th>
                                <th style={{ padding: '12px 10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>傾角</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>傾向</th>
                                <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>備註</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attitudes.map((att) => (
                                <tr key={att.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>{att.x.toFixed(0)}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>{att.y.toFixed(0)}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{att.z.toFixed(1)}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{att.strike}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{att.dip}</td>
                                    <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>{att.dipDirection || '-'}</td>
                                    <td style={{ padding: '10px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid #e2e8f0' }}>{att.description || '-'}</td>
                                    <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #e2e8f0' }}>
                                        <button onClick={() => handleEdit(att)} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>編輯</button>
                                        <button onClick={() => { setAttitudeToDelete(att.id); setShowDeleteConfirm(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>刪除</button>
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
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                            {editingId ? '編輯位態' : '新增位態'}
                        </h2>

                        {/* Coordinates */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>TWD97 座標 *</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                <div>
                                    <input type="number" placeholder="X (E)" value={formData.x} onChange={(e) => setFormData({ ...formData, x: e.target.value })} style={inputStyle} />
                                    {formErrors.x && <span style={{ fontSize: '12px', color: '#ef4444' }}>{formErrors.x}</span>}
                                </div>
                                <div>
                                    <input type="number" placeholder="Y (N)" value={formData.y} onChange={(e) => setFormData({ ...formData, y: e.target.value })} style={inputStyle} />
                                    {formErrors.y && <span style={{ fontSize: '12px', color: '#ef4444' }}>{formErrors.y}</span>}
                                </div>
                                <div>
                                    <input type="number" placeholder="Z (高程)" value={formData.z} onChange={(e) => setFormData({ ...formData, z: e.target.value })} style={inputStyle} />
                                    {formErrors.z && <span style={{ fontSize: '12px', color: '#ef4444' }}>{formErrors.z}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Strike & Dip */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>走向 (0-360) *</label>
                                <input type="number" value={formData.strike} onChange={(e) => setFormData({ ...formData, strike: e.target.value })} style={inputStyle} min="0" max="360" step="1" />
                                {formErrors.strike && <span style={{ fontSize: '12px', color: '#ef4444' }}>{formErrors.strike}</span>}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>傾角 (0-90) *</label>
                                <input type="number" value={formData.dip} onChange={(e) => setFormData({ ...formData, dip: e.target.value })} style={inputStyle} min="0" max="90" step="1" />
                                {formErrors.dip && <span style={{ fontSize: '12px', color: '#ef4444' }}>{formErrors.dip}</span>}
                            </div>
                        </div>

                        {/* DipDirection & Description */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>傾向</label>
                                <select value={formData.dipDirection} onChange={(e) => setFormData({ ...formData, dipDirection: e.target.value })} style={inputStyle}>
                                    {dipDirectionOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt || '-- 選擇 --'}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>備註</label>
                                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={inputStyle} placeholder="e.g. 節理面" />
                            </div>
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
                        <p style={{ marginBottom: '24px', color: '#64748b' }}>確定要刪除這筆位態資料嗎？此操作無法復原。</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowDeleteConfirm(false); setAttitudeToDelete(null); }} style={{ ...buttonStyle, background: '#f1f5f9', color: '#475569' }}>取消</button>
                            <button onClick={handleDelete} style={{ ...buttonStyle, background: '#ef4444' }}>刪除</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Import Modal */}
            {showCsvImport && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '600px', maxWidth: '90vw' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>CSV 批次匯入位態資料</h2>

                        <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                            <strong>CSV 格式規範：</strong>
                            <div style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                                x,y,z,strike,dip,dipDirection,description{'\n'}
                                250200,2600100,10,45,30,NE,節理面-1{'\n'}
                                250400,2600300,15,120,45,SE,節理面-2
                            </div>
                            <div style={{ marginTop: '8px', color: '#64748b' }}>
                                必填: x, y, z, strike, dip　選填: dipDirection, description
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
                                {importResult.duplicates > 0 && <span style={{ color: '#d97706', marginLeft: '8px' }}> (重複略過 {importResult.duplicates} 筆)</span>}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowCsvImport(false); setCsvData(''); setImportResult(null); setHasImported(false); if (csvInputRef.current) csvInputRef.current.value = ''; }} style={{ ...buttonStyle, background: '#f1f5f9', color: '#475569' }}>關閉</button>
                            <button onClick={handleCsvImport} disabled={!csvData.trim() || hasImported} style={{ ...buttonStyle, opacity: (!csvData.trim() || hasImported) ? 0.5 : 1 }}>
                                {hasImported ? '已匯入' : '匯入'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttitudeUploadSection;
