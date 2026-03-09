/**
 * FacilityDataPage
 * @module pages/FacilityDataPage
 *
 * 設施導覽模組資料管理頁面
 * 權限：admin/engineer only
 */

import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useProjectStore } from '../stores/projectStore';
import FacilityUploadSection from '../components/data/FacilityUploadSection';

export const FacilityDataPage: React.FC = () => {
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);
    const { projectCode } = useParams<{ projectCode: string }>();
    const { activeProjectId, projects, fetchProjects, getProjectByCode, setActiveProject } = useProjectStore();

    useEffect(() => {
        if (projects.length === 0) {
            fetchProjects();
        }
    }, [projects.length, fetchProjects]);

    const project = projectCode ? getProjectByCode(projectCode) : null;

    useEffect(() => {
        if (project) {
            setActiveProject(project.id);
        }
    }, [project, setActiveProject]);

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
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
            {/* Header */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 50,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link
                        to={projectCode ? `/project/${projectCode}` : '/'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            background: '#f3f4f6',
                            border: '1px solid transparent',
                            borderRadius: '6px',
                            color: '#4b5563',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            textDecoration: 'none',
                        }}
                    >
                        <ChevronLeft size={16} />
                        返回{projectCode ? '專案' : '首頁'}
                    </Link>
                    <h1 style={{
                        fontSize: '20px',
                        fontWeight: 600,
                        color: '#111827',
                        letterSpacing: '-0.025em',
                        margin: 0,
                    }}>
                        設施資料管理
                    </h1>
                    {project && (
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>
                            - {project.name}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#64748b' }}>{user?.name}</span>
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
            </header>

            {/* Content */}
            <main style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
                {activeProjectId ? (
                    <FacilityUploadSection projectId={activeProjectId} />
                ) : (
                    <div style={{ textAlign: 'center', padding: '64px 0', color: '#6b7280' }}>
                        載入專案中...
                    </div>
                )}
            </main>
        </div>
    );
};

export default FacilityDataPage;
