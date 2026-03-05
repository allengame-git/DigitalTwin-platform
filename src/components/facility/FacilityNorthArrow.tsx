/**
 * 設施導覽指北針
 * 北方方向 = Three.js +Z 軸（TWD97 Y 北向）
 */
import React, { useState, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const COMPASS_SIZE = 60;

/** Canvas 內部：每幀計算相機水平方位角 */
export function FacilityNorthArrowCalculator({
    onRotationChange,
}: {
    onRotationChange: (deg: number) => void;
}) {
    const { camera } = useThree();
    const lastValue = useRef<number | null>(null);
    const frameCount = useRef(0);

    useFrame(() => {
        frameCount.current++;
        if (frameCount.current % 3 !== 0) return;

        const cam = camera as THREE.PerspectiveCamera;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        forward.y = 0;

        let angle: number;
        if (forward.lengthSq() < 0.01) {
            // 俯視：改用 camera up 投影到 XZ 平面
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
            up.y = 0;
            up.normalize();
            // 北方 = +Z，angle 為相機 up 相對於 +Z 的偏轉
            angle = Math.atan2(up.x, up.z);
        } else {
            forward.normalize();
            // 北方 = +Z；camera 朝 +Z 時 angle = 0
            angle = Math.atan2(forward.x, forward.z);
        }

        const degrees = THREE.MathUtils.radToDeg(angle);
        if (lastValue.current === null || Math.abs(degrees - lastValue.current) > 0.5) {
            lastValue.current = degrees;
            onRotationChange(degrees);
        }
    });

    return null;
}

/** HTML Overlay 指北針顯示 */
export function FacilityNorthArrowOverlay({ cameraRotation }: { cameraRotation: number }) {
    // compass 旋轉：相機朝北（angle=0）時 N 指上
    // cameraRotation > 0 → 相機偏東 → N 需逆時針旋轉
    const rotation = -cameraRotation;

    return (
        <div style={styles.container}>
            <div style={styles.compassContainer}>
                {/* 刻度 */}
                <div style={styles.compassBg}>
                    {[0, 90, 180, 270].map(deg => (
                        <div key={deg} style={{ ...styles.tick, transform: `rotate(${deg}deg)` }} />
                    ))}
                </div>
                {/* 旋轉指針 */}
                <div style={{ ...styles.arrowContainer, transform: `rotate(${rotation}deg)` }}>
                    <div style={styles.arrowNorth}>N</div>
                    <div style={styles.arrowPolygon} />
                </div>
            </div>
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
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 10,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
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
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 14,
        fontFamily: 'sans-serif',
        textShadow: '0 1px 1px rgba(255,255,255,0.8)',
    },
    arrowPolygon: {
        marginTop: 18,
        width: 12,
        height: 24,
        background: 'linear-gradient(to bottom, #ef4444 50%, #9ca3af 50%)',
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
    },
};

/** Hook：橋接 Canvas 內計算與 DOM Overlay */
export function useFacilityNorthArrow() {
    const [cameraRotation, setCameraRotation] = useState(0);
    const handleRotationChange = useCallback((rot: number) => setCameraRotation(rot), []);
    return { cameraRotation, handleRotationChange };
}
