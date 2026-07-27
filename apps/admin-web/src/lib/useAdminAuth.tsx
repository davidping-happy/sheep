'use client';

import { useCallback, useState } from 'react';
import { apiFetch, ApiError } from './api';

interface LoginResult {
  accessToken: string;
}

/**
 * 後台登入狀態（記憶體持有 token，不寫入 localStorage，降低 XSS 風險）。
 * 各管理頁共用同一套登入表單與帳號設定。
 */
export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@church.local');
  const [password, setPassword] = useState('ChangeMe123456');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const login = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setLoginError('');
      setLoggingIn(true);
      try {
        const res = await apiFetch<LoginResult>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setToken(res.accessToken);
      } catch (err) {
        setLoginError(
          err instanceof ApiError
            ? err.message
            : '登入失敗，請確認 API 是否運行於 :3000',
        );
      } finally {
        setLoggingIn(false);
      }
    },
    [email, password],
  );

  const logout = useCallback(() => setToken(null), []);

  return { token, email, setEmail, password, setPassword, loginError, loggingIn, login, logout };
}

export function AdminLoginForm({ title, hint, auth }: { title: string; hint: string; auth: ReturnType<typeof useAdminAuth>; }) {
  return (
    <div>
      <h2>{title}</h2>
      <p className="muted">{hint}</p>
      <form className="card" style={{ maxWidth: 360 }} onSubmit={(e) => auth.login(e)}>
        <h3>登入</h3>
        <label style={labelStyle}>Email</label>
        <input style={inputStyle} value={auth.email} onChange={(e) => auth.setEmail(e.target.value)} type="email" autoComplete="username" />
        <label style={labelStyle}>密碼</label>
        <input style={inputStyle} value={auth.password} onChange={(e) => auth.setPassword(e.target.value)} type="password" autoComplete="current-password" />
        {auth.loginError ? (<p style={{ color: "#dc2626", fontSize: 13 }}>{auth.loginError}</p>) : null}
        <button style={primaryBtn} type="submit" disabled={auth.loggingIn}>
          {auth.loggingIn ? '登入中…' : '登入'}
        </button>
        <p className="muted" style={{ marginTop: 8 }}>
          種子帳號：admin@church.local / ChangeMe123456
        </p>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: '#6b7280', margin: '10px 0 4px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 };
const primaryBtn: React.CSSProperties = { marginTop: 16, width: '100%', padding: '10px', background: '#c46b4a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 };
