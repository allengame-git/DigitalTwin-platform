/**
 * ReviewMarkerDetail — 審查標記詳情浮動面板
 * 顯示選取標記的完整資訊、狀態控制、截圖、討論串。
 */
import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, MapPin } from 'lucide-react';
import { useReviewStore } from '../../stores/reviewStore';
import { useAuthStore } from '../../stores/authStore';
import type { ReviewMarker, MarkerStatus } from '../../types/review';

interface ReviewMarkerDetailProps {
    marker: ReviewMarker;
    onClose: () => void;
}

const STATUS_OPTIONS: { key: MarkerStatus; label: string; color: string; bg: string }[] = [
    { key: 'open', label: '待處理', color: '#dc2626', bg: '#fef2f2' },
    { key: 'in_progress', label: '處理中', color: '#d97706', bg: '#fffbeb' },
    { key: 'resolved', label: '已解決', color: '#16a34a', bg: '#f0fdf4' },
];

const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
    low: { background: '#f1f5f9', color: '#64748b' },
    medium: { background: '#fff7ed', color: '#ea580c' },
    high: { background: '#fef2f2', color: '#dc2626' },
};

const PRIORITY_LABEL: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
};

function formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '剛才';
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    // fallback to date
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const ReviewMarkerDetail: React.FC<ReviewMarkerDetailProps> = ({ marker, onClose }) => {
    const updateMarker = useReviewStore((s) => s.updateMarker);
    const addComment = useReviewStore((s) => s.addComment);
    const deleteComment = useReviewStore((s) => s.deleteComment);
    const user = useAuthStore((s) => s.user);

    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const threadEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const comments = [...(marker.comments || [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const scrollToBottom = () => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [comments.length]);

    const handleStatusChange = async (status: MarkerStatus) => {
        if (status === marker.status) return;
        await updateMarker(marker.id, { status });
    };

    const handleSubmitComment = async () => {
        const trimmed = replyText.trim();
        if (!trimmed || submitting) return;
        setSubmitting(true);
        const result = await addComment(marker.id, trimmed);
        setSubmitting(false);
        if (result) {
            setReplyText('');
            setTimeout(scrollToBottom, 50);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitComment();
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        await deleteComment(commentId, marker.id);
    };

    return (
        <div style={panel}>
            {/* Header */}
            <div style={headerRow}>
                <div style={headerLeft}>
                    <span style={titleText}>{marker.title}</span>
                    <span style={{ ...priorityBadge, ...PRIORITY_STYLE[marker.priority] }}>
                        {PRIORITY_LABEL[marker.priority]}
                    </span>
                </div>
                <button onClick={onClose} style={closeBtn} title="關閉">
                    <X size={16} strokeWidth={2} />
                </button>
            </div>

            {/* Status bar */}
            <div style={statusBar}>
                {STATUS_OPTIONS.map(({ key, label, color, bg }) => {
                    const active = marker.status === key;
                    return (
                        <button
                            key={key}
                            onClick={() => handleStatusChange(key)}
                            style={{
                                ...statusBtn,
                                background: active ? bg : 'transparent',
                                color: active ? color : '#94a3b8',
                                border: active ? `1px solid ${color}30` : '1px solid transparent',
                                fontWeight: active ? 600 : 400,
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Screenshot */}
            {marker.screenshotUrl && (
                <a
                    href={marker.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={screenshotLink}
                >
                    <img
                        src={marker.screenshotUrl}
                        alt="截圖"
                        style={screenshotImg}
                    />
                </a>
            )}

            {/* Info */}
            <div style={infoSection}>
                <div style={infoRow}>
                    <MapPin size={12} style={{ flexShrink: 0, color: '#94a3b8' }} />
                    <span style={infoMono}>
                        X={marker.positionX.toFixed(1)}, Y={marker.positionY.toFixed(1)}, Z={marker.positionZ.toFixed(1)}
                    </span>
                </div>
                <div style={infoMeta}>
                    <span>{formatRelativeTime(marker.createdAt)}</span>
                </div>
                {marker.description && (
                    <p style={descriptionText}>{marker.description}</p>
                )}
            </div>

            <div style={divider} />

            {/* Discussion thread */}
            <div style={threadHeader}>
                <span style={threadTitle}>討論串</span>
                <span style={threadCount}>{comments.length}</span>
            </div>

            <div style={threadContainer}>
                {comments.length === 0 && (
                    <div style={emptyThread}>尚無討論</div>
                )}
                {comments.map((comment) => {
                    const isOwner = user?.id === comment.createdBy;
                    return (
                        <div key={comment.id} style={commentCard}>
                            <div style={commentHeader}>
                                <span style={commentUser}>
                                    {comment.user?.name || '未知使用者'}
                                </span>
                                <span style={commentTime}>
                                    {formatTime(comment.createdAt)}
                                </span>
                                {isOwner && (
                                    <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        style={deleteBtn}
                                        title="刪除留言"
                                        className="review-comment-delete"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                            <p style={commentContent}>{comment.content}</p>
                        </div>
                    );
                })}
                <div ref={threadEndRef} />
            </div>

            {/* Reply input */}
            <div style={replyBar}>
                <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="輸入留言... (Shift+Enter 換行)"
                    rows={2}
                    style={replyInput}
                />
                <button
                    onClick={handleSubmitComment}
                    disabled={!replyText.trim() || submitting}
                    style={{
                        ...sendBtn,
                        opacity: !replyText.trim() || submitting ? 0.4 : 1,
                    }}
                    title="送出留言"
                >
                    <Send size={14} />
                </button>
            </div>

            {/* Hover style for delete button */}
            <style>{`
                .review-comment-delete {
                    opacity: 0;
                    transition: opacity 0.15s;
                }
                .review-comment-delete:hover {
                    color: #dc2626 !important;
                }
                div:hover > div > .review-comment-delete,
                div:hover > .review-comment-delete {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
    position: 'fixed',
    bottom: 16,
    right: 16,
    width: 380,
    maxHeight: 520,
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif",
};

const headerRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    padding: '14px 14px 0 14px',
};

const headerLeft: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    overflow: 'hidden',
};

const titleText: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const priorityBadge: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 10,
    flexShrink: 0,
    lineHeight: '18px',
};

const closeBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
};

const statusBar: React.CSSProperties = {
    display: 'flex',
    gap: 4,
    padding: '10px 14px',
};

const statusBtn: React.CSSProperties = {
    flex: 1,
    height: 28,
    borderRadius: 14,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const screenshotLink: React.CSSProperties = {
    display: 'block',
    margin: '0 14px 8px',
    borderRadius: 8,
    overflow: 'hidden',
    cursor: 'pointer',
};

const screenshotImg: React.CSSProperties = {
    width: '100%',
    maxHeight: 200,
    objectFit: 'cover',
    display: 'block',
    borderRadius: 8,
};

const infoSection: React.CSSProperties = {
    padding: '0 14px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
};

const infoRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
};

const infoMono: React.CSSProperties = {
    fontSize: 12,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    color: '#64748b',
};

const infoMeta: React.CSSProperties = {
    fontSize: 12,
    color: '#94a3b8',
};

const descriptionText: React.CSSProperties = {
    fontSize: 13,
    color: '#475569',
    margin: '4px 0 0',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
};

const divider: React.CSSProperties = {
    height: 1,
    background: '#f1f5f9',
    margin: '0 14px',
};

const threadHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 14px 6px',
};

const threadTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
};

const threadCount: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    background: '#f1f5f9',
    borderRadius: 8,
    padding: '1px 6px',
    lineHeight: '16px',
};

const threadContainer: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '0 14px',
    maxHeight: 180,
    overflowY: 'auto',
};

const emptyThread: React.CSSProperties = {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    padding: '12px 0',
};

const commentCard: React.CSSProperties = {
    background: '#f9fafb',
    padding: 8,
    borderRadius: 4,
};

const commentHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
};

const commentUser: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#1e293b',
};

const commentTime: React.CSSProperties = {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
};

const commentContent: React.CSSProperties = {
    fontSize: 13,
    color: '#475569',
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
};

const deleteBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
};

const replyBar: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
    padding: '10px 14px 14px',
    borderTop: '1px solid #f1f5f9',
    marginTop: 4,
};

const replyInput: React.CSSProperties = {
    flex: 1,
    resize: 'vertical',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    lineHeight: 1.5,
    minHeight: 36,
    maxHeight: 100,
    color: '#1e293b',
};

const sendBtn: React.CSSProperties = {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    width: 32,
    height: 32,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s',
};

export default ReviewMarkerDetail;
