/**
 * Annotation Renderer
 * 
 * Renders annotations as markers in 3D space.
 * Uses CSS-based markers for performance (no Cesium/Three dependency for MVP).
 * @see specs/4-user-roles-system/spec.md FR-10, FR-11
 */

import React from 'react';
import type { Annotation } from '../../types/annotation';

interface AnnotationRendererProps {
    annotations: Annotation[];
    selectedId: string | null;
    onSelect: (annotation: Annotation) => void;
    containerRef?: React.RefObject<HTMLElement>;
}

/**
 * Simple 2D marker renderer for annotations.
 * In a real Cesium/Three.js integration, this would project 3D coordinates
 * to screen coordinates. For MVP, we use a floating panel approach.
 */
export const AnnotationRenderer: React.FC<AnnotationRendererProps> = ({
    annotations,
    selectedId,
    onSelect,
}) => {
    const typeIcons: Record<string, string> = {
        text: '💬',
        arrow: '➡️',
        region: '⬜',
    };

    // For MVP, render as floating markers in a fixed container
    // Real implementation would use Cesium Entity or Three.js Sprite
    return (
        <div className="annotation-markers">
            <style>{`
        .annotation-markers {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .annotation-marker {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: auto;
          cursor: pointer;
          transform: translate(-50%, -100%);
          transition: transform 0.2s;
        }

        .annotation-marker:hover {
          transform: translate(-50%, -100%) scale(1.1);
          z-index: 100;
        }

        .annotation-marker.selected {
          transform: translate(-50%, -100%) scale(1.15);
          z-index: 101;
        }

        .annotation-marker-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(37, 99, 235, 0.9);
          border: 2px solid white;
          border-radius: 50%;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .annotation-marker.resolved .annotation-marker-icon {
          background: rgba(34, 197, 94, 0.9);
        }

        .annotation-marker.selected .annotation-marker-icon {
          background: #1d4ed8;
          border-width: 3px;
        }

        .annotation-marker-pin {
          width: 2px;
          height: 16px;
          background: linear-gradient(to bottom, white, transparent);
        }

        .annotation-marker-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.9);
          border-radius: 6px;
          white-space: nowrap;
          font-size: 12px;
          color: white;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
        }

        .annotation-marker:hover .annotation-marker-tooltip {
          opacity: 1;
        }
      `}</style>

            {annotations.map((annotation, index) => {
                // For MVP: distribute markers in a visible area
                // Real implementation would project 3D coords to screen
                const x = 100 + (index % 5) * 150;
                const y = 100 + Math.floor(index / 5) * 120;

                return (
                    <div
                        key={annotation.id}
                        className={`annotation-marker ${selectedId === annotation.id ? 'selected' : ''} ${annotation.isResolved ? 'resolved' : ''}`}
                        style={{ left: x, top: y }}
                        onClick={() => onSelect(annotation)}
                    >
                        <div className="annotation-marker-tooltip">
                            {annotation.content.slice(0, 30)}
                            {annotation.content.length > 30 ? '...' : ''}
                        </div>
                        <div className="annotation-marker-icon">
                            {typeIcons[annotation.type]}
                        </div>
                        <div className="annotation-marker-pin" />
                    </div>
                );
            })}
        </div>
    );
};

export default AnnotationRenderer;
