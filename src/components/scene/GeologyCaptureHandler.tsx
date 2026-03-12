/**
 * GeologyCaptureHandler — 暴露 WebGL canvas element + camera/controls 供外部截圖 & 審查模式使用
 * @module components/scene/GeologyCaptureHandler
 */

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type * as THREE from 'three';

/** 外部可直接讀取此 ref 呼叫 toDataURL() */
export let geologyCanvasEl: HTMLCanvasElement | null = null;

/** 外部可讀取相機位置 & 控制器 target */
export let geologyCameraRef: THREE.Camera | null = null;
export let geologyControlsRef: any = null;

export function GeologyCaptureHandler() {
    const { gl, camera, controls } = useThree();

    useEffect(() => {
        geologyCanvasEl = gl.domElement;
        geologyCameraRef = camera;
        geologyControlsRef = controls;
        return () => {
            geologyCanvasEl = null;
            geologyCameraRef = null;
            geologyControlsRef = null;
        };
    }, [gl, camera, controls]);

    return null;
}
