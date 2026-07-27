'use client';

import { useCallback, useState } from 'react';
import { apiFetch, ApiError } from './api';

interface LoginResult {
  accessToken: string;
}

/**
 * å¾Œå°?»å…¥?€?‹ï?è¨˜æ†¶é«”æ???tokenï¼Œä?å¯?localStorageï¼Œé?ä½?XSS é¢¨éšªï¼‰ã€?
 * ?„å??½é??±ç”¨?Œä?å¥—ç™»?¥è¡¨?®è?å¸³å??è¨­?¼ã€?
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
            : '?»å…¥å¤±æ?ï¼Œè?ç¢ºè? API ?¯å¦?Ÿå???:3000',
        );
      } finally {
        setLoggingIn(false);
      }
    },
    [email, password],
  );

  const logout = useCallback(() => setToken(null), []);

  return {
    token,
    email,
    setEmail,
    password,
    setPassword,
    loginError,
    loggingIn,
    login,
    logout,
  };
}

export function AdminLoginForm({
  title,
  hint,
  auth,
}: {
  title: string;
  hint: string;
  auth: ReturnType<typeof useAdminAuth>;
}) {
  return (
    <div>
      <h2>{title}</h2>
      <p className="muted">{hint}</p>
      <form
        className="card"
        style={{ maxWidth: 360 }}
        onSubmit={(e) => auth.login(e)}
      >
        <h3>?»å…¥</h3>
        <label style={labelStyle}>Email</label>
        <input
          style={inputStyle}
          value={auth.email}
          onChange={(e) => auth.setEmail(e.target.value)}
          type="email"
          autoComplete="username"
        />
        <label style={labelStyle}>å¯†ç¢¼</label>
        <input
          style={inputStyle}
          value={auth.password}
          onChange={(e) => auth.setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
        />
        {auth.loginError ? (
          <p style={{ color: '#dc2626', fontSize: 13 }}>{auth.loginError}</p>
        ) : null}
        <button style={primaryBtn} type="submit" disabled={auth.loggingIn}>
          {auth.loggingIn ? '?»å…¥ä¸­â€? : '?»å…¥'}
        </button>
        <p className="muted" style={{ marginTop: 8 }}>
          ç¨®å?å¸³è?ï¼šadmin@church.local / ChangeMe123456
        </p>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#6b7280',
  margin: '10px 0 4px',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
};
const primaryBtn: React.CSSProperties = {
  marginTop: 16,
  width: '100%',
  padding: '10px',
  background: '#c46b4a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
};
