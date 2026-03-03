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
            <div className="flex items-center gap-1 px-3 py-2 text-gray-400 text-xs">
                <Home size={12} />
                <span>尚未選擇場景</span>
            </div>
        );
    }

    const handleClick = (index: number, sceneId: string) => {
        // 最後一個（當前場景）不可點擊
        if (index === breadcrumbs.length - 1) return;

        // 若點擊根場景，使用 goToRoot
        if (index === 0) {
            goToRoot();
        } else {
            // 重新進入該場景（enterScene 會重設 stack）
            // 先跳至 root，再依序進入到目標層級
            // 簡化做法：直接呼叫 enterScene，但需要正確重設 sceneStack
            // 使用 store 的 enterScene 並先手動重設狀態
            const targetStack = sceneStack.slice(0, index);
            // 直接操作：先 goToRoot，再依序 enterScene
            // 為避免多次 API 呼叫，採用直接設定 store 狀態的方式
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
        <nav className="flex items-center gap-0.5 px-3 py-2 flex-wrap" aria-label="場景導覽">
            <button
                onClick={() => goToRoot()}
                className="text-gray-400 hover:text-gray-100 transition-colors p-0.5 rounded"
                title="回到根場景"
            >
                <Home size={12} />
            </button>
            {breadcrumbs.map((scene, index) => (
                <React.Fragment key={scene.id}>
                    <ChevronRight size={12} className="text-gray-600 flex-shrink-0" />
                    {index === breadcrumbs.length - 1 ? (
                        // 當前場景：粗體不可點擊
                        <span
                            className="text-gray-100 text-xs font-semibold truncate max-w-[120px]"
                            title={scene.name}
                        >
                            {scene.name}
                        </span>
                    ) : (
                        // 上層場景：可點擊
                        <button
                            onClick={() => handleClick(index, scene.id)}
                            className="text-gray-400 hover:text-gray-100 text-xs transition-colors truncate max-w-[100px]"
                            title={scene.name}
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
