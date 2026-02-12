/**
 * Geology Page
 * @module pages/GeologyPage
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { GeologyCanvas } from '../components/scene/GeologyCanvas';
import { GeologyErrorBoundary } from '../components/scene/GeologyErrorBoundary';
import { InspectorPanel } from '../components/overlay/InspectorPanel';
import { GeologySidebar } from '../components/layout/GeologySidebar';
import { useProjectStore } from '../stores/projectStore';
import { useLithologyStore } from '../stores/lithologyStore';
import { useTerrainStore } from '../stores/terrainStore';

export const GeologyPage: React.FC = () => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const { projects, setActiveProject } = useProjectStore();
    const { fetchLithologies } = useLithologyStore();
    const { fetchTerrains } = useTerrainStore();

    // 同步專案狀態與岩性資料 / 地形資料
    React.useEffect(() => {
        if (projectCode) {
            const project = projects.find(p => p.code === projectCode);
            if (project) {
                setActiveProject(project.id);
                fetchLithologies(project.id); // 確保獲取岩性設定，支援 3D 模型動態上色
                fetchTerrains(project.id);    // 獲取地形資料
            }
        }
    }, [projectCode, projects, setActiveProject, fetchLithologies, fetchTerrains]);

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

                {/* 統一資料檢視面板 (右下角) */}
                <InspectorPanel />
            </div>
        </div>
    );
};

export default GeologyPage;
