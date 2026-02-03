# Implementation Tasks: 使用者角色與權限系統 (User Roles System)

**Feature Branch**: `4-user-roles-system`  
**Status**: IN_PROGRESS (Phase 1-6 Complete)  
**Total Tasks**: 50  
**Estimated Effort**: 2 sprints

---

## Phase 1: Setup & Configuration

- [x] T001 Create feature branch `4-user-roles-system` from main
- [x] T002 Install auth dependencies: `jsonwebtoken`, `bcryptjs` in backend `package.json`
- [x] T003 Install Sentry SDK: `@sentry/react`, `@sentry/browser` in frontend `package.json`
- [x] T004 Configure Sentry DSN in `.env` as `VITE_SENTRY_DSN`
- [x] T005 Create JWT_SECRET and JWT_REFRESH_SECRET in `.env`

---

## Phase 2: Foundational Components (Blocking)

### Backend Types & Models

- [x] T006 [P] Create User model with role enum in `server/models/User.ts`
- [x] T007 [P] Create Annotation model in `server/models/Annotation.ts`
- [x] T008 [P] Create InviteLink model in `server/models/InviteLink.ts`
- [x] T009 [P] Create Session model for token tracking in `server/models/Session.ts`

### Frontend Types

- [x] T010 [P] Create auth types: User, Role, AuthState in `src/types/auth.ts`
- [x] T011 [P] Create annotation types: Annotation, CreateAnnotation in `src/types/annotation.ts`

### Zustand Stores

- [x] T012 [P] Create authStore with actions: login, logout, refreshToken, checkAuth in `src/stores/authStore.ts`
- [x] T013 [P] Create annotationStore with actions: fetchAnnotations, createAnnotation, resolveAnnotation in `src/stores/annotationStore.ts`

### API Layer

- [x] T014 Create auth API: login, logout, refresh, validateInvite in `src/api/auth.ts`
- [x] T015 Create annotation API: getAnnotations, createAnnotation, updateAnnotation in `src/api/annotation.ts`

### Database Schema

- [x] T016 Create database migration for users table in `server/migrations/001_create_users.sql`
- [x] T017 Create database migration for annotations table in `server/migrations/002_create_annotations.sql`
- [x] T018 Create database migration for invite_links table in `server/migrations/003_create_invite_links.sql`

---

## Phase 3: User Story [US1] - 工程師帳密登入

**Goal**: 工程師以帳號密碼登入，8 小時 Session

### Backend

- [x] T019 [US1] Create auth middleware for JWT validation in `server/middleware/auth.ts`
- [x] T020 [US1] Create login endpoint with password verification in `server/routes/auth.ts`
- [x] T021 [US1] Create refresh token endpoint with 8-hour expiry for engineer in `server/routes/auth.ts`
- [x] T022 [US1] Create logout endpoint to invalidate refresh token in `server/routes/auth.ts`

### Frontend

- [x] T023 [P] [US1] Create login form component in `src/components/auth/LoginForm.tsx`
- [x] T024 [P] [US1] Create auth context provider in `src/contexts/AuthContext.tsx`
- [x] T025 [US1] Implement token refresh timer based on role
- [x] T026 [US1] Create logout confirmation modal in `src/components/auth/LogoutModal.tsx`

**Independent Test Criteria**: 工程師可登入並在 8 小時後自動登出

---

## Phase 4: User Story [US2] - 審查委員邀請連結登入

**Goal**: 審查委員透過邀請連結登入，1 小時 Session

- [x] T027 [US2] Create invite link generation endpoint in `server/routes/invite.ts`
- [x] T028 [US2] Create invite link validation endpoint in `server/routes/invite.ts`
- [x] T029 [US2] Create invite landing page component in `src/pages/InvitePage.tsx`
- [x] T030 [US2] Implement 1-hour session timeout for reviewer role
- [x] T031 [US2] Create session expiry warning modal (5 min before) in `src/components/auth/SessionWarning.tsx`

**Independent Test Criteria**: 審查委員點邀請連結進入系統，1 小時後登出

---

## Phase 5: User Story [US3] - 民眾免登入存取

**Goal**: 民眾無需登入即可存取導覽模式

- [x] T032 [US3] Create public route configuration (no auth required) in `src/routes/publicRoutes.ts`
- [x] T033 [US3] Create public layout with simplified UI in `src/layouts/PublicLayout.tsx`
- [x] T034 [US3] Auto-start guided tour for public users
- [x] T035 [US3] Hide complex tools (量測、匯出) for public role

