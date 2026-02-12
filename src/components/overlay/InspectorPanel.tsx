/**
 * InspectorPanel - 統一資料檢視面板
 * @module components/overlay/InspectorPanel
 *
 * 整合鑽孔、位態、斷層三種資料的統一檢視面板
 * 設計風格: 專業 SaaS / 資料科學 Dashboard
 */

import React, { useState } from 'react';
import { useBoreholeStore } from '../../stores/boreholeStore';
import { useAttitudeStore } from '../../stores/attitudeStore';
import { useFaultPlaneStore } from '../../stores/faultPlaneStore';
import { LayerTable } from './LayerTable';
import { PropertyChart } from './PropertyChart';
import { PhotoGallery } from './PhotoGallery';

/* ─── Design Tokens ─── */
const T = {
    bg: '#ffffff',
    bgSection: '#f8fafc',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    accent: {
        borehole: '#3b82f6',  // blue
        attitude: '#8b5cf6',  // violet
        fault: '#ef4444',     // red
    },
    radius: '10px',
    radiusSm: '6px',
    shadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
    font: '"Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", "Cascadia Code", monospace',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/* ─── Shared Sub-Components ─── */

function CloseBtn({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label="Close"
            style={{
                background: 'none',
                border: 'none',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: T.textMuted,
                fontSize: '16px',
                transition: T.transition,
                flexShrink: 0,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = T.textMuted;
            }}
        >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        </button>
    );
}

function DataRow({ label, value, mono = false, color }: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    color?: string;
}) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
        }}>
            <span style={{
                fontSize: '12px',
                color: T.textMuted,
                fontWeight: 500,
                letterSpacing: '0.02em',
            }}>{label}</span>
            <span style={{
                fontSize: '13px',
                color: color || T.text,
                fontWeight: 600,
                fontFamily: mono ? T.mono : T.font,
            }}>{value}</span>
        </div>
    );
}

function Badge({ text, color }: { text: string; color: string }) {
    return (
        <span style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            background: `${color}14`,
            color: color,
            letterSpacing: '0.02em',
        }}>{text}</span>
    );
}

function SectionDivider() {
    return <div style={{ height: '1px', background: T.borderLight, margin: '4px 0' }} />;
}

/* ─── Section Card ─── */

interface SectionCardProps {
    title: string;
    icon: React.ReactNode;
    accentColor: string;
    badge?: string;
    onClose: () => void;
    defaultExpanded?: boolean;
    children: React.ReactNode;
}

function SectionCard({
    title, icon, accentColor, badge, onClose, defaultExpanded = true, children
}: SectionCardProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div style={{
            background: T.bg,
            borderRadius: T.radiusSm,
            border: `1px solid ${T.border}`,
            overflow: 'hidden',
            transition: T.transition,
        }}>
            {/* Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    background: expanded ? T.bgSection : T.bg,
                    borderBottom: expanded ? `1px solid ${T.border}` : 'none',
                    borderLeft: `3px solid ${accentColor}`,
                    transition: T.transition,
                    userSelect: 'none',
                }}
            >
                {/* Chevron */}
                <svg
                    width="12" height="12" viewBox="0 0 12 12"
                    style={{
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: T.transition,
                        flexShrink: 0,
                    }}
                >
                    <path d="M4 2L8 6L4 10" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>

                {/* Icon */}
                <span style={{ display: 'flex', alignItems: 'center', color: accentColor, flexShrink: 0 }}>
                    {icon}
                </span>

                {/* Title */}
                <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: T.text,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>{title}</span>

                {/* Badge */}
                {badge && <Badge text={badge} color={accentColor} />}

                {/* Close */}
                <CloseBtn onClick={onClose} />
            </div>

            {/* Body */}
            {expanded && (
                <div style={{
                    padding: '12px',
                    animation: 'inspectorSlideDown 0.15s ease-out',
                }}>
                    {children}
                </div>
            )}
        </div>
    );
}

/* ─── SVG Icons ─── */

const IconBorehole = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="4" r="3" stroke="currentColor" strokeWidth="1.5" />
        <line x1="8" y1="7" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="10" x2="11" y2="10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" />
        <line x1="5" y1="13" x2="11" y2="13" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" />
    </svg>
);

const IconAttitude = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <ellipse cx="8" cy="8" rx="7" ry="4" stroke="currentColor" strokeWidth="1.5" />
        <line x1="8" y1="4" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <polygon points="8,14 6,11 10,11" fill="currentColor" />
    </svg>
);

