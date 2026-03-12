/**
 * ProjectDashboardPage
 * @module pages/ProjectDashboardPage
 *
 * 專案 Dashboard - 顯示專案資訊和功能入口
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useProjectStore } from '../stores/projectStore';
import { useModuleStore, type Module, type ModuleStats } from '../stores/moduleStore';
import { getModuleTypeConfig, getAvailableModuleTypes, MODULE_TYPES } from '../config/moduleRegistry';
import { RoleBasedUI } from '../components/auth/RoleBasedUI';
import { Plus, Pencil, Trash2, GripVertical, X, Database, MessageSquareText } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ROLE_LABELS: Record<string, string> = {
    admin: '管理員',
    engineer: '工程師',
    viewer: '一般使用者',
};

/** Module types that have data management pages */
const DATA_PAGE_TYPES = new Set(['geology', 'facility']);

/** Background color per module type */
const TYPE_BG_COLORS: Record<string, string> = {
    geology: '#dcfce7',
    facility: '#e0f2fe',
    engineering: '#dbeafe',
    simulation: '#fef3c7',
};

// ──────────────────────── Create Module Modal ────────────────────────

interface CreateModuleModalProps {
    projectId: string;
    onClose: () => void;
}

const CreateModuleModal: React.FC<CreateModuleModalProps> = ({ projectId, onClose }) => {
    const availableTypes = getAvailableModuleTypes();
    const [type, setType] = useState(availableTypes[0]?.type ?? '');
    const [name, setName] = useState(availableTypes[0]?.config.label ?? '');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const createModule = useModuleStore(state => state.createModule);

    const handleTypeChange = (newType: string) => {
        setType(newType);
        const cfg = MODULE_TYPES[newType];
        if (cfg) setName(cfg.label);
    };

    const handleSubmit = async () => {
        if (!type || !name.trim()) return;
        setSubmitting(true);
        const result = await createModule(projectId, type, name.trim(), description.trim() || undefined);
        setSubmitting(false);
        if (result) onClose();
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: '12px', padding: '24px',
                    width: '420px', maxWidth: '90vw',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>新增模組</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Type select */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>模組類型</label>
                <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '14px',
                    }}
                >
                    {availableTypes.map(({ type: t, config }) => (
                        <option key={t} value={t}>{config.label}</option>
                    ))}
                </select>

                {/* Name */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>模組名稱</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '14px',
                        boxSizing: 'border-box',
                    }}
                />

                {/* Description */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>描述（選填）</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '14px',
                        resize: 'vertical', boxSizing: 'border-box',
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{
                        padding: '8px 16px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', background: '#fff',
                        color: '#64748b', cursor: 'pointer', fontSize: '14px',
                    }}>
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !name.trim()}
                        style={{
                            padding: '8px 16px', borderRadius: '6px',
                            border: 'none', background: submitting ? '#94a3b8' : '#2563eb',
                            color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '14px',
                        }}
                    >
                        {submitting ? '建立中...' : '建立'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────── Edit Module Modal ────────────────────────

interface EditModuleModalProps {
    mod: Module;
    onClose: () => void;
}

const EditModuleModal: React.FC<EditModuleModalProps> = ({ mod, onClose }) => {
    const [name, setName] = useState(mod.name);
    const [description, setDescription] = useState(mod.description ?? '');
    const [submitting, setSubmitting] = useState(false);
    const updateModule = useModuleStore(state => state.updateModule);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setSubmitting(true);
        const result = await updateModule(mod.id, {
            name: name.trim(),
            description: description.trim() || undefined,
        });
        setSubmitting(false);
        if (result) onClose();
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: '12px', padding: '24px',
                    width: '420px', maxWidth: '90vw',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>編輯模組</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={20} />
                    </button>
                </div>

                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>模組名稱</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '14px',
                        boxSizing: 'border-box',
                    }}
                />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>描述</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '14px',
                        resize: 'vertical', boxSizing: 'border-box',
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{
                        padding: '8px 16px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', background: '#fff',
                        color: '#64748b', cursor: 'pointer', fontSize: '14px',
                    }}>
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !name.trim()}
                        style={{
                            padding: '8px 16px', borderRadius: '6px',
                            border: 'none', background: submitting ? '#94a3b8' : '#2563eb',
                            color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '14px',
                        }}
                    >
                        {submitting ? '儲存中...' : '儲存'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────── Delete Module Modal ────────────────────────

interface DeleteModuleModalProps {
    mod: Module;
    onClose: () => void;
}

const DeleteModuleModal: React.FC<DeleteModuleModalProps> = ({ mod, onClose }) => {
    const [confirmName, setConfirmName] = useState('');
    const [stats, setStats] = useState<ModuleStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const deleteModule = useModuleStore(state => state.deleteModule);
    const getModuleStats = useModuleStore(state => state.getModuleStats);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const s = await getModuleStats(mod.id);
            if (!cancelled) {
                setStats(s);
                setLoadingStats(false);
            }
        })();
        return () => { cancelled = true; };
    }, [mod.id, getModuleStats]);

    const handleDelete = async () => {
        if (confirmName !== mod.name) return;
        setSubmitting(true);
        const ok = await deleteModule(mod.id, confirmName);
        setSubmitting(false);
        if (ok) onClose();
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: '12px', padding: '24px',
                    width: '440px', maxWidth: '90vw',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#dc2626' }}>刪除模組</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={20} />
                    </button>
                </div>

                <p style={{ fontSize: '14px', color: '#475569', marginBottom: '12px' }}>
                    確定要刪除模組 <strong>{mod.name}</strong>？此操作無法復原。
                </p>

                {/* Stats */}
                {loadingStats ? (
                    <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>載入資料統計...</p>
                ) : stats && Object.keys(stats.counts).length > 0 ? (
                    <div style={{
                        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                        padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#991b1b',
                    }}>
                        <p style={{ fontWeight: 500, marginBottom: '8px' }}>此模組包含以下資料：</p>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {Object.entries(stats.counts).map(([key, count]) => (
                                <li key={key}>{key}: {count} 筆</li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>此模組沒有關聯資料。</p>
                )}

                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                    請輸入模組名稱「{mod.name}」以確認刪除
                </label>
                <input
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={mod.name}
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '14px',
                        boxSizing: 'border-box',
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{
                        padding: '8px 16px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', background: '#fff',
                        color: '#64748b', cursor: 'pointer', fontSize: '14px',
                    }}>
                        取消
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={submitting || confirmName !== mod.name}
                        style={{
                            padding: '8px 16px', borderRadius: '6px',
                            border: 'none',
                            background: (submitting || confirmName !== mod.name) ? '#fca5a5' : '#dc2626',
                            color: '#fff',
                            cursor: (submitting || confirmName !== mod.name) ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        {submitting ? '刪除中...' : '確認刪除'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────── Sortable Module Card ────────────────────────

interface SortableModuleCardProps {
    mod: Module;
    projectCode: string;
    isAdmin: boolean;
    isAdminOrEngineer: boolean;
    isDragEnabled: boolean;
    onEdit: (mod: Module) => void;
    onDelete: (mod: Module) => void;
}

const SortableModuleCard: React.FC<SortableModuleCardProps> = ({
    mod, projectCode, isAdmin, isAdminOrEngineer, isDragEnabled, onEdit, onDelete,
}) => {
    const navigate = useNavigate();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: mod.id, disabled: !isDragEnabled });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: '#fff',
        borderRadius: '12px',
        padding: '24px',
        border: isDragging ? '2px solid #2563eb' : '1px solid #e2e8f0',
        cursor: 'pointer',
        position: 'relative',
    };

    const config = getModuleTypeConfig(mod.type);
    const IconComponent = config?.icon;
    const bgColor = TYPE_BG_COLORS[mod.type] || '#f1f5f9';

    return (
        <div ref={setNodeRef} style={style}>
            {/* Admin/Engineer actions */}
            {isAdminOrEngineer && (
                <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    display: 'flex', gap: '4px', alignItems: 'center',
                }}>
                    {isAdmin && isDragEnabled && (
                        <span
                            {...attributes}
                            {...listeners}
                            style={{ color: '#94a3b8', cursor: 'grab', touchAction: 'none', padding: '4px' }}
                            title="拖曳排序"
                        >
                            <GripVertical size={16} />
                        </span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(mod); }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#94a3b8', padding: '4px',
                        }}
                        title="編輯模組"
                    >
                        <Pencil size={15} />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(mod); }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#94a3b8', padding: '4px',
                            }}
                            title="刪除模組"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            )}

            {/* Card body — clickable */}
            <div onClick={() => navigate(`/project/${projectCode}/module/${mod.id}`)}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                }}>
                    {IconComponent && <IconComponent size={24} />}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                    {mod.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                    {mod.description || config?.description || ''}
                </p>
            </div>

            {/* Data management link */}
            {isAdminOrEngineer && DATA_PAGE_TYPES.has(mod.type) && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/project/${projectCode}/module/${mod.id}/data`);
                    }}
                    style={{
                        marginTop: '12px',
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '12px', color: '#6366f1',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    <Database size={13} />
                    資料管理
                </button>
            )}
        </div>
    );
};

// ──────────────────────── Main Page ────────────────────────

export const ProjectDashboardPage: React.FC = () => {
    const { projectCode } = useParams<{ projectCode: string }>();
    const navigate = useNavigate();
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);
    const { projects, fetchProjects, getProjectByCode, setActiveProject } = useProjectStore();
    const { modules, fetchModules } = useModuleStore();

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [deletingModule, setDeletingModule] = useState<Module | null>(null);

    // 載入專案列表
    useEffect(() => {
        if (projects.length === 0) {
            fetchProjects();
        }
    }, [projects.length, fetchProjects]);

    // 設定當前專案
    const project = projectCode ? getProjectByCode(projectCode) : null;

    useEffect(() => {
        if (project) {
            setActiveProject(project.id);
        }
    }, [project, setActiveProject]);

    // 載入模組列表
    useEffect(() => {
        if (project) {
            fetchModules(project.id);
        }
    }, [project, fetchModules]);

    // 判斷模組是否可存取
    const canAccessModule = useCallback((moduleId: string) => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'engineer') return true;
        if (user.role === 'viewer' && project?.allowedModules) {
            return project.allowedModules.includes(moduleId);
        }
        return false;
    }, [user, project]);

    const isAdmin = user?.role === 'admin';
    const isAdminOrEngineer = user?.role === 'admin' || user?.role === 'engineer';

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // Visible modules (filtered by access)
    const visibleModules = useMemo(
        () => modules.filter(mod => canAccessModule(mod.id)),
        [modules, canAccessModule],
    );

    const moduleIds = useMemo(() => visibleModules.map(m => m.id), [visibleModules]);

    const reorderModules = useModuleStore(state => state.reorderModules);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = visibleModules.findIndex(m => m.id === active.id);
        const newIndex = visibleModules.findIndex(m => m.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        // Build new order array
        const reordered = [...visibleModules];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        const orders = reordered.map((m, i) => ({ id: m.id, sortOrder: i }));
        reorderModules(orders);
    }, [visibleModules, reorderModules]);

    // 專案不存在
    if (projects.length > 0 && !project) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc'
            }}>
                <h1 style={{ fontSize: '48px', color: '#e11d48' }}>404</h1>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>專案不存在</p>
                <Link to="/" style={{ color: '#2563eb' }}>返回專案列表</Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <header style={{
                background: '#fff',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/" style={{
                        fontSize: '20px',
                        fontWeight: 600,
                        color: '#0f172a',
                        textDecoration: 'none'
                    }}>
                        LLRWD DigitalTwin
                    </Link>
                    {project && (
                        <>
                            <span style={{ color: '#cbd5e1' }}>/</span>
                            <span style={{ fontSize: '16px', color: '#475569' }}>{project.name}</span>
                        </>
                    )}
                </div>
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 500, color: '#334155' }}>{user.name}</span>
                        <span style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontWeight: 500,
                            background: user.role === 'admin' ? '#fef3c7' : user.role === 'engineer' ? '#dbeafe' : '#dcfce7',
                            color: user.role === 'admin' ? '#92400e' : user.role === 'engineer' ? '#1e40af' : '#166534',
                        }}>
                            {ROLE_LABELS[user.role] || user.role}
                        </span>
                        <button
                            onClick={() => logout()}
                            style={{
                                padding: '8px 16px',
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                color: '#64748b',
                                cursor: 'pointer',
                            }}
                        >
                            登出
                        </button>
                    </div>
                )}
            </header>

            {/* Content */}
            <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* 專案資訊 */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <Link to="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
                            ← 返回專案列表
                        </Link>
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                        {project?.name || '載入中...'}
                    </h1>
                    <p style={{ fontSize: '16px', color: '#64748b' }}>
                        {project?.description || '選擇下方功能開始使用'}
                    </p>
                    {project && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                            <span>{project._count?.geologyModels || 0} 個地質模型</span>
                            <span>|</span>
                            <span>{project._count?.boreholes || 0} 筆鑽探資料</span>
                            <span>|</span>
                            <span>{project._count?.imagery || 0} 張航照圖</span>
                            <span>|</span>
                            <span>{project._count?.geophysics || 0} 筆探勘剖面</span>
                        </div>
                    )}
                </div>

                {/* 功能卡片 */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                <SortableContext items={moduleIds} strategy={rectSortingStrategy}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '20px'
                }}>
                    {/* Dynamic module cards */}
                    {visibleModules.map((mod) => (
                        <SortableModuleCard
                            key={mod.id}
                            mod={mod}
                            projectCode={projectCode || ''}
                            isAdmin={isAdmin}
                            isAdminOrEngineer={isAdminOrEngineer}
                            isDragEnabled={isAdmin}
                            onEdit={setEditingModule}
                            onDelete={setDeletingModule}
                        />
                    ))}

                    {/* 審查標註 (non-module, keep as-is) */}
                    <div
                        onClick={() => navigate(`/project/${projectCode}/annotations`)}
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: '#fce7f3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                        }}>
                            <MessageSquareText size={24} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                            審查標註
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                            檢視與管理審查標註
                        </p>
                    </div>

                    {/* 新增模組 button — Admin/Engineer only */}
                    {isAdminOrEngineer && project && (
                        <div
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                background: '#fff',
                                borderRadius: '12px',
                                padding: '24px',
                                border: '2px dashed #cbd5e1',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '160px',
                            }}
                        >
                            <Plus size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                            <span style={{ fontSize: '15px', fontWeight: 500, color: '#64748b' }}>新增模組</span>
                        </div>
                    )}
                </div>
                </SortableContext>
                </DndContext>
            </main>

            {/* Modals */}
            {showCreateModal && project && (
                <CreateModuleModal
                    projectId={project.id}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
            {editingModule && (
                <EditModuleModal
                    mod={editingModule}
                    onClose={() => setEditingModule(null)}
                />
            )}
            {deletingModule && (
                <DeleteModuleModal
                    mod={deletingModule}
                    onClose={() => setDeletingModule(null)}
                />
            )}
        </div>
    );
};

export default ProjectDashboardPage;
