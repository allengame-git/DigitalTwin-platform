# 正式帳號管理系統 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將 in-memory 假資料帳號系統升級為 Prisma 持久化帳號管理系統，含完整資安機制。

**Architecture:** 在現有 Prisma schema 新增 User/Session/AuditLog model，改寫 `server/routes/auth.ts` 從 Map 查詢改為 Prisma 查詢，新增 `server/routes/admin.ts` 帳號管理 API，新增安全 middleware（rate limit / CSRF / 密碼強度），改寫前端 AdminUsersPage/AdminSettingsPage 接真實 API，新增 ChangePasswordPage。

**Tech Stack:** Prisma 7 + PostgreSQL, Express 5, bcryptjs, JWT (jsonwebtoken), React 19, Zustand 5, TypeScript 5.9

**Design Doc:** `docs/plans/2026-03-09-user-auth-system-design.md`

**注意：** 本專案無測試框架，所有 Step 中的「測試」均為手動驗證（curl / 瀏覽器）。

---

## Task 1: Prisma Schema — User / Session / AuditLog

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: 在 schema.prisma 末尾新增 enum 與 model**

在 `schema.prisma` 檔案最後（所有現有 model 之後）新增：

```prisma
// ── 帳號管理 ──────────────────────────────────────────

enum UserRole {
  engineer
  reviewer
  public
  admin
}

enum AccountStatus {
  active
  locked
  disabled
  pending_reset
}

model User {
  id                 String        @id @default(uuid())
  email              String        @unique
  passwordHash       String
  name               String
  role               UserRole      @default(engineer)
  status             AccountStatus @default(active)
  mustChangePassword Boolean       @default(false)
  passwordChangedAt  DateTime?
  failedLoginCount   Int           @default(0)
  lockedUntil        DateTime?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  lastLoginAt        DateTime?
  sessions           Session[]
  auditLogs          AuditLog[]

  @@map("users")
}

model Session {
  id             String   @id @default(uuid())
  userId         String
  refreshToken   String   @unique
  userAgent      String?
  ipAddress      String?
  expiresAt      DateTime
  createdAt      DateTime @default(now())
  lastActivityAt DateTime @default(now())
  isRevoked      Boolean  @default(false)
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

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
  id        String      @id @default(uuid())
  userId    String?
  action    AuditAction
  ipAddress String?
  userAgent String?
  details   Json?
  createdAt DateTime    @default(now())
  user      User?       @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

**Step 2: Push schema to DB**

Run:
```bash
cd server && npx prisma db push && npx prisma generate
```

Expected: `Your database is now in sync with your Prisma schema.`

**Step 3: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(auth): add User/Session/AuditLog Prisma models"
```

---

## Task 2: Seed Script — 初始 Admin 帳號

**Files:**
- Create: `server/prisma/seed.ts`
- Modify: `server/package.json` (add prisma seed config)

**Step 1: 建立 seed.ts**

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const initialPassword = 'Admin@2026';
    const hash = await bcrypt.hash(initialPassword, 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@llrwd.tw' },
        update: {},
        create: {
            email: 'admin@llrwd.tw',
            passwordHash: hash,
            name: '系統管理員',
            role: 'admin',
            status: 'active',
            mustChangePassword: true,
        },
    });

    console.log(`Seeded admin user: ${admin.email} (id: ${admin.id})`);
    console.log(`Initial password: ${initialPassword}`);
    console.log('⚠️  User will be forced to change password on first login.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
```

**Step 2: 在 server/package.json 加入 prisma seed 設定**

在 `server/package.json` 的頂層（與 `scripts` 同級）加入：

```json
"prisma": {
    "seed": "ts-node prisma/seed.ts"
}
```

**Step 3: 執行 seed**

Run:
```bash
cd server && npx prisma db seed
```

Expected: 印出 `Seeded admin user: admin@llrwd.tw`

**Step 4: Commit**

```bash
git add server/prisma/seed.ts server/package.json
git commit -m "feat(auth): add seed script for initial admin account"
```

---

## Task 3: 密碼強度驗證 + Audit Log Helper

**Files:**
- Create: `server/lib/passwordPolicy.ts`
- Create: `server/lib/auditLog.ts`

**Step 1: 建立 passwordPolicy.ts**

```typescript
export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}

