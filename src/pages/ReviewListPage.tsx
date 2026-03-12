/**
 * ReviewListPage
 * @module pages/ReviewListPage
 *
 * 審查作業列表頁面
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReviewStore } from '../stores/reviewStore';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import type { ReviewStatus, ReviewSessionWithStats } from '../types/review';
import {
    ArrowLeft,
    Plus,
    Calendar,
    Users,
    FileText,
    Download,
    ClipboardList,
    X,
} from 'lucide-react';

// ──────────────────────── Constants ────────────────────────

const STATUS_LABELS: Record<ReviewStatus, string> = {
    draft: '草稿',
    active: '進行中',
    concluded: '已結案',
};

const STATUS_BADGE_STYLES: Record<ReviewStatus, React.CSSProperties> = {
    draft: { background: '#f1f5f9', color: '#475569' },
    active: { background: '#dbeafe', color: '#1e40af' },
    concluded: { background: '#dcfce7', color: '#166534' },
};

const FILTER_TABS: Array<{ key: ReviewStatus | 'all'; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'draft', label: '草稿' },
    { key: 'active', label: '進行中' },
    { key: 'concluded', label: '已結案' },
];

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ──────────────────────── Create Session Modal ────────────────────────

interface CreateModalProps {
    projectId: string;
    projectCode: string;
    onClose: () => void;
}

const CreateSessionModal: React.FC<CreateModalProps> = ({ projectId, projectCode, onClose }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const createSession = useReviewStore((s) => s.createSession);
    const navigate = useNavigate();

    const handleSubmit = async () => {
        if (!title.trim()) return;
        setSubmitting(true);
        const session = await createSession({
            projectId,
            title: title.trim(),
            description: description.trim() || undefined,
            scheduledAt: scheduledAt || undefined,
        });
        setSubmitting(false);
        if (session) {
            navigate(`/project/${projectCode}/reviews/${session.id}`);
        }
    };

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
                    width: '460px', maxWidth: '90vw',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>新增審查</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Title */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                    審查標題 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：第三次地質審查會議"
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '14px',
                        boxSizing: 'border-box',
                    }}
                />

                {/* Description */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                    描述（選填）
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="審查目的或備註..."
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '14px',
                        resize: 'vertical', boxSizing: 'border-box',
                    }}
                />

                {/* Scheduled date */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                    排定時間（選填）
                </label>
                <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '14px',
                        boxSizing: 'border-box',
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
                        onClick={handleSubmit}
                        disabled={submitting || !title.trim()}
                        style={{
                            padding: '8px 16px', borderRadius: '6px',
                            border: 'none',
                            background: (submitting || !title.trim()) ? '#94a3b8' : '#2563eb',
                            color: '#fff',
                            cursor: (submitting || !title.trim()) ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        {submitting ? '建立中...' : '建立'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────── Session Card ────────────────────────

interface SessionCardProps {
    session: ReviewSessionWithStats;
    projectCode: string;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, projectCode }) => {
    const navigate = useNavigate();
    const stats = session.markerStats;

    return (
        <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                    {session.title}
                </h3>
                <span style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    ...STATUS_BADGE_STYLES[session.status],
                }}>
                    {STATUS_LABELS[session.status]}
                </span>
            </div>

            {/* Description */}
            {session.description && (
                <p style={{
                    fontSize: '13px', color: '#64748b', margin: '0 0 12px 0',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                }}>
                    {session.description}
                </p>
            )}

            {/* Meta info */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={14} />
                    {formatDate(session.createdAt)}
                </span>
                {session.scheduledAt && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {formatDateTime(session.scheduledAt)}
                    </span>
                )}
                {session.participantNames && session.participantNames.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} />
                        {session.participantNames.join(', ')}
                    </span>
                )}
            </div>

            {/* Marker stats */}
            {stats && stats.total > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', marginBottom: '16px' }}>
                    <span style={{ color: '#64748b' }}>標記:</span>
                    {stats.open > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                            {stats.open}
                        </span>
                    )}
                    {stats.in_progress > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />
                            {stats.in_progress}
                        </span>
                    )}
                    {stats.resolved > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                            {stats.resolved}
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => navigate(`/project/${projectCode}/reviews/${session.id}`)}
                    style={{
                        padding: '6px 14px', borderRadius: '6px',
                        border: 'none', background: '#2563eb', color: '#fff',
                        fontSize: '13px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                >
                    <ClipboardList size={14} />
                    檢視
                </button>
                {session.pdfUrl && (
                    <a
                        href={session.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            padding: '6px 14px', borderRadius: '6px',
                            border: '1px solid #e2e8f0', background: '#fff', color: '#475569',
                            fontSize: '13px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            textDecoration: 'none',
                        }}
                    >
                        <Download size={14} />
                        下載 PDF
                    </a>
                )}
            </div>
        </div>
    );
};

