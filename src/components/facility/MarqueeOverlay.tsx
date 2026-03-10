import type { MarqueeRect } from '../../hooks/useMarqueeSelect';

interface MarqueeOverlayProps {
    rect: MarqueeRect;
}

export function MarqueeOverlay({ rect }: MarqueeOverlayProps) {
    const left = Math.min(rect.x1, rect.x2);
    const top = Math.min(rect.y1, rect.y2);
    const width = Math.abs(rect.x2 - rect.x1);
    const height = Math.abs(rect.y2 - rect.y1);

    return (
        <div
            style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                border: '1px solid rgba(37, 99, 235, 0.8)',
                background: 'rgba(37, 99, 235, 0.15)',
                pointerEvents: 'none',
                zIndex: 10,
            }}
        />
    );
}