export function validatePassword(password: string, email: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('密碼長度至少 8 字元');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('密碼需包含至少一個大寫字母');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('密碼需包含至少一個小寫字母');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('密碼需包含至少一個數字');
    }
    if (password.toLowerCase() === email.toLowerCase()) {
        errors.push('密碼不能與 Email 相同');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Generate a random temporary password meeting policy requirements
 */
export function generateTempPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;

    // Ensure at least one of each required type
    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += digits[Math.floor(Math.random() * digits.length)];

    // Fill remaining 7 chars
    for (let i = 0; i < 7; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle
    return password.split('').sort(() => Math.random() - 0.5).join('');
}
```

**Step 2: 建立 auditLog.ts**

```typescript
import { PrismaClient, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditLogParams {
    userId?: string | null;
    action: AuditAction;
    ipAddress?: string | null;
    userAgent?: string | null;
    details?: Record<string, unknown>;
}

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId ?? null,
                action: params.action,
                ipAddress: params.ipAddress ?? null,
                userAgent: params.userAgent ?? null,
                details: params.details ?? undefined,
            },
        });
    } catch (error) {
        // Audit log 寫入失敗不應阻斷主要流程
        console.error('[AuditLog] Failed to write:', error);
    }
}
```

**注意：** `auditLog.ts` 自行 import PrismaClient 是不好的做法（應共用 singleton）。改為使用現有的 `server/lib/prisma.ts` singleton：

```typescript
import prisma from './prisma';
import { AuditAction } from '@prisma/client';

// ... 同上，但 import prisma from './prisma' 取代 new PrismaClient()
```

先確認 `server/lib/prisma.ts` 的 export 格式再決定 import 寫法。

**Step 3: Commit**

```bash
git add server/lib/passwordPolicy.ts server/lib/auditLog.ts
git commit -m "feat(auth): add password policy validator and audit log helper"
```

---

## Task 4: Rate Limiting Middleware

**Files:**
- Create: `server/middleware/rateLimit.ts`

**Step 1: 建立 rateLimit.ts**

```typescript
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
    if (!stores.has(name)) {
        stores.set(name, new Map());
    }
    return stores.get(name)!;
}

interface RateLimitOptions {
    name: string;           // store 名稱（不同 endpoint 用不同 store）
    windowMs: number;       // 時間視窗（毫秒）
    maxRequests: number;    // 視窗內最大請求數
    keyFn?: (req: Request) => string;  // 預設用 IP
}

export function rateLimit(options: RateLimitOptions) {
    const { name, windowMs, maxRequests, keyFn } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
        const store = getStore(name);
        const key = keyFn ? keyFn(req) : (req.ip || req.socket.remoteAddress || 'unknown');
        const now = Date.now();

        const entry = store.get(key);

        if (!entry || now > entry.resetAt) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            next();
            return;
        }

        if (entry.count >= maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.status(429).json({
                message: '請求過於頻繁，請稍後再試',
                retryAfter,
            });
            return;
        }

        entry.count++;
        next();
    };
}

// 定期清理過期 entries（每 5 分鐘）
setInterval(() => {
    const now = Date.now();
    for (const store of stores.values()) {
        for (const [key, entry] of store) {
            if (now > entry.resetAt) {
                store.delete(key);
            }
        }
    }
}, 5 * 60 * 1000);

// ── 預設配置 ──────────────────────────────────────────

/** 登入端點：同 IP 60 秒內最多 10 次 */
export const loginRateLimit = rateLimit({
    name: 'login',
    windowMs: 60 * 1000,
    maxRequests: 10,
});

/** 密碼變更：同 IP 60 秒內最多 5 次 */
export const passwordRateLimit = rateLimit({
    name: 'password',
    windowMs: 60 * 1000,
    maxRequests: 5,
});

