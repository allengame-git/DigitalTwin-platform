# 審查作業系統 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立以會議為單位的審查作業系統，讓審查委員在 3D 場景中留下 pin 標記（含自動截圖）與討論串，結案後匯出 PDF 會議記錄。

**Architecture:** ReviewSession 掛在 Project 層級，ReviewMarker 透過 moduleId 關聯到各模組的 3D 場景。前端在模組 3D 頁面新增「審查模式」，Raycasting 取交點座標 + Canvas 截圖。後端用 pdfkit 產生 PDF。

**Tech Stack:** Prisma 7, Express 5, Zustand 5, React Three Fiber, @react-three/drei Html, pdfkit, multer

**Design Doc:** `docs/plans/2026-03-12-review-system-design.md`

---

## Dependency Graph

```
Phase 1 (parallel):  Task 1 (DB)  |  Task 2 (Types)  |  Task 3 (Store)
                         │                │                  │
Phase 2 (sequential):   Task 4 (Backend routes, depends on Task 1)
                         │
                        Task 5 (Register route + verify)
                         │
Phase 3 (parallel):  Task 6 (ReviewListPage)  |  Task 7 (ReviewDetailPage)  |  Task 8 (Routes + Dashboard)
                         │
Phase 4 (parallel):  Task 9 (ReviewModePanel)  |  Task 10 (MarkerPin 3D)  |  Task 11 (MarkerDetail)  |  Task 12 (Screenshot)
                         │
Phase 5 (sequential): Task 13 (pdfkit backend)  →  Task 14 (PDF frontend)
```

---

## Phase 1: Foundation (3 tasks, parallel)

### Task 1: DB Schema — Prisma Models

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add Review models to schema.prisma**

在 `schema.prisma` 末尾（`Module` model 之後）加入以下 4 個 model + 3 個 enum：

```prisma
// ============================================
// Review System
// ============================================

enum ReviewStatus {
  draft
  active
  concluded
}

enum MarkerStatus {
  open
  in_progress
  resolved
}

enum MarkerPriority {
  low
  medium
  high
}

model ReviewSession {
  id           String       @id @default(uuid())
  projectId    String
  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title        String
  description  String?
  status       ReviewStatus @default(draft)
  conclusion   String?
  scheduledAt  DateTime?
  concludedAt  DateTime?
  pdfUrl       String?
  createdBy    String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  markers      ReviewMarker[]
  participants ReviewParticipant[]

  @@index([projectId])
  @@map("review_sessions")
}

model ReviewParticipant {
  id        String        @id @default(uuid())
  sessionId String
  session   ReviewSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      String        @default("participant")
  joinedAt  DateTime      @default(now())

  @@unique([sessionId, userId])
  @@map("review_participants")
}

model ReviewMarker {
  id              String         @id @default(uuid())
  sessionId       String
  session         ReviewSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  moduleId        String
  module          Module         @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  title           String
  description     String?
  status          MarkerStatus   @default(open)
  priority        MarkerPriority @default(medium)
  positionX       Float
  positionY       Float
  positionZ       Float
  cameraPositionX Float
  cameraPositionY Float
  cameraPositionZ Float
  cameraTargetX   Float
  cameraTargetY   Float
  cameraTargetZ   Float
  screenshotUrl   String?
  createdBy       String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  comments ReviewComment[]

  @@index([sessionId])
  @@index([moduleId])
  @@map("review_markers")
}

model ReviewComment {
  id        String       @id @default(uuid())
  markerId  String
  marker    ReviewMarker @relation(fields: [markerId], references: [id], onDelete: Cascade)
  content   String
  createdBy String
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@index([markerId])
  @@map("review_comments")
}
```

**Step 2: Add relation fields to existing models**

在 `Project` model 加：
```prisma
reviewSessions ReviewSession[]
```

在 `Module` model 加：
```prisma
reviewMarkers ReviewMarker[]
```

在 `User` model 加：
```prisma
reviewParticipations ReviewParticipant[]
```

**Step 3: Push to DB and regenerate**

```bash
cd server && npx prisma db push && npx prisma generate
```

**Step 4: Verify**

```bash
cd server && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(db): add ReviewSession/Marker/Comment/Participant schema"
```

---

### Task 2: Frontend TypeScript Types + API Client

**Files:**
- Create: `src/types/review.ts`
- Create: `src/api/review.ts`

**Step 1: Create types**

```typescript
// src/types/review.ts

export type ReviewStatus = 'draft' | 'active' | 'concluded';
export type MarkerStatus = 'open' | 'in_progress' | 'resolved';
export type MarkerPriority = 'low' | 'medium' | 'high';

export interface ReviewSession {
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    status: ReviewStatus;
    conclusion: string | null;
    scheduledAt: string | null;
    concludedAt: string | null;
    pdfUrl: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    markers?: ReviewMarker[];
    participants?: ReviewParticipant[];
    _count?: { markers: number };
}

export interface ReviewParticipant {
    id: string;
    sessionId: string;
    userId: string;
    role: string;
    joinedAt: string;
    user?: { id: string; name: string; email: string };
}

export interface ReviewMarker {
    id: string;
    sessionId: string;
    moduleId: string;
    title: string;
    description: string | null;
    status: MarkerStatus;
    priority: MarkerPriority;
    positionX: number;
    positionY: number;
    positionZ: number;
    cameraPositionX: number;
    cameraPositionY: number;
    cameraPositionZ: number;
    cameraTargetX: number;
    cameraTargetY: number;
    cameraTargetZ: number;
    screenshotUrl: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    comments?: ReviewComment[];
    module?: { id: string; type: string; name: string };
}

export interface ReviewComment {
    id: string;
    markerId: string;
    content: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    user?: { id: string; name: string };
}

export interface MarkerStats {
    open: number;
    in_progress: number;
    resolved: number;
    total: number;
}

export interface ReviewSessionWithStats extends ReviewSession {
    markerStats?: MarkerStats;
    participantNames?: string[];
}

// DTOs
export interface CreateSessionDTO {
    projectId: string;
    title: string;
    description?: string;
    scheduledAt?: string;
}

export interface UpdateSessionDTO {
    title?: string;
    description?: string;
    status?: ReviewStatus;
    conclusion?: string;
}

export interface CreateMarkerDTO {
    moduleId: string;
    title: string;
    description?: string;
    priority?: MarkerPriority;
    positionX: number;
    positionY: number;
    positionZ: number;
    cameraPositionX: number;
    cameraPositionY: number;
    cameraPositionZ: number;
    cameraTargetX: number;
    cameraTargetY: number;
    cameraTargetZ: number;
}

export interface UpdateMarkerDTO {
    title?: string;
    description?: string;
    status?: MarkerStatus;
    priority?: MarkerPriority;
}
```

