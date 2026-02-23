/**
 * 動態指北針元件
 * 根據相機旋轉角度自動旋轉，並加上專案設定的真北方位角偏移
 * @module components/overlay/NorthArrow
 */

import React, { useState, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useProjectStore } from '../../stores/projectStore';
import * as THREE from 'three';

// 羅盤盤面外觀
const COMPASS_SIZE = 60;

/**
 * Canvas 內部元件：計算每一幀的攝影機水平旋轉角
 */
export function NorthArrowCalculator({
    onRotationChange,
}: {
    onRotationChange: (rot: number) => void;
}) {
    const { camera } = useThree();
    const lastValue = useRef<number | null>(null);
    const frameCount = useRef(0);

    useFrame(() => {
        // 每 3 幀更新一次
        frameCount.current++;
        if (frameCount.current % 3 !== 0) return;

        // 計算相機看往哪裡（在地平面上的投影方向）
        const cam = camera as THREE.PerspectiveCamera;

        // 取得相機的世界旋轉，從 forward 向量計算方位角
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        forward.y = 0;

        let angle: number;
        if (forward.lengthSq() < 0.01) {
            // 近乎正上方俯視 → forward 投影到 xz 接近零，改用 camera up 向量
            // CameraController 在 TOP 視角會把 camera.up 設為北方方向
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
            up.y = 0;
            up.normalize();
            angle = Math.atan2(up.x, -up.z);
        } else {
            forward.normalize();
            angle = Math.atan2(forward.x, -forward.z);
        }

        // 轉換為度數
        const degrees = THREE.MathUtils.radToDeg(angle);

        // 如果變化大於 0.5 度才更新 UI 以免過度渲染
        if (
            lastValue.current === null ||
            Math.abs(degrees - lastValue.current) > 0.5
        ) {
            lastValue.current = degrees;
            onRotationChange(degrees);
        }
    });

    return null;
}

/**
 * HTML Overlay 指北針顯示
 */
export function NorthArrowOverlay({
    cameraRotation,
}: {
    cameraRotation: number;
}) {
    const { getActiveProject } = useProjectStore();
    const project = getActiveProject();

    // 專案設定的北角 (度)，若未設定則為 0
    // 例如使用者設定 30 度，代表場景中 +Z 的方向實際上是南偏東 30 度
    // 這裡我們直接將偏移加到旋轉上
    const northOffset = project?.northAngle || 0;

    // 總旋轉角度 = 真北偏移 - 相機方位角
    // heading 正值 = 相機朝東，此時北方在螢幕左方 → compass 需負角
    const totalRotation = northOffset - cameraRotation;

    return (
        <div style={styles.container}>
            <div style={styles.compassContainer}>
                {/* 盤面背景與刻度 */}
                <div style={styles.compassBg}>
                    <div style={{ ...styles.tick, transform: 'rotate(0deg)' }} />
                    <div style={{ ...styles.tick, transform: 'rotate(90deg)' }} />
                    <div style={{ ...styles.tick, transform: 'rotate(180deg)' }} />
                    <div style={{ ...styles.tick, transform: 'rotate(270deg)' }} />
                </div>

                {/* 旋轉的指針 */}
                <div style={{
                    ...styles.arrowContainer,
                    transform: `rotate(${totalRotation}deg)`
                }}>
                    <div style={styles.arrowNorth}>N</div>
                    <div style={styles.arrowPolygonConfig} />
                </div>
            </div>
            {/* <div style={styles.label}>北</div> */}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'absolute',
        top: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'auto',
        userSelect: 'none',
        zIndex: 10,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        cursor: 'pointer', // 可以給未來點擊重置視角用
    },
    compassContainer: {
        position: 'relative',
        width: COMPASS_SIZE,
        height: COMPASS_SIZE,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.85)',
        border: '2px solid rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
    },
    compassBg: {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
    },
    tick: {
        position: 'absolute',
        width: 2,
        height: 6,
        backgroundColor: '#9ca3af',
        top: 2,
        transformOrigin: `50% ${COMPASS_SIZE / 2 - 2}px`,
    },
    arrowContainer: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'transform 0.1s linear',
    },
    arrowNorth: {
        position: 'absolute',
        top: -4,
        color: '#ef4444', // 紅色 N
        fontWeight: 'bold',
        fontSize: 14,
        fontFamily: 'sans-serif',
        textShadow: '0 1px 1px rgba(255,255,255,0.8)',
    },
    arrowPolygonConfig: {
        marginTop: 18,
        width: 12,
        height: 24,
        background: 'linear-gradient(to bottom, #ef4444 50%, #9ca3af 50%)',
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
    },
    label: {
        fontSize: 12,
        fontWeight: 600,
        color: '#4b5563',
        textShadow: '0 1px 2px rgba(255,255,255,0.8)',
        fontFamily: "'Inter', 'Roboto', sans-serif",
    }
};

/**
 * 完整指北針元件 Hook
 */
export function useNorthArrow() {
    const [cameraRotation, setCameraRotation] = useState(0);

    const handleRotationChange = useCallback((rot: number) => {
        setCameraRotation(rot);
    }, []);

    return { cameraRotation, handleRotationChange };
}
