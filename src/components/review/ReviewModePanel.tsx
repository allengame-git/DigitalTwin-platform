/**
 * ReviewModePanel
 * @module components/review/ReviewModePanel
 *
 * 3D 場景側邊欄審查模式面板
 * - 選擇/建立審查作業
 * - 顯示 marker 清單（依模組分群，當前模組優先）
 * - 點擊 marker 飛到對應視角
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Plus, MapPin, ExternalLink, AlertCircle } from 'lucide-react';
import { useReviewStore } from '../../stores/reviewStore';
import { getModuleTypeConfig } from '../../config/moduleRegistry';
import type { ReviewMarker, MarkerStatus, MarkerPriority } from '../../types/review';

interface ReviewModePanelProps {
    projectId: string;
    moduleId: string;
    onFlyTo?: (position: [number, number, number], target: [number, number, number]) => void;
}

const STATUS_COLOR: Record<MarkerStatus, string> = {
    open: '#ef4444',
    in_progress: '#eab308',
    resolved: '#22c55e',
};

const STATUS_LABEL: Record<MarkerStatus, string> = {
    open: '待處理',
    in_progress: '處理中',
    resolved: '已解決',
};

const PRIORITY_LABEL: Record<MarkerPriority, string> = {
    high: '高',
    medium: '中',
    low: '低',
};

const PRIORITY_COLOR: Record<MarkerPriority, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#94a3b8',
};

const SESSION_STATUS_LABEL: Record<string, string> = {
    draft: '草稿',
    active: '進行中',
    concluded: '已結案',
};

export default function ReviewModePanel({ projectId, moduleId, onFlyTo }: ReviewModePanelProps) {
    const navigate = useNavigate();
    const { projectCode } = useParams<{ projectCode: string }>();

    const {
        sessions,
        markers,
        reviewMode,
        activeSessionId,
        selectedMarkerId,
        loading,
        fetchSessions,
        enterReviewMode,
        exitReviewMode,
        selectMarker,
        createSession,
        currentSession,
        fetchSession,
    } = useReviewStore();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [creating, setCreating] = useState(false);

    // 載入專案的審查作業
    useEffect(() => {
        fetchSessions(projectId);
    }, [projectId, fetchSessions]);

    // 進入審查模式後載入 session 詳情
    useEffect(() => {
        if (activeSessionId) {
            fetchSession(activeSessionId);
        }
    }, [activeSessionId, fetchSession]);

    // 可選的作業列表（draft + active）
    const selectableSessions = useMemo(
        () => sessions.filter((s) => s.status === 'draft' || s.status === 'active'),
        [sessions]
    );

    // 依模組分群 markers，當前模組優先
    const groupedMarkers = useMemo(() => {
        const currentModuleMarkers: ReviewMarker[] = [];
        const otherModuleMap = new Map<string, ReviewMarker[]>();

        for (const m of markers) {
            if (m.moduleId === moduleId) {
                currentModuleMarkers.push(m);
            } else {
                const key = m.moduleId;
                if (!otherModuleMap.has(key)) otherModuleMap.set(key, []);
                otherModuleMap.get(key)!.push(m);
            }
        }

        const groups: { moduleId: string; moduleName: string; moduleType: string; markers: ReviewMarker[] }[] = [];

        if (currentModuleMarkers.length > 0) {
            const first = currentModuleMarkers[0];
            groups.push({
                moduleId,
                moduleName: first.module?.name || '目前模組',
                moduleType: first.module?.type || '',
                markers: currentModuleMarkers,
            });
        }

        for (const [mid, mks] of otherModuleMap) {
            const first = mks[0];
            groups.push({
                moduleId: mid,
                moduleName: first.module?.name || mid,
                moduleType: first.module?.type || '',
                markers: mks,
            });
        }

        return groups;
    }, [markers, moduleId]);

    const handleCreateSession = useCallback(async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        const session = await createSession({ projectId, title: newTitle.trim() });
        setCreating(false);
        if (session) {
            setNewTitle('');
            setShowCreateForm(false);
            enterReviewMode(session.id);
        }
    }, [newTitle, projectId, createSession, enterReviewMode]);

    const handleSelectSession = useCallback(
        (sessionId: string) => {
            enterReviewMode(sessionId);
        },
        [enterReviewMode]
    );

    const handleMarkerClick = useCallback(
        (marker: ReviewMarker) => {
            selectMarker(marker.id);
            if (marker.moduleId === moduleId && onFlyTo) {
                onFlyTo(
                    [marker.cameraPositionX, marker.cameraPositionY, marker.cameraPositionZ],
                    [marker.cameraTargetX, marker.cameraTargetY, marker.cameraTargetZ]
                );
            }
        },
        [selectMarker, moduleId, onFlyTo]
    );

    const handleCrossModuleNav = useCallback(
        (marker: ReviewMarker) => {
            if (!projectCode || !activeSessionId) return;
            navigate(
                `/project/${projectCode}/module/${marker.moduleId}?review=${activeSessionId}&marker=${marker.id}`
            );
        },
        [projectCode, activeSessionId, navigate]
    );

    const activeSession = useMemo(
        () => currentSession ?? sessions.find((s) => s.id === activeSessionId),
        [currentSession, sessions, activeSessionId]
    );

    // ---- Render ----

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: '#ea580c',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    flexShrink: 0,
                }}
            >
                <span>審查模式</span>
                <button
                    onClick={exitReviewMode}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                    title="退出審查模式"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', fontSize: '13px' }}>
                {!activeSessionId ? (
                    /* Session Selector */
                    <div style={{ padding: '12px' }}>
                        <div style={{ color: '#64748b', marginBottom: '8px' }}>選擇審查作業</div>

                        {selectableSessions.length === 0 && !loading && (
                            <div style={{ color: '#94a3b8', padding: '16px 0', textAlign: 'center' }}>
                                尚無審查作業
                            </div>
                        )}

                        {selectableSessions.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => handleSelectSession(s.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: '8px 10px',
                                    marginBottom: '4px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                }}
                            >
                                <span style={{ fontWeight: 500 }}>{s.title}</span>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        padding: '1px 6px',
                                        borderRadius: '9999px',
                                        background: s.status === 'active' ? '#dcfce7' : '#f1f5f9',
                                        color: s.status === 'active' ? '#16a34a' : '#64748b',
                                    }}
                                >
                                    {SESSION_STATUS_LABEL[s.status]}
                                </span>
                            </button>
                        ))}

                        {/* Create new session */}
                        {!showCreateForm ? (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    width: '100%',
                                    padding: '8px 10px',
                                    marginTop: '8px',
                                    border: '1px dashed #ea580c',
                                    borderRadius: '6px',
                                    background: '#fff7ed',
                                    color: '#ea580c',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    fontSize: '13px',
                                }}
                            >
                                <Plus size={14} />
                                新增審查作業
                            </button>
                        ) : (
                            <div
                                style={{
                                    marginTop: '8px',
                                    padding: '10px',
                                    border: '1px solid #fed7aa',
                                    borderRadius: '6px',
                                    background: '#fff7ed',
                                }}
                            >
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateSession();
                                        if (e.key === 'Escape') {
                                            setShowCreateForm(false);
                                            setNewTitle('');
                                        }
                                    }}
                                    placeholder="輸入審查作業名稱"
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '6px 8px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        marginBottom: '8px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={handleCreateSession}
                                        disabled={!newTitle.trim() || creating}
                                        style={{
                                            flex: 1,
                                            padding: '5px 0',
                                            border: 'none',
                                            borderRadius: '4px',
                                            background: '#ea580c',
                                            color: '#fff',
                                            fontWeight: 500,
                                            fontSize: '12px',
                                            cursor: newTitle.trim() && !creating ? 'pointer' : 'not-allowed',
                                            opacity: !newTitle.trim() || creating ? 0.5 : 1,
                                        }}
                                    >
                                        {creating ? '建立中...' : '建立'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setNewTitle('');
                                        }}
                                        style={{
                                            padding: '5px 12px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '4px',
                                            background: '#fff',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Active session content */
                    <>
                        {/* Session info */}
                        <div
                            style={{
                                padding: '10px 12px',
                                borderBottom: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>
                                {activeSession?.title || '審查作業'}
                            </span>
                            {activeSession && (
                                <span
                                    style={{
                                        fontSize: '11px',
                                        padding: '1px 6px',
                                        borderRadius: '9999px',
                                        background:
                                            activeSession.status === 'active'
                                                ? '#dcfce7'
                                                : activeSession.status === 'draft'
                                                  ? '#f1f5f9'
                                                  : '#fef3c7',
                                        color:
                                            activeSession.status === 'active'
                                                ? '#16a34a'
                                                : activeSession.status === 'draft'
                                                  ? '#64748b'
                                                  : '#d97706',
                                    }}
                                >
                                    {SESSION_STATUS_LABEL[activeSession.status]}
                                </span>
                            )}
                        </div>

                        {/* Marker list */}
                        <div style={{ padding: '8px 0' }}>
                            {markers.length === 0 && (
                                <div
                                    style={{
                                        textAlign: 'center',
                                        color: '#94a3b8',
                                        padding: '24px 12px',
                                    }}
                                >
                                    <MapPin size={20} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.4 }} />
                                    尚無標記
                                </div>
                            )}

                            {groupedMarkers.map((group) => {
                                const typeConfig = getModuleTypeConfig(group.moduleType);
                                const IconComponent = typeConfig?.icon;
                                const isCurrent = group.moduleId === moduleId;

                                return (
                                    <div key={group.moduleId} style={{ marginBottom: '4px' }}>
                                        {/* Group header */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            {IconComponent && <IconComponent size={12} />}
                                            <span>{group.moduleName}</span>
                                            {!isCurrent && (
                                                <span
                                                    style={{
                                                        fontSize: '10px',
                                                        color: '#94a3b8',
                                                        fontWeight: 400,
                                                        textTransform: 'none',
                                                    }}
                                                >
                                                    (其他模組)
                                                </span>
                                            )}
                                        </div>

                                        {/* Marker items */}
                                        {group.markers.map((marker) => {
                                            const isSelected = marker.id === selectedMarkerId;
                                            return (
                                                <div
                                                    key={marker.id}
                                                    onClick={() => handleMarkerClick(marker)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '7px 12px 7px 20px',
                                                        cursor: 'pointer',
                                                        background: isSelected ? '#fff7ed' : 'transparent',
                                                        borderLeft: isSelected
                                                            ? '3px solid #ea580c'
                                                            : '3px solid transparent',
                                                    }}
                                                >
                                                    {/* Status dot */}
                                                    <span
                                                        style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            background: STATUS_COLOR[marker.status],
                                                            flexShrink: 0,
                                                        }}
                                                        title={STATUS_LABEL[marker.status]}
                                                    />

                                                    {/* Title */}
                                                    <span
                                                        style={{
                                                            flex: 1,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            fontWeight: isSelected ? 600 : 400,
                                                            color: isSelected ? '#ea580c' : '#334155',
                                                            fontSize: '13px',
                                                        }}
                                                    >
                                                        {marker.title}
                                                    </span>

                                                    {/* Priority */}
                                                    {marker.priority === 'high' && (
                                                        <AlertCircle
                                                            size={13}
                                                            style={{ color: PRIORITY_COLOR.high, flexShrink: 0 }}
                                                            title={`優先度: ${PRIORITY_LABEL[marker.priority]}`}
                                                        />
                                                    )}

                                                    {/* Cross-module navigation */}
                                                    {!isCurrent && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCrossModuleNav(marker);
                                                            }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                padding: '2px',
                                                                color: '#94a3b8',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                flexShrink: 0,
                                                            }}
                                                            title="前往該模組"
                                                        >
                                                            <ExternalLink size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Bottom: exit button (only when session active) */}
            {activeSessionId && (
                <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                    <button
                        onClick={exitReviewMode}
                        style={{
                            width: '100%',
                            padding: '8px 0',
                            border: '1px solid #ea580c',
                            borderRadius: '6px',
                            background: '#fff',
                            color: '#ea580c',
                            fontWeight: 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        結束審查模式
                    </button>
                </div>
            )}
        </div>
    );
}
