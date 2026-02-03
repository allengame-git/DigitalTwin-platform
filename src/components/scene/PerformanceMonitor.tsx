import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { usePerformanceStore } from '../../stores/performanceStore';

export function PerformanceMonitor() {
    const { updateStats } = usePerformanceStore();
    const { gl } = useThree();

    // Refs for FPS calculation
    const frames = useRef(0);
    const prevTime = useRef(performance.now());

    useFrame(() => {
        frames.current++;
        const time = performance.now();

        // Update every 500ms
        if (time >= prevTime.current + 500) {
            const fps = Math.round((frames.current * 1000) / (time - prevTime.current));

            // Get Memory (Chrome specific API)
            // @ts-ignore - performance.memory is non-standard
            const memory = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0;

            updateStats({
                fps,
                memory,
                drawCalls: gl.info.render.calls,
                triangles: gl.info.render.triangles,
            });

            prevTime.current = time;
            frames.current = 0;
        }
    });

    return null;
}
