# 設計文件：正式帳號管理系統 + 資安機制

**Status**: APPROVED
**Date**: 2026-03-09
**Spec Reference**: `specs/4-user-roles-system/spec.md`
**Branch**: `1-geology-module`（待建立新 feature branch）

---

## 1. 背景與目標

### 現狀

- 後端 `server/routes/auth.ts` 使用 in-memory `Map` 儲存使用者與 session，server 重啟全部遺失
- 3 個硬編碼 demo 帳號（`engineer@example.com` / `reviewer@example.com` / `admin@example.com`）
- Prisma schema 中**無 User / Session model**
- 前端已有完整骨架：`authStore.ts`（Zustand）、`LoginForm`、`ProtectedRoute`、`RoleBasedUI`、`SessionWarning`、`AdminUsersPage`（mock data）、`AdminSettingsPage`（部分接真 API）

### 目標

將假資料帳號系統升級為正式的持久化帳號管理系統：

1. User / Session / AuditLog 持久化到 PostgreSQL（Prisma）
2. 帳號 CRUD（admin 管理介面）
3. 密碼安全（bcrypt 雜湊、強度驗證、admin 手動重設 + 強制改密碼）
4. 登入失敗鎖定（5 次 → 15 分鐘）
5. Session 併發控制（同帳號最多 3 個）
6. CSRF protection（Double Submit Cookie）
7. Rate limiting（in-memory 滑動視窗）
8. 認證事件稽核日誌

---

## 2. 架構方案

**選定方案：Prisma Model 直接擴充**

在現有 Prisma schema 新增 `User`、`Session`、`AuditLog` model，`auth.ts` 路由從 in-memory Map 改為 Prisma 查詢。

**排除方案：**
- Passport.js：僅需帳密登入，Passport 是 overkill，且跟現有 JWT middleware 衝突
- Auth.js 獨立 Auth Service：50 人系統不需要獨立 auth server，部署複雜度過高

---

## 3. Database Schema

