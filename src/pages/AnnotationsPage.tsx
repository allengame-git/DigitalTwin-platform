/**
 * Annotation Page
 * 
 * Main page for viewing and managing annotations.
 * Only accessible to reviewers.
 * @see specs/4-user-roles-system/spec.md FR-10, FR-11
 */

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAnnotationStore } from '../stores/annotationStore';
import { useAuth } from '../contexts/AuthContext';
import { usePageTracking } from '../hooks/usePageTracking';
import {
  AnnotationToolbar,
  AnnotationList,
  AnnotationRenderer,
  AnnotationForm,
} from '../components/annotation';
import type { AnnotationType, Position3D, CameraState, CreateAnnotationDTO } from '../types/annotation';

const DEFAULT_PROJECT_ID = 'default';

export const AnnotationsPage: React.FC = () => {
  usePageTracking({ pageName: '審查標註' });
  const { projectCode } = useParams<{ projectCode: string }>();

  const { user } = useAuth();
  const {
    annotations,
    selectedAnnotation,
    isLoading,
    error,
    fetchAnnotations,
    createAnnotation,
    resolveAnnotation,
    deleteAnnotation,
    selectAnnotation,
    navigateToAnnotation,
    clearError,
  } = useAnnotationStore();

  const [activeTool, setActiveTool] = useState<AnnotationType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formPosition, setFormPosition] = useState<Position3D>({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    fetchAnnotations(DEFAULT_PROJECT_ID);
  }, [fetchAnnotations]);

  // Mock camera state (in real implementation, get from Cesium/Three.js)
  const getCurrentCameraState = (): CameraState => ({
    position: { x: 121.5654, y: 25.0330, z: 500 },
    heading: 0,
    pitch: -45,
    roll: 0,
  });

  // Handle scene click for annotation creation
  const handleSceneClick = (position: Position3D) => {
    if (activeTool) {
      setFormPosition(position);
      setShowForm(true);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (data: CreateAnnotationDTO) => {
    try {
      await createAnnotation(data);
      setShowForm(false);
      setActiveTool(null);
    } catch {
      // Error handled by store
    }
  };

  // Handle delete with confirmation
  const handleDelete = async (id: string) => {
    if (window.confirm('確定要刪除這個標註嗎？')) {
      await deleteAnnotation(id);
    }
  };

  return (
    <div className="annotations-page">
      <style>{`
        .annotations-page {
          display: flex;
          height: 100vh;
          background: #0a0a0a;
          color: white;
        }

        .annotations-sidebar {
          width: 360px;
          flex-shrink: 0;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
        }

        .annotations-header {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .annotations-title {
          margin: 0 0 4px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .annotations-subtitle {
          margin: 0;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
        }

        .annotations-back-link {
          display: inline-block;
          margin-top: 12px;
          font-size: 14px;
          color: #60a5fa;
          text-decoration: none;
        }

        .annotations-back-link:hover {
          text-decoration: underline;
        }

        .annotations-list-container {
          flex: 1;
          overflow: hidden;
        }

        .annotations-scene {
          flex: 1;
          position: relative;
          background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%);
        }

        .annotations-toolbar-container {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }

        .annotations-scene-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.3);
        }

        .annotations-scene-placeholder-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .annotations-scene-placeholder-text {
          font-size: 18px;
        }

        .annotations-scene-placeholder-hint {
          font-size: 14px;
          margin-top: 8px;
        }

        .annotations-error {
          padding: 16px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          margin: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .annotations-error-text {
          color: #f87171;
          font-size: 14px;
        }

        .annotations-error-close {
          background: none;
          border: none;
          color: #f87171;
          cursor: pointer;
          font-size: 16px;
        }

        .annotations-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: rgba(255, 255, 255, 0.5);
        }

        .annotations-demo-btn {
          position: absolute;
          top: 24px;
          right: 24px;
          padding: 12px 24px;
          background: #2563eb;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          cursor: pointer;
          z-index: 10;
        }

        .annotations-demo-btn:hover {
          background: #1d4ed8;
        }
      `}</style>

      <div className="annotations-sidebar">
        <div className="annotations-header">
          <h1 className="annotations-title">審查標註</h1>
          <p className="annotations-subtitle">
            歡迎，{user?.name}
          </p>
          <Link to={projectCode ? `/project/${projectCode}` : '/'} className="annotations-back-link">
            ← 返回{projectCode ? '專案' : ''}儀表板
          </Link>
        </div>

        {error && (
          <div className="annotations-error">
            <span className="annotations-error-text">{error}</span>
            <button className="annotations-error-close" onClick={clearError}>
              ✕
            </button>
          </div>
        )}

        <div className="annotations-list-container">
          {isLoading ? (
            <div className="annotations-loading">載入中...</div>
          ) : (
            <AnnotationList
              annotations={annotations}
              selectedId={selectedAnnotation?.id || null}
              onSelect={selectAnnotation}
              onNavigate={navigateToAnnotation}
              onResolve={resolveAnnotation}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      <div className="annotations-scene">
        {/* 3D Scene would go here - using placeholder for MVP */}
        <div className="annotations-scene-placeholder">
          <span className="annotations-scene-placeholder-icon">🗺️</span>
          <span className="annotations-scene-placeholder-text">3D 場景區域</span>
          <span className="annotations-scene-placeholder-hint">
            {activeTool
              ? '點擊場景以新增標註'
              : '選擇工具開始標註'}
          </span>
        </div>

        {/* Annotation markers */}
        <AnnotationRenderer
          annotations={annotations}
          selectedId={selectedAnnotation?.id || null}
          onSelect={selectAnnotation}
        />

        {/* Demo button to simulate clicking on scene */}
        <button
          className="annotations-demo-btn"
          onClick={() => handleSceneClick({
            x: 121.5654 + Math.random() * 0.01,
            y: 25.0330 + Math.random() * 0.01,
            z: 50 + Math.random() * 100,
          })}
          disabled={!activeTool}
        >
          📍 模擬點擊場景
        </button>

        {/* Toolbar */}
        <div className="annotations-toolbar-container">
          <AnnotationToolbar
            activeTool={activeTool}
            onToolSelect={setActiveTool}
          />
        </div>

        {/* Annotation form modal */}
        {showForm && activeTool && (
          <AnnotationForm
            type={activeTool}
            position={formPosition}
            cameraState={getCurrentCameraState()}
            projectId={DEFAULT_PROJECT_ID}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setActiveTool(null);
            }}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default AnnotationsPage;
