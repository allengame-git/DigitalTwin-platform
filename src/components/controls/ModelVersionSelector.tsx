/**
 * ModelVersionSelector Component
 * @module components/controls/ModelVersionSelector
 */

import React, { useEffect } from 'react';
import { useUploadStore } from '../../stores/uploadStore';

export const ModelVersionSelector: React.FC = () => {
    const {
        geologyModels,
        activeGeologyModelId,
        fetchGeologyModels,
        activateGeologyModel,
    } = useUploadStore();

    useEffect(() => {
        fetchGeologyModels();
    }, [fetchGeologyModels]);

    const completedModels = geologyModels.filter(m => m.conversionStatus === 'completed');
    const activeModel = geologyModels.find(m => m.id === activeGeologyModelId);

    if (completedModels.length === 0) {
        return (
            <div style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                    🧊 3D 地質模型
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    尚無可用模型，請至資料管理頁面上傳
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                🧊 3D 地質模型版本
            </div>
            <select
                value={activeGeologyModelId || ''}
                onChange={(e) => {
                    if (e.target.value) activateGeologyModel(e.target.value);
                }}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: 'white',
                    cursor: 'pointer',
                }}
            >
                <option value="" disabled>選擇模型版本</option>
                {completedModels.map(m => (
                    <option key={m.id} value={m.id}>
                        v{m.version} - {m.name} ({m.year}年)
                    </option>
                ))}
            </select>
            {activeModel && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
                    目前使用: v{activeModel.version} · {activeModel.name}
                </div>
            )}
        </div>
    );
};

export default ModelVersionSelector;
