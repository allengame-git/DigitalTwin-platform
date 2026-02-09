/**
 * Project Selector
 * @module components/controls/ProjectSelector
 * 
 * 專案選擇下拉選單
 */

import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';

interface ProjectSelectorProps {
    /**
     * 選擇專案後導航到的頁面類型
     */
    targetPage?: 'geology' | 'data' | 'engineering' | 'simulation' | 'annotations';
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
    targetPage = 'geology'
}) => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const navigate = useNavigate();
    const {
        projects,
        loading,
        fetchProjects,
        setActiveProject,
        getProjectByCode
    } = useProjectStore();

    // 載入專案列表
    useEffect(() => {
        if (projects.length === 0) {
            fetchProjects();
        }
    }, [projects.length, fetchProjects]);

    // 當 URL 中有 projectCode 時，設定 activeProject
    useEffect(() => {
        if (projectCode) {
            const project = getProjectByCode(projectCode);
            if (project) {
                setActiveProject(project.id);
            }
        }
    }, [projectCode, projects, getProjectByCode, setActiveProject]);

    const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCode = e.target.value;
        if (selectedCode) {
            navigate(`/project/${selectedCode}/${targetPage}`);
        }
    };

    const currentProject = projectCode ? getProjectByCode(projectCode) : null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        }}>
            <label
                htmlFor="project-selector"
                style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#6b7280',
                }}
            >
                專案:
            </label>
            <select
                id="project-selector"
                value={projectCode || ''}
                onChange={handleProjectChange}
                disabled={loading}
                style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: 'pointer',
                    minWidth: '180px',
                    color: currentProject ? '#1f2937' : '#9ca3af',
                }}
            >
                <option value="" disabled>
                    {loading ? '載入中...' : '選擇專案'}
                </option>
                {projects.map((project) => (
                    <option key={project.id} value={project.code}>
                        {project.name}
                    </option>
                ))}
            </select>
            {currentProject && (
                <span style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    padding: '2px 6px',
                    background: '#f3f4f6',
                    borderRadius: '4px',
                }}>
                    {currentProject._count?.geologyModels || 0} 模型 | {currentProject._count?.imagery || 0} 航照
                </span>
            )}
        </div>
    );
};

export default ProjectSelector;
