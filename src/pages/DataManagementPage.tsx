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
            <style>{`
                /* Global Variables & Reset */
                :root {
                    --primary: #2563eb;
                    --primary-hover: #1d4ed8;
                    --danger: #dc2626;
                    --danger-hover: #b91c1c;
                    --success: #16a34a;
                    --gray-50: #f9fafb;
                    --gray-100: #f3f4f6;
                    --gray-200: #e5e7eb;
                    --gray-300: #d1d5db;
                    --gray-400: #9ca3af;
                    --gray-500: #6b7280;
                    --gray-600: #4b5563;
                    --gray-700: #374151;
                    --gray-800: #1f2937;
                    --gray-900: #111827;
                    --text-primary: #0f172a;
                    --bg-page: #f1f5f9;
                    --bg-card: #ffffff;
                    --font-sans: 'DM Sans', system-ui, -apple-system, sans-serif;
                    --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
                    --group-setup: #64748b;
                    --group-geology: #d97706;
                    --group-surface: #0891b2;
                    --group-model: #7c3aed;
                }

                .dm-mono {
                    font-family: var(--font-mono);
                    font-size: 13px;
                    letter-spacing: -0.01em;
                }

                .data-management-page {
                    min-height: 100vh;
                    background: var(--bg-page);
                    color: var(--text-primary);
                    font-family: var(--font-sans);
                }

                /* Header */
                .dm-header {
                    background: white;
                    border-bottom: 1px solid var(--gray-200);
                    padding: 16px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    top: 0;
                    z-index: 50;
                }

                .dm-header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .dm-back-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: var(--gray-100);
                    border: 1px solid transparent;
                    border-radius: 6px;
                    color: var(--gray-600);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    text-decoration: none;
                    transition: all 0.2s;
                }

                .dm-back-btn:hover {
                    background: var(--gray-200);
                    color: var(--gray-900);
                }

                .dm-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--text-primary);
                    letter-spacing: -0.025em;
                }

                .dm-layout {
                    display: flex;
                    max-width: 1440px;
                    margin: 0 auto;
                    padding: 32px 24px;
                    gap: 32px;
                }

                .dm-content {
                    flex: 1;
                    min-width: 0;
                    padding: 0;
                    max-width: none;
                    margin: 0;
                }

                /* Sections */
                .dm-section {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 24px;
                    border: 1px solid var(--gray-200);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }

                .dm-section-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .dm-section-icon {
                    width: 40px;
                    height: 40px;
                    background: var(--gray-50);
                    border: 1px solid var(--gray-200);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--gray-600);
                }

                .dm-section-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--gray-900);
                    margin-bottom: 4px;
                }

                .dm-section-desc {
                    font-size: 14px;
                    color: var(--gray-500);
                }

                /* Buttons */
                .dm-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    line-height: 1.25rem;
                }

                .dm-btn-primary {
                    background: var(--primary);
                    color: white;
                    border: 1px solid transparent;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }
                .dm-btn-primary:hover { background: var(--primary-hover); }
                .dm-btn-primary:disabled { background: var(--gray-400); cursor: not-allowed; }

                .dm-btn-secondary {
                    background: white;
                    color: var(--gray-700);
                    border: 1px solid var(--gray-300);
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }
                .dm-btn-secondary:hover { background: var(--gray-50); border-color: var(--gray-400); }

                .dm-btn-danger {
                    background: #fee2e2;
                    color: var(--danger);
                    border: 1px solid #fecaca;
                }
                .dm-btn-danger:hover { background: #fecaca; }

                .dm-btn-danger-solid {
                    background: var(--danger);
                    color: white;
                    border: 1px solid transparent;
                }
                .dm-btn-danger-solid:hover { background: var(--danger-hover); }

                /* Upload Zone */
                .dm-upload-zone {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    border: 2px dashed var(--gray-300);
                    border-radius: 8px;
                    padding: 40px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: var(--gray-50);
                    margin-bottom: 16px;
                }
                .dm-upload-zone:hover, .dm-upload-zone.dragging {
                    border-color: var(--primary);
                    background: #eff6ff;
                }
                .dm-upload-icon {
                    color: var(--gray-400);
                    margin-bottom: 16px;
                    padding: 16px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .dm-upload-zone:hover .dm-upload-icon {
                    color: var(--primary);
                    transform: scale(1.05);
                    transition: all 0.2s;
                }
                .dm-upload-text {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--gray-700);
                    margin-bottom: 8px;
                }
                .dm-upload-hint {
                    font-size: 13px;
                    color: var(--gray-500);
                }

                /* Modals */
                .dm-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .dm-modal {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    width: 100%;
                    max-width: 500px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid var(--gray-200);
                }
                .dm-modal-header {
                    padding: 16px 24px;
                    border-bottom: 1px solid var(--gray-200);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .dm-modal-title { font-weight: 600; font-size: 16px; color: var(--gray-900); }
                .dm-modal-body { padding: 24px; overflow-y: auto; }
                .dm-modal-footer {
                    padding: 16px 24px;
                    background: var(--gray-50);
                    border-top: 1px solid var(--gray-200);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                /* Forms */
                .dm-form-group { margin-bottom: 16px; }
                .dm-form-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--gray-700);
                    margin-bottom: 4px;
                }
                .dm-form-input {
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    background: white;
                    border: 1px solid var(--gray-300);
                    border-radius: 6px;
                    font-size: 14px;
                    color: var(--gray-900);
                    transition: all 0.15s;
                    box-sizing: border-box;
                }
                .dm-form-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }
                .dm-form-error {
                    font-size: 12px;
                    color: var(--danger);
                    margin-top: 4px;
                }

                /* Cards & Grids */
                .dm-file-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 16px;
                }
                .dm-file-card {
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.2s;
                    position: relative;
                }
                .dm-file-card:hover {
                    border-color: var(--gray-300);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    transform: translateY(-1px);
                }
                .dm-file-thumb {
                    width: 100%;
                    height: 140px;
                    object-fit: cover;
                    background: var(--gray-100);
                }
                .dm-file-info { padding: 12px; }
                .dm-file-name {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--gray-900);
                    margin-bottom: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .dm-file-meta {
                    font-size: 12px;
                    color: var(--gray-500);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                /* Tables */
                .dm-table-wrapper {
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .dm-table { width: 100%; border-collapse: collapse; font-size: 14px; }
                .dm-table th {
                    background: var(--gray-50);
                    padding: 12px 16px;
                    text-align: left;
                    font-weight: 600;
                    color: var(--gray-600);
                    border-bottom: 1px solid var(--gray-200);
                    white-space: nowrap;
                }
                .dm-table td {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--gray-200);
                    color: var(--gray-700);
                }
                .dm-table tr:last-child td { border-bottom: none; }
                .dm-table tr:hover { background: var(--gray-50); }

                /* File Actions & Buttons */
                .dm-file-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 8px;
                }
                .dm-file-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 12px;
                    border: 1px solid var(--gray-300);
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    background: white;
                    color: var(--gray-600);
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .dm-file-btn:hover {
                    background: var(--gray-50);
                    border-color: var(--gray-400);
                }
                .dm-file-btn-delete {
                    color: var(--danger);
                    border-color: #fecaca;
                    background: #fef2f2;
                }
                .dm-file-btn-delete:hover {
                    background: #fee2e2;
                    border-color: #fca5a5;
                }

                /* File List (horizontal cards) */
                .dm-file-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .dm-file-list .dm-file-card {
                    display: flex;
                    align-items: center;
                }
                .dm-file-list .dm-file-info {
                    flex: 1;
                }

                /* File Preview (in modals) */
                .dm-file-preview {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: var(--gray-50);
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    margin-bottom: 16px;
                }
                .dm-file-preview-icon {
                    color: var(--gray-400);
                    display: flex;
                    align-items: center;
                }
                .dm-file-preview-name {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--gray-900);
                }
                .dm-file-preview-size {
                    font-size: 12px;
                    color: var(--gray-500);
                    font-family: var(--font-mono);
                }

                /* Form Rows */
                .dm-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .dm-form-row:has(> :nth-child(3)) {
                    grid-template-columns: 1fr 1fr 1fr;
                }
                .dm-form-textarea {
                    min-height: 60px;
                    resize: vertical;
                }

                /* Advanced Toggle */
                .dm-advanced-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid var(--gray-200);
                    border-radius: 6px;
                    background: var(--gray-50);
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--gray-700);
                    margin-bottom: 12px;
                    transition: all 0.15s;
                }
                .dm-advanced-toggle:hover {
                    background: var(--gray-100);
                    border-color: var(--gray-300);
                }
                .dm-advanced-section {
                    padding: 12px;
                    background: var(--gray-50);
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    margin-bottom: 16px;
                }

                /* Coords */
                .dm-coords-hint {
                    font-size: 12px;
                    color: var(--gray-500);
                    margin-bottom: 12px;
                }
                .dm-coords-status {
                    display: inline-flex;
                    align-items: center;
                    color: var(--success);
                    font-size: 11px;
                    font-weight: 500;
                }

                /* Error & Loading */
                .dm-error {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    color: var(--danger);
                    font-size: 14px;
                    margin-bottom: 16px;
                }
                .dm-loading {
                    text-align: center;
                    padding: 16px;
                    color: var(--gray-500);
                    font-size: 14px;
                }

                /* Misc */
                .dm-empty-state, .dm-empty {
                    text-align: center;
                    padding: 40px;
                    background: var(--gray-50);
                    border: 1px dashed var(--gray-300);
                    border-radius: 8px;
                    color: var(--gray-500);
                    font-size: 14px;
                }
                .dm-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 8px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .dm-badge-blue { background: #dbeafe; color: #1e40af; }
                .dm-badge-green { background: #dcfce7; color: #15803d; }
                .dm-badge-gray { background: #f3f4f6; color: #374151; }

                .dm-file-year {
                    font-family: var(--font-mono);
                    font-size: 12px;
                }

                .required { color: var(--danger); }
                
                @keyframes progress-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .dm-progress-container {
                    width: 100%;
                    height: 4px;
                    background: #f1f5f9;
                    border-radius: 2px;
                    overflow: hidden;
                    margin-top: 10px;
                }
                .dm-progress-bar {
                    height: 100%;
                    background: #3b82f6;
                    border-radius: 2px;
                    transition: width 0.3s ease-out;
                }
                .dm-progress-shimmer {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.4) 50%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    animation: progress-shimmer 1.5s infinite linear;
                }

                /* TOC */
                .dm-toc {
                    position: sticky;
                    top: 80px;
                    width: 200px;
                    flex-shrink: 0;
                    align-self: flex-start;
                    max-height: calc(100vh - 100px);
                    overflow-y: auto;
                }
                .dm-toc-group { margin-bottom: 20px; }
                .dm-toc-group-label {
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 0 12px;
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                }
                .dm-toc-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    padding: 8px 12px;
                    border: none;
                    background: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-family: var(--font-sans);
                    color: var(--gray-500);
                    text-align: left;
                    transition: all 0.15s;
                }
                .dm-toc-item:hover { background: var(--gray-100); color: var(--text-primary); }
                .dm-toc-item.active { background: var(--gray-100); color: var(--text-primary); font-weight: 600; }
                .dm-toc-item-icon { display: flex; align-items: center; color: inherit; opacity: 0.6; }
                .dm-toc-item-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .dm-toc-item-count { font-size: 11px; color: var(--gray-400); min-width: 20px; text-align: right; }

                /* Section wrappers with group colors */
                .dm-section-wrapper {
                    position: relative;
                    margin-bottom: 24px;
                }
                .dm-section-wrapper .dm-section {
                    margin-bottom: 0;
                }
                .dm-section-wrapper[data-group="setup"] .dm-section { border-left: 3px solid var(--group-setup); }
                .dm-section-wrapper[data-group="geology"] .dm-section { border-left: 3px solid var(--group-geology); }
                .dm-section-wrapper[data-group="surface"] .dm-section { border-left: 3px solid var(--group-surface); }
                .dm-section-wrapper[data-group="model"] .dm-section { border-left: 3px solid var(--group-model); }

                /* Collapsed bar */
                .dm-collapsed-bar {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 24px;
                    background: var(--bg-card);
                    border: 1px solid var(--gray-200);
                    border-radius: 12px;
                    cursor: pointer;
                    font-family: var(--font-sans);
                    font-weight: 600;
                    font-size: 14px;
                    color: var(--text-primary);
                    transition: all 0.2s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .dm-collapsed-bar:hover {
                    background: var(--gray-50);
                    border-color: var(--gray-300);
                }
                .dm-section-wrapper[data-group="setup"] .dm-collapsed-bar { border-left: 3px solid var(--group-setup); }
                .dm-section-wrapper[data-group="geology"] .dm-collapsed-bar { border-left: 3px solid var(--group-geology); }
                .dm-section-wrapper[data-group="surface"] .dm-collapsed-bar { border-left: 3px solid var(--group-surface); }
                .dm-section-wrapper[data-group="model"] .dm-collapsed-bar { border-left: 3px solid var(--group-model); }

                .dm-collapse-count {
                    font-family: var(--font-mono);
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 9999px;
                    background: var(--gray-100);
                    color: var(--gray-500);
                    font-weight: 500;
                    margin-left: auto;
                }

                .dm-expand-toggle {
                    position: absolute;
                    top: 28px;
                    right: 24px;
                    cursor: pointer;
                    color: var(--gray-400);
                    z-index: 2;
                    padding: 4px;
                    border-radius: 4px;
                    background: none;
                    border: none;
                    display: flex;
                    align-items: center;
                }
                .dm-expand-toggle:hover {
                    background: var(--gray-100);
                    color: var(--gray-600);
                }

                @media (max-width: 1400px) {
                    .dm-toc { display: none; }
                    .dm-layout { max-width: 1200px; }
                }
            `}</style>
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