// ──────────────────────── Main Page ────────────────────────

export const ReviewListPage: React.FC = () => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const projects = useProjectStore((s) => s.projects);
    const fetchProjects = useProjectStore((s) => s.fetchProjects);
    const { sessions, loading, fetchSessions } = useReviewStore();

    const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const project = useMemo(
        () => projects.find((p) => p.code === projectCode),
        [projects, projectCode],
    );

    // Load projects if not already loaded
    useEffect(() => {
        if (projects.length === 0) {
            fetchProjects();
        }
    }, [projects.length, fetchProjects]);

    // Fetch sessions when project is available
    useEffect(() => {
        if (project) {
            fetchSessions(project.id);
        }
    }, [project?.id, fetchSessions]);

    const isAdminOrEngineer = user?.role === 'admin' || user?.role === 'engineer';

    const filteredSessions = useMemo(() => {
        if (statusFilter === 'all') return sessions;
        return sessions.filter((s) => s.status === statusFilter);
    }, [sessions, statusFilter]);

    // Loading / project not found
    if (projects.length > 0 && !project) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', background: '#f8fafc',
            }}>
                <h1 style={{ fontSize: '48px', color: '#e11d48' }}>404</h1>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>專案不存在</p>
                <Link to="/" style={{ color: '#2563eb' }}>返回專案列表</Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <header style={{
                background: '#fff',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link
                        to={`/project/${projectCode}`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '14px', color: '#64748b', textDecoration: 'none',
                        }}
                    >
                        <ArrowLeft size={16} />
                        返回專案
                    </Link>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                        審查作業
                    </h1>
                </div>
                {isAdminOrEngineer && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', borderRadius: '6px',
                            border: 'none', background: '#2563eb', color: '#fff',
                            fontSize: '14px', cursor: 'pointer', fontWeight: 500,
                        }}
                    >
                        <Plus size={16} />
                        新增審查
                    </button>
                )}
            </header>

            {/* Content */}
            <main style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
                {/* Status filter tabs */}
                <div style={{
                    display: 'flex', gap: '4px', marginBottom: '24px',
                    background: '#f1f5f9', borderRadius: '8px', padding: '4px',
                }}>
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                background: statusFilter === tab.key ? '#fff' : 'transparent',
                                color: statusFilter === tab.key ? '#0f172a' : '#64748b',
                                boxShadow: statusFilter === tab.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {loading && sessions.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                        載入中...
                    </p>
                )}

                {/* Empty state */}
                {!loading && filteredSessions.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        color: '#94a3b8',
                    }}>
                        <ClipboardList size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                            {statusFilter === 'all' ? '尚無審查作業' : `沒有${STATUS_LABELS[statusFilter as ReviewStatus]}的審查作業`}
                        </p>
                        {isAdminOrEngineer && statusFilter === 'all' && (
                            <p style={{ fontSize: '13px' }}>
                                點擊右上角「新增審查」開始第一次審查
                            </p>
                        )}
                    </div>
                )}

                {/* Session cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredSessions.map((session) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            projectCode={projectCode || ''}
                        />
                    ))}
                </div>
            </main>

            {/* Create modal */}
            {showCreateModal && project && (
                <CreateSessionModal
                    projectId={project.id}
                    projectCode={projectCode || ''}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
};

export default ReviewListPage;
