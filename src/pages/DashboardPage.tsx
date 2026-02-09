/**
 * DashboardPage Component
 * 
 * Main dashboard for authenticated users.
 */

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RoleBasedUI, EngineerOnly, AdminOnly } from '../components/auth/RoleBasedUI';
import { useProjectStore, Project } from '../stores/projectStore';

const ROLE_LABELS: Record<string, string> = {
  admin: '管理員',
  engineer: '工程師',
  reviewer: '審查委員',
  public: '訪客',
};

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { projects, loading, fetchProjects, createProject } = useProjectStore();
  const [showProjectModal, setShowProjectModal] = React.useState(false);
  const [projectForm, setProjectForm] = React.useState({ name: '', code: '', description: '' });
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Delete Modal State
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);
  const [confirmName, setConfirmName] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const { deleteProject } = useProjectStore();

  // 載入專案列表
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 建立專案
  // 開啟建立 modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setProjectForm({ name: '', code: '', description: '' });
    setShowProjectModal(true);
  };

  // 開啟編輯 modal
  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(project.id);
    setProjectForm({
      name: project.name,
      code: project.code,
      description: project.description || ''
    });
    setShowProjectModal(true);
  };

  // 儲存專案 (新增或更新)
  const handleSaveProject = async () => {
    if (!projectForm.name || !projectForm.code) return;
    setSaving(true);

    let result;
    if (isEditing && editingId) {
      // Update
      result = await useProjectStore.getState().updateProject(editingId, {
        name: projectForm.name,
        description: projectForm.description || undefined,
        // code, originX, originY typically not editable here or handled separately
      });
    } else {
      // Create
      result = await createProject({
        name: projectForm.name,
        code: projectForm.code,
        description: projectForm.description || undefined,
        originX: 224000,
        originY: 2429000,
        isActive: true,
      });
    }

    setSaving(false);
    if (result) {
      setShowProjectModal(false);
      setProjectForm({ name: '', code: '', description: '' });
      setIsEditing(false);
      setEditingId(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setConfirmName('');
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    if (confirmName !== projectToDelete.name) return;

    setDeleting(true);
    const success = await deleteProject(projectToDelete.id, confirmName);
    setDeleting(false);

    if (success) {
      setProjectToDelete(null);
      setConfirmName('');
    } else {
      alert('刪除失敗');
    }
  };
  return (
    <div className="dashboard-page">
      <style>{`
        .dashboard-page {
          min-height: 100vh;
          background: #f8fafc;
        }
        
        .dashboard-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .dashboard-logo {
          font-size: 20px;
          font-weight: 600;
          color: #0f172a;
          text-decoration: none;
        }
        
        .dashboard-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .dashboard-user-name {
          font-weight: 500;
          color: #334155;
        }
        
        .dashboard-user-role {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .role-admin {
          background: #fef3c7;
          color: #92400e;
        }
        
        .role-engineer {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .role-reviewer {
          background: #dcfce7;
          color: #166534;
        }
        
        .dashboard-logout-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .dashboard-logout-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        
        .dashboard-content {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .dashboard-welcome {
          margin-bottom: 32px;
        }
        
        .dashboard-welcome h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
        
        .dashboard-welcome p {
          font-size: 16px;
          color: #64748b;
        }
        
        .dashboard-section {
          margin-bottom: 32px;
        }
        
        .dashboard-section-title {
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        
        .dashboard-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
          position: relative;
        }
        
        .dashboard-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .dashboard-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 24px;
        }
        
        .icon-geology { background: #dcfce7; }
        .icon-engineering { background: #dbeafe; }
        .icon-simulation { background: #fef3c7; }
        .icon-data { background: #e0e7ff; }
        .icon-annotation { background: #fce7f3; }
        .icon-invite { background: #f3e8ff; }
        .icon-users { background: #fee2e2; }
        .icon-settings { background: #f1f5f9; }
        
        .dashboard-card-title {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 8px;
        }
        
        .dashboard-card-desc {
          font-size: 14px;
          color: #64748b;
          line-height: 1.5;
        }
        
        .dashboard-card-link {
          display: inline-block;
          margin-top: 16px;
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
          text-decoration: none;
        }
        
        .dashboard-card-link:hover {
          color: #475569;
        }

        .action-btn {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          opacity: 0.8;
          transition: all 0.2s;
        }
        .action-btn:hover {
          opacity: 1;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          background: #f8fafc !important;
          color: #3b82f6 !important;
        }
        .action-btn.delete-btn:hover {
          background: #fee2e2 !important;
          color: #ef4444 !important;
          border-color: #fecaca !important;
        }
      `}</style>

      <header className="dashboard-header">
        <Link to="/" className="dashboard-logo">LLRWD DigitalTwin</Link>
        {user && (
          <div className="dashboard-user">
            <span className="dashboard-user-name">{user.name}</span>
            <span className={`dashboard-user-role role-${user.role}`}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
            <button className="dashboard-logout-btn" onClick={() => logout()}>
              登出
            </button>
          </div>
        )}
      </header>

      <main className="dashboard-content">
        <div className="dashboard-welcome">
          <h1>歡迎回來，{user?.name}</h1>
          <p>選擇專案開始使用</p>
        </div>

        {/* 專案列表區 */}
        <div className="dashboard-section">
          <h2 className="dashboard-section-title">我的專案</h2>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              載入中...
            </div>
          ) : projects.length === 0 ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ color: '#64748b', marginBottom: '16px' }}>尚未建立任何專案</p>
              <RoleBasedUI allowedRoles={['admin', 'engineer']}>
                <button
                  onClick={handleOpenCreate}
                  style={{
                    padding: '10px 24px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  建立第一個專案
                </button>
              </RoleBasedUI>
            </div>
          ) : (
            <div className="dashboard-grid">
              {projects.map((project) => (
                <div key={project.id} className="dashboard-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/project/${project.code}`)}>
                  <div className="dashboard-card-icon icon-geology">📁</div>
                  <h3 className="dashboard-card-title">{project.name}</h3>
                  <p className="dashboard-card-desc">
                    {project.description || '無描述'}
                  </p>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <span>{project._count?.geologyModels || 0} 模型</span>
                    <span>|</span>
                    <span>{project._count?.boreholes || 0} 鑽探</span>
                    <span>|</span>
                    <span>{project._count?.imagery || 0} 航照</span>
                    <span>|</span>
                    <span>{project._count?.geophysics || 0} 探勘</span>
                  </div>

                  {/* Actions: Edit (Admin/Engineer) & Delete (Admin Only) */}
                  <RoleBasedUI allowedRoles={['admin', 'engineer']}>
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      display: 'flex',
                      gap: '8px',
                      zIndex: 20
                    }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleEditClick(e, project)}
                        style={{
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '4px',
                          color: '#94a3b8',
                          fontSize: '16px',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        className="action-btn"
                        title="編輯專案"
                      >
                        ✏️
                      </button>

                      <RoleBasedUI allowedRoles={['admin']}>
                        <button
                          onClick={(e) => handleDeleteClick(e, project)}
                          style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '4px',
                            color: '#94a3b8',
                            fontSize: '16px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          className="action-btn delete-btn"
                          title="刪除專案"
                        >
                          🗑️
                        </button>
                      </RoleBasedUI>
                    </div>
                  </RoleBasedUI>
                </div>
              ))}
              {/* 新增專案卡片 */}
              <RoleBasedUI allowedRoles={['admin', 'engineer']}>
                <div
                  className="dashboard-card"
                  style={{
                    cursor: 'pointer',
                    border: '2px dashed #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '160px'
                  }}
                  onClick={handleOpenCreate}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px', color: '#94a3b8' }}>+</div>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>建立新專案</span>
                </div>
              </RoleBasedUI>
            </div>
          )}
        </div>


        {/* 審查功能區 */}
        <RoleBasedUI allowedRoles={['admin', 'reviewer', 'engineer']}>
          <div className="dashboard-section">
            <h2 className="dashboard-section-title">審查功能</h2>
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <div className="dashboard-card-icon icon-annotation">📝</div>
                <h3 className="dashboard-card-title">審查標註</h3>
                <p className="dashboard-card-desc">
                  檢視與管理審查標註
                </p>
                <Link to="/annotations" className="dashboard-card-link">
                  進入 →
                </Link>
              </div>

              <EngineerOnly>
                <div className="dashboard-card">
                  <div className="dashboard-card-icon icon-invite">👥</div>
                  <h3 className="dashboard-card-title">邀請審查委員</h3>
                  <p className="dashboard-card-desc">
                    產生邀請連結供審查委員使用
                  </p>
                  <Link to="/admin/invites" className="dashboard-card-link">
                    進入 →
                  </Link>
                </div>
              </EngineerOnly>
            </div>
          </div>
        </RoleBasedUI>

        {/* 系統管理區 - Admin Only */}
        <AdminOnly>
          <div className="dashboard-section">
            <h2 className="dashboard-section-title">系統管理</h2>
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <div className="dashboard-card-icon icon-users">👤</div>
                <h3 className="dashboard-card-title">使用者管理</h3>
                <p className="dashboard-card-desc">
                  管理系統使用者帳號與權限
                </p>
                <Link to="/admin/users" className="dashboard-card-link">
                  進入 →
                </Link>
              </div>

              <div className="dashboard-card">
                <div className="dashboard-card-icon icon-settings">⚙️</div>
                <h3 className="dashboard-card-title">系統設定</h3>
                <p className="dashboard-card-desc">
                  調整系統參數與整合設定
                </p>
                <Link to="/admin/settings" className="dashboard-card-link">
                  進入 →
                </Link>
              </div>
            </div>
          </div>
        </AdminOnly>
      </main>

      {/* 建立/編輯專案 Modal */}
      {showProjectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
              {isEditing ? '編輯專案' : '建立新專案'}
            </h2>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>專案名稱 *</label>
              <input
                type="text"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="例: 某某處置場計畫"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                專案代碼 {isEditing ? '(不可修改)' : '*'}
              </label>
              <input
                type="text"
                value={projectForm.code}
                disabled={isEditing}
                onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="例: llrwd-site-a (用於 URL)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: isEditing ? '#f3f4f6' : '#fff',
                  cursor: isEditing ? 'not-allowed' : 'text'
                }}
              />
              {!isEditing && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  建立後無法修改。建立後，網址將為 /project/<b>{projectForm.code || 'your-code'}</b>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>描述</label>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="專案簡短說明..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowProjectModal(false)}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveProject}
                disabled={saving || !projectForm.name || !projectForm.code}
                style={{
                  padding: '8px 16px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (saving || !projectForm.name || !projectForm.code) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: (saving || !projectForm.name || !projectForm.code) ? 0.7 : 1
                }}
              >
                {saving ? '處理中...' : (isEditing ? '儲存變更' : '建立專案')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認 Modal */}
      {projectToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw',
            border: '1px solid #fee2e2'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#dc2626' }}>
              ⚠️ 刪除專案確認
            </h2>

            <div style={{ marginBottom: '20px', fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
              此動作<strong style={{ color: '#dc2626' }}>無法復原</strong>。將會永久刪除專案
              <strong>「{projectToDelete.name}」</strong>及其所有關聯資料（地質模型、航照圖、探查資料等）。
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                請輸入專案名稱以確認刪除： <span style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 4px', borderRadius: '4px' }}>{projectToDelete.name}</span>
              </label>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="在此輸入專案名稱"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setProjectToDelete(null);
                  setConfirmName('');
                }}
                disabled={deleting}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting || confirmName !== projectToDelete.name}
                style={{
                  padding: '8px 16px',
                  background: (confirmName === projectToDelete.name) ? '#dc2626' : '#fca5a5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (confirmName === projectToDelete.name) ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                {deleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
