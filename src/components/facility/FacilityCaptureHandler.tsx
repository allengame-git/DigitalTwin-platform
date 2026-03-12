/**
 * FacilityCaptureHandler — 暴露 WebGL canvas element + camera/controls 供外部截圖 & 審查模式使用
 * @module components/facility/FacilityCaptureHandler
 */

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type * as THREE from 'three';

/** 外部可直接讀取此 ref 呼叫 toDataURL() */
export let facilityCanvasEl: HTMLCanvasElement | null = null;

/** 外部可讀取相機位置 & 控制器 target */
export let facilityCameraRef: THREE.Camera | null = null;
export let facilityControlsRef: any = null;

export function FacilityCaptureHandler() {
    const { gl, camera, controls } = useThree();

    useEffect(() => {
        facilityCanvasEl = gl.domElement;
        facilityCameraRef = camera;
        facilityControlsRef = controls;
        return () => {
            facilityCanvasEl = null;
            facilityCameraRef = null;
            facilityControlsRef = null;
        };
    }, [gl, camera, controls]);

    return null;
}
