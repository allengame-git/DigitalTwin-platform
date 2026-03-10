import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFacilityStore, getModelGroupRef } from '../stores/facilityStore';

// ── Module-level refs (set by MarqueeCameraSync inside Canvas) ──
let _camera: THREE.Camera | null = null;
let _controls: any = null;

export function _setMarqueeRefs(camera: THREE.Camera, controls: any) {
    _camera = camera;
    _controls = controls;
}

export interface MarqueeRect {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

const DRAG_THRESHOLD = 5; // px

export function useMarqueeSelect() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState<MarqueeRect | null>(null);
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const metaKey = useRef(false);
    const controlsWasEnabled = useRef(true);
    const latestRect = useRef<MarqueeRect | null>(null);

    const isEnabled = useCallback(() => {
        const { editMode, animationMode } = useFacilityStore.getState();
        return editMode || animationMode;
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            if (!isEnabled()) return;

            startPos.current = { x: e.clientX, y: e.clientY };
            metaKey.current = e.metaKey || e.ctrlKey;
            isDragging.current = false;
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isEnabled()) return;
            if (!(e.buttons & 1)) return;

            const dx = e.clientX - startPos.current.x;
            const dy = e.clientY - startPos.current.y;

            if (!isDragging.current) {
                if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
                isDragging.current = true;

                if (_controls && _controls.enabled !== undefined) {
                    controlsWasEnabled.current = _controls.enabled;
                    _controls.enabled = false;
                }
            }

            const elRect = el.getBoundingClientRect();
            const newRect: MarqueeRect = {
                x1: startPos.current.x - elRect.left,
                y1: startPos.current.y - elRect.top,
                x2: e.clientX - elRect.left,
                y2: e.clientY - elRect.top,
            };
            latestRect.current = newRect;
            setRect(newRect);
        };

        const onPointerUp = () => {
            if (!isDragging.current) return;
            isDragging.current = false;

            // 恢復 MapControls
            if (_controls && _controls.enabled !== undefined) {
                _controls.enabled = controlsWasEnabled.current;
            }

            // 用 ref 取最新 rect（避免 stale closure）
            performHitTest(latestRect.current, metaKey.current, el);
            latestRect.current = null;
            setRect(null);
        };

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);

        return () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
        };
    }, [isEnabled]);

    return { containerRef, rect, isDragging };
}

function performHitTest(rect: MarqueeRect | null, isAdditive: boolean, container: HTMLElement) {
    if (!rect || !_camera) return;

    const { models, hiddenModelIds, selectedModelIds, setSelectedModelIds } =
        useFacilityStore.getState();

    const elRect = container.getBoundingClientRect();
    const w = elRect.width;
    const h = elRect.height;

    const minX = Math.min(rect.x1, rect.x2);
    const maxX = Math.max(rect.x1, rect.x2);
    const minY = Math.min(rect.y1, rect.y2);
    const maxY = Math.max(rect.y1, rect.y2);

    const hiddenSet = new Set(hiddenModelIds);
    const hitIds: string[] = [];
    const v = new THREE.Vector3();
    const box = new THREE.Box3();

    for (const model of models) {
        if (hiddenSet.has(model.id)) continue;

        // 從 group ref 即時計算世界座標（動畫可能改變位置）
        const group = getModelGroupRef(model.id);
        if (!group) continue;

        box.setFromObject(group);
        box.getCenter(v);
        v.project(_camera);

        // 排除相機背後
        if (v.z >= 1) continue;

        // NDC → 螢幕座標
        const sx = (v.x * 0.5 + 0.5) * w;
        const sy = (-v.y * 0.5 + 0.5) * h;

        if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
            hitIds.push(model.id);
        }
    }

    if (isAdditive) {
        const merged = new Set(selectedModelIds);
        for (const id of hitIds) merged.add(id);
        setSelectedModelIds(Array.from(merged));
    } else {
        setSelectedModelIds(hitIds);
    }
}
