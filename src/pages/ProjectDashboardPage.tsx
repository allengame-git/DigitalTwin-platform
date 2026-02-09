/**
 * ProjectDashboardPage
 * @module pages/ProjectDashboardPage
 * 
 * 專案 Dashboard - 顯示專案資訊和功能入口
 */

import React, { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProjectStore } from '../stores/projectStore';
import { RoleBasedUI } from '../components/auth/RoleBasedUI';

const ROLE_LABELS: Record<string, string> = {
    admin: '管理員',
    engineer: '工程師',
    reviewer: '審查委員',
};

export const ProjectDashboardPage: React.FC = () => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { projects, fetchProjects, getProjectByCode, setActiveProject } = useProjectStore();

    // 載入專案列表
    useEffect(() => {
        if (projects.length === 0) {
            fetchProjects();
        }
    }, [projects.length, fetchProjects]);

    // 設定當前專案
    const project = projectCode ? getProjectByCode(projectCode) : null;

    useEffect(() => {
        if (project) {
            setActiveProject(project.id);
        }
    }, [project, setActiveProject]);

    // 專案不存在
    if (projects.length > 0 && !project) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc'
            }}>
                <h1 style={{ fontSize: '48px', color: '#e11d48' }}>404</h1>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>專案不存在</p>
                <Link to="/" style={{ color: '#2563eb' }}>返回專案列表</Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <header style={{
                background: '#fff',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/" style={{
                        fontSize: '20px',
                        fontWeight: 600,
                        color: '#0f172a',
                        textDecoration: 'none'
                    }}>
                        LLRWD DigitalTwin
                    </Link>
                    {project && (
                        <>
                            <span style={{ color: '#cbd5e1' }}>/</span>
                            <span style={{ fontSize: '16px', color: '#475569' }}>{project.name}</span>
                        </>
                    )}
                </div>
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 500, color: '#334155' }}>{user.name}</span>
                        <span style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontWeight: 500,
                            background: user.role === 'admin' ? '#fef3c7' : user.role === 'engineer' ? '#dbeafe' : '#dcfce7',
                            color: user.role === 'admin' ? '#92400e' : user.role === 'engineer' ? '#1e40af' : '#166534',
                        }}>
                            {ROLE_LABELS[user.role] || user.role}
                        </span>
                        <button
                            onClick={() => logout()}
                            style={{
                                padding: '8px 16px',
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                color: '#64748b',
                                cursor: 'pointer',
                            }}
                        >
                            登出
                        </button>
                    </div>
                )}
            </header>

            {/* Content */}
            <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* 專案資訊 */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <Link to="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
                            ← 返回專案列表
                        </Link>
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                        {project?.name || '載入中...'}
                    </h1>
                    <p style={{ fontSize: '16px', color: '#64748b' }}>
                        {project?.description || '選擇下方功能開始使用'}
                    </p>
                    {project && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                            <span>{project._count?.geologyModels || 0} 個地質模型</span>
                            <span>|</span>
                            <span>{project._count?.boreholes || 0} 筆鑽探資料</span>
                            <span>|</span>
                            <span>{project._count?.imagery || 0} 張航照圖</span>
                            <span>|</span>
                            <span>{project._count?.geophysics || 0} 筆探勘剖面</span>
                        </div>
                    )}
                </div>

                {/* 功能卡片 */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '20px'
                }}>
                    {/* 地質資料 */}
                    <div
                        onClick={() => navigate(`/project/${projectCode}/geology`)}
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            fontSize: '24px'
                        }}>🗺️</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                            地質資料
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                            檢視鑽孔資料、地層分布與地質構造
                        </p>
                    </div>

                    {/* 工程設計 */}
                    <div
                        onClick={() => navigate(`/project/${projectCode}/engineering`)}
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: '#dbeafe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            fontSize: '24px'
                        }}>🏗️</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                            工程設計
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                            檢視壩體、廠房與隧道設計模型
                        </p>
                    </div>

                    {/* 模擬分析 */}
                    <div
                        onClick={() => navigate(`/project/${projectCode}/simulation`)}
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: '#fef3c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            fontSize: '24px'
                        }}>📊</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                            模擬分析
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                            檢視流場、應力與水位模擬結果
                        </p>
                    </div>

                    {/* 審查標註 */}
                    <div
                        onClick={() => navigate(`/project/${projectCode}/annotations`)}
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: '#fce7f3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            fontSize: '24px'
                        }}>📝</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                            審查標註
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                            檢視與管理審查標註
                        </p>
                    </div>

                    {/* 資料管理 - Admin/Engineer only */}
                    <RoleBasedUI allowedRoles={['admin', 'engineer']}>
                        <div
                            onClick={() => navigate(`/project/${projectCode}/data`)}
                            style={{
                                background: '#fff',
                                borderRadius: '12px',
                                padding: '24px',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: '#e0e7ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '16px',
                                fontSize: '24px'
                            }}>📁</div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                                資料管理
                            </h3>
                            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                                上傳與管理地質模型、航照圖、探查資料
                            </p>
                        </div>
                    </RoleBasedUI>
                </div>
            </main>
        </div>
    );
};

export default ProjectDashboardPage;