/** Admin API：同 IP 60 秒內最多 30 次 */
export const adminRateLimit = rateLimit({
    name: 'admin',
    windowMs: 60 * 1000,
    maxRequests: 30,
});
```

**Step 2: Commit**

```bash
git add server/middleware/rateLimit.ts
git commit -m "feat(auth): add rate limiting middleware (in-memory sliding window)"
```

---

## Task 5: CSRF Protection Middleware

**Files:**
- Create: `server/middleware/csrf.ts`
- Modify: `server/index.ts` (add CORS header for CSRF token)

**Step 1: 建立 csrf.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

/**
 * 設置 CSRF token cookie（登入成功後呼叫）
 */
export function setCsrfToken(res: Response): string {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,  // 前端需讀取
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24h
    });
    return token;
}

/**
 * 驗證 CSRF token（用於 mutating requests）
 * Double Submit Cookie pattern: 比對 cookie 中的 token 與 header 中的 token
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
    // 只檢查 mutating methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER] as string | undefined;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        res.status(403).json({ message: 'CSRF token 驗證失敗' });
        return;
    }

    next();
}
```

**Step 2: 修改 server/index.ts CORS allowedHeaders**

在 `server/index.ts` 的 `cors()` 設定中，`allowedHeaders` 加入 `'X-CSRF-Token'`：

```typescript
// 現有
allowedHeaders: ['Content-Type', 'Authorization'],

// 改為
allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
```

**Step 3: Commit**

```bash
git add server/middleware/csrf.ts server/index.ts
git commit -m "feat(auth): add CSRF protection middleware (double submit cookie)"
```

---

## Task 6: 改寫 auth.ts — Login / Logout / Refresh / Me / Change-Password

**Files:**
- Modify: `server/routes/auth.ts` (全面改寫)
- Modify: `server/middleware/auth.ts` (import UserRole from Prisma)

**這是最核心的改動。** 將整個 `auth.ts` 從 in-memory Map 改為 Prisma 查詢。

**Step 1: 更新 server/middleware/auth.ts 的 UserRole import**

現有 `auth.ts` middleware import 了 `import { UserRole } from '../models/User';`。改為使用 Prisma 生成的型別：

```typescript
// 舊
import { UserRole } from '../models/User';

// 新
import { UserRole } from '@prisma/client';
```

`JwtPayload` interface 中的 `role: UserRole` 型別不變（Prisma 的 UserRole enum 與原本的 string union 相容）。

**Step 2: 全面改寫 server/routes/auth.ts**

移除所有 in-memory Map 和硬編碼 demo 帳號，改用 Prisma 查詢。關鍵改動：

1. **Login**：Prisma 查 User → 檢查 status/鎖定 → bcrypt → 更新 failedLoginCount → 建立 Session → 寫 AuditLog → 設 CSRF cookie
2. **Logout**：revoke Session record → 寫 AuditLog → 清 cookies
3. **Refresh**：Prisma 查 Session（非 revoked + 未過期）→ 查 User → 生成新 accessToken → 更新 lastActivityAt
4. **Me**：Prisma 查 User by id
5. **Change-Password**（新）：驗證舊密碼 → 密碼強度檢查 → bcrypt 新密碼 → 更新 User → 清除 mustChangePassword → 寫 AuditLog

完整改寫內容：

