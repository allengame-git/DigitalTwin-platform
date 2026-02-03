/**
 * Annotation Form
 * 
 * Form for creating/editing annotations with camera state capture.
 * @see specs/4-user-roles-system/spec.md FR-10
 */

import React, { useState } from 'react';
import type { AnnotationType, Position3D, CameraState, CreateAnnotationDTO } from '../../types/annotation';

interface AnnotationFormProps {
    type: AnnotationType;
    position: Position3D;
    cameraState: CameraState;
    projectId: string;
    onSubmit: (data: CreateAnnotationDTO) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const AnnotationForm: React.FC<AnnotationFormProps> = ({
    type,
    position,
    cameraState,
    projectId,
    onSubmit,
    onCancel,
    isLoading = false,
}) => {
    const [content, setContent] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        onSubmit({
            projectId,
            type,
            content: content.trim(),
            position,
            cameraState,
        });
    };

    const typeLabels: Record<AnnotationType, string> = {
        text: '文字標註',
        arrow: '箭頭標註',
        region: '區域標註',
    };

    return (
        <div className="annotation-form-overlay">
            <style>{`
        .annotation-form-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .annotation-form {
          width: 100%;
          max-width: 400px;
          background: #1a1a2e;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }

        .annotation-form-header {
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .annotation-form-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: white;
        }

        .annotation-form-body {
          padding: 20px;
        }

        .annotation-form-field {
          margin-bottom: 16px;
        }

        .annotation-form-label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
        }

        .annotation-form-textarea {
          width: 100%;
          min-height: 120px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          resize: vertical;
        }

        .annotation-form-textarea:focus {
          outline: none;
          border-color: #2563eb;
        }

        .annotation-form-info {
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .annotation-form-actions {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .annotation-form-btn {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .annotation-form-btn-cancel {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.7);
        }

        .annotation-form-btn-cancel:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .annotation-form-btn-submit {
          background: #2563eb;
          border: none;
          color: white;
        }

        .annotation-form-btn-submit:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .annotation-form-btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

            <form className="annotation-form" onSubmit={handleSubmit}>
                <div className="annotation-form-header">
                    <h3 className="annotation-form-title">新增{typeLabels[type]}</h3>
                </div>

                <div className="annotation-form-body">
                    <div className="annotation-form-field">
                        <label className="annotation-form-label">標註內容</label>
                        <textarea
                            className="annotation-form-textarea"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="請輸入標註說明..."
                            autoFocus
                        />
                    </div>

                    <div className="annotation-form-info">
                        📍 位置: ({position.x.toFixed(2)}, {position.y.toFixed(2)}, {position.z.toFixed(2)})
                    </div>
                </div>

                <div className="annotation-form-actions">
                    <button
                        type="button"
                        className="annotation-form-btn annotation-form-btn-cancel"
                        onClick={onCancel}
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        className="annotation-form-btn annotation-form-btn-submit"
                        disabled={!content.trim() || isLoading}
                    >
                        {isLoading ? '儲存中...' : '儲存標註'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AnnotationForm;
