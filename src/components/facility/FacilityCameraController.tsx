import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFacilityStore } from '../../stores/facilityStore';

interface FlyTarget {
    position: THREE.Vector3;
    duration: number;
    startTime: number;
    startPosition: THREE.Vector3;
}

export function FacilityCameraController() {
    const { camera } = useThree();
    const flyRef = useRef<FlyTarget | null>(null);
    const currentScene = useFacilityStore(state => state.getCurrentScene());

    // Fly to scene camera position when scene changes
    useEffect(() => {
        if (!currentScene?.cameraPosition) return;

        const cp = currentScene.cameraPosition;
        flyRef.current = {
            position: new THREE.Vector3(cp.x, cp.y, cp.z),
            duration: 800,
            startTime: performance.now(),
            startPosition: camera.position.clone(),
        };
    }, [currentScene?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useFrame(() => {
        const fly = flyRef.current;
        if (!fly) return;

        const elapsed = performance.now() - fly.startTime;
        const t = Math.min(elapsed / fly.duration, 1);
        // cubic ease-out
        const ease = 1 - Math.pow(1 - t, 3);

        camera.position.lerpVectors(fly.startPosition, fly.position, ease);

        if (t >= 1) {
            flyRef.current = null;
        }
    });

    return null;
}

export default FacilityCameraController;
