/**
 * BreadcrumbNav — 設施導覽麵包屑元件
 * 顯示當前場景的導覽路徑，允許點擊跳轉至任意層級
 * @module components/facility/BreadcrumbNav
 */

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useFacilityStore } from '@/stores/facilityStore';

const BreadcrumbNav: React.FC = () => {
    const { scenes, sceneStack, currentSceneId, enterScene, goToRoot } = useFacilityStore();

    // 從 sceneStack + currentSceneId 建立完整麵包屑路徑
    const breadcrumbs = [...sceneStack, currentSceneId]
        .filter(Boolean)
        .map(id => scenes.find(s => s.id === id))
        .filter(Boolean) as typeof scenes;

    if (breadcrumbs.length === 0) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', color: '#9ca3af', fontSize: 12 }}>
                <Home size={12} />
                <span>尚未選擇場景</span>
            </div>
        );
    }

    const handleClick = (index: number, sceneId: string) => {
        if (index === breadcrumbs.length - 1) return;
        if (index === 0) {
            goToRoot();
        } else {
            const targetStack = sceneStack.slice(0, index);
            useFacilityStore.setState({
                currentSceneId: sceneId,
                sceneStack: targetStack,
                selectedModelId: null,
                hoveredModelId: null,
                editingModelId: null,
            });
            useFacilityStore.getState().fetchModels(sceneId);
        }
    };

    return (
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 12px', flexWrap: 'wrap' }} aria-label="場景導覽">
            <button
                onClick={() => goToRoot()}
                title="回到根場景"
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: 2,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            >
                <Home size={12} />
            </button>
            {breadcrumbs.map((scene, index) => (
                <React.Fragment key={scene.id}>
                    <ChevronRight size={12} style={{ color: '#d1d5db', flexShrink: 0 }} />
                    {index === breadcrumbs.length - 1 ? (
                        <span
                            title={scene.name}
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#111827',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 120,
                            }}
                        >
                            {scene.name}
                        </span>
                    ) : (
                        <button
                            onClick={() => handleClick(index, scene.id)}
                            title={scene.name}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 12,
                                color: '#6b7280',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 100,
                                padding: 0,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                        >
                            {scene.name}
                        </button>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default BreadcrumbNav;
