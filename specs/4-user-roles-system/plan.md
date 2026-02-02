# Implementation Plan: 使用者角色與權限系統 (User Roles System)

**Status**: DRAFT  
**Spec**: [specs/4-user-roles-system/spec.md](./spec.md)

## Technical Context

- **Feature Branch**: `4-user-roles-system`
- **Core Technologies**:
  - Frontend: React 18 + TypeScript + Vite
  - State: Zustand
  - UI: Tailwind CSS + Shadcn/ui
  - Auth: JWT (Access Token + Refresh Token)
- **Key Dependencies**:
  - Backend API (Node.js + Express/NestJS)
  - PostgreSQL (使用者、標註、邀請連結)
  - bcrypt (密碼雜湊)
  - 錯誤日誌收集服務 (Sentry 或自建)
  - 頁面瀏覽統計 (Plausible 或 PostHog)

## Constitution Check

- [x] Aligns with Principle 1: 程式碼品質與架構 (Code Quality)
  - User, Annotation, InviteLink interfaces
  - Auth Context Provider 與 UI 分離
  - Zustand: `useAuthStore`, `useAnnotationStore`
- [x] Aligns with Principle 2: 效能至上 (Performance)
  - 角色權限檢查 <100ms (前端快取 + JWT decode)
  - 條件式載入 UI 組件 (依角色動態 import)
- [x] Aligns with Principle 3: 測試標準 (Testing)
  - 登入/登出流程測試
  - 權限守衛 (Route Guard) 測試
  - 標註 CRUD 測試
- [x] Aligns with Principle 4: 一致的使用者體驗 (UX Consistency)
  - 登入狀態 feedback
  - 未授權存取友善提示

## Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    AuthProvider (Context)                    ││
│  │  - user: User | null                                         ││
│  │  - role: 'engineer' | 'reviewer' | 'public'                 ││
│  │  - isAuthenticated: boolean                                  ││
│  └───────────────────────────┬─────────────────────────────────┘│
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────────┐│
│  │                  Route Guard Components                      ││
│  │  <ProtectedRoute allowedRoles={['engineer', 'reviewer']} /> ││
│  └───────────────────────────┬─────────────────────────────────┘│
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────────┐│
│  │              Role-Based UI Adaptation                        ││
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ ││
│  │  │ Engineer UI  │ │ Reviewer UI  │ │ Public UI (Guided)   │ ││
│  │  │ - Full Tools │ │ - Annotation │ │ - Simple Controls    │ ││
│  │  │ - Raw Data   │ │ - Limited    │ │ - Auto Tour          │ ││
│  │  └──────────────┘ └──────────────┘ └──────────────────────┘ ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (REST)                          │
│  POST /api/auth/login       → JWT Token                          │
│  POST /api/auth/refresh     → 刷新 Token                         │
│  GET  /api/auth/me          → 當前使用者資訊                      │
│  POST /api/invite/validate  → 驗證邀請連結                        │
│  GET  /api/annotations      → 標註列表                            │
│  POST /api/annotations      → 建立標註                            │
│  PATCH/api/annotations/:id  → 更新標註                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                PostgreSQL                                        │
│  users | annotations | invite_links | sessions                   │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 0: Research & Discovery

- [x] Resolve: JWT vs Session-based Auth
  - **Decision**: JWT (適合前後端分離，審查委員可透過邀請連結直接獲得 token)
- [x] Resolve: Session 逾時實作
  - **Decision**:
    - Access Token: 15 分鐘
    - Refresh Token: 工程師 8 小時，審查委員 1 小時
    - 前端定時刷新 + 活動偵測
- [x] Resolve: 錯誤日誌服務
  - **Decision**: Sentry (成熟、免費額度足夠初期使用)

## Phase 1: Core Implementation

**Goal**: Functional MVP — 登入/登出與角色識別

### 1.1 Data Model & Types

- [ ] 建立 `src/types/auth.ts` 定義 User, Role, AuthState interfaces
- [ ] 建立 `src/types/annotation.ts` 定義 Annotation interface

### 1.2 Zustand Stores

- [ ] 建立 `src/stores/authStore.ts` — 認證狀態與使用者資訊
- [ ] 建立 `src/stores/annotationStore.ts` — 標註資料 (僅 reviewer)

### 1.3 API Layer

- [ ] 建立 `src/api/auth.ts` — 登入、登出、刷新、驗證邀請連結
- [ ] 建立 `src/api/annotation.ts` — 標註 CRUD

### 1.4 Auth Components

- [ ] 建立 `src/components/auth/LoginForm.tsx` — 登入表單
- [ ] 建立 `src/components/auth/ProtectedRoute.tsx` — 路由守衛
- [ ] 建立 `src/components/auth/RoleBasedUI.tsx` — 角色條件渲染 HOC

### 1.5 UI Adaptation

- [ ] 建立 `src/layouts/EngineerLayout.tsx` — 工程師完整介面
- [ ] 建立 `src/layouts/ReviewerLayout.tsx` — 審查委員介面
- [ ] 建立 `src/layouts/PublicLayout.tsx` — 民眾導覽介面

## Phase 2: Integration & Polish

**Goal**: Production Ready

### 2.1 Annotation System (Reviewer)

- [ ] 建立 `src/components/annotation/AnnotationTool.tsx` — 標註繪製工具
- [ ] 建立 `src/components/annotation/AnnotationList.tsx` — 標註列表
- [ ] 實作標註 3D 定位與相機狀態儲存

### 2.2 Invite Link Flow

- [ ] 實作邀請連結產生 (後端)
- [ ] 實作邀請連結驗證與自動登入

### 2.3 Session Management

- [ ] 實作 Token 自動刷新
- [ ] 實作多分頁同步登出
- [ ] 實作活動偵測 + 逾時警告

### 2.4 Observability

- [ ] 整合 Sentry 錯誤追蹤
- [ ] 整合頁面瀏覽統計 (Plausible/PostHog)

### 2.5 Error Handling

- [ ] 實作未授權存取友善提示
- [ ] 實作 Session 過期重新登入引導

## Verification Plan

### Unit Tests

- [ ] `authUtils.ts` — JWT decode、過期檢查
- [ ] `permissionUtils.ts` — 角色權限判斷
- [ ] `sessionTimer.ts` — 逾時計算

### Integration Tests

- [ ] 登入流程 (成功/失敗)
- [ ] 邀請連結驗證流程
- [ ] 角色路由守衛 (工程師 vs 審查委員 vs 民眾)
- [ ] 標註建立與顯示流程

### Manual Test Scenarios

- [ ] 工程師登入後 5 秒內存取完整功能
- [ ] 審查委員 1 小時無操作後登出
- [ ] 民眾無需登入進入導覽模式
- [ ] 未授權存取顯示友善提示

## Generated Artifacts

- `data-model.md` — 資料模型設計
- `contracts/auth-api.yaml` — OpenAPI 規格
