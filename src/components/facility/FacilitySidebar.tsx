/**
 * FacilitySidebar — 設施導覽側邊欄
 * 整合 BreadcrumbNav、SceneTree 與模型清單
 * @module components/facility/FacilitySidebar
 */

import React from 'react';
import { ChevronRight, Box, Layers, Map, Loader2 } from 'lucide-react';
import { useFacilityStore } from '@/stores/facilityStore';
import BreadcrumbNav from './BreadcrumbNav';
import SceneTree from './SceneTree';
import PlanView from './PlanView';

const FacilitySidebar: React.FC = () => {
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
            style={{ width: 260, minWidth: 260, maxWidth: 260 }}
            className="h-full bg-gray-900 border-r border-gray-700 flex flex-col overflow-hidden"
        >
            {/* 頂部標題 */}
            <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-700 flex-shrink-0">
                <Map size={15} className="text-blue-400 flex-shrink-0" />
                <span className="text-gray-100 text-sm font-medium truncate">
                    {currentScene?.name ?? '設施導覽'}
                </span>
            </div>

            {/* 麵包屑導覽 */}
            <div className="border-b border-gray-700 flex-shrink-0">
                <BreadcrumbNav />
            </div>

            {/* 可捲動內容區 */}
            <div className="flex-1 overflow-y-auto">

                {/* 子場景區塊 */}
                <section className="border-b border-gray-700">
                    <div className="flex items-center gap-2 px-3 py-2">
                        <Layers size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                            子場景
                        </span>
                    </div>
                    <div className="px-1 pb-1">
                        <SceneTree />
                    </div>
                </section>

                {/* 模型清單區塊 */}
                <section>
                    <div className="flex items-center gap-2 px-3 py-2">
                        <Box size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                            模型清單
                        </span>
                        {models.length > 0 && (
                            <span className="ml-auto text-gray-500 text-xs">
                                {models.length}
                            </span>
                        )}
                    </div>

                    {/* 載入中狀態 */}
                    {isLoading && (
                        <div className="flex items-center gap-2 px-3 py-2 text-gray-500 text-xs">
                            <Loader2 size={13} className="animate-spin flex-shrink-0" />
                            <span>載入中...</span>
                        </div>
                    )}

                    {/* 模型列表 */}
                    {!isLoading && models.length === 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 text-gray-500 text-xs italic">
                            <Box size={13} className="flex-shrink-0" />
                            <span>沒有模型</span>
                        </div>
                    )}

                    {!isLoading && models.length > 0 && (
                        <ul className="px-1 pb-2 space-y-0.5">
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
                                                className={`
                                                    w-full flex items-center gap-2 px-3 py-2
                                                    rounded-sm transition-colors text-left group
                                                    ${isSelected
                                                        ? 'bg-blue-600 text-white'
                                                        : 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                                                    }
                                                `}
                                                title={model.name}
                                            >
                                                <Box
                                                    size={13}
                                                    className={`flex-shrink-0 ${
                                                        isSelected
                                                            ? 'text-blue-200'
                                                            : 'text-gray-500 group-hover:text-gray-400'
                                                    }`}
                                                />
                                                <span className="flex-1 text-xs truncate">
                                                    {model.name}
                                                </span>
                                                {hasChildScene && (
                                                    <ChevronRight
                                                        size={12}
                                                        className={`flex-shrink-0 ${
                                                            isSelected ? 'text-blue-200' : 'text-gray-500'
                                                        }`}
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

                {/* 2D 平面圖區塊 */}
                <PlanView />
            </div>
        </aside>
    );
};

export default FacilitySidebar;
