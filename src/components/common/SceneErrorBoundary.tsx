/**
 * SceneErrorBoundary
 *
 * 共用的 3D 場景錯誤邊界元件
 * 用於捕捉 Cesium/Deck.gl/Three.js 渲染錯誤並提供降級顯示
 *
 * @module src/components/common/SceneErrorBoundary
 * @see NFR-08, NFR-09 (所有展示模組的異常處理需求)
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface FallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
}

interface SceneErrorBoundaryProps {
  /** 顯示降級內容的 Fallback 元件 */
  fallback: React.ComponentType<FallbackProps>;
  /** 子元件 (3D 場景) */
  children: ReactNode;
  /** 錯誤回報 callback (可整合 Sentry) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 模組名稱 (用於錯誤訊息) */
  moduleName?: string;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 共用 3D 場景錯誤邊界
 *
 * 使用範例：
 * ```tsx
 * <SceneErrorBoundary
 *   fallback={GeologyFallback2D}
 *   moduleName="地質模組"
 *   onError={(err) => Sentry.captureException(err)}
 * >
 *   <CesiumViewer />
 * </SceneErrorBoundary>
 * ```
 */
export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  constructor(props: SceneErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SceneErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // 呼叫外部錯誤處理 (Sentry)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Console 記錄 (開發環境)
    if (import.meta.env.DEV) {
      console.error(
        `[SceneErrorBoundary] ${this.props.moduleName || '3D 場景'} 渲染錯誤:`,
        error,
        errorInfo
      );
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback: FallbackComponent } = this.props;

    if (hasError && error) {
      return (
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    return children;
  }
}

export default SceneErrorBoundary;