```typescript
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import {
    authenticate,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    AuthenticatedRequest
} from '../middleware/auth';
import { loginRateLimit, passwordRateLimit } from '../middleware/rateLimit';
import { setCsrfToken } from '../middleware/csrf';
import { writeAuditLog } from '../lib/auditLog';
import { validatePassword } from '../lib/passwordPolicy';

const router = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SESSIONS = 3;

// ── Session timeout by role (ms) ──
const SESSION_TIMEOUT: Record<string, number> = {
    engineer: 8 * 60 * 60 * 1000,
    reviewer: 1 * 60 * 60 * 1000,
    admin: 8 * 60 * 60 * 1000,
};

// ── Helper: get client info ──
function getClientInfo(req: Request) {
    return {
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
    };
}

/**
 * POST /auth/login
 */
router.post('/login', loginRateLimit, async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const client = getClientInfo(req);

    if (!email || !password) {
        res.status(400).json({ message: '請提供 email 和密碼' });
        return;
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            await writeAuditLog({
                action: 'LOGIN_FAILED',
                ...client,
                details: { attemptedEmail: email, reason: 'user_not_found' },
            });
            res.status(401).json({ message: '帳號或密碼錯誤' });
            return;
        }

        // 檢查帳號狀態
        if (user.status === 'disabled') {
            await writeAuditLog({
                userId: user.id, action: 'LOGIN_FAILED', ...client,
                details: { reason: 'account_disabled' },
            });
            res.status(403).json({ message: '帳號已停用，請聯繫管理員' });
            return;
        }

        // 自動解鎖檢查
        if (user.status === 'locked') {
            if (user.lockedUntil && user.lockedUntil > new Date()) {
                const remainingSec = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
                res.status(423).json({
                    message: `帳號已鎖定，請 ${remainingSec} 秒後再試`,
                    lockedUntil: user.lockedUntil.toISOString(),
                    remainingSeconds: remainingSec,
                });
                return;
            }
            // 鎖定時間已過，自動解鎖
            await prisma.user.update({
                where: { id: user.id },
                data: { status: 'active', failedLoginCount: 0, lockedUntil: null },
            });
        }

        // 驗證密碼
        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
            const newCount = user.failedLoginCount + 1;
            const updateData: Record<string, unknown> = { failedLoginCount: newCount };

            if (newCount >= MAX_FAILED_ATTEMPTS) {
                updateData.status = 'locked';
                updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            }

            await prisma.user.update({ where: { id: user.id }, data: updateData });
            await writeAuditLog({
                userId: user.id, action: 'LOGIN_FAILED', ...client,
                details: { reason: 'wrong_password', failedCount: newCount },
            });

            const remaining = MAX_FAILED_ATTEMPTS - newCount;
            const msg = remaining > 0
                ? `帳號或密碼錯誤（還有 ${remaining} 次嘗試機會）`
                : '登入失敗次數過多，帳號已鎖定 15 分鐘';
            res.status(401).json({ message: msg });
            return;
        }

        // ── 登入成功 ──

        // 重置失敗計數
        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginCount: 0,
                lockedUntil: null,
                status: 'active',
                lastLoginAt: new Date(),
            },
        });

        // Session 併發控制：最多 MAX_SESSIONS 個
        const activeSessions = await prisma.session.findMany({
            where: { userId: user.id, isRevoked: false, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'asc' },
        });

        if (activeSessions.length >= MAX_SESSIONS) {
            const toRevoke = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS + 1);
            await prisma.session.updateMany({
                where: { id: { in: toRevoke.map(s => s.id) } },
                data: { isRevoked: true },
            });
            for (const s of toRevoke) {
                await writeAuditLog({
                    userId: user.id, action: 'SESSION_REVOKED', ...client,
                    details: { revokedSessionId: s.id, reason: 'max_sessions_exceeded' },
                });
            }
        }

        // 建立 token
        const accessToken = generateAccessToken(user.id, user.email, user.role);
        const refreshToken = generateRefreshToken(user.id, user.role);

        // 建立 Session record
        const sessionTimeout = SESSION_TIMEOUT[user.role] || SESSION_TIMEOUT.engineer;
        await prisma.session.create({
            data: {
                userId: user.id,
                refreshToken,
                userAgent: client.userAgent,
                ipAddress: client.ipAddress,
                expiresAt: new Date(Date.now() + sessionTimeout),
            },
        });

        // CSRF token
        const csrfToken = setCsrfToken(res);

        // Audit log
        await writeAuditLog({ userId: user.id, action: 'LOGIN_SUCCESS', ...client });

        // Set refresh token cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: sessionTimeout,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                mustChangePassword: user.mustChangePassword,
                createdAt: user.createdAt.toISOString(),
                lastLoginAt: new Date().toISOString(),
            },
            tokens: {
                accessToken,
                expiresIn: 24 * 60 * 60 * 1000,
            },
            csrfToken,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: '登入失敗' });
    }
});

/**
 * POST /auth/logout
 */
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const client = getClientInfo(req);
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
        await prisma.session.updateMany({
            where: { refreshToken },
            data: { isRevoked: true },
        });
    }

    if (req.user) {
        await writeAuditLog({ userId: req.user.userId, action: 'LOGOUT', ...client });
    }

    res.clearCookie('refreshToken');
    res.clearCookie('csrf-token');
    res.json({ message: '已登出' });
});

/**
 * POST /auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        res.status(401).json({ message: '未提供 Refresh Token' });
        return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
        res.status(401).json({ message: 'Refresh Token 無效或已過期' });
        return;
    }

    // 查 Session
    const session = await prisma.session.findUnique({ where: { refreshToken } });
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
        res.status(401).json({ message: 'Session 已失效，請重新登入' });
        return;
    }

    // 查 User
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status === 'disabled') {
        res.status(401).json({ message: '帳號不存在或已停用' });
        return;
    }

    // 更新 session 活動時間
    await prisma.session.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
    });

    const accessToken = generateAccessToken(user.id, user.email, user.role);

    res.json({
        accessToken,
        expiresIn: 15 * 60 * 1000,
    });
});

/**
 * GET /auth/me
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: '未認證' });
        return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
        res.status(404).json({ message: '使用者不存在' });
        return;
    }

    res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
    });
});

/**
 * PUT /auth/change-password
 */
router.put('/change-password', authenticate, passwordRateLimit, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: '未認證' });
        return;
    }

    const { oldPassword, newPassword } = req.body;
    const client = getClientInfo(req);

    if (!oldPassword || !newPassword) {
        res.status(400).json({ message: '請提供舊密碼和新密碼' });
        return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
        res.status(404).json({ message: '使用者不存在' });
        return;
    }

    // 驗證舊密碼
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
        res.status(401).json({ message: '舊密碼錯誤' });
        return;
    }

    // 密碼強度驗證
    const validation = validatePassword(newPassword, user.email);
    if (!validation.valid) {
        res.status(400).json({ message: '密碼不符合規則', errors: validation.errors });
        return;
    }

    // 更新密碼
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash: hash,
            mustChangePassword: false,
            passwordChangedAt: new Date(),
        },
    });

    await writeAuditLog({ userId: user.id, action: 'PASSWORD_CHANGE', ...client });

    res.json({ message: '密碼已更新' });
});

export default router;
```

