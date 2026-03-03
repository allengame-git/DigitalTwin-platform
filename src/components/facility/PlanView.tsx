/**
 * PlanView — 設施 2D 平面圖元件
 * 顯示當前場景的平面圖，並在圖上疊加可點擊的模型標記
 * @module components/facility/PlanView
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, MapPin, DoorOpen } from 'lucide-react';
import { useFacilityStore } from '@/stores/facilityStore';
import type { FacilityModel } from '@/types/facility';

export default function PlanView() {
    const scenes = useFacilityStore(state => state.scenes);
    const currentSceneId = useFacilityStore(state => state.currentSceneId);
    const models = useFacilityStore(state => state.models);
    const selectedModelId = useFacilityStore(state => state.selectedModelId);
    const selectModel = useFacilityStore(state => state.selectModel);

    const [expanded, setExpanded] = useState(true);
    const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

    const currentScene = useMemo(
        () => scenes.find(s => s.id === currentSceneId) ?? null,
        [scenes, currentSceneId]
    );

    const planImage = currentScene?.planImageUrl ?? currentScene?.autoPlanImageUrl ?? null;

    // 計算 bounds 用於標記位置對應
    // terrainBounds 中 minX/maxX 對應水平 X，minZ/maxZ 對應水平 Z（Three.js 座標）
    const bounds = useMemo(() => {
        if (currentScene?.terrainBounds) {
            const b = currentScene.terrainBounds;
            return {
                minX: b.minX,
                maxX: b.maxX,
                minZ: b.minZ,
                maxZ: b.maxZ,
            };
        }
        if (models.length === 0) return null;
        const xs = models.map(m => m.position.x);
        const zs = models.map(m => m.position.z);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minZ = Math.min(...zs);
        const maxZ = Math.max(...zs);
        const padX = (maxX - minX) * 0.2 || 50;
        const padZ = (maxZ - minZ) * 0.2 || 50;
        return {
            minX: minX - padX,
            maxX: maxX + padX,
            minZ: minZ - padZ,
            maxZ: maxZ + padZ,
        };
    }, [currentScene, models]);

    const getMarkerPosition = (model: FacilityModel) => {
        if (!bounds) return { x: 50, y: 50 };
        const rangeX = bounds.maxX - bounds.minX;
        const rangeZ = bounds.maxZ - bounds.minZ;
        const x = rangeX === 0 ? 50 : ((model.position.x - bounds.minX) / rangeX) * 100;
        // 翻轉 Y 軸：Three.js 的 Z 增大方向對應圖片的上方
        const y = rangeZ === 0 ? 50 : (1 - (model.position.z - bounds.minZ) / rangeZ) * 100;
        return {
            x: Math.max(2, Math.min(98, x)),
            y: Math.max(2, Math.min(98, y)),
        };
    };

    return (
        <div className="border-t border-gray-700">
            {/* 標題列 / 展開收合按鈕 */}
            <button
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <span>平面圖</span>
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {expanded && (
                <div className="px-2 pb-2">
                    {planImage ? (
                        <div className="relative w-full overflow-hidden rounded">
                            <img
                                src={planImage}
                                alt="平面圖"
                                className="w-full max-h-48 object-contain bg-gray-800 block"
                            />
                            {/* 模型標記覆蓋層 */}
                            {bounds && models.map(model => {
                                const pos = getMarkerPosition(model);
                                const isSelected = model.id === selectedModelId;
                                const isHovered = model.id === hoveredMarkerId;
                                const iconSize = isSelected || isHovered ? 16 : 12;

                                return (
                                    <button
                                        key={model.id}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 focus:outline-none"
                                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                                        onClick={() => selectModel(model.id)}
                                        onMouseEnter={() => setHoveredMarkerId(model.id)}
                                        onMouseLeave={() => setHoveredMarkerId(null)}
                                        title={model.name}
                                    >
                                        {scenes.some(s => s.parentModelId === model.id) ? (
                                            <DoorOpen
                                                size={iconSize}
                                                className={
                                                    isSelected
                                                        ? 'text-blue-400 drop-shadow-lg'
                                                        : 'text-yellow-400 drop-shadow'
                                                }
                                            />
                                        ) : (
                                            <MapPin
                                                size={iconSize}
                                                className={
                                                    isSelected
                                                        ? 'text-blue-400 drop-shadow-lg'
                                                        : 'text-green-400 drop-shadow'
                                                }
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 text-center py-4">
                            無平面圖
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
