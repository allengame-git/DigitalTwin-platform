/**
 * ReviewDetailPage
 * @module pages/ReviewDetailPage
 *
 * 審查作業詳情頁 — 顯示單一審查 session 的完整資訊、標記、留言
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useReviewStore } from '../stores/reviewStore';
import { getModuleTypeConfig } from '../config/moduleRegistry';
import type { ReviewMarker, MarkerStatus, ReviewComment } from '../types/review';
import {
    ArrowLeft,
    Play,
    Square,
    FileDown,
    Trash2,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Send,
    X,
    UserPlus,
    Clock,
    Calendar,
    Pencil,
    Check,
} from 'lucide-react';

// ─── Status / Priority config ───

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    draft: { label: '草稿', bg: '#f1f5f9', color: '#475569' },
    active: { label: '進行中', bg: '#dbeafe', color: '#1e40af' },
    concluded: { label: '已結束', bg: '#dcfce7', color: '#166534' },
};

const MARKER_STATUS_CONFIG: Record<MarkerStatus, { label: string; bg: string; color: string; border: string }> = {
    open: { label: '待處理', bg: '#fef2f2', color: '#991b1b', border: '#ef4444' },
    in_progress: { label: '處理中', bg: '#fefce8', color: '#854d0e', border: '#eab308' },
    resolved: { label: '已解決', bg: '#f0fdf4', color: '#166534', border: '#22c55e' },
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    low: { label: '低', bg: '#f1f5f9', color: '#64748b' },
    medium: { label: '中', bg: '#fff7ed', color: '#c2410c' },
    high: { label: '高', bg: '#fef2f2', color: '#dc2626' },
};

const MARKER_STATUS_CYCLE: MarkerStatus[] = ['open', 'in_progress', 'resolved'];

// ─── Helpers ───

const formatDate = (iso: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '剛才';
    if (diffMin < 60) return `${diffMin} 分鐘前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} 小時前`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} 天前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
};

// ─── Conclude Modal ───

interface ConcludeModalProps {
    onSubmit: (conclusion: string) => void;
    onClose: () => void;
    submitting: boolean;
}

const ConcludeModal: React.FC<ConcludeModalProps> = ({ onSubmit, onClose, submitting }) => {
    const [text, setText] = useState('');

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: '12px', padding: '24px',
                    width: '480px', maxWidth: '90vw',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>結束審查</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={20} />
                    </button>
                </div>

                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
                    請輸入審查結論。結束後將無法新增或修改標記。
                </p>

                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="輸入審查結論..."
                    rows={5}
                    style={{
                        width: '100%', padding: '10px 12px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', fontSize: '14px',
                        resize: 'vertical', boxSizing: 'border-box', marginBottom: '20px',
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{
                        padding: '8px 16px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', background: '#fff',
                        color: '#64748b', cursor: 'pointer', fontSize: '14px',
                    }}>
                        取消
                    </button>
                    <button
                        onClick={() => onSubmit(text)}
                        disabled={submitting || !text.trim()}
                        style={{
                            padding: '8px 16px', borderRadius: '6px',
                            border: 'none',
                            background: (submitting || !text.trim()) ? '#94a3b8' : '#16a34a',
                            color: '#fff',
                            cursor: (submitting || !text.trim()) ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        {submitting ? '結束中...' : '確認結束'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Delete Confirm Modal ───

interface DeleteConfirmModalProps {
    title: string;
    onConfirm: () => void;
    onClose: () => void;
    submitting: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ title, onConfirm, onClose, submitting }) => (
    <div
        style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={onClose}
    >
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                background: '#fff', borderRadius: '12px', padding: '24px',
                width: '400px', maxWidth: '90vw',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
        >
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#dc2626', marginBottom: '12px' }}>刪除審查</h2>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
                確定要刪除「{title}」？此操作無法復原，所有標記與留言將一併刪除。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={onClose} style={{
                    padding: '8px 16px', borderRadius: '6px',
                    border: '1px solid #e2e8f0', background: '#fff',
                    color: '#64748b', cursor: 'pointer', fontSize: '14px',
                }}>
                    取消
                </button>
                <button
                    onClick={onConfirm}
                    disabled={submitting}
                    style={{
                        padding: '8px 16px', borderRadius: '6px',
                        border: 'none',
                        background: submitting ? '#fca5a5' : '#dc2626',
                        color: '#fff',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                    }}
                >
                    {submitting ? '刪除中...' : '確認刪除'}
                </button>
            </div>
        </div>
    </div>
);

// ─── Comment Item ───

interface CommentItemProps {
    comment: ReviewComment;
    userId: string | undefined;
    onDelete: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, userId, onDelete }) => (
    <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '10px 12px', borderBottom: '1px solid #f1f5f9',
    }}>
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    {comment.user?.name || '未知使用者'}
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {formatDateShort(comment.createdAt)}
                </span>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {comment.content}
            </p>
        </div>
        {userId === comment.createdBy && (
            <button
                onClick={() => onDelete(comment.id)}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#cbd5e1', padding: '4px', flexShrink: 0,
                }}
                title="刪除留言"
            >
                <Trash2 size={14} />
            </button>
        )}
    </div>
);

// ─── Marker Card ───

interface MarkerCardProps {
    marker: ReviewMarker;
    projectCode: string;
    userId: string | undefined;
    onStatusCycle: (markerId: string, current: MarkerStatus) => void;
    onAddComment: (markerId: string, content: string) => Promise<void>;
    onDeleteComment: (commentId: string, markerId: string) => void;
}

const MarkerCard: React.FC<MarkerCardProps> = ({
    marker, projectCode, userId,
    onStatusCycle, onAddComment, onDeleteComment,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    const statusCfg = MARKER_STATUS_CONFIG[marker.status];
    const priorityCfg = PRIORITY_CONFIG[marker.priority];
    const comments = marker.comments || [];

    const handleReply = async () => {
        if (!replyText.trim() || sending) return;
        setSending(true);
        await onAddComment(marker.id, replyText.trim());
        setReplyText('');
        setSending(false);
    };

    return (
        <div style={{
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            borderLeft: `3px solid ${statusCfg.border}`,
            marginBottom: '8px',
            overflow: 'hidden',
        }}>
            {/* Marker header */}
            <div style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{marker.title}</span>
                            <button
                                onClick={() => onStatusCycle(marker.id, marker.status)}
                                style={{
                                    fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                                    background: statusCfg.bg, color: statusCfg.color,
                                    border: 'none', cursor: 'pointer', fontWeight: 500,
                                }}
                                title="點擊切換狀態"
                            >
                                {statusCfg.label}
                            </button>
                            <span style={{
                                fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                                background: priorityCfg.bg, color: priorityCfg.color, fontWeight: 500,
                            }}>
                                {priorityCfg.label}
                            </span>
                        </div>
                        {marker.description && (
                            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                                {marker.description}
                            </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#94a3b8' }}>
                            <span>{formatDateShort(marker.createdAt)}</span>
                            <Link
                                to={`/project/${projectCode}/module/${marker.moduleId}?review=${marker.sessionId}&marker=${marker.id}`}
                                style={{
                                    color: '#2563eb', textDecoration: 'none',
                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                }}
                            >
                                前往 3D 場景 <ExternalLink size={11} />
                            </Link>
                        </div>
                    </div>

                    {/* Screenshot thumbnail */}
                    {marker.screenshotUrl && (
                        <a
                            href={marker.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ flexShrink: 0 }}
                        >
                            <img
                                src={marker.screenshotUrl}
                                alt="截圖"
                                style={{
                                    width: '80px', height: '60px', objectFit: 'cover',
                                    borderRadius: '6px', border: '1px solid #e2e8f0',
                                }}
                            />
                        </a>
                    )}
                </div>

                {/* Expand toggle */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '12px', color: '#64748b', padding: '4px 0 0 0',
                        marginTop: '4px',
                    }}
                >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    討論 ({comments.length})
                </button>
            </div>

            {/* Discussion thread */}
            {expanded && (
                <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    {comments.length > 0 ? (
                        comments.map((c) => (
                            <CommentItem
                                key={c.id}
                                comment={c}
                                userId={userId}
                                onDelete={(cid) => onDeleteComment(cid, marker.id)}
                            />
                        ))
                    ) : (
                        <p style={{ padding: '12px 16px', fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                            尚無留言
                        </p>
                    )}

                    {/* Reply input */}
                    <div style={{ padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="輸入留言..."
                            rows={1}
                            style={{
                                flex: 1, padding: '8px 10px', borderRadius: '6px',
                                border: '1px solid #e2e8f0', fontSize: '13px',
                                resize: 'none', boxSizing: 'border-box',
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleReply();
                                }
                            }}
                        />
                        <button
                            onClick={handleReply}
                            disabled={sending || !replyText.trim()}
                            style={{
                                padding: '8px', borderRadius: '6px',
                                border: 'none',
                                background: (sending || !replyText.trim()) ? '#e2e8f0' : '#2563eb',
                                color: (sending || !replyText.trim()) ? '#94a3b8' : '#fff',
                                cursor: (sending || !replyText.trim()) ? 'not-allowed' : 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ──────────────────────── Main Page ────────────────────────

export const ReviewDetailPage: React.FC = () => {
    const { projectCode, sessionId } = useParams<{ projectCode: string; sessionId: string }>();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const {
        currentSession,
        markers,
        loading,
        fetchSession,
        updateSession,
        deleteSession,
        updateMarker,
        addComment,
        deleteComment,
    } = useReviewStore();

    // Modal states
    const [showConcludeModal, setShowConcludeModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Editable title
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState('');

    useEffect(() => {
        if (sessionId) fetchSession(sessionId);
    }, [sessionId, fetchSession]);

    const isAdmin = user?.role === 'admin';
    const isAdminOrEngineer = user?.role === 'admin' || user?.role === 'engineer';

    // ─── Group markers by module ───
    const markersByModule = useMemo(() => {
        const groups = new Map<string, { moduleType: string; moduleName: string; markers: ReviewMarker[] }>();
        markers.forEach((m) => {
            const key = m.moduleId;
            if (!groups.has(key)) {
                groups.set(key, {
                    moduleType: m.module?.type || 'unknown',
                    moduleName: m.module?.name || 'Unknown',
                    markers: [],
                });
            }
            groups.get(key)!.markers.push(m);
        });
        return Array.from(groups.values());
    }, [markers]);

    // ─── Stats ───
    const stats = useMemo(() => {
        let open = 0, inProgress = 0, resolved = 0;
        markers.forEach((m) => {
            if (m.status === 'open') open++;
            else if (m.status === 'in_progress') inProgress++;
            else if (m.status === 'resolved') resolved++;
        });
        return { open, inProgress, resolved, total: markers.length };
    }, [markers]);

    // ─── Handlers ───

    const handleStartReview = useCallback(async () => {
        if (!sessionId) return;
        setSubmitting(true);
        await updateSession(sessionId, { status: 'active' });
        setSubmitting(false);
    }, [sessionId, updateSession]);

    const handleConclude = useCallback(async (conclusion: string) => {
        if (!sessionId) return;
        setSubmitting(true);
        await updateSession(sessionId, { status: 'concluded', conclusion });
        setSubmitting(false);
        setShowConcludeModal(false);
    }, [sessionId, updateSession]);

    const handleDelete = useCallback(async () => {
        if (!sessionId) return;
        setSubmitting(true);
        const ok = await deleteSession(sessionId);
        setSubmitting(false);
        if (ok) {
            navigate(`/project/${projectCode}/reviews`);
        }
        setShowDeleteModal(false);
    }, [sessionId, deleteSession, navigate, projectCode]);

    const handleStatusCycle = useCallback(async (markerId: string, current: MarkerStatus) => {
        const idx = MARKER_STATUS_CYCLE.indexOf(current);
        const next = MARKER_STATUS_CYCLE[(idx + 1) % MARKER_STATUS_CYCLE.length];
        await updateMarker(markerId, { status: next });
    }, [updateMarker]);

    const handleAddComment = useCallback(async (markerId: string, content: string) => {
        await addComment(markerId, content);
    }, [addComment]);

    const handleDeleteComment = useCallback(async (commentId: string, markerId: string) => {
        await deleteComment(commentId, markerId);
    }, [deleteComment]);

    const handleTitleSave = useCallback(async () => {
        if (!sessionId || !titleDraft.trim()) {
            setEditingTitle(false);
            return;
        }
        await updateSession(sessionId, { title: titleDraft.trim() });
        setEditingTitle(false);
    }, [sessionId, titleDraft, updateSession]);

    const handleExportPdf = useCallback(() => {
        // Placeholder — will be enhanced in Task 14
        alert('PDF 匯出功能開發中');
    }, []);

    // ─── Loading / Not found ───
    if (loading && !currentSession) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: '16px' }}>載入中...</p>
            </div>
        );
    }

    if (!currentSession) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h1 style={{ fontSize: '48px', color: '#e11d48' }}>404</h1>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>審查作業不存在</p>
                <Link to={`/project/${projectCode}/reviews`} style={{ color: '#2563eb' }}>返回審查列表</Link>
            </div>
        );
    }

    const statusCfg = STATUS_CONFIG[currentSession.status] || STATUS_CONFIG.draft;
    const participants = currentSession.participants || [];

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <header style={{
                background: '#fff',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px',
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {/* Back link */}
                    <Link
                        to={`/project/${projectCode}/reviews`}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            color: '#64748b', textDecoration: 'none', fontSize: '14px',
                            marginBottom: '12px',
                        }}
                    >
                        <ArrowLeft size={16} />
                        返回審查列表
                    </Link>

                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        {editingTitle ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    autoFocus
                                    style={{
                                        fontSize: '24px', fontWeight: 700, color: '#0f172a',
                                        border: '1px solid #2563eb', borderRadius: '6px',
                                        padding: '4px 8px', outline: 'none',
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleTitleSave();
                                        if (e.key === 'Escape') setEditingTitle(false);
                                    }}
                                />
                                <button
                                    onClick={handleTitleSave}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}
                                >
                                    <Check size={20} />
                                </button>
                                <button
                                    onClick={() => setEditingTitle(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <h1
                                style={{
                                    fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0,
                                    cursor: isAdminOrEngineer ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                }}
                                onClick={() => {
                                    if (isAdminOrEngineer) {
                                        setTitleDraft(currentSession.title);
                                        setEditingTitle(true);
                                    }
                                }}
                            >
                                {currentSession.title}
                                {isAdminOrEngineer && <Pencil size={16} style={{ color: '#94a3b8' }} />}
                            </h1>
                        )}

                        <span style={{
                            fontSize: '12px', padding: '4px 10px', borderRadius: '4px',
                            fontWeight: 500, background: statusCfg.bg, color: statusCfg.color,
                        }}>
                            {statusCfg.label}
                        </span>
                    </div>

                    {/* Action buttons */}
                    {isAdminOrEngineer && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {currentSession.status === 'draft' && (
                                <button
                                    onClick={handleStartReview}
                                    disabled={submitting}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 16px', borderRadius: '6px',
                                        border: 'none', background: '#2563eb', color: '#fff',
                                        cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '14px',
                                    }}
                                >
                                    <Play size={14} />
                                    開始審查
                                </button>
                            )}
                            {currentSession.status !== 'concluded' && (
                                <button
                                    onClick={() => setShowConcludeModal(true)}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 16px', borderRadius: '6px',
                                        border: '1px solid #e2e8f0', background: '#fff', color: '#475569',
                                        cursor: 'pointer', fontSize: '14px',
                                    }}
                                >
                                    <Square size={14} />
                                    結束審查
                                </button>
                            )}
                            <button
                                onClick={handleExportPdf}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', borderRadius: '6px',
                                    border: '1px solid #e2e8f0', background: '#fff', color: '#475569',
                                    cursor: 'pointer', fontSize: '14px',
                                }}
                            >
                                <FileDown size={14} />
                                匯出 PDF
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 16px', borderRadius: '6px',
                                        border: '1px solid #fecaca', background: '#fff', color: '#dc2626',
                                        cursor: 'pointer', fontSize: '14px',
                                    }}
                                >
                                    <Trash2 size={14} />
                                    刪除
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <main style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
                {/* Stats summary */}
                {stats.total > 0 && (
                    <div style={{
                        display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', background: '#fef2f2', borderRadius: '8px',
                            fontSize: '14px', color: '#991b1b', fontWeight: 500,
                        }}>
                            待處理 {stats.open}
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', background: '#fefce8', borderRadius: '8px',
                            fontSize: '14px', color: '#854d0e', fontWeight: 500,
                        }}>
                            處理中 {stats.inProgress}
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', background: '#f0fdf4', borderRadius: '8px',
                            fontSize: '14px', color: '#166534', fontWeight: 500,
                        }}>
                            已解決 {stats.resolved}
                        </div>
                    </div>
                )}

                {/* Info section */}
                <section style={{
                    background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                    padding: '20px 24px', marginBottom: '24px',
                }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px', marginTop: 0 }}>
                        審查資訊
                    </h2>

                    {currentSession.description && (
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: '12px' }}>
                            {currentSession.description}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} />
                            建立時間：{formatDate(currentSession.createdAt)}
                        </div>
                        {currentSession.scheduledAt && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={14} />
                                排定日期：{formatDate(currentSession.scheduledAt)}
                            </div>
                        )}
                        {currentSession.concludedAt && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={14} />
                                結束時間：{formatDate(currentSession.concludedAt)}
                            </div>
                        )}
                    </div>

                    {/* Conclusion box */}
                    {currentSession.conclusion && (
                        <div style={{
                            marginTop: '16px', padding: '14px 16px',
                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                        }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#166534', marginTop: 0, marginBottom: '6px' }}>
                                審查結論
                            </h3>
                            <p style={{ fontSize: '14px', color: '#15803d', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {currentSession.conclusion}
                            </p>
                        </div>
                    )}
                </section>

                {/* Participants section */}
                <section style={{
                    background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                    padding: '20px 24px', marginBottom: '24px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                            參與者 ({participants.length})
                        </h2>
                        {isAdminOrEngineer && (
                            <button
                                onClick={() => alert('新增參與者功能開發中')}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    padding: '6px 12px', borderRadius: '6px',
                                    border: '1px solid #e2e8f0', background: '#fff', color: '#475569',
                                    cursor: 'pointer', fontSize: '13px',
                                }}
                            >
                                <UserPlus size={14} />
                                新增參與者
                            </button>
                        )}
                    </div>

                    {participants.length > 0 ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {participants.map((p) => (
                                <div key={p.id} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 12px', borderRadius: '20px',
                                    background: '#f8fafc', border: '1px solid #e2e8f0',
                                    fontSize: '13px', color: '#334155',
                                }}>
                                    <span style={{ fontWeight: 500 }}>{p.user?.name || p.userId}</span>
                                    <span style={{
                                        fontSize: '11px', padding: '1px 6px', borderRadius: '4px',
                                        background: p.role === 'host' ? '#dbeafe' : '#f1f5f9',
                                        color: p.role === 'host' ? '#1e40af' : '#64748b',
                                        fontWeight: 500,
                                    }}>
                                        {p.role === 'host' ? '主持人' : '參與者'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>尚無參與者</p>
                    )}
                </section>

                {/* Markers section (grouped by module) */}
                <section>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                        審查標記 ({markers.length})
                    </h2>

                    {markersByModule.length === 0 ? (
                        <div style={{
                            background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                            padding: '40px 24px', textAlign: 'center',
                        }}>
                            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>尚無審查標記</p>
                        </div>
                    ) : (
                        markersByModule.map((group, gi) => {
                            const modCfg = getModuleTypeConfig(group.moduleType);
                            const IconComponent = modCfg?.icon;

                            return (
                                <div key={gi} style={{ marginBottom: '20px' }}>
                                    {/* Module group header */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        marginBottom: '10px', padding: '8px 0',
                                    }}>
                                        {IconComponent && (
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '6px',
                                                background: '#f1f5f9',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <IconComponent size={16} />
                                            </div>
                                        )}
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                                            {group.moduleName}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                            ({group.markers.length})
                                        </span>
                                    </div>

                                    {/* Marker cards */}
                                    {group.markers.map((marker) => (
                                        <MarkerCard
                                            key={marker.id}
                                            marker={marker}
                                            projectCode={projectCode || ''}
                                            userId={user?.id}
                                            onStatusCycle={handleStatusCycle}
                                            onAddComment={handleAddComment}
                                            onDeleteComment={handleDeleteComment}
                                        />
                                    ))}
                                </div>
                            );
                        })
                    )}
                </section>
            </main>

            {/* Modals */}
            {showConcludeModal && (
                <ConcludeModal
                    onSubmit={handleConclude}
                    onClose={() => setShowConcludeModal(false)}
                    submitting={submitting}
                />
            )}
            {showDeleteModal && (
                <DeleteConfirmModal
                    title={currentSession.title}
                    onConfirm={handleDelete}
                    onClose={() => setShowDeleteModal(false)}
                    submitting={submitting}
                />
            )}
        </div>
    );
};

export default ReviewDetailPage;
