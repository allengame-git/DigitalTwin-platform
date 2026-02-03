/**
 * GeologyFallback2D Component
 * @module components/scene/GeologyFallback2D
 * 
 * WebGL 失敗時的 2D Canvas 降級顯示
 * Task: T049
 */

import React, { useEffect, useRef } from 'react';
import { useBoreholeStore } from '../../stores/boreholeStore';

interface GeologyFallback2DProps {
    width?: number;
    height?: number;
}

export const GeologyFallback2D: React.FC<GeologyFallback2DProps> = ({
    width = 800,
    height = 600,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { boreholes, selectedBorehole, selectBorehole } = useBoreholeStore();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 清除畫布
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, width, height);

        // 繪製標題
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 18px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('地質資料展示 (2D 降級模式)', width / 2, 30);
        ctx.font = '12px system-ui';
        ctx.fillStyle = '#6b7280';
        ctx.fillText('WebGL 不可用，顯示簡化視圖', width / 2, 50);

        if (boreholes.length === 0) {
            ctx.fillStyle = '#9ca3af';
            ctx.font = '14px system-ui';
            ctx.fillText('載入鑽孔資料中...', width / 2, height / 2);
            return;
        }

        // 計算範圍
        const xs = boreholes.map(b => b.x);
        const ys = boreholes.map(b => b.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const padding = 60;
        const scaleX = (width - padding * 2) / (maxX - minX || 1);
        const scaleY = (height - padding * 2) / (maxY - minY || 1);
        const scale = Math.min(scaleX, scaleY);

        const offsetX = padding + (width - padding * 2 - (maxX - minX) * scale) / 2;
        const offsetY = padding + (height - padding * 2 - (maxY - minY) * scale) / 2;

        // 轉換座標
        const toCanvasX = (x: number) => offsetX + (x - minX) * scale;
        const toCanvasY = (y: number) => height - (offsetY + (y - minY) * scale);

        // 繪製鑽孔點位
        boreholes.forEach((borehole) => {
            const cx = toCanvasX(borehole.x);
            const cy = toCanvasY(borehole.y);
            const isSelected = selectedBorehole?.id === borehole.id;

            ctx.beginPath();
            ctx.arc(cx, cy, isSelected ? 8 : 4, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#ef4444' : '#3b82f6';
            ctx.fill();

            if (isSelected) {
                ctx.strokeStyle = '#1d4ed8';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        // 繪製選中鑽孔資訊
        if (selectedBorehole) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(10, height - 80, 200, 70);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(selectedBorehole.name, 20, height - 58);
            ctx.font = '12px system-ui';
            ctx.fillText(`座標: (${selectedBorehole.x.toFixed(0)}, ${selectedBorehole.y.toFixed(0)})`, 20, height - 40);
            ctx.fillText(`深度: ${selectedBorehole.totalDepth}m`, 20, height - 22);
        }

        // 繪製圖例
        ctx.fillStyle = '#374151';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(`共 ${boreholes.length} 個鑽孔`, width - 20, height - 20);
    }, [boreholes, selectedBorehole, width, height]);

    // 處理點擊
    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || boreholes.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // 重新計算座標轉換
        const xs = boreholes.map(b => b.x);
        const ys = boreholes.map(b => b.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const padding = 60;
        const scaleX = (width - padding * 2) / (maxX - minX || 1);
        const scaleY = (height - padding * 2) / (maxY - minY || 1);
        const scale = Math.min(scaleX, scaleY);

        const offsetX = padding + (width - padding * 2 - (maxX - minX) * scale) / 2;
        const offsetY = padding + (height - padding * 2 - (maxY - minY) * scale) / 2;

        const toCanvasX = (x: number) => offsetX + (x - minX) * scale;
        const toCanvasY = (y: number) => height - (offsetY + (y - minY) * scale);

        // 找出最近的鑽孔
        let closestBorehole: typeof boreholes[number] | null = null;
        let closestDist = Infinity;

        boreholes.forEach((borehole) => {
            const cx = toCanvasX(borehole.x);
            const cy = toCanvasY(borehole.y);
            const dist = Math.sqrt((clickX - cx) ** 2 + (clickY - cy) ** 2);
            if (dist < closestDist && dist < 20) {
                closestDist = dist;
                closestBorehole = borehole;
            }
        });

        if (closestBorehole) {
            selectBorehole((closestBorehole as typeof boreholes[number]).id);
        }
    };

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onClick={handleClick}
            style={{
                width: '100%',
                height: '100%',
                cursor: 'crosshair',
            }}
        />
    );
};

export default GeologyFallback2D;
