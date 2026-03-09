import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const ChangePasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const changePassword = useAuthStore(state => state.changePassword);
    const user = useAuthStore(state => state.user);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const checks = {
        length: newPassword.length >= 8,
        upper: /[A-Z]/.test(newPassword),
        lower: /[a-z]/.test(newPassword),
        digit: /[0-9]/.test(newPassword),
    };
    const allValid = checks.length && checks.upper && checks.lower && checks.digit;
    const passwordMatch = newPassword === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!allValid || !passwordMatch) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await changePassword(oldPassword, newPassword);
            const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : '密碼變更失敗');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
        }}>
            <div style={{
                width: 420,
                background: '#fff',
                borderRadius: 8,
                padding: 32,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
                <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>
                    變更密碼
                </h2>
                <p style={{ margin: '0 0 24px', color: '#666', fontSize: 14 }}>
                    {user?.mustChangePassword
                        ? '首次登入需要變更密碼才能繼續使用系統。'
                        : '請輸入舊密碼和新密碼。'}
                </p>

                {error && (
                    <div style={{
                        padding: '8px 12px',
                        marginBottom: 16,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 4,
                        color: '#dc2626',
                        fontSize: 14,
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                            舊密碼
                        </label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={e => setOldPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: 4,
                                fontSize: 14,
                                boxSizing: 'border-box',
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                            新密碼
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: 4,
                                fontSize: 14,
                                boxSizing: 'border-box',
                            }}
                            required
                        />
                    </div>

                    {/* Password strength checklist */}
                    <div style={{ marginBottom: 16, fontSize: 13 }}>
                        {[
                            { key: 'length', label: '至少 8 個字元', ok: checks.length },
                            { key: 'upper', label: '包含大寫字母', ok: checks.upper },
                            { key: 'lower', label: '包含小寫字母', ok: checks.lower },
                            { key: 'digit', label: '包含數字', ok: checks.digit },
                        ].map(item => (
                            <div key={item.key} style={{
                                color: newPassword.length === 0 ? '#999' : item.ok ? '#16a34a' : '#dc2626',
                                marginBottom: 2,
                            }}>
                                {newPassword.length === 0 ? '○' : item.ok ? '●' : '○'} {item.label}
                            </div>
                        ))}
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                            確認新密碼
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: `1px solid ${confirmPassword.length > 0 && !passwordMatch ? '#dc2626' : '#d1d5db'}`,
                                borderRadius: 4,
                                fontSize: 14,
                                boxSizing: 'border-box',
                            }}
                            required
                        />
                        {confirmPassword.length > 0 && !passwordMatch && (
                            <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                                密碼不一致
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !allValid || !passwordMatch}
                        style={{
                            width: '100%',
                            padding: '10px 0',
                            background: isSubmitting || !allValid || !passwordMatch ? '#9ca3af' : '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: isSubmitting || !allValid || !passwordMatch ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isSubmitting ? '變更中...' : '確認變更'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
