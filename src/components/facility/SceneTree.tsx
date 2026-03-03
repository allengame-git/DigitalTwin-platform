/**
 * SceneTree — 子場景樹狀清單元件
 * 顯示當前場景的直接子場景，點擊可進入該子場景
 * @module components/facility/SceneTree
 */

import React from 'react';
import { FolderOpen, ChevronRight, Layers } from 'lucide-react';
import { useFacilityStore } from '@/stores/facilityStore';

const SceneTree: React.FC = () => {
    const { scenes, currentSceneId, enterScene } = useFacilityStore();

    // 找出當前場景的直接子場景（依 sortOrder 排序）
    const childScenes = scenes
        .filter(s => s.parentSceneId === currentSceneId)
        .sort((a, b) => a.sortOrder - b.sortOrder);

    if (childScenes.length === 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 text-gray-500 text-xs italic">
                <Layers size={13} className="flex-shrink-0" />
                <span>沒有子場景</span>
            </div>
        );
    }

    return (
        <ul className="space-y-0.5">
            {childScenes.map(scene => {
                // 計算子場景自身有多少孫子場景，作為提示
                const grandChildCount = scenes.filter(s => s.parentSceneId === scene.id).length;

                return (
                    <li key={scene.id}>
                        <button
                            onClick={() => enterScene(scene.id)}
                            className="
                                w-full flex items-center gap-2 px-3 py-2
                                text-gray-300 hover:text-gray-100
                                hover:bg-gray-700
                                rounded-sm transition-colors text-left group
                            "
                            title={scene.description ?? scene.name}
                        >
                            <FolderOpen
                                size={14}
                                className="flex-shrink-0 text-blue-400 group-hover:text-blue-300"
                            />
                            <span className="flex-1 text-xs truncate">
                                {scene.name}
                            </span>
                            {grandChildCount > 0 && (
                                <span className="text-gray-500 text-xs flex-shrink-0">
                                    {grandChildCount}
                                </span>
                            )}
                            <ChevronRight
                                size={12}
                                className="flex-shrink-0 text-gray-600 group-hover:text-gray-400"
                            />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

export default SceneTree;
