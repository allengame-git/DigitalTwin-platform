/**
 * FacilityDataPage
 * @module pages/FacilityDataPage
 *
 * 設施導覽模組資料管理頁面
 * 權限：admin/engineer only
 */

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Layers, UploadCloud, FileText, Mountain, Settings } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useProjectStore } from '../stores/projectStore';
import FacilityUploadSection from '../components/data/FacilityUploadSection';
import '../styles/data-management.css';

export type FacilityTab = 'scenes' | 'models' | 'info' | 'terrain' | 'manager';

const tabItems: { key: FacilityTab; label: string; icon: React.ReactNode }[] = [
    { key: 'scenes', label: '場景管理', icon: <Layers size={14} /> },
    { key: 'models', label: '模型上傳', icon: <UploadCloud size={14} /> },
    { key: 'info', label: '模型資訊', icon: <FileText size={14} /> },
    { key: 'terrain', label: '場景地形', icon: <Mountain size={14} /> },
    { key: 'manager', label: '模型管理', icon: <Settings size={14} /> },
];

interface FacilityDataPageProps {
    moduleId?: string;
}

export const FacilityDataPage: React.FC<FacilityDataPageProps> = ({ moduleId }) => {
    const user = useAuthStore(state => state.user);
    const { projectCode } = useParams<{ projectCode: string }>();
    const { activeProjectId, projects, fetchProjects, getProjectByCode, setActiveProject } = useProjectStore();
    const [activeTab, setActiveTab] = useState<FacilityTab>('scenes');

    useEffect(() => {
        if (projects.length === 0) fetchProjects();
    }, [projects.length, fetchProjects]);

    const project = projectCode ? getProjectByCode(projectCode) : null;

    useEffect(() => {
        if (project) setActiveProject(project.id);
    }, [project, setActiveProject]);

    if (projects.length > 0 && !project) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-page)',
            }}>
                <h1 style={{ fontSize: '48px', color: '#e11d48' }}>404</h1>
                <p style={{ color: 'var(--gray-500)', marginBottom: '24px' }}>專案不存在</p>
                <Link to="/" style={{ color: 'var(--primary)' }}>返回專案列表</Link>
            </div>
        );
    }

    return (
        <div className="data-management-page">
            <header className="dm-header">
                <div className="dm-header-left">
                    <Link to={projectCode ? `/project/${projectCode}` : '/'} className="dm-back-btn">
                        <ChevronLeft size={16} />
                        返回{projectCode ? '專案' : '首頁'}
                    </Link>
                    <h1 className="dm-title">設施資料管理</h1>
                    {project && <span style={{ fontSize: '14px', color: 'var(--gray-500)' }}>- {project.name}</span>}
                </div>
                <div>
                    <span style={{ color: 'var(--gray-500)' }}>{user?.name}</span>
                </div>
            </header>

            <div className="dm-layout">
                {/* Sidebar navigation */}
                <nav className="dm-toc">
                    <div className="dm-toc-group">
                        <div className="dm-toc-group-label" style={{ color: 'var(--group-setup)' }}>設施導覽</div>
                        {tabItems.map(tab => (
                            <button
                                key={tab.key}
                                className={`dm-toc-item${activeTab === tab.key ? ' active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <span className="dm-toc-item-icon">{tab.icon}</span>
                                <span className="dm-toc-item-label">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Content */}
                <main className="dm-content">
                    {activeProjectId ? (
                        <FacilityUploadSection projectId={activeProjectId} activeTab={activeTab} />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--gray-500)' }}>
                            載入專案中...
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default FacilityDataPage;
