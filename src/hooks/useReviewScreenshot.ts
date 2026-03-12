import { useCallback } from 'react';

export function useReviewScreenshot(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const capture = useCallback((): Blob | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / canvas.width);

        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width * scale;
        offscreen.height = canvas.height * scale;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);

        const dataUrl = offscreen.toDataURL('image/jpeg', 0.8);
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    }, [canvasRef]);

    return { capture };
}