**Independent Test Criteria**: 民眾直接存取 /public 路徑進入導覽模式

---

## Phase 6: User Story [US4] - 角色權限路由守衛

**Goal**: 依角色限制功能存取

- [x] T036 [US4] Create ProtectedRoute component with role checking in `src/components/auth/ProtectedRoute.tsx`
- [x] T037 [US4] Create RoleBasedUI HOC for conditional rendering in `src/components/auth/RoleBasedUI.tsx`
- [x] T038 [US4] Create permission config mapping roles to features in `src/config/permissions.ts`
- [x] T039 [US4] Create unauthorized access page with friendly message in `src/pages/UnauthorizedPage.tsx`
- [x] T040 [US4] Apply ProtectedRoute to all feature routes

**Independent Test Criteria**: 審查委員無法存取工程師專屬功能

---

## Phase 7: User Story [US5] - 審查委員標註功能

**Goal**: 審查委員可在 3D 場景中建立標註

- [ ] T041 [P] [US5] Create annotation toolbar (text/arrow/region) in `src/components/annotation/AnnotationToolbar.tsx`
- [ ] T042 [P] [US5] Create annotation renderer using R3F/drei Html in `src/components/annotation/AnnotationRenderer.tsx`
- [ ] T043 [US5] Create annotation entry form with camera state capture in `src/components/annotation/AnnotationForm.tsx`
- [ ] T044 [US5] Create annotation list panel in `src/components/annotation/AnnotationList.tsx`
- [ ] T045 [US5] Implement click-to-navigate to annotation position
- [ ] T046 [US5] Create annotation CRUD endpoints in `server/routes/annotations.ts`

**Independent Test Criteria**: 審查委員可建立標註，標註顯示於場景中

---

## Phase 8: User Story [US6] - 可觀測性整合

**Goal**: 收集錯誤日誌與頁面瀏覽統計

- [ ] T047 [US6] Initialize Sentry in React app entry in `src/main.tsx`
- [ ] T048 [US6] Create error boundary with Sentry reporting in `src/components/common/ErrorBoundary.tsx`
- [ ] T049 [US6] Add page view tracking hook in `src/hooks/usePageTracking.ts`
- [ ] T050 [US6] Create backend error logging middleware in `server/middleware/errorLogger.ts`

**Independent Test Criteria**: 前端錯誤上報 Sentry，頁面瀏覽有統計

---

## Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ──────────────────────────────────┐
    ↓                                                    │
Phase 3 (US1: 工程師登入) ←──────────────────────────────┤
    ↓                                                    │
Phase 4 (US2: 審查委員登入) ←── shares auth infra        │
    ↓                                                    │
Phase 5 (US3: 民眾免登入) ←── depends on route setup     │
    ↓                                                    │
Phase 6 (US4: 權限守衛) ←── depends on US1-3             │
    ↓                                                    │
Phase 7 (US5: 標註功能) ←── depends on US2, US4          │
    ↓                                                    │
Phase 8 (US6: 可觀測性) ←────────────────────────────────┘
```

## Parallel Execution Opportunities

| Phase | Parallelizable Tasks |
|-------|---------------------|
| Phase 2 | T006-T009 (backend models), T010-T011 (frontend types), T012-T013 (stores) |
| Phase 3 | T023-T024 (frontend auth) |
| Phase 7 | T041-T042 (annotation components) |

## MVP Scope

**Recommended MVP**: Phase 1-6 (US1-US4)

- 三種角色登入 + 權限路由守衛
- 標註功能可延後至 Phase 2
- 預估工時: 1 sprint

---

## Implementation Notes

### Security Considerations

- JWT 使用 RS256 或 HS256 with long secret
- Refresh Token 存 httpOnly cookie
- CSRF protection via SameSite cookie + custom header
- Rate limit on login endpoint

### Session Timeout Implementation

```typescript
// Engineer: 8 hours
const ENGINEER_SESSION = 8 * 60 * 60 * 1000;
// Reviewer: 1 hour
const REVIEWER_SESSION = 1 * 60 * 60 * 1000;
// Access Token: 15 minutes (both roles)
const ACCESS_TOKEN_TTL = 15 * 60 * 1000;
```

### Role-UI Mapping

| Role | Available Features |
|------|-------------------|
| engineer | All features + raw data export |
| reviewer | View + Annotation (no export) |
| public | Guided tour only (readonly) |
