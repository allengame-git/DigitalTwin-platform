/**
 * Annotation Toolbar
 * 
 * Toolbar for selecting annotation types (text, arrow, region).
 * @see specs/4-user-roles-system/spec.md FR-10
 */

import React, { useState } from 'react';
import type { AnnotationType } from '../../types/annotation';

interface AnnotationToolbarProps {
    onToolSelect: (tool: AnnotationType | null) => void;
    activeTool: AnnotationType | null;
    disabled?: boolean;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
    onToolSelect,
    activeTool,
    disabled = false,
}) => {
    const tools: { type: AnnotationType; icon: string; label: string }[] = [
        { type: 'text', icon: '💬', label: '文字標註' },
        { type: 'arrow', icon: '➡️', label: '箭頭標註' },
        { type: 'region', icon: '⬜', label: '區域標註' },
    ];

    const handleToolClick = (type: AnnotationType) => {
        if (disabled) return;
        onToolSelect(activeTool === type ? null : type);
    };

    return (
        <div className="annotation-toolbar">
            <style>{`
        .annotation-toolbar {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .annotation-tool-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .annotation-tool-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .annotation-tool-btn.active {
          background: rgba(37, 99, 235, 0.3);
          border-color: #2563eb;
          color: white;
        }

        .annotation-tool-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .annotation-tool-icon {
          font-size: 24px;
        }

        .annotation-tool-label {
          font-size: 12px;
        }
      `}</style>

            {tools.map((tool) => (
                <button
                    key={tool.type}
                    className={`annotation-tool-btn ${activeTool === tool.type ? 'active' : ''}`}
                    onClick={() => handleToolClick(tool.type)}
                    disabled={disabled}
                    title={tool.label}
                >
                    <span className="annotation-tool-icon">{tool.icon}</span>
                    <span className="annotation-tool-label">{tool.label}</span>
                </button>
            ))}
        </div>
    );
};

export default AnnotationToolbar;