**Step 3: 手動驗證**

```bash
# 啟動 server
cd server && npm run dev

# 測試登入（用 seed 的 admin 帳號）
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@llrwd.tw","password":"Admin@2026"}' \
  -c cookies.txt -v
```

Expected: 200 + JSON with `user.mustChangePassword: true`

**Step 4: Commit**

```bash
git add server/routes/auth.ts server/middleware/auth.ts
git commit -m "feat(auth): rewrite auth routes from in-memory to Prisma persistence"
```

---

## Task 7: Admin API — 帳號管理路由

**Files:**
- Create: `server/routes/admin.ts`
- Modify: `server/index.ts` (mount admin routes)

**Step 1: 建立 server/routes/admin.ts**

包含所有 9 個端點（users CRUD + reset-password + unlock + sessions + audit-logs）。

關鍵端點實作要點：

- **GET /admin/users**：`prisma.user.findMany` + `_count: { sessions: { where: { isRevoked: false, expiresAt: { gt: new Date() } } } }`
- **POST /admin/users**：`generateTempPassword()` + `bcrypt.hash` + `mustChangePassword: true` → 回傳臨時密碼明文（僅此一次）
- **POST /admin/users/:id/reset-password**：同上邏輯，revoke 該 user 所有 session
- **DELETE /admin/users/:id**：`status: 'disabled'`（soft delete）+ revoke all sessions
- **GET /admin/audit-logs**：支援 query params `page`, `limit`, `startDate`, `endDate`, `action`, `userId`

所有端點掛載 `authenticate` + `authorize('admin')` + `adminRateLimit`。

**Step 2: 在 server/index.ts 掛載**

```typescript
import adminRoutes from './routes/admin';
// ...
app.use('/api/admin', adminRoutes);
```

**Step 3: 手動驗證**

```bash
# 先登入取 token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@llrwd.tw","password":"Admin@2026"}' | jq -r '.tokens.accessToken')

# 建立新使用者
curl -X POST http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@llrwd.tw","name":"測試工程師","role":"engineer"}'
```

Expected: 200 + JSON with `temporaryPassword` 欄位

**Step 4: Commit**

```bash
git add server/routes/admin.ts server/index.ts
git commit -m "feat(auth): add admin API routes (users CRUD, sessions, audit logs)"
```

---

## Task 8: 前端型別 + API Client + Admin Store

**Files:**
- Modify: `src/types/auth.ts` (add new fields)
- Modify: `src/api/auth.ts` (add changePassword)
- Create: `src/api/admin.ts`
- Create: `src/stores/adminStore.ts`

**Step 1: 更新 src/types/auth.ts**

在 `User` interface 加入新欄位：

