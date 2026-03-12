/**
 * ReviewDetailPage
 * @module pages/ReviewDetailPage
 *
 * 審查作業詳細頁面 — placeholder, 待 Task 7 實作
 */

import React from 'react';
import { useParams, Link } from 'react-router-dom';

const ReviewDetailPage: React.FC = () => {
    const { projectCode, sessionId } = useParams<{ projectCode: string; sessionId: string }>();

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
            <Link
                to={`/project/${projectCode}/reviews`}
                style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}
            >
                ← 返回審查列表
            </Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 16 }}>
                審查作業詳情
            </h1>
            <p style={{ color: '#64748b', marginTop: 8 }}>
                Session ID: {sessionId}
            </p>
            <p style={{ color: '#94a3b8', marginTop: 16 }}>待實作</p>
        </div>
    );
};

export default ReviewDetailPage;
