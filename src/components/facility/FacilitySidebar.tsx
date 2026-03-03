/**
 * FacilitySidebar — 設施導覽側邊欄
 * 整合 BreadcrumbNav、SceneTree 與模型清單
 * @module components/facility/FacilitySidebar
 */

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Box, Layers } from 'lucide-react';
import { useFacilityStore } from '@/stores/facilityStore';
import BreadcrumbNav from './BreadcrumbNav';
import SceneTree from './SceneTree';
import PlanView from './PlanView';

const FacilitySidebar: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const { projectCode } = useParams<{ projectCode: string }>();

    const {
        models,
        selectedModelId,
        selectModel,
        currentSceneId,
        scenes,
        isLoading,
    } = useFacilityStore();

    const currentScene = scenes.find(s => s.id === currentSceneId);

    return (
        <aside
            style={{
                width: isCollapsed ? 50 : 280,
                minWidth: isCollapsed ? 50 : 280,
                height: '100%',
                background: 'white',
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
                zIndex: 50,
                transition: 'width 0.3s ease',
                position: 'relative',
            }}
        >
            {/* 收合按鈕 */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? '展開側邊欄' : '收合側邊欄'}
                style={{
                    position: 'absolute',
                    top: 12,
                    right: isCollapsed ? '50%' : -15,
                    transform: isCollapsed ? 'translateX(50%)' : 'none',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'white',
                    border: '1px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 60,
                    transition: 'all 0.3s ease',
                    color: '#4b5563',
                    fontSize: 16,
                }}
            >
                {isCollapsed ? '›' : '‹'}
            </button>

            {/* Header */}
            <div
                style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    height: isCollapsed ? 0 : 'auto',
                    transition: 'opacity 0.2s ease',
                }}
            >
                <div style={{ marginBottom: 8 }}>
                    <Link
                        to={projectCode ? `/project/${projectCode}` : '/'}
                        style={{
                            textDecoration: 'none',
                            color: '#4b5563',
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 500,
                        }}
                    >
                        ← 回到{projectCode ? '專案' : ''}儀表板
                    </Link>
                </div>
                <h1 style={{ margin: 0, fontSize: 18, color: '#111827', fontWeight: 700 }}>
                    {currentScene?.name ?? '設施導覽'}
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                    {models.length > 0 ? `${models.length} 個模型` : '互動式 3D 設施導覽'}
                </p>
            </div>

            {/* 收合時的直排文字 */}
            <div
                style={{
                    display: isCollapsed ? 'flex' : 'none',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 60,
                    opacity: isCollapsed ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
            >
                <div style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    color: '#4b5563',
                    letterSpacing: 2,
                    fontWeight: 600,
                    fontSize: 13,
                }}>
                    設施導覽模組
                </div>
            </div>

            {/* 可捲動內容區 */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    pointerEvents: isCollapsed ? 'none' : 'auto',
                    transition: 'opacity 0.2s ease',
                }}
            >
                {/* 麵包屑導覽 */}
                <div style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <BreadcrumbNav />
                </div>

                {/* 子場景 */}
                <section style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
                        <Layers size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#9ca3af',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            子場景
                        </span>
                    </div>
                    <div style={{ padding: '0 4px 4px' }}>
                        <SceneTree />
                    </div>
                </section>

                {/* 模型清單 */}
                <section style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
                        <Box size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#9ca3af',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            模型清單
                        </span>
                        {models.length > 0 && (
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
                                {models.length}
                            </span>
                        )}
                    </div>

                    {isLoading && (
                        <div style={{ padding: '8px 12px', fontSize: 12, color: '#9ca3af' }}>
                            載入中...
                        </div>
                    )}

                    {!isLoading && models.length === 0 && (
                        <div style={{ padding: '8px 12px', fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                            沒有模型
                        </div>
                    )}

                    {!isLoading && models.length > 0 && (
                        <ul style={{ listStyle: 'none', margin: 0, padding: '0 4px 4px' }}>
                            {models
                                .slice()
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map(model => {
                                    const isSelected = model.id === selectedModelId;
                                    const hasChildScene = model.childSceneId !== null;

                                    return (
                                        <li key={model.id}>
                                            <button
                                                onClick={() => selectModel(isSelected ? null : model.id)}
                                                title={model.name}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '7px 12px',
                                                    borderRadius: 4,
                                                    border: 'none',
                                                    background: isSelected ? '#2563eb' : 'transparent',
                                                    color: isSelected ? 'white' : '#374151',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'background 0.15s',
                                                    fontSize: 12,
                                                }}
                                                onMouseEnter={e => {
                                                    if (!isSelected) e.currentTarget.style.background = '#f3f4f6';
                                                }}
                                                onMouseLeave={e => {
                                                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <Box
                                                    size={13}
                                                    style={{
                                                        flexShrink: 0,
                                                        color: isSelected ? 'rgba(255,255,255,0.7)' : '#9ca3af',
                                                    }}
                                                />
                                                <span style={{
                                                    flex: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {model.name}
                                                </span>
                                                {hasChildScene && (
                                                    <ChevronRight
                                                        size={12}
                                                        style={{
                                                            flexShrink: 0,
                                                            color: isSelected ? 'rgba(255,255,255,0.5)' : '#d1d5db',
                                                        }}
                                                        title="包含子場景"
                                                    />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                        </ul>
                    )}
                </section>

                {/* 2D 平面圖 */}
                <PlanView />
            </div>

            {/* Footer */}
            <div
                style={{
                    padding: '10px 20px',
                    borderTop: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    fontSize: 11,
                    color: '#9ca3af',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    height: isCollapsed ? 0 : 'auto',
                    flexShrink: 0,
                }}
            >
                LLRWD DigitalTwin Platform v1.0
            </div>
        </aside>
    );
};

export default FacilitySidebar;