```typescript
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status?: 'active' | 'locked' | 'disabled' | 'pending_reset';
    mustChangePassword?: boolean;
    createdAt: string;
    lastLoginAt: string | null;
}

export interface LoginResponse {
    user: User;
    tokens: AuthTokens;
    csrfToken?: string;
}
```

新增 admin 相關型別：

```typescript
export interface AdminUser extends User {
    status: 'active' | 'locked' | 'disabled' | 'pending_reset';
    activeSessions: number;
    failedLoginCount: number;
    updatedAt: string;
}

export interface CreateUserRequest {
    email: string;
    name: string;
    role: UserRole;
}

export interface CreateUserResponse {
    user: AdminUser;
    temporaryPassword: string;
}

export interface AuditLogEntry {
    id: string;
    userId: string | null;
    action: string;
    ipAddress: string | null;
    userAgent: string | null;
    details: Record<string, unknown> | null;
    createdAt: string;
    user?: { name: string; email: string } | null;
}

export interface AuditLogFilters {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    action?: string;
    userId?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export interface UserSession {
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
    lastActivityAt: string;
    expiresAt: string;
}
```

**Step 2: 更新 src/api/auth.ts**

新增 `changePassword` 函數：

```typescript
export async function changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword }),
    });
}
```

更新 `fetchApi` 加入 CSRF token header：

```typescript
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // 讀取 CSRF cookie
    const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];

    const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
            ...(options.headers || {}),
        },
        ...options,
    });
    // ... rest unchanged
}
```

**Step 3: 建立 src/api/admin.ts**

```typescript
import type {
    AdminUser, CreateUserRequest, CreateUserResponse,
    AuditLogEntry, AuditLogFilters, PaginatedResponse, UserSession
} from '../types/auth';
import { useAuthStore } from '../stores/authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = useAuthStore.getState().accessToken;
    const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];

    const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
            ...(options.headers || {}),
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

export const fetchUsers = () => adminFetch<AdminUser[]>('/admin/users');
export const createUser = (data: CreateUserRequest) =>
    adminFetch<CreateUserResponse>('/admin/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id: string, data: Partial<AdminUser>) =>
    adminFetch<AdminUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const resetPassword = (id: string) =>
    adminFetch<{ temporaryPassword: string }>(`/admin/users/${id}/reset-password`, { method: 'POST' });
export const unlockUser = (id: string) =>
    adminFetch<AdminUser>(`/admin/users/${id}/unlock`, { method: 'POST' });
export const disableUser = (id: string) =>
    adminFetch<void>(`/admin/users/${id}`, { method: 'DELETE' });
export const fetchUserSessions = (id: string) =>
    adminFetch<UserSession[]>(`/admin/users/${id}/sessions`);
export const revokeUserSessions = (id: string) =>
    adminFetch<void>(`/admin/users/${id}/sessions`, { method: 'DELETE' });
export const fetchAuditLogs = (filters: AuditLogFilters) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.action) params.set('action', filters.action);
    if (filters.userId) params.set('userId', filters.userId);
    return adminFetch<PaginatedResponse<AuditLogEntry>>(`/admin/audit-logs?${params}`);
};
```

**Step 4: 建立 src/stores/adminStore.ts**

Zustand store，包含 users CRUD、audit logs、sessions 管理的所有 action。遵循現有 store 模式（state + async actions）。

**Step 5: Commit**

```bash
git add src/types/auth.ts src/api/auth.ts src/api/admin.ts src/stores/adminStore.ts
git commit -m "feat(auth): add frontend types, API clients, and admin store"
```

---

## Task 9: 更新 authStore — mustChangePassword + CSRF

**Files:**
- Modify: `src/stores/authStore.ts`

**Step 1: 更新 login action**

在 `login` success handler 中：
- 儲存 `mustChangePassword` flag
- 儲存 `csrfToken`（從 response.csrfToken）到 state（雖然 cookie 也有，但 store 中有一份方便判斷）

**Step 2: 新增 changePassword action**

```typescript
changePassword: async (oldPassword: string, newPassword: string) => {
    await authApi.changePassword(oldPassword, newPassword);
    set({ user: get().user ? { ...get().user!, mustChangePassword: false } : null });
},
```

**Step 3: Commit**

```bash
git add src/stores/authStore.ts
git commit -m "feat(auth): update authStore with mustChangePassword and changePassword"
```

