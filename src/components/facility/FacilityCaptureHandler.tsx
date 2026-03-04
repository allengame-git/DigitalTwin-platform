/**
 * FacilityCaptureHandler — Canvas 內截圖處理器
 * 監聽 captureIntent，在下一幀捕捉 WebGL canvas
 * - 'screenshot': 下載為 PNG
 * - 'autoplan':   PUT 到後端作為場景自動平面圖
 * @module components/facility/FacilityCaptureHandler
 */

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useFacilityStore } from '@/stores/facilityStore';
import { useAuthStore } from '@/stores/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function FacilityCaptureHandler() {
    const { gl } = useThree();

    const captureIntent   = useFacilityStore(s => s.captureIntent);
    const setCaptureIntent = useFacilityStore(s => s.setCaptureIntent);
    const currentSceneId  = useFacilityStore(s => s.currentSceneId);
    const fetchScenes     = useFacilityStore(s => s.fetchScenes);

    // 用 ref 把 intent 傳進 useFrame（避免 closure 問題）
    const pendingRef = useRef<'screenshot' | 'autoplan' | null>(null);
    const sceneIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (captureIntent) {
            pendingRef.current = captureIntent;
            sceneIdRef.current = currentSceneId;
        }
    }, [captureIntent, currentSceneId]);

    useFrame(() => {
        const intent = pendingRef.current;
        if (!intent) return;
        pendingRef.current = null;

        // 讀取當前幀（preserveDrawingBuffer 預設 false，需在同一 tick）
        const canvas = gl.domElement;
        const dataUrl = canvas.toDataURL('image/png');

        setCaptureIntent(null);

        if (intent === 'screenshot') {
            const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `facility-${ts}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }

        if (intent === 'autoplan') {
            const sceneId = sceneIdRef.current;
            if (!sceneId) {
                console.warn('[FacilityCaptureHandler] autoplan: sceneId is null, abort');
                return;
            }

            console.log('[FacilityCaptureHandler] autoplan: sending to sceneId=', sceneId, 'dataUrl length=', dataUrl.length);
            const token = useAuthStore.getState().accessToken;
            fetch(`${API_BASE}/api/facility/scenes/${sceneId}/auto-plan-image`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ imageData: dataUrl }),
            })
                .then(async r => {
                    if (!r.ok) {
                        const text = await r.text();
                        throw new Error(`save failed: ${r.status} ${text}`);
                    }
                    console.log('[FacilityCaptureHandler] autoplan: saved OK');
                    const scenes = useFacilityStore.getState().scenes;
                    const projectId = scenes[0]?.projectId;
                    if (projectId) fetchScenes(projectId);
                })
                .catch(err => console.error('[FacilityCaptureHandler] autoplan save error:', err));
        }
    });

    return null;
}
