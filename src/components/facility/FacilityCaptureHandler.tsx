/**
 * FacilityCaptureHandler — 暴露 WebGL canvas element 供外部截圖使用
 * @module components/facility/FacilityCaptureHandler
 */

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/** 外部可直接讀取此 ref 呼叫 toDataURL() */
export let facilityCanvasEl: HTMLCanvasElement | null = null;

export function FacilityCaptureHandler() {
    const { gl } = useThree();

    useEffect(() => {
        facilityCanvasEl = gl.domElement;
        return () => { facilityCanvasEl = null; };
    }, [gl]);

    return null;
}