```prisma
enum UserRole {
  engineer
  reviewer
  public
  admin
}

enum AccountStatus {
  active          // 正常使用
  locked          // 登入失敗過多，自動鎖定
  disabled        // 管理員手動停用
  pending_reset   // 等待首次登入改密碼（admin 重設後）
}

model User {
  id             String        @id @default(uuid())
  email          String        @unique
  passwordHash   String
  name           String
  role           UserRole      @default(engineer)
  status         AccountStatus @default(active)

  // 密碼安全
  mustChangePassword Boolean   @default(false)
  passwordChangedAt  DateTime?
  failedLoginCount   Int       @default(0)
  lockedUntil        DateTime?

  // 時間戳
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  lastLoginAt    DateTime?

  // Relations
  sessions       Session[]
  auditLogs      AuditLog[]

  @@map("users")
}

model Session {
  id             String    @id @default(uuid())
  userId         String
  refreshToken   String    @unique
  userAgent      String?
  ipAddress      String?
  expiresAt      DateTime
  createdAt      DateTime  @default(now())
  lastActivityAt DateTime  @default(now())
  isRevoked      Boolean   @default(false)

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

enum AuditAction {
  LOGIN_SUCCESS
  LOGIN_FAILED
  LOGOUT
  TOKEN_REFRESH
  PASSWORD_CHANGE
  PASSWORD_RESET
  ACCOUNT_CREATE
  ACCOUNT_UPDATE
  ACCOUNT_DISABLE
  ACCOUNT_UNLOCK
  SESSION_REVOKED
}

model AuditLog {
  id          String      @id @default(uuid())
  userId      String?
  action      AuditAction
  ipAddress   String?
  userAgent   String?
  details     Json?
  createdAt   DateTime    @default(now())

  user        User?       @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### 設計決策

- `AccountStatus` enum：鎖定（自動，有 `lockedUntil`）vs 停用（手動，admin 才能恢復）分開處理
- `failedLoginCount` + `lockedUntil`：連續 5 次失敗 → 鎖定 15 分鐘，成功登入重置
- Session 上限 3 個：新登入時檢查 active session 數量，超過 revoke 最舊的
- AuditLog `userId` nullable：登入失敗時帳號可能不存在，但仍記錄 IP 和嘗試的 email（存在 `details` JSON）
- AuditLog `onDelete: SetNull`：刪除使用者後 audit 紀錄保留

---

## 4. API 設計

### 4.1 認證 API（改寫 `server/routes/auth.ts`）

| Method | Endpoint | 認證 | 說明 |
|--------|----------|------|------|
| POST | `/api/auth/login` | 無 | 登入（rate limit + 鎖定檢查） |
| POST | `/api/auth/logout` | authenticate | 登出（revoke session） |
| POST | `/api/auth/refresh` | cookie | 刷新 access token |
| GET | `/api/auth/me` | authenticate | 取得當前使用者（讀 DB） |
| PUT | `/api/auth/change-password` | authenticate | 變更自己的密碼 |

**Login 流程：**

```
收到 email/password
  → rate limit 檢查（同 IP 60 秒內最多 10 次）
  → Prisma 查詢 User by email
  → 檢查 status:
    - locked + lockedUntil > now → 回「帳號已鎖定」+ 剩餘秒數
    - disabled → 回「帳號已停用」
  → bcrypt.compare
  → 失敗:
    - failedLoginCount++
    - 達 5 次 → status=locked, lockedUntil = now + 15min
    - 寫 AuditLog(LOGIN_FAILED, details: { attemptedEmail })
  → 成功:
    - failedLoginCount = 0, lockedUntil = null
    - 如果 status=locked 且 lockedUntil < now → status = active（自動解鎖）
    - 更新 lastLoginAt
    - 計算 active sessions → 超過 3 → revoke 最舊 → AuditLog(SESSION_REVOKED)
    - 建立 Session record
    - 寫 AuditLog(LOGIN_SUCCESS)
    - 回傳 accessToken + mustChangePassword flag
    - set httpOnly cookie (refreshToken)