**Step 2: Create API client**

```typescript
// src/api/review.ts

import { useAuthStore } from '../stores/authStore';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/review`;

function authHeaders(): Record<string, string> {
    const token = useAuthStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// === Session ===

export async function fetchSessions(projectId: string) {
    const res = await fetch(`${API_BASE}?projectId=${projectId}`, {
        headers: authHeaders(),
    });
    return res.json();
}

export async function fetchSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/${sessionId}`, {
        headers: authHeaders(),
    });
    return res.json();
}

export async function createSession(data: {
    projectId: string;
    title: string;
    description?: string;
    scheduledAt?: string;
}) {
    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateSession(
    sessionId: string,
    data: { title?: string; description?: string; status?: string; conclusion?: string }
) {
    const res = await fetch(`${API_BASE}/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/${sessionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    return res.json();
}

// === Markers ===

export async function fetchMarkers(sessionId: string) {
    const res = await fetch(`${API_BASE}/${sessionId}/markers`, {
        headers: authHeaders(),
    });
    return res.json();
}

export async function createMarker(
    sessionId: string,
    data: FormData // multipart: screenshot file + JSON fields
) {
    const res = await fetch(`${API_BASE}/${sessionId}/markers`, {
        method: 'POST',
        headers: { ...authHeaders() }, // no Content-Type for FormData
        body: data,
    });
    return res.json();
}

export async function updateMarker(
    markerId: string,
    data: { title?: string; description?: string; status?: string; priority?: string }
) {
    const res = await fetch(`${API_BASE}/markers/${markerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteMarker(markerId: string) {
    const res = await fetch(`${API_BASE}/markers/${markerId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    return res.json();
}

// === Comments ===

export async function createComment(markerId: string, content: string) {
    const res = await fetch(`${API_BASE}/markers/${markerId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content }),
    });
    return res.json();
}

export async function updateComment(commentId: string, content: string) {
    const res = await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content }),
    });
    return res.json();
}

export async function deleteComment(commentId: string) {
    const res = await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    return res.json();
}

// === Participants ===

export async function addParticipant(sessionId: string, userId: string, role?: string) {
    const res = await fetch(`${API_BASE}/${sessionId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ userId, role }),
    });
    return res.json();
}

export async function removeParticipant(sessionId: string, userId: string) {
    const res = await fetch(`${API_BASE}/${sessionId}/participants/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    return res.json();
}

// === PDF ===

export async function exportPdf(sessionId: string) {
    const res = await fetch(`${API_BASE}/${sessionId}/export-pdf`, {
        method: 'POST',
        headers: authHeaders(),
    });
    return res.json();
}

export function getPdfDownloadUrl(sessionId: string) {
    return `${API_BASE}/${sessionId}/pdf`;
}
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/types/review.ts src/api/review.ts
git commit -m "feat: add review system TypeScript types and API client"
```

---

### Task 3: Zustand Store — reviewStore

**Files:**
- Create: `src/stores/reviewStore.ts`

**Step 1: Create store**

```typescript
// src/stores/reviewStore.ts
/**
 * Review Store
 * @module stores/reviewStore
 *
 * 審查作業狀態管理
 */

import { create } from 'zustand';
import * as reviewApi from '../api/review';
import type {
    ReviewSession,
    ReviewMarker,
    ReviewComment,
    ReviewSessionWithStats,
    MarkerStats,
    CreateSessionDTO,
    UpdateSessionDTO,
    CreateMarkerDTO,
    UpdateMarkerDTO,
} from '../types/review';

interface ReviewStore {
    // State
    sessions: ReviewSessionWithStats[];
    currentSession: ReviewSession | null;
    markers: ReviewMarker[];
    loading: boolean;
    error: string | null;

    // Review mode state (for 3D scene integration)
    reviewMode: boolean;
    activeSessionId: string | null;
    selectedMarkerId: string | null;

    // Session actions
    fetchSessions: (projectId: string) => Promise<void>;
    fetchSession: (sessionId: string) => Promise<void>;
    createSession: (data: CreateSessionDTO) => Promise<ReviewSession | null>;
    updateSession: (sessionId: string, data: UpdateSessionDTO) => Promise<ReviewSession | null>;
    deleteSession: (sessionId: string) => Promise<boolean>;

    // Marker actions
    fetchMarkers: (sessionId: string) => Promise<void>;
    createMarker: (sessionId: string, data: CreateMarkerDTO, screenshot?: Blob) => Promise<ReviewMarker | null>;
    updateMarker: (markerId: string, data: UpdateMarkerDTO) => Promise<ReviewMarker | null>;
    deleteMarker: (markerId: string) => Promise<boolean>;

    // Comment actions
    addComment: (markerId: string, content: string) => Promise<ReviewComment | null>;
    updateComment: (commentId: string, content: string) => Promise<ReviewComment | null>;
    deleteComment: (commentId: string, markerId: string) => Promise<boolean>;

    // Participant actions
    addParticipant: (sessionId: string, userId: string, role?: string) => Promise<boolean>;
    removeParticipant: (sessionId: string, userId: string) => Promise<boolean>;

    // PDF
    exportPdf: (sessionId: string) => Promise<string | null>;

    // Review mode actions
    enterReviewMode: (sessionId: string) => void;
    exitReviewMode: () => void;
    selectMarker: (markerId: string | null) => void;
}

export const useReviewStore = create<ReviewStore>()((set, get) => ({
    // Initial state
    sessions: [],
    currentSession: null,
    markers: [],
    loading: false,
    error: null,
    reviewMode: false,
    activeSessionId: null,
    selectedMarkerId: null,

    // === Session actions ===

    fetchSessions: async (projectId) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.fetchSessions(projectId);
            if (data.success) {
                set({ sessions: data.data, loading: false });
            } else {
                set({ error: data.error, loading: false });
            }
        } catch {
            set({ error: '無法載入審查作業', loading: false });
        }
    },

    fetchSession: async (sessionId) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.fetchSession(sessionId);
            if (data.success) {
                set({
                    currentSession: data.data,
                    markers: data.data.markers || [],
                    loading: false,
                });
            } else {
                set({ error: data.error, loading: false });
            }
        } catch {
            set({ error: '無法載入審查詳情', loading: false });
        }
    },

    createSession: async (dto) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.createSession(dto);
            if (data.success) {
                set((s) => ({
                    sessions: [...s.sessions, data.data],
                    loading: false,
                }));
                return data.data;
            } else {
                set({ error: data.error, loading: false });
                return null;
            }
        } catch {
            set({ error: '無法建立審查作業', loading: false });
            return null;
        }
    },

    updateSession: async (sessionId, dto) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.updateSession(sessionId, dto);
            if (data.success) {
                set((s) => ({
                    sessions: s.sessions.map((ss) =>
                        ss.id === sessionId ? { ...ss, ...data.data } : ss
                    ),
                    currentSession:
                        s.currentSession?.id === sessionId
                            ? { ...s.currentSession, ...data.data }
                            : s.currentSession,
                    loading: false,
                }));
                return data.data;
            } else {
                set({ error: data.error, loading: false });
                return null;
            }
        } catch {
            set({ error: '無法更新審查作業', loading: false });
            return null;
        }
    },

    deleteSession: async (sessionId) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.deleteSession(sessionId);
            if (data.success) {
                set((s) => ({
                    sessions: s.sessions.filter((ss) => ss.id !== sessionId),
                    currentSession:
                        s.currentSession?.id === sessionId ? null : s.currentSession,
                    loading: false,
                }));
                return true;
            } else {
                set({ error: data.error, loading: false });
                return false;
            }
        } catch {
            set({ error: '無法刪除審查作業', loading: false });
            return false;
        }
    },

    // === Marker actions ===

    fetchMarkers: async (sessionId) => {
        try {
            const data = await reviewApi.fetchMarkers(sessionId);
            if (data.success) {
                set({ markers: data.data });
            }
        } catch {
            // silent
        }
    },

    createMarker: async (sessionId, dto, screenshot?) => {
        set({ loading: true, error: null });
        try {
            const formData = new FormData();
            Object.entries(dto).forEach(([key, value]) => {
                formData.append(key, String(value));
            });
            if (screenshot) {
                formData.append('screenshot', screenshot, 'screenshot.jpg');
            }
            const data = await reviewApi.createMarker(sessionId, formData);
            if (data.success) {
                set((s) => ({
                    markers: [...s.markers, data.data],
                    loading: false,
                }));
                return data.data;
            } else {
                set({ error: data.error, loading: false });
                return null;
            }
        } catch {
            set({ error: '無法建立標記', loading: false });
            return null;
        }
    },

    updateMarker: async (markerId, dto) => {
        try {
            const data = await reviewApi.updateMarker(markerId, dto);
            if (data.success) {
                set((s) => ({
                    markers: s.markers.map((m) =>
                        m.id === markerId ? { ...m, ...data.data } : m
                    ),
                }));
                return data.data;
            }
            return null;
        } catch {
            return null;
        }
    },

    deleteMarker: async (markerId) => {
        try {
            const data = await reviewApi.deleteMarker(markerId);
            if (data.success) {
                set((s) => ({
                    markers: s.markers.filter((m) => m.id !== markerId),
                    selectedMarkerId:
                        s.selectedMarkerId === markerId ? null : s.selectedMarkerId,
                }));
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    // === Comment actions ===

    addComment: async (markerId, content) => {
        try {
            const data = await reviewApi.createComment(markerId, content);
            if (data.success) {
                set((s) => ({
                    markers: s.markers.map((m) =>
                        m.id === markerId
                            ? { ...m, comments: [...(m.comments || []), data.data] }
                            : m
                    ),
                }));
                return data.data;
            }
            return null;
        } catch {
            return null;
        }
    },

    updateComment: async (commentId, content) => {
        try {
            const data = await reviewApi.updateComment(commentId, content);
            if (data.success) {
                set((s) => ({
                    markers: s.markers.map((m) => ({
                        ...m,
                        comments: m.comments?.map((c) =>
                            c.id === commentId ? { ...c, ...data.data } : c
                        ),
                    })),
                }));
                return data.data;
            }
            return null;
        } catch {
            return null;
        }
    },

    deleteComment: async (commentId, markerId) => {
        try {
            const data = await reviewApi.deleteComment(commentId);
            if (data.success) {
                set((s) => ({
                    markers: s.markers.map((m) =>
                        m.id === markerId
                            ? {
                                  ...m,
                                  comments: m.comments?.filter((c) => c.id !== commentId),
                              }
                            : m
                    ),
                }));
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    // === Participant actions ===

    addParticipant: async (sessionId, userId, role?) => {
        try {
            const data = await reviewApi.addParticipant(sessionId, userId, role);
            return data.success === true;
        } catch {
            return false;
        }
    },

    removeParticipant: async (sessionId, userId) => {
        try {
            const data = await reviewApi.removeParticipant(sessionId, userId);
            return data.success === true;
        } catch {
            return false;
        }
    },

    // === PDF ===

    exportPdf: async (sessionId) => {
        set({ loading: true, error: null });
        try {
            const data = await reviewApi.exportPdf(sessionId);
            if (data.success) {
                // Update session's pdfUrl
                set((s) => ({
                    sessions: s.sessions.map((ss) =>
                        ss.id === sessionId ? { ...ss, pdfUrl: data.data.pdfUrl } : ss
                    ),
                    currentSession:
                        s.currentSession?.id === sessionId
                            ? { ...s.currentSession, pdfUrl: data.data.pdfUrl }
                            : s.currentSession,
                    loading: false,
                }));
                return data.data.pdfUrl;
            } else {
                set({ error: data.error, loading: false });
                return null;
            }
        } catch {
            set({ error: '無法匯出 PDF', loading: false });
            return null;
        }
    },

    // === Review mode ===

    enterReviewMode: (sessionId) => {
        set({ reviewMode: true, activeSessionId: sessionId, selectedMarkerId: null });
        // Also fetch markers for this session
        get().fetchMarkers(sessionId);
    },

    exitReviewMode: () => {
        set({ reviewMode: false, activeSessionId: null, selectedMarkerId: null });
    },

    selectMarker: (markerId) => {
        set({ selectedMarkerId: markerId });
    },
}));

export default useReviewStore;
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/stores/reviewStore.ts
git commit -m "feat: add reviewStore for review session/marker/comment state management"
```

---

## Phase 2: Backend API (sequential, depends on Task 1)

### Task 4: Backend Review Routes

**Files:**
- Create: `server/routes/review.ts`

**Step 1: Create the full review route file**

```typescript
// server/routes/review.ts
import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// === Multer for screenshot uploads ===

const REVIEWS_DIR = path.join(__dirname, '..', 'uploads', 'reviews');

const screenshotStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        // Actual dir created per-request in route handler
        cb(null, REVIEWS_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `screenshot-${Date.now()}${ext}`);
    },
});

const screenshotUpload = multer({
    storage: screenshotStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ============================================
// Review Session CRUD
// ============================================

// GET /api/review?projectId=xxx — list sessions with marker stats
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const projectId = req.query['projectId'] as string;
        if (!projectId) {
            res.status(400).json({ success: false, error: 'projectId is required' });
            return;
        }

        const sessions = await prisma.reviewSession.findMany({
            where: { projectId },
            include: {
                participants: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
                _count: { select: { markers: true } },
                markers: {
                    select: { status: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Compute marker stats per session
        const data = sessions.map((s) => {
            const markerStats = {
                open: s.markers.filter((m) => m.status === 'open').length,
                in_progress: s.markers.filter((m) => m.status === 'in_progress').length,
                resolved: s.markers.filter((m) => m.status === 'resolved').length,
                total: s.markers.length,
            };
            const participantNames = s.participants.map((p) => p.user.name);
            const { markers: _markers, ...rest } = s;
            return { ...rest, markerStats, participantNames };
        });

        res.json({ success: true, data });
    } catch (err) {
        console.error('GET /api/review error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/review — create session
router.post('/', authorize('admin', 'engineer'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId, title, description, scheduledAt } = req.body;
        if (!projectId || !title) {
            res.status(400).json({ success: false, error: 'projectId and title are required' });
            return;
        }

        const session = await prisma.reviewSession.create({
            data: {
                projectId,
                title,
                description: description || null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                createdBy: req.user!.userId,
                participants: {
                    create: {
                        userId: req.user!.userId,
                        role: 'host',
                    },
                },
            },
            include: {
                participants: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
            },
        });

        res.status(201).json({ success: true, data: session });
    } catch (err) {
        console.error('POST /api/review error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/review/:id — get session detail with markers, comments, participants
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params.id as string;

        const session = await prisma.reviewSession.findUnique({
            where: { id },
            include: {
                participants: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
                markers: {
                    include: {
                        comments: {
                            orderBy: { createdAt: 'asc' },
                        },
                        module: { select: { id: true, type: true, name: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!session) {
            res.status(404).json({ success: false, error: 'Review session not found' });
            return;
        }

        // Resolve user names for markers and comments
        const userIds = new Set<string>();
        userIds.add(session.createdBy);
        session.markers.forEach((m) => {
            userIds.add(m.createdBy);
            m.comments.forEach((c) => userIds.add(c.createdBy));
        });

        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, name: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u.name]));

        // Attach user names
        const markersWithUsers = session.markers.map((m) => ({
            ...m,
            createdByName: userMap.get(m.createdBy) || 'Unknown',
            comments: m.comments.map((c) => ({
                ...c,
                createdByName: userMap.get(c.createdBy) || 'Unknown',
            })),
        }));

        res.json({
            success: true,
            data: {
                ...session,
                createdByName: userMap.get(session.createdBy) || 'Unknown',
                markers: markersWithUsers,
            },
        });
    } catch (err) {
        console.error('GET /api/review/:id error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/review/:id — update session
router.put('/:id', authorize('admin', 'engineer'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { title, description, status, conclusion } = req.body;

        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (conclusion !== undefined) updateData.conclusion = conclusion;
        if (status === 'concluded') updateData.concludedAt = new Date();

        const session = await prisma.reviewSession.update({
            where: { id },
            data: updateData,
        });

        res.json({ success: true, data: session });
    } catch (err) {
        console.error('PUT /api/review/:id error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/review/:id — delete session (admin only)
router.delete('/:id', authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params.id as string;

        // Delete associated files
        const screenshotDir = path.join(REVIEWS_DIR, id);
        if (fs.existsSync(screenshotDir)) {
            fs.rmSync(screenshotDir, { recursive: true });
        }

        await prisma.reviewSession.delete({ where: { id } });

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/review/:id error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// Review Markers
// ============================================

// GET /api/review/:sessionId/markers
router.get('/:sessionId/markers', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;

        const markers = await prisma.reviewMarker.findMany({
            where: { sessionId },
            include: {
                comments: { orderBy: { createdAt: 'asc' } },
                module: { select: { id: true, type: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ success: true, data: markers });
    } catch (err) {
        console.error('GET markers error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/review/:sessionId/markers — create marker with optional screenshot
router.post(
    '/:sessionId/markers',
    screenshotUpload.single('screenshot'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const sessionId = req.params.sessionId as string;
            const {
                moduleId, title, description, priority,
                positionX, positionY, positionZ,
                cameraPositionX, cameraPositionY, cameraPositionZ,
                cameraTargetX, cameraTargetY, cameraTargetZ,
            } = req.body;

            if (!moduleId || !title) {
                res.status(400).json({ success: false, error: 'moduleId and title are required' });
                return;
            }

            // Move screenshot to session-specific dir
            let screenshotUrl: string | null = null;
            if (req.file) {
                const sessionDir = path.join(REVIEWS_DIR, sessionId, 'screenshots');
                fs.mkdirSync(sessionDir, { recursive: true });
                const ext = path.extname(req.file.filename);
                const destFilename = `marker-${Date.now()}${ext}`;
                const destPath = path.join(sessionDir, destFilename);
                fs.renameSync(req.file.path, destPath);
                screenshotUrl = `/uploads/reviews/${sessionId}/screenshots/${destFilename}`;
            }

            const marker = await prisma.reviewMarker.create({
                data: {
                    sessionId,
                    moduleId,
                    title,
                    description: description || null,
                    priority: priority || 'medium',
                    positionX: parseFloat(positionX),
                    positionY: parseFloat(positionY),
                    positionZ: parseFloat(positionZ),
                    cameraPositionX: parseFloat(cameraPositionX),
                    cameraPositionY: parseFloat(cameraPositionY),
                    cameraPositionZ: parseFloat(cameraPositionZ),
                    cameraTargetX: parseFloat(cameraTargetX),
                    cameraTargetY: parseFloat(cameraTargetY),
                    cameraTargetZ: parseFloat(cameraTargetZ),
                    screenshotUrl,
                    createdBy: req.user!.userId,
                },
                include: {
                    module: { select: { id: true, type: true, name: true } },
                },
            });

            res.status(201).json({ success: true, data: marker });
        } catch (err) {
            console.error('POST marker error:', err);
            // Cleanup uploaded file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
);

// PUT /api/review/markers/:markerId
router.put('/markers/:markerId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const markerId = req.params.markerId as string;
        const { title, description, status, priority } = req.body;

        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;

        const marker = await prisma.reviewMarker.update({
            where: { id: markerId },
            data: updateData,
        });

        res.json({ success: true, data: marker });
    } catch (err) {
        console.error('PUT marker error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/review/markers/:markerId
router.delete('/markers/:markerId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const markerId = req.params.markerId as string;

        await prisma.reviewMarker.delete({ where: { id: markerId } });

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE marker error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// Review Comments
// ============================================

// POST /api/review/markers/:markerId/comments
router.post('/markers/:markerId/comments', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const markerId = req.params.markerId as string;
        const { content } = req.body;

        if (!content) {
            res.status(400).json({ success: false, error: 'content is required' });
            return;
        }

        const comment = await prisma.reviewComment.create({
            data: {
                markerId,
                content,
                createdBy: req.user!.userId,
            },
        });

        res.status(201).json({ success: true, data: comment });
    } catch (err) {
        console.error('POST comment error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/review/comments/:commentId
router.put('/comments/:commentId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const commentId = req.params.commentId as string;
        const { content } = req.body;

        const comment = await prisma.reviewComment.update({
            where: { id: commentId },
            data: { content },
        });

        res.json({ success: true, data: comment });
    } catch (err) {
        console.error('PUT comment error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/review/comments/:commentId
router.delete('/comments/:commentId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const commentId = req.params.commentId as string;

        await prisma.reviewComment.delete({ where: { id: commentId } });

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE comment error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// Participants
// ============================================

// POST /api/review/:sessionId/participants
router.post('/:sessionId/participants', authorize('admin', 'engineer'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;
        const { userId, role } = req.body;

        if (!userId) {
            res.status(400).json({ success: false, error: 'userId is required' });
            return;
        }

        const participant = await prisma.reviewParticipant.create({
            data: {
                sessionId,
                userId,
                role: role || 'participant',
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });

        res.status(201).json({ success: true, data: participant });
    } catch (err) {
        console.error('POST participant error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/review/:sessionId/participants/:userId
router.delete('/:sessionId/participants/:userId', authorize('admin', 'engineer'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;
        const userId = req.params.userId as string;

        await prisma.reviewParticipant.deleteMany({
            where: { sessionId, userId },
        });

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE participant error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// PDF Export (placeholder — Task 13 will implement pdfkit)
// ============================================

// POST /api/review/:sessionId/export-pdf
router.post('/:sessionId/export-pdf', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;

        // TODO: Task 13 will implement pdfkit generation here
        // For now, return a stub
        res.json({
            success: false,
            error: 'PDF export not yet implemented',
        });
    } catch (err) {
        console.error('POST export-pdf error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/review/:sessionId/pdf — download existing PDF
router.get('/:sessionId/pdf', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;

        const session = await prisma.reviewSession.findUnique({
            where: { id: sessionId },
            select: { pdfUrl: true, title: true },
        });

        if (!session?.pdfUrl) {
            res.status(404).json({ success: false, error: 'PDF not found' });
            return;
        }

        const filePath = path.join(__dirname, '..', session.pdfUrl);
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ success: false, error: 'PDF file not found' });
            return;
        }

        res.download(filePath, `${session.title}.pdf`);
    } catch (err) {
        console.error('GET pdf error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
```

**Step 2: Verify backend compiles**

```bash
cd server && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add server/routes/review.ts
git commit -m "feat: add review system backend routes (session/marker/comment/participant CRUD)"
```

---

### Task 5: Register Route + Create uploads dir + Verify

**Files:**
- Modify: `server/index.ts`

**Step 1: Register route in server/index.ts**

Add after existing route registrations:

```typescript
import reviewRoutes from './routes/review';
// ...
app.use('/api/review', reviewRoutes);
```

**Step 2: Create uploads directory**

```bash
mkdir -p server/uploads/reviews
```

**Step 3: Verify full backend compiles**

```bash
cd server && npx tsc --noEmit
```

**Step 4: Verify frontend compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add server/index.ts
git commit -m "feat: register /api/review routes in server index"
```

---

## Phase 3: Frontend Pages (3 tasks, parallel)

### Task 6: ReviewListPage

**Files:**
- Create: `src/pages/ReviewListPage.tsx`

**Step 1: Create ReviewListPage**

審查列表頁，顯示專案的所有審查作業。包含：
- 審查作業卡片列表（標題、日期、狀態、議題統計、參與者）
- 新增審查 Modal
- 狀態篩選（全部/進行中/已結案）
- 每張卡片的「檢視」「下載 PDF」按鈕

**UI Pattern：** 使用與 ProjectDashboardPage 相同的卡片式設計。狀態 badge 顏色：`draft` 灰色、`active` 藍色、`concluded` 綠色。議題統計用小圓點：紅 open、黃 in_progress、綠 resolved。

**Key imports:**
```typescript
import { useReviewStore } from '../stores/reviewStore';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, FileText, Download, ArrowLeft, Calendar, Users } from 'lucide-react';
```

**Route param:** `projectCode` from URL → 用 `projectStore` 找到 `project.id` → `fetchSessions(projectId)`。

**新增審查 Modal：** 表單欄位：標題（必填）、說明（選填）、預定時間（選填 datetime-local input）。提交後 `createSession()` → navigate 到 `/project/:code/reviews/:sessionId`。

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/pages/ReviewListPage.tsx
git commit -m "feat: add ReviewListPage for listing review sessions"
```

---

### Task 7: ReviewDetailPage

**Files:**
- Create: `src/pages/ReviewDetailPage.tsx`

**Step 1: Create ReviewDetailPage**

審查詳情頁，顯示單一審查作業的完整內容。包含：

**Header 區域：**
- 返回按鈕、標題（可編輯）、狀態 badge
- 操作按鈕：「編輯資訊」「結束審查」（status → concluded + conclusion textarea modal）「匯出 PDF」「下載 PDF」

**參與者區域：**
- 參與者頭像/名稱列表
- 新增參與者按鈕（搜尋使用者 modal）

**Markers 區域（依模組分群）：**
- 用 `moduleRegistry` 的 icon + 模組名稱作為分群標題
- 每個 marker 卡片：截圖縮圖、標題、狀態 badge、優先級、討論串數量
- 展開 marker → 顯示截圖大圖、說明、狀態切換、討論串（時間序列）、回覆輸入框
- 「前往 3D 場景」按鈕 → navigate 到模組頁面帶 query params

**統計摘要：**
- 底部或 header 旁顯示 open/in_progress/resolved 統計

**Key imports:**
```typescript
import { useReviewStore } from '../stores/reviewStore';
import { useParams, useNavigate } from 'react-router-dom';
import { getModuleTypeConfig } from '../config/moduleRegistry';
import { ArrowLeft, Edit, Check, Download, FileText, MapPin, MessageSquare, ExternalLink } from 'lucide-react';
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/pages/ReviewDetailPage.tsx
git commit -m "feat: add ReviewDetailPage for viewing review session details"
```

---

### Task 8: Routes + Dashboard Entry

**Files:**
- Modify: `src/routes/AppRoutes.tsx`
- Modify: `src/pages/ProjectDashboardPage.tsx`

**Step 1: Add routes in AppRoutes.tsx**

在 `project/:projectCode/module/:moduleId/data` 路由之後加：

```typescript
{
    path: '/project/:projectCode/reviews',
    element: (
        <ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']}>
            <ReviewListPage />
        </ProtectedRoute>
    ),
},
{
    path: '/project/:projectCode/reviews/:sessionId',
    element: (
        <ProtectedRoute allowedRoles={['admin', 'engineer', 'viewer']}>
            <ReviewDetailPage />
        </ProtectedRoute>
    ),
},
```

加 imports:
```typescript
import ReviewListPage from '../pages/ReviewListPage';
import ReviewDetailPage from '../pages/ReviewDetailPage';
```

**Step 2: Add Dashboard review section in ProjectDashboardPage.tsx**

在模組卡片區塊之後，新增「審查作業」區塊：

- 標題「審查作業」+ 「查看全部」連結 + 「新增審查」按鈕（admin/engineer only）
- 顯示最近 3 筆審查作業摘要卡片（狀態、標題、日期、議題統計）
- 無審查作業時顯示空狀態提示

**需要在 ProjectDashboardPage 的 useEffect 中加 `reviewStore.fetchSessions(project.id)`。**

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/routes/AppRoutes.tsx src/pages/ProjectDashboardPage.tsx
git commit -m "feat: add review routes and dashboard review section"
```

---

## Phase 4: 3D Review Mode (4 tasks, parallel)

### Task 9: ReviewModePanel

**Files:**
- Create: `src/components/review/ReviewModePanel.tsx`

**Step 1: Create ReviewModePanel**

審查模式側邊面板，嵌入在模組 3D 頁面的 sidebar 中。

**UI 結構：**
- 橘色主題 header「審查模式」
- Session 選擇器：dropdown 列出 project 的 active/draft sessions，或「新增審查作業」
- 當前 session 的 marker 列表（依模組分群，當前模組的標在上面）
- 每個 marker：狀態圓點 + 標題 + 優先級 badge
- 點擊 marker → `selectMarker(markerId)` + 飛相機到 marker 位置
- 跨模組 marker 顯示模組 icon + 名稱，點擊跳轉
- 底部按鈕：「結束審查模式」

**Props：**
```typescript
interface ReviewModePanelProps {
    projectId: string;
    moduleId: string;
    onFlyTo?: (position: [number, number, number], target: [number, number, number]) => void;
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/review/ReviewModePanel.tsx
git commit -m "feat: add ReviewModePanel for 3D scene sidebar integration"
```

---

### Task 10: ReviewMarkerPin (3D)

**Files:**
- Create: `src/components/review/ReviewMarkerPin.tsx`

**Step 1: Create ReviewMarkerPin**

R3F 元件，在 3D 場景中渲染 pin 標記。

**技術：**
- 使用 `@react-three/drei` 的 `<Html>` component 在世界座標渲染 HTML overlay
- Pin 圖示：圓形 div（24px），邊框 2px white，陰影
- 顏色依 `status`：`open` → `#ef4444`（紅）、`in_progress` → `#eab308`（黃）、`resolved` → `#22c55e`（綠）
- 底部三角形指標（CSS border trick）
- `distanceFactor={300}` 控制遠距縮放
- 點擊 pin → `reviewStore.selectMarker(marker.id)`
- Hover → 顯示 tooltip（標題 + 狀態）
- `occlude` 被遮擋時降低 opacity

**Props：**
```typescript
interface ReviewMarkerPinProps {
    marker: ReviewMarker;
    isSelected: boolean;
    onClick: () => void;
}
```

**渲染位置：** `<group position={[marker.positionX, marker.positionY, marker.positionZ]}>`

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/review/ReviewMarkerPin.tsx
git commit -m "feat: add ReviewMarkerPin 3D component with status-colored pins"
```

---

### Task 11: ReviewMarkerDetail

**Files:**
- Create: `src/components/review/ReviewMarkerDetail.tsx`

**Step 1: Create ReviewMarkerDetail**

右下角浮動面板，顯示選中 marker 的詳情和討論串。

**UI 結構：**
- 固定在右下角（position absolute, bottom: 16px, right: 16px, width: 380px, maxHeight: 500px）
- Header：標題 + 關閉按鈕 + 「前往 3D」按鈕（如果是其他模組的 marker）
- 截圖區：如果有 screenshotUrl，顯示可放大的縮圖
- 資訊區：狀態（可切換的 dropdown/button group）、優先級、建立者、時間
- 討論串：時間序列，每則顯示使用者名稱 + 時間 + 內容
- 底部輸入框 + 送出按鈕

**Props：**
```typescript
interface ReviewMarkerDetailProps {
    marker: ReviewMarker;
    onClose: () => void;
    onStatusChange: (status: MarkerStatus) => void;
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/review/ReviewMarkerDetail.tsx
git commit -m "feat: add ReviewMarkerDetail panel with discussion thread"
```

---

### Task 12: Screenshot Capture + Integrate Review Mode into Facility/Geology Pages

**Files:**
- Create: `src/hooks/useReviewScreenshot.ts`
- Modify: `src/components/review/ReviewMarkerForm.tsx` (create)
- Modify: `src/pages/GeologyPage.tsx`
- Modify: `src/components/facility/FacilityPage.tsx` (or wherever FacilityPage is)

**Step 1: Create useReviewScreenshot hook**

```typescript
// src/hooks/useReviewScreenshot.ts
import { useCallback } from 'react';

/**
 * Hook to capture screenshot from a Canvas element.
 * Works with both geology (standard Canvas) and facility (FacilityCaptureHandler).
 */
export function useReviewScreenshot(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const capture = useCallback((): Blob | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        // Create a smaller version (max 1280px width)
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / canvas.width);

        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width * scale;
        offscreen.height = canvas.height * scale;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);

        // Convert to blob synchronously via dataURL
        const dataUrl = offscreen.toDataURL('image/jpeg', 0.8);
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    }, [canvasRef]);

    return { capture };
}
```

**Step 2: Create ReviewMarkerForm (modal)**

```typescript
// src/components/review/ReviewMarkerForm.tsx
```

Modal 表單，新增標記時彈出：
- 標題（必填 text input）
- 說明（選填 textarea）
- 優先級（radio buttons: low/medium/high，預設 medium）
- 截圖預覽（從 capture 取得的 blob 轉 objectURL）
- 提交 / 取消按鈕

提交時呼叫 `reviewStore.createMarker(sessionId, dto, screenshotBlob)`。

**Step 3: Integrate into GeologyPage and FacilityPage**

在 sidebar 底部（現有的「編輯模式」按鈕旁邊）新增「審查模式」按鈕（橘色主題）。

審查模式啟用時：
- 顯示 `<ReviewModePanel>` 在 sidebar 中
- 在 Canvas 內渲染 `<ReviewMarkerPin>` for each marker in current module
- 點擊 3D 場景（onPointerDown + Raycasting）→ 取得交點座標 → capture screenshot → 開啟 ReviewMarkerForm
- 選中 marker 時顯示 `<ReviewMarkerDetail>` 面板

**注意：**
- Geology Canvas 的 ref 要暴露出來（目前 `GeologyCanvas.tsx` 用 `<Canvas>`）
- Facility 已有 `facilityCanvasEl` module-level variable
- 審查模式下 Raycasting 點擊要攔截（不觸發其他功能如鑽孔選取）

**Step 4: Verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/hooks/useReviewScreenshot.ts src/components/review/ReviewMarkerForm.tsx src/pages/GeologyPage.tsx src/components/facility/FacilityPage.tsx
git commit -m "feat: integrate review mode into geology and facility 3D pages with screenshot capture"
```

---

## Phase 5: PDF Export (sequential)

### Task 13: Backend PDF Generation with pdfkit

**Files:**
- Modify: `server/routes/review.ts` (replace export-pdf stub)

**Step 1: Install pdfkit**

```bash
cd server && npm install pdfkit @types/pdfkit
```

**Step 2: Implement PDF generation in review.ts**

Replace the `POST /:sessionId/export-pdf` stub with actual implementation.

**PDF 結構：**
1. **封面頁**：標題、日期、狀態、參與者
2. **結論**（如果有）
3. **依模組分章節**：每個 marker 包含截圖嵌入、標題、座標、優先級、狀態、討論串
4. **尾頁**：議題統計、產生時間

**Key implementation notes：**
- 使用中文字體：pdfkit 預設無中文，需要嵌入字體檔。**建議用系統字體路徑**：macOS `/System/Library/Fonts/PingFang.ttc`，或下載 Noto Sans CJK 放在 `server/fonts/`。
- 截圖嵌入：`doc.image(screenshotPath, { width: 400 })`
- 座標轉 TWD97 顯示：positionX → X(East)、positionZ → Y(North)（因為 Three.js Z = TWD97 North）
- 存檔路徑：`server/uploads/reviews/{sessionId}/report.pdf`
- 更新 `ReviewSession.pdfUrl`

**字體選擇（實作時決定）：**
- 方案 A：用系統 PingFang（macOS only，開發用）
- 方案 B：下載 NotoSansCJK-Regular.ttf 到 `server/fonts/`（通用）
- 推薦方案 B，因為 production 可能不是 macOS

**Step 3: Verify**

```bash
cd server && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add server/routes/review.ts server/package.json server/package-lock.json
git commit -m "feat: implement PDF export with pdfkit for review sessions"
```

---

### Task 14: Frontend PDF Export UI

**Files:**
- Create: `src/components/review/ReviewExportButton.tsx`
- Modify: `src/pages/ReviewDetailPage.tsx` (add export button)
- Modify: `src/pages/ReviewListPage.tsx` (add download button on cards)

**Step 1: Create ReviewExportButton**

按鈕元件，處理 PDF 匯出和下載：
- 點擊「匯出 PDF」→ `reviewStore.exportPdf(sessionId)` → loading spinner
- 成功後自動開始下載（`window.open(pdfUrl)` 或 `<a download>`）
- 如果已有 pdfUrl → 顯示「下載 PDF」按鈕（直接下載）+ 「重新產生」按鈕

**Step 2: Integrate into pages**

- `ReviewDetailPage`：header 區域加 `<ReviewExportButton>`
- `ReviewListPage`：已結案的卡片上加下載按鈕

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/review/ReviewExportButton.tsx src/pages/ReviewDetailPage.tsx src/pages/ReviewListPage.tsx
git commit -m "feat: add PDF export and download UI for review sessions"
```

---

## Summary

| Phase | Tasks | Parallel? | 預估 |
|-------|-------|-----------|------|
| 1. Foundation | Task 1 (DB), Task 2 (Types), Task 3 (Store) | Yes, 3 parallel | |
| 2. Backend | Task 4 (Routes), Task 5 (Register) | Sequential | |
| 3. Pages | Task 6 (List), Task 7 (Detail), Task 8 (Routes+Dashboard) | Yes, 3 parallel | |
| 4. 3D Mode | Task 9 (Panel), Task 10 (Pin), Task 11 (Detail), Task 12 (Integration) | Yes, 4 parallel | |
| 5. PDF | Task 13 (Backend), Task 14 (Frontend) | Sequential | |

**Total: 14 tasks, 5 phases**
