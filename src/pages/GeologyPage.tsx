/**
 * Geology Page
 * @module pages/GeologyPage
 */

import React from 'react';
import { GeologyCanvas } from '../components/scene/GeologyCanvas';
import { GeologyErrorBoundary } from '../components/scene/GeologyErrorBoundary';
import { BoreholeDetail } from '../components/overlay/BoreholeDetail';
import { GeologySidebar } from '../components/layout/GeologySidebar';
import { useParams } from 'react-router-dom';
import { useBoreholeStore } from '../stores/boreholeStore';
import { useProjectStore } from '../stores/projectStore';

export const GeologyPage: React.FC = () => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const { projects, setActiveProject } = useProjectStore();
    const { selectedBorehole } = useBoreholeStore();

    // 同步專案狀態
    React.useEffect(() => {
        if (projectCode) {
            const project = projects.find(p => p.code === projectCode);
            if (project) {
                setActiveProject(project.id);
            }
        }
    }, [projectCode, projects, setActiveProject]);

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
            {/* 左側整合側邊欄 */}
            <GeologySidebar />

            {/* 右側 3D 畫布區域 */}
            <div style={{ flex: 1, position: 'relative' }}>
                {/* 3D 場景 - 包裹 ErrorBoundary */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'auto' }}>
                    <GeologyErrorBoundary>
                        <GeologyCanvas showStats />
                    </GeologyErrorBoundary>
                </div>

                {/* 詳細資料面板 (Overlay) - 仍保留在右側懸浮 */}
                <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                    {selectedBorehole && (
                        <div style={{ pointerEvents: 'auto', height: '100%', background: 'white' }}>
                            <BoreholeDetail />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeologyPage;

