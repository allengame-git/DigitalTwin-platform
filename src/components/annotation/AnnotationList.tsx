/**
 * Annotation List
 * 
 * Panel displaying all annotations with filtering and navigation.
 * @see specs/4-user-roles-system/spec.md FR-11
 */

import React, { useState } from 'react';
import type { Annotation } from '../../types/annotation';

interface AnnotationListProps {
    annotations: Annotation[];
    selectedId: string | null;
    onSelect: (annotation: Annotation) => void;
    onNavigate: (annotation: Annotation) => void;
    onResolve: (id: string) => void;
    onDelete: (id: string) => void;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({
    annotations,
    selectedId,
    onSelect,
    onNavigate,
    onResolve,
    onDelete,
}) => {
    const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

    const filteredAnnotations = annotations.filter((a) => {
        if (filter === 'unresolved') return !a.isResolved;
        if (filter === 'resolved') return a.isResolved;
        return true;
    });

    const typeIcons: Record<string, string> = {
        text: '💬',
        arrow: '➡️',
        region: '⬜',
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="annotation-list">
            <style>{`
        .annotation-list {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1a1a2e;
          border-radius: 12px;
          overflow: hidden;
        }

        .annotation-list-header {
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .annotation-list-title {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .annotation-list-filters {
          display: flex;
          gap: 8px;
        }

        .annotation-filter-btn {
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .annotation-filter-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .annotation-filter-btn.active {
          background: rgba(37, 99, 235, 0.3);
          border-color: #2563eb;
          color: white;
        }

        .annotation-list-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .annotation-item {
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .annotation-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .annotation-item.selected {
          background: rgba(37, 99, 235, 0.15);
          border-color: #2563eb;
        }

        .annotation-item.resolved {
          opacity: 0.6;
        }

        .annotation-item-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .annotation-item-type {
          font-size: 16px;
        }

        .annotation-item-user {
          font-size: 13px;
          font-weight: 500;
          color: white;
        }

        .annotation-item-date {
          margin-left: auto;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }

        .annotation-item-content {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .annotation-item-actions {
          display: flex;
          gap: 8px;
        }

        .annotation-action-btn {
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .annotation-action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .annotation-action-btn.navigate {
          background: rgba(37, 99, 235, 0.2);
          border-color: rgba(37, 99, 235, 0.3);
          color: #60a5fa;
        }

        .annotation-action-btn.resolve {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .annotation-action-btn.delete {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .annotation-resolved-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: rgba(34, 197, 94, 0.2);
          border-radius: 4px;
          font-size: 11px;
          color: #4ade80;
        }

        .annotation-list-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: rgba(255, 255, 255, 0.5);
        }

        .annotation-list-empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
      `}</style>

            <div className="annotation-list-header">
                <h3 className="annotation-list-title">
                    審查標註 ({filteredAnnotations.length})
                </h3>
                <div className="annotation-list-filters">
                    <button
                        className={`annotation-filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        全部
                    </button>
                    <button
                        className={`annotation-filter-btn ${filter === 'unresolved' ? 'active' : ''}`}
                        onClick={() => setFilter('unresolved')}
                    >
                        未解決
                    </button>
                    <button
                        className={`annotation-filter-btn ${filter === 'resolved' ? 'active' : ''}`}
                        onClick={() => setFilter('resolved')}
                    >
                        已解決
                    </button>
                </div>
            </div>

            <div className="annotation-list-content">
                {filteredAnnotations.length === 0 ? (
                    <div className="annotation-list-empty">
                        <span className="annotation-list-empty-icon">📝</span>
                        <span>暫無標註</span>
                    </div>
                ) : (
                    filteredAnnotations.map((annotation) => (
                        <div
                            key={annotation.id}
                            className={`annotation-item ${selectedId === annotation.id ? 'selected' : ''} ${annotation.isResolved ? 'resolved' : ''}`}
                            onClick={() => onSelect(annotation)}
                        >
                            <div className="annotation-item-header">
                                <span className="annotation-item-type">
                                    {typeIcons[annotation.type]}
                                </span>
                                <span className="annotation-item-user">{annotation.userName}</span>
                                {annotation.isResolved && (
                                    <span className="annotation-resolved-badge">✓ 已解決</span>
                                )}
                                <span className="annotation-item-date">
                                    {formatDate(annotation.createdAt)}
                                </span>
                            </div>

                            <div className="annotation-item-content">{annotation.content}</div>

                            <div className="annotation-item-actions">
                                <button
                                    className="annotation-action-btn navigate"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onNavigate(annotation);
                                    }}
                                >
                                    📍 移至
                                </button>
                                {!annotation.isResolved && (
                                    <button
                                        className="annotation-action-btn resolve"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onResolve(annotation.id);
                                        }}
                                    >
                                        ✓ 解決
                                    </button>
                                )}
                                <button
                                    className="annotation-action-btn delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(annotation.id);
                                    }}
                                >
                                    🗑 刪除
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AnnotationList;
