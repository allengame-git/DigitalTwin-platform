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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>
                <Layers size={13} style={{ flexShrink: 0 }} />
                <span>沒有子場景</span>
            </div>
        );
    }

    return (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {childScenes.map(scene => {
                const grandChildCount = scenes.filter(s => s.parentSceneId === scene.id).length;

                return (
                    <li key={scene.id}>
                        <button
                            onClick={() => enterScene(scene.id)}
                            title={scene.description ?? scene.name}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '7px 12px',
                                borderRadius: 4,
                                border: 'none',
                                background: 'transparent',
                                color: '#374151',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s',
                                fontSize: 12,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <FolderOpen size={14} style={{ flexShrink: 0, color: '#3b82f6' }} />
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {scene.name}
                            </span>
                            {grandChildCount > 0 && (
                                <span style={{ color: '#9ca3af', fontSize: 11, flexShrink: 0 }}>
                                    {grandChildCount}
                                </span>
                            )}
                            <ChevronRight size={12} style={{ flexShrink: 0, color: '#d1d5db' }} />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

export default SceneTree;