const IconFault = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 14L7 8L9 10L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="7" y1="8" x2="3" y2="4" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
    </svg>
);

/* ─── Borehole Section ─── */

type BoreholeTab = 'info' | 'layers' | 'properties' | 'photos';

interface BoreholeSectionProps {
    isMaximized?: boolean;
}

function BoreholeSection({ isMaximized = false }: BoreholeSectionProps) {
    const { selectedBorehole, clearSelection } = useBoreholeStore();
    const [tab, setTab] = useState<BoreholeTab>('info');

    if (!selectedBorehole) return null;

    const tabs: { key: BoreholeTab; label: string }[] = [
        { key: 'info', label: '基本' },
        { key: 'layers', label: '地層' },
        { key: 'properties', label: '物性' },
        { key: 'photos', label: '照片' },
    ];

    // Dynamic height based on maximize state
    const contentMaxHeight = isMaximized ? 'calc(100vh - 280px)' : '300px';
    const contentStyle = {
        maxHeight: contentMaxHeight,
        overflow: 'auto',
        transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    return (
        <SectionCard
            title={selectedBorehole.name || selectedBorehole.boreholeNo}
            icon={IconBorehole}
            accentColor={T.accent.borehole}
            badge="鑽孔"
            onClose={clearSelection}
        >
            {/* Sub-tabs */}
            <div style={{
                display: 'flex',
                gap: '2px',
                background: '#f1f5f9',
                borderRadius: '6px',
                padding: '2px',
                marginBottom: '12px',
            }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            flex: 1,
                            padding: '6px 0',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: tab === t.key ? 600 : 400,
                            color: tab === t.key ? T.accent.borehole : T.textMuted,
                            background: tab === t.key ? '#fff' : 'transparent',
                            cursor: 'pointer',
                            transition: T.transition,
                            boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        }}
                    >{t.label}</button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'info' && (
                <div>
                    <DataRow label="鑽孔編號" value={selectedBorehole.boreholeNo} />
                    <SectionDivider />
                    <DataRow label="X (東距)" value={selectedBorehole.x.toFixed(1)} mono />
                    <DataRow label="Y (北距)" value={selectedBorehole.y.toFixed(1)} mono />
                    <DataRow label="孔口高程" value={`${selectedBorehole.elevation.toFixed(1)} m`} mono />
                    <SectionDivider />
                    <DataRow label="總深度" value={`${selectedBorehole.totalDepth.toFixed(1)} m`} mono color={T.accent.borehole} />
                    {selectedBorehole.area && <DataRow label="區域" value={selectedBorehole.area} />}
                    {selectedBorehole.contractor && <DataRow label="承攬商" value={selectedBorehole.contractor} />}
                </div>
            )}
            {tab === 'layers' && (
                <div style={contentStyle}>
                    <LayerTable layers={selectedBorehole.layers} />
                </div>
            )}
            {tab === 'properties' && (
                <div style={contentStyle}>
                    <PropertyChart properties={selectedBorehole.properties} />
                </div>
            )}
            {tab === 'photos' && (
                <div style={contentStyle}>
                    <PhotoGallery photos={selectedBorehole.photos} />
                </div>
            )}
        </SectionCard>
    );
}

/* ─── Attitude Section ─── */