---

## Task 10: ChangePasswordPage + ProtectedRoute 攔截

**Files:**
- Create: `src/pages/ChangePasswordPage.tsx`
- Modify: `src/components/auth/ProtectedRoute.tsx`
- Modify: `src/routes/AppRoutes.tsx`

**Step 1: 建立 ChangePasswordPage.tsx**

表單含：舊密碼、新密碼、確認密碼、密碼強度即時提示（4 個 checklist item：長度/大寫/小寫/數字），提交呼叫 `authStore.changePassword()`，成功後 `navigate` 回 `location.state?.from || '/'`。

**Step 2: 修改 ProtectedRoute.tsx**

在認證通過後、角色檢查前，加入 mustChangePassword 攔截：

```typescript
// 在 "Redirect to login if not authenticated" 之後加入：
if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" state={{ from: location }} replace />;
}
```

同時將 `useAuth()` 改為 `useAuthStore`。

**Step 3: 修改 AppRoutes.tsx**

新增 lazy import + route：

```typescript
const ChangePasswordPage = React.lazy(() => import('../pages/ChangePasswordPage'));

// 在 router config 中加入（login 同級，不需 ProtectedRoute）：
{ path: '/change-password', element: <ChangePasswordPage /> }
```

**Step 4: Commit**

```bash
git add src/pages/ChangePasswordPage.tsx src/components/auth/ProtectedRoute.tsx src/routes/AppRoutes.tsx
git commit -m "feat(auth): add ChangePasswordPage with forced password change flow"
```

---

## Task 11: 改寫 AdminUsersPage — Mock → 真實 API

**Files:**
- Modify: `src/pages/AdminUsersPage.tsx`

**Step 1: 替換資料來源**

- 移除 `MockUser` interface 和 `mockUsers` 陣列
- 移除 `useState<MockUser[]>(mockUsers)`
- 改用 `useAdminStore`：`users`, `fetchUsers`, `createUser`, `updateUser`, `resetPassword`, `unlockUser`, `disableUser`
- `useEffect` 中呼叫 `fetchUsers()`
- 替換 `useAuth()` → `useAuthStore`

**Step 2: 更新表格**

- 狀態欄：4 種 badge（active=綠、locked=橘、disabled=紅、pending_reset=黃）
- 新增「活躍 Sessions」數量欄
- 操作改為 dropdown menu（編輯/重設密碼/解鎖/查看 Sessions/踢出/停用）

**Step 3: 更新新增帳號 modal**

- 移除密碼輸入欄
- 新增成功後顯示臨時密碼（含複製按鈕）的提示區塊

**Step 4: 新增篩選**

搜尋旁加角色下拉（全部/管理員/工程師/審查委員）和狀態下拉（全部/啟用/鎖定/停用）。

**Step 5: Commit**

```bash
git add src/pages/AdminUsersPage.tsx
git commit -m "feat(auth): rewrite AdminUsersPage from mock data to real API"
```

---

## Task 12: AdminSettingsPage — 安全性設定 + 稽核日誌

**Files:**
- Modify: `src/pages/AdminSettingsPage.tsx`

**Step 1: 更新安全性設定分區**

將 toggle/input 改為唯讀資訊顯示：

```
登入失敗鎖定：5 次失敗後鎖定 15 分鐘
密碼規則：最少 8 字元，需含大寫、小寫、數字
Session 上限：同帳號最多 3 個同時登入
Session 超時：工程師/管理員 8 小時，審查委員 1 小時
```

**Step 2: 新增稽核日誌分區**

在 `settingSections` 陣列中加入 `{ id: 'audit', title: '稽核日誌', description: '...' }`。

日誌分區內容：
- 日期區間 picker（兩個 `<input type="date">`）
- 事件類型下拉（全部 + 所有 AuditAction enum 值）
- 使用者下拉（從 `adminStore.users` 取）
- 分頁表格（每頁 50 筆）：時間、事件、使用者、IP、詳情
- 底部分頁控制

**Step 3: 替換 `useAuth()` → `useAuthStore`**

**Step 4: Commit**

```bash
git add src/pages/AdminSettingsPage.tsx
git commit -m "feat(auth): add audit log viewer and security info to AdminSettingsPage"
```

---

## Task 13: 清理 — 移除 AuthContext 依賴

