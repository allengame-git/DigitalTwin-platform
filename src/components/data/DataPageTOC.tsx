/**
 * DataPageTOC
 * @module components/data/DataPageTOC
 *
 * 浮動目錄 + scroll spy，顯示各資料區塊的導覽
 */

import React, { useState, useEffect } from 'react';

interface TocItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    group: string;
    count?: number;
}

interface DataPageTOCProps {
    items: TocItem[];
    collapsedSections: Set<string>;
    onToggleSection: (id: string) => void;
}

const GROUP_META: Record<string, { label: string; color: string }> = {
    setup: { label: '基礎設定', color: 'var(--group-setup)' },
    geology: { label: '地質資料', color: 'var(--group-geology)' },
    surface: { label: '地表資料', color: 'var(--group-surface)' },
    model: { label: '模型資料', color: 'var(--group-model)' },
};

export const DataPageTOC: React.FC<DataPageTOCProps> = ({ items, collapsedSections, onToggleSection }) => {
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        const observers: IntersectionObserver[] = [];
        items.forEach(item => {
            const el = document.getElementById(item.id);
            if (!el) return;
            const observer = new IntersectionObserver(
                ([entry]) => { if (entry.isIntersecting) setActiveId(item.id); },
                { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
            );
            observer.observe(el);
            observers.push(observer);
        });
        return () => observers.forEach(o => o.disconnect());
    }, [items]);

    const handleClick = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const sectionKey = id.replace('section-', '');
        if (collapsedSections.has(sectionKey)) onToggleSection(sectionKey);
    };

    const groups = ['setup', 'geology', 'surface', 'model'];

    return (
        <nav className="dm-toc">
            {groups.map(groupKey => {
                const groupItems = items.filter(i => i.group === groupKey);
                if (groupItems.length === 0) return null;
                const meta = GROUP_META[groupKey];
                return (
                    <div key={groupKey} className="dm-toc-group">
                        <div className="dm-toc-group-label" style={{ color: meta.color }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: meta.color, marginRight: 8, flexShrink: 0 }} />
                            {meta.label}
                        </div>
                        {groupItems.map(item => (
                            <button
                                key={item.id}
                                className={`dm-toc-item ${activeId === item.id ? 'active' : ''}`}
                                onClick={() => handleClick(item.id)}
                            >
                                <span className="dm-toc-item-icon">{item.icon}</span>
                                <span className="dm-toc-item-label">{item.label}</span>
                                {item.count !== undefined && (
                                    <span className="dm-toc-item-count dm-mono">{item.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                );
            })}
        </nav>
    );
};