function AttitudeSection() {
    const { attitudes, selectedAttitudeId, selectAttitude } = useAttitudeStore();
    const attitude = attitudes.find(a => a.id === selectedAttitudeId);

    if (!selectedAttitudeId || !attitude) return null;

    return (
        <SectionCard
            title={`N ${attitude.strike.toFixed(0)}° E / ${attitude.dip.toFixed(0)}°`}
            icon={IconAttitude}
            accentColor={T.accent.attitude}
            badge="位態"
            onClose={() => selectAttitude(null)}
        >
            <DataRow label="X (東距)" value={attitude.x.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mono />
            <DataRow label="Y (北距)" value={attitude.y.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mono />
            <DataRow label="Z (高程)" value={`${attitude.z.toFixed(1)} m`} mono />
            <SectionDivider />
            <DataRow label="走向 (Strike)" value={`N ${attitude.strike.toFixed(1)}° E`} mono color={T.accent.attitude} />
            <DataRow label="傾角 (Dip)" value={`${attitude.dip.toFixed(1)}°`} mono color={T.accent.attitude} />
            <DataRow label="傾向" value={attitude.dipDirection || '--'} />
            {attitude.description && (
                <>
                    <SectionDivider />
                    <div style={{
                        fontSize: '12px',
                        color: T.textSecondary,
                        lineHeight: 1.6,
                        background: T.bgSection,
                        padding: '8px 10px',
                        borderRadius: T.radiusSm,
                        border: `1px solid ${T.borderLight}`,
                        marginTop: '4px',
                    }}>
                        {attitude.description}
                    </div>
                </>
            )}
        </SectionCard>
    );
}

/* ─── Fault Section ─── */

const faultTypeLabels: Record<string, string> = {
    'normal': '正斷層',
    'reverse': '逆斷層',
    'strike-slip': '走滑斷層',
};

function FaultSection() {
    const { faultPlanes, selectedFaultId, selectFault } = useFaultPlaneStore();
    const fault = faultPlanes.find(f => f.id === selectedFaultId);

    if (!selectedFaultId || !fault) return null;

    return (
        <SectionCard
            title={fault.name}
            icon={IconFault}
            accentColor={T.accent.fault}
            badge={faultTypeLabels[fault.type] || fault.type}
            onClose={() => selectFault(null)}
        >
            <DataRow label="類型" value={
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        width: '10px', height: '10px', borderRadius: '2px',
                        background: fault.color, display: 'inline-block',
                    }} />
                    {faultTypeLabels[fault.type] || fault.type}
                </span>
            } />
            <SectionDivider />
            <DataRow label="傾角" value={`${fault.dipAngle}°`} mono color={T.accent.fault} />
            <DataRow label="傾向" value={`${fault.dipDirection}°`} mono />
            <DataRow label="延伸深度" value={`${fault.depth} m`} mono />
            <SectionDivider />
            <DataRow label="座標點數" value={`${fault.coordinates.length} 點`} />
        </SectionCard>
    );
}

/* ─── Main Panel ─── */

export function InspectorPanel() {
    const { selectedBorehole } = useBoreholeStore();
    const { selectedAttitudeId } = useAttitudeStore();
    const { selectedFaultId } = useFaultPlaneStore();

    const hasAny = !!selectedBorehole || !!selectedAttitudeId || !!selectedFaultId;

    // Determine if we should maximize the borehole view
    // Rule: Only maximize if borehole is selected AND (no attitude AND no fault selected)
    const isBoreholeOnly = !!selectedBorehole && !selectedAttitudeId && !selectedFaultId;

    if (!hasAny) return null;

    return (
        <>
            <style>{`
                @keyframes inspectorSlideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes inspectorSlideDown {
                    from { opacity: 0; max-height: 0; }
                    to { opacity: 1; max-height: 600px; }
                }
                .inspector-panel::-webkit-scrollbar {
                    width: 6px;
                }
                .inspector-panel::-webkit-scrollbar-track {
                    background: transparent;
                }
                .inspector-panel::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }
                .inspector-panel::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>

            <div
                className="inspector-panel"
                style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    width: '340px',
                    maxHeight: 'calc(100vh - 100px)',
                    overflowY: 'visible',
                    overflowX: 'visible',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    zIndex: 20,
                    pointerEvents: 'none',
                    animation: 'inspectorSlideUp 0.25s ease-out',
                    fontFamily: T.font,
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth width transition if we ever change it
                }}
            >
                <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Panel Header */}
                    <div style={{
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: T.radiusSm,
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: `1px solid ${T.border}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <rect x="1" y="1" width="5" height="5" rx="1" stroke={T.textMuted} strokeWidth="1.5" />
                            <rect x="8" y="1" width="5" height="5" rx="1" stroke={T.textMuted} strokeWidth="1.5" />
                            <rect x="1" y="8" width="5" height="5" rx="1" stroke={T.textMuted} strokeWidth="1.5" />
                            <rect x="8" y="8" width="5" height="5" rx="1" stroke={T.textMuted} strokeWidth="1.5" />
                        </svg>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: T.textSecondary,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                        }}>Inspector</span>
                        <span style={{
                            fontSize: '11px',
                            color: T.textMuted,
                            marginLeft: 'auto',
                        }}>
                            {[
                                selectedBorehole && '鑽孔',
                                selectedAttitudeId && '位態',
                                selectedFaultId && '斷層',
                            ].filter(Boolean).join(' / ')}
                        </span>
                    </div>

                    {/* Sections — STACKED */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                    }}>
                        <BoreholeSection isMaximized={isBoreholeOnly} />
                        <AttitudeSection />
                        <FaultSection />
                    </div>
                </div>
            </div>
        </>
    );
}

export default InspectorPanel;
