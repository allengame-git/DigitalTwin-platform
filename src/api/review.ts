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
