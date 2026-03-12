/**
 * ReviewMarkerPin — 3D review marker pin rendered via R3F Html overlay
 * Status-colored circular pin with hover tooltip
 */
import { useState, useCallback } from 'react';
import { Html } from '@react-three/drei';
import type { ReviewMarker, MarkerStatus } from '@/types/review';

interface ReviewMarkerPinProps {
    marker: ReviewMarker;
    isSelected: boolean;
    onClick: () => void;
}

const STATUS_COLORS: Record<MarkerStatus, string> = {
    open: '#ef4444',
    in_progress: '#eab308',
    resolved: '#22c55e',
};

const STATUS_LABELS: Record<MarkerStatus, string> = {
    open: '待處理',
    in_progress: '處理中',
    resolved: '已解決',
};

const pulseKeyframes = `
@keyframes review-pin-pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    50% { transform: scale(1.15); box-shadow: 0 2px 12px rgba(255,255,255,0.4); }
}
`;

// Inject keyframes once
let styleInjected = false;
function ensureStyles() {
    if (styleInjected) return;
    styleInjected = true;
    const style = document.createElement('style');
    style.textContent = pulseKeyframes;
    document.head.appendChild(style);
}

export function ReviewMarkerPin({ marker, isSelected, onClick }: ReviewMarkerPinProps) {
    const [hovered, setHovered] = useState(false);

    // Inject CSS keyframes on first render
    useState(() => { ensureStyles(); });

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
    }, [onClick]);

    const color = STATUS_COLORS[marker.status];
    const size = isSelected ? 32 : 28;

    return (
        <group position={[marker.positionX, marker.positionY, marker.positionZ]}>
            <Html
                distanceFactor={300}
                zIndexRange={[100, 0]}
                style={{ pointerEvents: 'auto' }}
                center
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                    onClick={handleClick}
                    onPointerEnter={() => setHovered(true)}
                    onPointerLeave={() => setHovered(false)}
                >
                    {/* Tooltip */}
                    {hovered && (
                        <div style={{
                            background: 'rgba(15, 15, 15, 0.88)',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 500,
                            padding: '4px 8px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            marginBottom: 4,
                            backdropFilter: 'blur(4px)',
                            boxShadow: '0 1px 6px rgba(0,0,0,0.3)',
                            lineHeight: '1.4',
                        }}>
                            <div style={{ fontWeight: 600 }}>{marker.title}</div>
                            <div style={{ fontSize: 10, opacity: 0.7 }}>
                                {STATUS_LABELS[marker.status]}
                            </div>
                        </div>
                    )}

                    {/* Pin circle */}
                    <div style={{
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        background: color,
                        border: isSelected
                            ? '2.5px solid #fff'
                            : '2px solid rgba(255,255,255,0.85)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: isSelected
                            ? 'review-pin-pulse 1.5s ease-in-out infinite'
                            : 'none',
                        transition: 'width 0.15s, height 0.15s',
                    }}>
                        {/* Simple pin SVG icon */}
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                    </div>

                    {/* Triangle pointer */}
                    <div style={{
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: `6px solid ${color}`,
                        marginTop: -1,
                    }} />
                </div>
            </Html>
        </group>
    );
}

export default ReviewMarkerPin;