**Files:**
- Modify: 所有引用 `useAuth()` 的 31 個檔案
- Delete: `src/contexts/AuthContext.tsx`（最後才刪）

**Step 1: 批次替換**

所有元件中的 `import { useAuth } from '../contexts/AuthContext'` 或類似路徑，改為 `import { useAuthStore } from '@/stores/authStore'`。

`useAuth()` 回傳的欄位與 `useAuthStore` 的欄位名稱一致（`user`, `isAuthenticated`, `isLoading`, `error`, `login`, `logout`, `hasRole`），大部分替換是直接的。

唯一差異：`useAuth()` 有 `isSessionExpiringSoon` boolean，`useAuthStore` 是 `isSessionExpiringSoon()` 方法。

**Step 2: 移除 AuthProvider**

`AppRoutes.tsx` 中的 `<AuthProvider>` 包裹可以移除，因為 Zustand store 不需要 Provider。

**Step 3: 刪除 AuthContext.tsx**

確認所有 import 都替換完成後刪除。

**Step 4: 型別檢查**

```bash
npx tsc --noEmit
```

Expected: 0 errors

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(auth): remove AuthContext, unify to useAuthStore"
```

---

## Task 14: CSRF Middleware 掛載 + 整合測試

**Files:**
- Modify: `server/index.ts` (mount CSRF middleware)

**Step 1: 掛載 CSRF middleware**

在 `server/index.ts` 中，**只對 `/api/admin` 和 `/api/auth/change-password` 掛載 CSRF**，不對 `/api/auth/login` 掛載（因為登入時還沒有 CSRF cookie）。

```typescript
import { verifyCsrf } from './middleware/csrf';

// 在 routes 之前
app.use('/api/admin', verifyCsrf);
```

`/api/auth/change-password` 的 CSRF 驗證已在路由層處理（auth.ts 內部）。

**Step 2: 全流程手動測試**

1. 用 seed admin 登入 → 拿到 accessToken + csrfToken
2. 被導向改密碼頁 → 改密碼成功
3. 進入 /admin → 看到使用者列表（只有 admin）
4. 新增工程師帳號 → 拿到臨時密碼
5. 用工程師帳號登入 → 被導向改密碼 → 改完進入主畫面
6. 用 admin 查看稽核日誌 → 看到以上所有事件

**Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat(auth): mount CSRF middleware on admin routes"
```

---

## Task 15: 移除舊 models + 清理

**Files:**
- Delete: `server/models/User.ts`
- Delete: `server/models/Session.ts`
- Delete: `server/models/Annotation.ts`
- Delete: `server/models/InviteLink.ts`
- Modify: 所有引用 `server/models/User.ts` 的檔案（改為 `@prisma/client`）

**Step 1: 搜尋所有引用**

```bash
grep -rn "from '../models/User'" server/
grep -rn "from '../models/Session'" server/
```

將 `import { UserRole } from '../models/User'` 全部改為 `import { UserRole } from '@prisma/client'`。
將 `import { SESSION_TIMEOUT } from '../models/Session'` 改為在 `auth.ts` 內定義常數（Task 6 已處理）。

**Step 2: 刪除 models 目錄**

```bash
rm server/models/User.ts server/models/Session.ts
rm server/models/Annotation.ts server/models/InviteLink.ts
```

Annotation 和 InviteLink 目前未被任何真實功能使用（spec 未實作），安全刪除。

**Step 3: 型別檢查**

```bash
cd server && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(auth): remove legacy in-memory models, use Prisma types"
```

---

## 完成後檢查清單

- [ ] `admin@llrwd.tw` 可登入，首次被強制改密碼
- [ ] 改密碼後可正常使用所有功能
- [ ] Admin 頁面可新增/編輯/停用/解鎖使用者
- [ ] 新增使用者顯示臨時密碼
- [ ] 連續 5 次登入失敗 → 帳號鎖定 15 分鐘
- [ ] 同帳號第 4 個 session 登入時，最舊的被踢掉
- [ ] 稽核日誌記錄所有認證事件
- [ ] Rate limit 正常運作（快速連續請求返回 429）
- [ ] CSRF protection 正常運作（缺少 token 返回 403）
- [ ] `npx tsc --noEmit` 前後端均 0 error
- [ ] 硬編碼 demo 帳號已全部移除