```

### 4.2 帳號管理 API（新增 `server/routes/admin.ts`）

| Method | Endpoint | 認證 | 說明 |
|--------|----------|------|------|
| GET | `/api/admin/users` | admin | 使用者列表（含 status、lastLoginAt、active session 數） |
| POST | `/api/admin/users` | admin | 建立帳號（自動 bcrypt + mustChangePassword=true） |
| PUT | `/api/admin/users/:id` | admin | 更新（name、role、status） |
| POST | `/api/admin/users/:id/reset-password` | admin | 重設密碼（產生臨時密碼 + mustChangePassword=true） |
| POST | `/api/admin/users/:id/unlock` | admin | 手動解鎖 |
| DELETE | `/api/admin/users/:id` | admin | 停用（status=disabled，soft delete） |
| GET | `/api/admin/users/:id/sessions` | admin | 該使用者的 active sessions |
| DELETE | `/api/admin/users/:id/sessions` | admin | 踢掉全部 session |
| GET | `/api/admin/audit-logs` | admin | 稽核日誌（分頁 + 日期區間 + action/user 篩選） |

### 4.3 安全 Middleware

**Rate Limiting（`server/middleware/rateLimit.ts`）**

In-memory Map + 滑動視窗（50 人規模不需 Redis）：
- 登入：同 IP 60 秒內最多 10 次
- 密碼變更：同 user 60 秒內最多 5 次
- Admin API：同 user 60 秒內最多 30 次

**CSRF Protection（`server/middleware/csrf.ts`）**

Double Submit Cookie pattern：
- 登入時回傳 `X-CSRF-Token` header
- 前端存 memory，mutating request 帶上
- 後端比對 cookie token 與 header token

**密碼強度驗證（`server/lib/passwordPolicy.ts`）**

- 最少 8 字元
- 大寫、小寫、數字各至少 1 個
- 不能跟 email 相同
- 建立帳號與變更密碼時統一檢查

---

## 5. 前端設計

### 5.1 頁面改動

**改寫 `AdminUsersPage.tsx`**（Mock → 真實 API）：

| 項目 | 現狀 | 改為 |
|------|------|------|
| 資料來源 | `useState<MockUser[]>(mockUsers)` | `adminStore.users` + `fetchUsers()` |
| 認證 | `useAuth()` (context) | `useAuthStore` (zustand) |
| 表格欄位 | 名稱/角色/狀態/最後登入/操作 | 加「活躍 Sessions」數量 |
| 狀態 | active/inactive | active/locked/disabled/pending_reset（4 種 badge） |
| 新增帳號 | 手動輸入密碼 | 自動產生臨時密碼 + 顯示複製 + mustChangePassword |
| 操作 | 編輯/停用 | 編輯/重設密碼/解鎖/查看 Sessions/踢出/停用（dropdown） |
| 篩選 | 僅搜尋 | 加角色篩選 + 狀態篩選下拉 |

**改寫 `AdminSettingsPage.tsx`**：

| 分區 | 改動 |
|------|------|
| 安全性設定 | 唯讀顯示（登入失敗次數上限 5、鎖定時間 15 分鐘、密碼最小長度 8），值 hardcode 後端常數 |
| 新增：稽核日誌 | sidebar 新增分區，分頁表格 + 日期區間 + 事件類型/使用者篩選，每頁 50 筆 |
| 儲存空間管理 | 保持不變（已接真 API） |
| 一般/通知/整合 | 保持 placeholder |

**新增 `ChangePasswordPage.tsx`**（`/change-password`）：
- `mustChangePassword=true` 時 `ProtectedRoute` 攔截導向此頁
- 舊密碼 + 新密碼 + 確認密碼
- 密碼強度即時提示（長度/大寫/小寫/數字）
- 成功後清除 flag，導回原頁面

### 5.2 Store 改動

**`authStore.ts`**：
- Login response 增加 `mustChangePassword` flag 處理
- 新增 `changePassword(oldPassword, newPassword)` action
- 統一移除 `useAuth()` Context 依賴

**新增 `adminStore.ts`**：
- `users[]`、`fetchUsers()`、`createUser()`、`updateUser()`、`resetPassword()`、`unlockUser()`
- `auditLogs[]`、`fetchAuditLogs(filters)`（分頁 + 篩選）
- `userSessions[]`、`fetchUserSessions(userId)`、`revokeAllSessions(userId)`

### 5.3 路由改動

- `ProtectedRoute.tsx`：加入 `mustChangePassword` 攔截
- `AppRoutes.tsx`：新增 `/change-password` 路由
- 統一 `useAuth()` → `useAuthStore`（`AdminUsersPage`、`AdminSettingsPage`）

---

## 6. Migration 策略

首次部署時需要 seed 一個 admin 帳號：

```typescript
// server/prisma/seed.ts
const adminHash = await bcrypt.hash('初始密碼', 10);
await prisma.user.upsert({
  where: { email: 'admin@llrwd.tw' },
  update: {},
  create: {
    email: 'admin@llrwd.tw',
    passwordHash: adminHash,
    name: '系統管理員',
    role: 'admin',
    status: 'active',
    mustChangePassword: true,
  },
});
```

生產環境部署流程：
1. `npx prisma db push` — 建立 User/Session/AuditLog 表
2. `npx prisma db seed` — 建立 admin 帳號
3. 移除 `auth.ts` 中的硬編碼 demo 帳號
4. Admin 首次登入後被強制改密碼，之後再建立其他使用者

---

## 7. 不在此次範圍

以下功能在 spec 中有規劃但不在本次實作：

- InviteLink（審查委員邀請連結）
- Annotation（標註系統）
- i18n 多語系
- Sentry 整合
- 頁面瀏覽統計
- Email 密碼重設
- 雙因素驗證（2FA）
- 資料異動 audit log（僅做認證事件）
