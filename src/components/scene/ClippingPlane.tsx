/**
 * ClippingPlane Component
 * @module components/scene/ClippingPlane
 * 
 * Three.js Clipping Plane 實作
 * Task: T039
 */

import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewerStore } from '../../stores/viewerStore';

export function ClippingPlane() {
    const { gl } = useThree();
    const clippingPlane = useViewerStore((state) => state.clippingPlane);

    // 建立 Three.js Plane
    const plane = useMemo(() => {
        const normal = new THREE.Vector3(
            clippingPlane.normal[0],
            clippingPlane.normal[1],
            clippingPlane.normal[2]
        );
        return new THREE.Plane(normal, clippingPlane.constant);
    }, [clippingPlane.normal, clippingPlane.constant]);

    // 套用 Clipping Plane 到 Renderer
    useEffect(() => {
        if (clippingPlane.enabled) {
            gl.clippingPlanes = [plane];
            gl.localClippingEnabled = true;
        } else {
            gl.clippingPlanes = [];
            gl.localClippingEnabled = false;
        }

        return () => {
            gl.clippingPlanes = [];
            gl.localClippingEnabled = false;
        };
    }, [gl, plane, clippingPlane.enabled]);

    // 不渲染任何可見元素
    return null;
}

export default ClippingPlane;
