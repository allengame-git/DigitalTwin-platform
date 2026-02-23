/**
 * 動態比例尺元件
 * 根據相機距離自動計算並顯示合適的比例尺
 * @module components/overlay/ScaleBar
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// 預定義的比例尺刻度 (公尺)
const SCALE_STEPS = [
    1, 2, 5,
    10, 20, 50,
    100, 200, 500,
    1000, 2000, 5000,
    10000, 20000, 50000,
];

// 比例尺最小與最大每一段顯示寬度 (px)
const MIN_SEGMENT_PX = 60;
const MAX_SEGMENT_PX = 150;
const SEGMENTS_COUNT = 3;

/** 格式化數字顯示，加上千分位 */
function formatNumber(num: number): string {
    return num.toLocaleString('en-US');
}

/**
 * Canvas 內部元件：計算每一幀的像素/公尺比
 * 透過 callback 將結果傳給外部 overlay
 */
export function ScaleBarCalculator({
    onScaleChange,
}: {
    onScaleChange: (pixelsPerMeter: number) => void;
}) {
    const { camera, gl } = useThree();
    const lastValue = useRef(0);
    const frameCount = useRef(0);

    useFrame(() => {
        // 每 6 幀更新一次，避免過度渲染
        frameCount.current++;
        if (frameCount.current % 6 !== 0) return;

        const canvas = gl.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        if (width === 0 || height === 0) return;

        // 用兩個世界座標點投影到螢幕空間，計算每像素代表多少公尺
        const cam = camera as THREE.PerspectiveCamera;

        // 取相機目標點（MapControls 的 target）
        // MapControls 會把 target 存在 controls 裡，但我們可以用 camera 正前方的地面點
        const cameraPos = cam.position.clone();

        // 在相機正下方地面（y=0）找一個參考點
        const groundY = 0;
        const distToGround = Math.abs(cameraPos.y - groundY);
        const effectiveDist = Math.max(distToGround, 10);

        // 計算 FOV 對應的可視寬度
        const vFov = THREE.MathUtils.degToRad(cam.fov);
        const aspect = width / height;
        const visibleHeight = 2 * Math.tan(vFov / 2) * effectiveDist;
        const visibleWidth = visibleHeight * aspect;

        // 每像素代表的公尺數
        const pixelsPerMeter = width / visibleWidth;

        // 變化超過 5% 才更新
        if (
            lastValue.current === 0 ||
            Math.abs(pixelsPerMeter - lastValue.current) / lastValue.current > 0.05
        ) {
            lastValue.current = pixelsPerMeter;
            onScaleChange(pixelsPerMeter);
        }
    });

    return null;
}

/**
 * HTML Overlay 比例尺顯示
 */
export function ScaleBarOverlay({
    pixelsPerMeter,
}: {
    pixelsPerMeter: number;
}) {
    if (pixelsPerMeter <= 0) return null;

    // 找到合適的比例尺刻度 (單一段的公尺數)
    let bestStep = SCALE_STEPS[0];
    for (const step of SCALE_STEPS) {
        const segmentPx = step * pixelsPerMeter;
        if (segmentPx >= MIN_SEGMENT_PX && segmentPx <= MAX_SEGMENT_PX) {
            bestStep = step;
            break;
        }
        if (segmentPx > MAX_SEGMENT_PX) break;
        bestStep = step;
    }

    const segmentWidthPx = bestStep * pixelsPerMeter;
    const totalWidthPx = segmentWidthPx * SEGMENTS_COUNT;
    const labels = Array.from({ length: SEGMENTS_COUNT + 1 }).map((_, i) => i * bestStep);

    return (
        <div style={styles.container}>
            {/* 標籤 */}
            <div style={{ ...styles.labelsContainer, width: totalWidthPx }}>
                {labels.map((val, idx) => {
                    const pct = (idx / SEGMENTS_COUNT) * 100;
                    return (
                        <div key={idx} style={{ ...styles.label, left: `${pct}%` }}>
                            {formatNumber(val)}{idx === SEGMENTS_COUNT ? ' m' : ''}
                        </div>
                    );
                })}
            </div>

            {/* 交錯比例尺 */}
            <div style={{ ...styles.barContainer, width: totalWidthPx }}>
                {Array.from({ length: SEGMENTS_COUNT }).map((_, idx) => (
                    <div key={idx} style={styles.segment}>
                        <div style={{
                            ...styles.segmentHalf,
                            backgroundColor: idx % 2 === 0 ? '#4A4A4A' : '#FFFFFF'
                        }} />
                        <div style={{
                            ...styles.segmentHalf,
                            backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#4A4A4A'
                        }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 10,
    },
    labelsContainer: {
        position: 'relative',
        height: 16,
        marginBottom: 2,
    },
    label: {
        position: 'absolute',
        bottom: 0,
        transform: 'translateX(-50%)',
        fontSize: 12,
        fontWeight: 500,
        color: '#000',
        textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff',
        fontFamily: 'sans-serif',
        lineHeight: 1,
        whiteSpace: 'nowrap',
    },
    barContainer: {
        position: 'relative',
        height: 12,
        display: 'flex',
        borderTop: '1px solid #000',
        borderBottom: '1px solid #000',
        borderLeft: '1px solid #000',
        boxShadow: '0 0 2px rgba(255,255,255,0.8)', // 陰影確保在深色背景下可見
    },
    segment: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: '1px solid #000',
        boxSizing: 'border-box',
    },
    segmentHalf: {
        flex: 1,
        width: '100%',
    }
};

/**
 * 完整比例尺元件（用於 GeologyCanvas 內部）
 * 包含 Canvas 內計算器 + HTML overlay
 *
 * 使用方式：
 * 1. 在 <Canvas> 內放 <ScaleBarCalculator>
 * 2. 在 <Canvas> 外放 <ScaleBarOverlay>
 * 或直接用 useScaleBar hook
 */
export function useScaleBar() {
    const [pixelsPerMeter, setPixelsPerMeter] = useState(0);

    const handleScaleChange = useCallback((value: number) => {
        setPixelsPerMeter(value);
    }, []);

    return { pixelsPerMeter, handleScaleChange };
}
