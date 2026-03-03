/**
 * FacilityToolbar — Canvas 頂部工具列
 * 提供根場景導覽、編輯模式切換等功能。
 */
import React from 'react';
import { Home, Edit3, Camera } from 'lucide-react';
import { useFacilityStore } from '../../stores/facilityStore';

const FacilityToolbar: React.FC = () => {
    const {
        sceneStack,
        editMode,
        setEditMode,
        goToRoot,
        getBreadcrumbs,
    } = useFacilityStore();

    const breadcrumbs = getBreadcrumbs();
    const isAtRoot = sceneStack.length === 0;

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 48,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 12px',
                background: 'rgba(17, 24, 39, 0.80)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            {/* 根場景按鈕 — 非根場景時才顯示 */}
            {!isAtRoot && (
                <button
                    onClick={goToRoot}
                    title="返回根場景"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#e5e7eb',
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                >
                    <Home size={14} />
                    根場景
                </button>
            )}

            {/* 麵包屑導覽 */}
            {breadcrumbs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, overflow: 'hidden' }}>
                    {breadcrumbs.map((scene, idx) => (
                        <React.Fragment key={scene.id}>
                            {idx > 0 && (
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>/</span>
                            )}
                            <span
                                style={{
                                    color: idx === breadcrumbs.length - 1 ? '#f9fafb' : 'rgba(255,255,255,0.5)',
                                    fontSize: 13,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: 120,
                                }}
                            >
                                {scene.name}
                            </span>
                        </React.Fragment>
                    ))}
                </div>
            )}

            <div style={{ flex: 1 }} />

            {/* 編輯模式切換 */}
            <button
                onClick={() => setEditMode(!editMode)}
                title={editMode ? '關閉編輯模式' : '開啟編輯模式'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: editMode
                        ? '1px solid rgba(59,130,246,0.6)'
                        : '1px solid rgba(255,255,255,0.15)',
                    background: editMode
                        ? 'rgba(59,130,246,0.35)'
                        : 'rgba(255,255,255,0.08)',
                    color: editMode ? '#93c5fd' : '#e5e7eb',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                    if (!editMode) e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={e => {
                    if (!editMode) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
            >
                <Edit3 size={14} />
                {editMode ? '編輯中' : '編輯模式'}
            </button>

            {/* 截圖按鈕（Toolbar 在 Canvas 外，功能受限，顯示 disabled） */}
            <button
                disabled
                title="截圖（需在 Canvas 內執行）"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: 13,
                    cursor: 'not-allowed',
                }}
            >
                <Camera size={14} />
                截圖
            </button>
        </div>
    );
};

export default FacilityToolbar;
