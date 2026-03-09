/**
 * DataManagementPage
 * @module pages/DataManagementPage
 * 
 * 資料管理頁面 - 統一管理所有模組所需資料
 * 權限：admin/engineer only
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronDown,
    ChevronRight,
    Settings,
    AlertTriangle,
    Layers,
    GitBranch,
    Compass,
    ImageIcon,
    Mountain,
    Droplets,
    Box,
    Activity,
    Palette,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUploadStore } from '../stores/uploadStore';
import { useProjectStore } from '../stores/projectStore';
import { useBoreholeStore } from '../stores/boreholeStore';
import { useFaultPlaneStore } from '../stores/faultPlaneStore';
import { useAttitudeStore } from '../stores/attitudeStore';
import { useTerrainStore } from '../stores/terrainStore';
import { useWaterLevelStore } from '../stores/waterLevelStore';
import { setOrigin } from '../utils/coordinates';
import { BoreholeUploadSection } from '../components/data/BoreholeUploadSection';
import { FaultPlaneUploadSection } from '../components/data/FaultPlaneUploadSection';
import { AttitudeUploadSection } from '../components/data/AttitudeUploadSection';
import { TerrainUploadSection } from '../components/data/TerrainUploadSection';
import { WaterLevelUploadSection } from '../components/data/WaterLevelUploadSection';
import { ImageryUploadSection } from '../components/data/ImageryUploadSection';
import { GeologyModelSection } from '../components/data/GeologyModelSection';
import { GeophysicsUploadSection } from '../components/data/GeophysicsUploadSection';
import LithologySection from '../components/data/LithologySection';
import { DataPageTOC } from '../components/data/DataPageTOC';
import { useLithologyStore } from '../stores/lithologyStore';
import '../styles/data-management.css';


export const DataManagementPage: React.FC = () => {
    const user = useAuthStore(state => state.user);
    const { projectCode } = useParams<{ projectCode: string }>();
    const navigate = useNavigate();
    const {
        clearError,
    } = useUploadStore();

    const { activeProjectId, projects, updateProject } = useProjectStore();
    const activeProject = projects.find(p => p.id === activeProjectId);

    // Lithology Store
    const { lithologies, fetchLithologies } = useLithologyStore();

    // 檢查設定是否完成（原點已設定 + 至少有一個岩性）
    const isSetupComplete = activeProject &&
        activeProject.originX !== 0 &&
        activeProject.originY !== 0 &&
        lithologies.length > 0;

    // Collapsible sections
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const toggleSection = (id: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Section counts from stores
    const boreholeCount = useBoreholeStore(s => s.boreholes.length);
    const faultPlaneCount = useFaultPlaneStore(s => s.faultPlanes.length);
    const attitudeCount = useAttitudeStore(s => s.attitudes.length);
    const imageryCount = useUploadStore(s => s.imageryFiles.length);
    const terrainCount = useTerrainStore(s => s.terrains.length);
    const waterLevelCount = useWaterLevelStore(s => s.waterLevels.length);
    const geologyModelCount = useUploadStore(s => s.geologyModels.length);
    const geophysicsCount = useUploadStore(s => s.geophysicsFiles.length);

    // TOC items
    const tocItems = [
        { id: 'section-settings', label: '專案設定', icon: <Settings size={14} />, group: 'setup' },
        { id: 'section-lithology', label: '岩性', icon: <Palette size={14} />, group: 'setup', count: lithologies.length },
        { id: 'section-borehole', label: '鑽孔資料', icon: <Layers size={14} />, group: 'geology', count: boreholeCount },
        { id: 'section-faultplane', label: '斷層面資料', icon: <GitBranch size={14} />, group: 'geology', count: faultPlaneCount },
        { id: 'section-attitude', label: '位態資料', icon: <Compass size={14} />, group: 'geology', count: attitudeCount },
        { id: 'section-imagery', label: '航照圖', icon: <ImageIcon size={14} />, group: 'surface', count: imageryCount },
        { id: 'section-terrain', label: '地形資料', icon: <Mountain size={14} />, group: 'surface', count: terrainCount },
        { id: 'section-waterlevel', label: '地下水位', icon: <Droplets size={14} />, group: 'surface', count: waterLevelCount },
        { id: 'section-geomodel', label: '3D 地質模型', icon: <Box size={14} />, group: 'model', count: geologyModelCount },
        { id: 'section-geophysics', label: '地球物理', icon: <Activity size={14} />, group: 'model', count: geophysicsCount },
    ];

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message, type });
        toastTimerRef.current = setTimeout(() => setToast(null), 3500);
    }, []);

    // Project Settings State
    const [originForm, setOriginForm] = useState({ x: '', y: '', northAngle: '' });
    const [isSavingOrigin, setIsSavingOrigin] = useState(false);

    useEffect(() => {
        if (activeProject) {
            setOriginForm({
                x: activeProject.originX.toString(),
                y: activeProject.originY.toString(),
                northAngle: (activeProject.northAngle || 0).toString()
            });
        }
    }, [activeProject]);

    const handleOriginSubmit = async () => {
        if (!activeProject) return;

        const x = parseFloat(originForm.x);
        const y = parseFloat(originForm.y);
        const northAngle = parseFloat(originForm.northAngle) || 0;

        if (isNaN(x) || isNaN(y)) {
            showToast('請輸入有效的數字', 'error');
            return;
        }

        setIsSavingOrigin(true);
        try {
            const updated = await updateProject(activeProject.id, {
                originX: x,
                originY: y,
                northAngle: northAngle
            });

            if (updated) {
                setOrigin(x, y);
                showToast('專案座標設定已更新', 'success');
            } else {
                showToast('更新失敗', 'error');
            }
        } catch (error) {
            console.error('Update origin error:', error);
            showToast('更新時發生錯誤', 'error');
        } finally {
            setIsSavingOrigin(false);
        }
    };




    // Fetch lithologies when project changes
    useEffect(() => {
        if (activeProjectId) {
            fetchLithologies(activeProjectId);
        }
    }, [activeProjectId, fetchLithologies]);

    return (
        <div className="data-management-page">
            {/* Same header... */}
            <header className="dm-header">
                <div className="dm-header-left">
                    <Link to={projectCode ? `/project/${projectCode}` : '/'} className="dm-back-btn">
                        <ChevronLeft size={16} />
                        返回{projectCode ? '專案' : '首頁'}
                    </Link>
                    <h1 className="dm-title">資料管理</h1>
                </div>
                <div>
                    <span style={{ marginRight: 12, color: '#64748b' }}>
                        {user?.name}
                    </span>
                </div>
            </header>

            <div className="dm-layout">
                <DataPageTOC items={tocItems} collapsedSections={collapsedSections} onToggleSection={toggleSection} />
                <main className="dm-content">
                    {/* 專案設定 */}
                    {activeProject && (
                        <div id="section-settings" className="dm-section-wrapper" data-group="setup">
                            {collapsedSections.has('settings') ? (
                                <div className="dm-collapsed-bar" onClick={() => toggleSection('settings')}>
                                    <Settings size={16} />
                                    <span>專案設定</span>
                                    <ChevronRight size={14} />
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <button className="dm-expand-toggle" onClick={() => toggleSection('settings')} title="收合">
                                        <ChevronDown size={14} />
                                    </button>
                                    <section className="dm-section">
                                        <div className="dm-section-header">
                                            <div className="dm-section-icon">
                                                <Settings size={20} />
                                            </div>
                                            <div>
                                                <div className="dm-section-title">專案設定 (TWD97 座標原點)</div>
                                                <div className="dm-section-desc">設定此專案的場景中心座標，所有 3D 模型將以此為基準進行定位。</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', maxWidth: '600px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label className="dm-form-label">
                                                    原點 X (東距) <span className="required">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="dm-form-input dm-mono"
                                                    value={originForm.x}
                                                    onChange={e => setOriginForm(prev => ({ ...prev, x: e.target.value }))}
                                                    placeholder="224000"
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label className="dm-form-label">
                                                    原點 Y (北距) <span className="required">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="dm-form-input dm-mono"
                                                    value={originForm.y}
                                                    onChange={e => setOriginForm(prev => ({ ...prev, y: e.target.value }))}
                                                    placeholder="2429000"
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label className="dm-form-label">
                                                    北方角度 (度) <span className="required">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="dm-form-input dm-mono"
                                                    value={originForm.northAngle}
                                                    onChange={e => setOriginForm(prev => ({ ...prev, northAngle: e.target.value }))}
                                                    placeholder="0 (正北)"
                                                />
                                            </div>
                                            <button
                                                className="dm-btn dm-btn-primary"
                                                onClick={handleOriginSubmit}
                                                disabled={isSavingOrigin}
                                                style={{ height: '42px', minWidth: '80px' }}
                                            >
                                                {isSavingOrigin ? '儲存中...' : '儲存設定'}
                                            </button>
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 岩性設定 */}
                    <div id="section-lithology" className="dm-section-wrapper" data-group="setup">
                        {collapsedSections.has('lithology') ? (
                            <div className="dm-collapsed-bar" onClick={() => toggleSection('lithology')}>
                                <Palette size={16} />
                                <span>岩性</span>
                                <span className="dm-collapse-count">{lithologies.length}</span>
                                <ChevronRight size={14} />
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <button className="dm-expand-toggle" onClick={() => toggleSection('lithology')} title="收合">
                                    <ChevronDown size={14} />
                                </button>
                                <LithologySection />
                            </div>
                        )}
                    </div>

                    {/* Required setup message */}
                    {!isSetupComplete && (
                        <div style={{
                            background: '#fffbeb',
                            border: '1px solid #fcd34d',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '16px'
                        }}>
                            <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px', color: '#b45309' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '4px', fontSize: '16px' }}>
                                    請先完成專案設定
                                </div>
                                <div style={{ color: '#b45309', fontSize: '14px', lineHeight: '1.5' }}>
                                    需設定 TWD97 座標原點並載入岩性資料後，才可使用以下資料管理功能。
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 鑽孔資料 */}
                    <div id="section-borehole" className="dm-section-wrapper" data-group="geology"
                         style={{ opacity: isSetupComplete ? 1 : 0.5, pointerEvents: isSetupComplete ? 'auto' : 'none' }}>
                        {collapsedSections.has('borehole') ? (
                            <div className="dm-collapsed-bar" onClick={() => toggleSection('borehole')}>
                                <Layers size={16} />
                                <span>鑽孔資料</span>
                                <span className="dm-collapse-count">{boreholeCount}</span>
                                <ChevronRight size={14} />
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <button className="dm-expand-toggle" onClick={() => toggleSection('borehole')} title="收合">
                                    <ChevronDown size={14} />
                                </button>
                                <BoreholeUploadSection />
                            </div>
                        )}
                    </div>

                    {/* 斷層面資料 */}
                    <div id="section-faultplane" className="dm-section-wrapper" data-group="geology"
                         style={{ opacity: isSetupComplete ? 1 : 0.5, pointerEvents: isSetupComplete ? 'auto' : 'none' }}>
                        {collapsedSections.has('faultplane') ? (
                            <div className="dm-collapsed-bar" onClick={() => toggleSection('faultplane')}>
                                <GitBranch size={16} />
                                <span>斷層面資料</span>
                                <span className="dm-collapse-count">{faultPlaneCount}</span>
                                <ChevronRight size={14} />
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <button className="dm-expand-toggle" onClick={() => toggleSection('faultplane')} title="收合">
                                    <ChevronDown size={14} />
                                </button>
                                <FaultPlaneUploadSection />
                            </div>
                        )}
                    </div>

                    {/* 位態資料 */}
                    <div id="section-attitude" className="dm-section-wrapper" data-group="geology"
                         style={{ opacity: isSetupComplete ? 1 : 0.5, pointerEvents: isSetupComplete ? 'auto' : 'none' }}>
                        {collapsedSections.has('attitude') ? (
                            <div className="dm-collapsed-bar" onClick={() => toggleSection('attitude')}>
                                <Compass size={16} />
                                <span>位態資料</span>
                                <span className="dm-collapse-count">{attitudeCount}</span>
                                <ChevronRight size={14} />
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <button className="dm-expand-toggle" onClick={() => toggleSection('attitude')} title="收合">
                                    <ChevronDown size={14} />
                                </button>
                                <AttitudeUploadSection />
                            </div>
                        )}
                    </div>

                    {/* 航照圖 */}
                    <div id="section-imagery" className="dm-section-wrapper" data-group="surface"
                         style={{ opacity: isSetupComplete ? 1 : 0.5, pointerEvents: isSetupComplete ? 'auto' : 'none' }}>
                        {collapsedSections.has('imagery') ? (
                            <div className="dm-collapsed-bar" onClick={() => toggleSection('imagery')}>
                                <ImageIcon size={16} />
                                <span>航照圖</span>
                                <span className="dm-collapse-count">{imageryCount}</span>
                                <ChevronRight size={14} />
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <button className="dm-expand-toggle" onClick={() => toggleSection('imagery')} title="收合">
                                    <ChevronDown size={14} />
                                </button>
                                <ImageryUploadSection showToast={showToast} />
                            </div>
                        )}
                    </div>

                    {/* 地形資料 */}
                    <div id="section-terrain" className="dm-section-wrapper" data-group="surface"
                         style={{ opacity: isSetupComplete ? 1 : 0.5, pointerEvents: isSetupComplete ? 'auto' : 'none' }}>
                        {collapsedSections.has('terrain') ? (
                            <div className="dm-collapsed-bar" onClick={() => toggleSection('terrain')}>
                                <Mountain size={16} />
                                <span>地形資料</span>
                                <span className="dm-collapse-count">{terrainCount}</span>
                                <ChevronRight size={14} />
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <button className="dm-expand-toggle" onClick={() => toggleSection('terrain')} title="收合">
                                    <ChevronDown size={14} />
                                </button>
                                <TerrainUploadSection />
                            </div>
                        )}
                    </div>

                    {/* 地下水位 */}
                    <div id="section-waterlevel" className="dm-section-wrapper" data-group="surface"
                         style={{ opacity: isSetupComplete ? 1 : 0.5, pointerEvents: isSetupComplete ? 'auto' : 'none' }}>
                        {collapsedSections.has('waterlevel') ? (
                            <div className="dm-collapsed-bar" onClick={() => toggleSection('waterlevel')}>
                                <Droplets size={16} />
                                <span>地下水位</span>
                                <span className="dm-collapse-count">{waterLevelCount}</span>
                                <ChevronRight size={14} />
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <button className="dm-expand-toggle" onClick={() => toggleSection('waterlevel')} title="收合">
                                    <ChevronDown size={14} />
                                </button>
                                <WaterLevelUploadSection />
                            </div>
                        )}
                    </div>

                    {/* 3D 地質模型 */}
                    <div id="section-geomodel" className="dm-section-wrapper" data-group="model"
                         style={{ opacity: isSetupComplete ? 1 : 0.5, pointerEvents: isSetupComplete ? 'auto' : 'none' }}>
                        {collapsedSections.has('geomodel') ? (
                            <div className="dm-collapsed-bar" onClick={() => toggleSection('geomodel')}>
                                <Box size={16} />
                                <span>3D 地質模型</span>
                                <span className="dm-collapse-count">{geologyModelCount}</span>
                                <ChevronRight size={14} />
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <button className="dm-expand-toggle" onClick={() => toggleSection('geomodel')} title="收合">
                                    <ChevronDown size={14} />
                                </button>
                                <GeologyModelSection showToast={showToast} />
                            </div>
                        )}
                    </div>

                    {/* 地球物理 */}
                    <div id="section-geophysics" className="dm-section-wrapper" data-group="model"
                         style={{ opacity: isSetupComplete ? 1 : 0.5, pointerEvents: isSetupComplete ? 'auto' : 'none' }}>
                        {collapsedSections.has('geophysics') ? (
                            <div className="dm-collapsed-bar" onClick={() => toggleSection('geophysics')}>
                                <Activity size={16} />
                                <span>地球物理</span>
                                <span className="dm-collapse-count">{geophysicsCount}</span>
                                <ChevronRight size={14} />
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <button className="dm-expand-toggle" onClick={() => toggleSection('geophysics')} title="收合">
                                    <ChevronDown size={14} />
                                </button>
                                <GeophysicsUploadSection showToast={showToast} />
                            </div>
                        )}
                    </div>

                </main>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div
                    style={{
                        position: 'fixed',
                        top: 24,
                        right: 24,
                        zIndex: 10000,
                        padding: '14px 24px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        animation: 'dm-toast-in 0.3s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        maxWidth: '420px',
                        background: toast.type === 'success'
                            ? 'linear-gradient(135deg, #059669, #10b981)'
                            : toast.type === 'error'
                                ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                                : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    }}
                    onClick={() => setToast(null)}
                >
                    <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}</span>
                    <span>{toast.message}</span>
                </div>
            )}

            <style>{`
@keyframes dm-toast-in {
    from { opacity: 0; transform: translateX(40px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
`}</style>
        </div>
    );
};

export default DataManagementPage;
