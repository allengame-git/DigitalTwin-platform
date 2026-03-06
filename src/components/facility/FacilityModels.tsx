/**
 * FacilityModels — 場景模型群元件
 * 渲染目前場景中所有 FacilityModelItem，含 Error Boundary 保護
 */
import React from 'react';
import { Html } from '@react-three/drei';
import { useFacilityStore } from '@/stores/facilityStore';
import { FacilityModelItem } from './FacilityModelItem';
import type { FacilityModel } from '@/types/facility';

const DEG2RAD = Math.PI / 180;

// ── Error Boundary（Class component，React 要求）──
interface ModelErrorBoundaryProps {
    model: FacilityModel;
    children: React.ReactNode;
}
interface ModelErrorBoundaryState {
    hasError: boolean;
    error: string | null;
}

class ModelErrorBoundary extends React.Component<ModelErrorBoundaryProps, ModelErrorBoundaryState> {
    state: ModelErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error: error.message || '模型載入失敗' };
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            const { model } = this.props;
            return (
                <group
                    position={[model.position.x, model.position.y, model.position.z]}
                    rotation={[
                        model.rotation.x * DEG2RAD,
                        model.rotation.y * DEG2RAD,
                        model.rotation.z * DEG2RAD,
                    ]}
                >
                    {/* 紅色半透明佔位方塊 */}
                    <mesh>
                        <boxGeometry args={[
                            Math.max(model.scale.x * 2, 5),
                            Math.max(model.scale.y * 2, 5),
                            Math.max(model.scale.z * 2, 5),
                        ]} />
                        <meshBasicMaterial color="#ef4444" transparent opacity={0.25} />
                    </mesh>
                    {/* 紅色線框 */}
                    <mesh>
                        <boxGeometry args={[
                            Math.max(model.scale.x * 2, 5),
                            Math.max(model.scale.y * 2, 5),
                            Math.max(model.scale.z * 2, 5),
                        ]} />
                        <meshBasicMaterial color="#ef4444" wireframe />
                    </mesh>
                    {/* 標籤 */}
                    <Html center style={{ pointerEvents: 'auto' }}>
                        <div style={{
                            background: 'rgba(220,38,38,0.92)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                            maxWidth: 200,
                            lineHeight: 1.4,
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>{model.name}</div>
                            <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 4 }}>
                                {this.state.error}
                            </div>
                            <button
                                onClick={this.handleRetry}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: '1px solid rgba(255,255,255,0.4)',
                                    color: 'white',
                                    borderRadius: 4,
                                    padding: '2px 10px',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                }}
                            >
                                重試
                            </button>
                        </div>
                    </Html>
                </group>
            );
        }
        return this.props.children;
    }
}

// ── 主元件 ──
export function FacilityModels() {
    const models = useFacilityStore(state => state.models);

    if (models.length === 0) {
        return null;
    }

    return (
        <>
            {models.map(model => (
                <ModelErrorBoundary key={model.id} model={model}>
                    <FacilityModelItem model={model} />
                </ModelErrorBoundary>
            ))}
        </>
    );
}

export default FacilityModels;
