'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';

interface PrayerItem {
  id: string;
  content: string;
  visibility: string;
  moderationStatus: string;
  sensitiveCategory: string;
  escalated: boolean;
  reportCount: number;
  isAnonymous: boolean;
  createdAt: string;
}

interface LoginResult {
  accessToken: string;
}

const SENSITIVE_LABEL: Record<string, string> = {
  SELF_HARM: '自傷/自殺意念',
  DOMESTIC_VIOLENCE: '家暴',
  MENTAL_HEALTH_CRISIS: '精神健康危機',
  INVOLVES_THIRD_PARTY: '涉及第三人',
  INVOLVES_MINOR: '涉及未成年',
};

export default function PrayerModerationPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@church.local');
  const [password, setPassword] = useState('ChangeMe123456');
  const [loginError, setLoginError] = useState('');
  const [queue, setQueue] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = useCallback(async (jwt: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<PrayerItem[]>('/prayer/moderation/queue', {
        token: jwt,
      });
      setQueue(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadQueue(token);
  }, [token, loadQueue]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await apiFetch<LoginResult>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.accessToken);
    } catch (err) {
      setLoginError(
        err instanceof ApiError ? err.message : '登入失敗，請確認 API 是否啟動',
      );
    }
  }

  async function moderate(id: string, decision: 'APPROVED' | 'REJECTED') {
    if (!token) return;
    setBusyId(id);
    try {
      await apiFetch(`/prayer/${id}/moderate`, {
        method: 'POST',
        token,
        body: JSON.stringify({ decision }),
      });
      // 樂觀更新：從佇列移除已處理項目
      setQueue((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '操作失敗');
    } finally {
      setBusyId(null);
    }
  }

  if (!token) {
    return (
      <div>
        <h2>代禱牆審核</h2>
        <p className="muted">
          需 STAFF 以上或代禱牆管理同工登入。後台正式環境建議強制 2FA（§四.3）。
        </p>
        <form className="card" style={{ maxWidth: 360 }} onSubmit={handleLogin}>
          <h3>登入</h3>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <label style={labelStyle}>密碼</label>
          <input
            style={inputStyle}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
          {loginError ? (
            <p style={{ color: '#dc2626', fontSize: 13 }}>{loginError}</p>
          ) : null}
          <button style={primaryBtn} type="submit">
            登入
          </button>
          <p className="muted" style={{ marginTop: 8 }}>
            種子帳號：admin@church.local / ChangeMe123456
          </p>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2>代禱牆審核佇列</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={ghostBtn} onClick={() => loadQueue(token)}>
            重新整理
          </button>
          <button style={ghostBtn} onClick={() => setToken(null)}>
            登出
          </button>
        </div>
      </div>
      <p className="muted">
        公開內容需發布前人工審核；危機類（自傷/家暴/精神危機）自動標記
        <span className="badge">AUTO_FLAGGED</span>，不公開曝光並優先通報關懷同工。
      </p>

      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
      {loading ? <p className="muted">載入中…</p> : null}

      {!loading && queue.length === 0 ? (
        <div className="card">
          <p className="muted">目前沒有待審核項目。</p>
        </div>
      ) : null}

      {queue.map((item) => (
        <div className="card" key={item.id}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="badge">{item.visibility}</span>
            <span className="badge">{item.moderationStatus}</span>
            {item.isAnonymous ? <span className="badge">匿名</span> : null}
            {item.reportCount > 0 ? (
              <span style={warnBadge}>檢舉 {item.reportCount}</span>
            ) : null}
            {item.sensitiveCategory !== 'NONE' ? (
              <span style={dangerBadge}>
                ⚠ {SENSITIVE_LABEL[item.sensitiveCategory] ?? item.sensitiveCategory}
              </span>
            ) : null}
            {item.escalated ? (
              <span style={dangerBadge}>已通報關懷同工</span>
            ) : null}
          </div>

          <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>{item.content}</p>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              style={approveBtn}
              disabled={busyId === item.id}
              onClick={() => moderate(item.id, 'APPROVED')}
            >
              核准
            </button>
            <button
              style={rejectBtn}
              disabled={busyId === item.id}
              onClick={() => moderate(item.id, 'REJECTED')}
            >
              退回
            </button>
            <span className="muted" style={{ marginLeft: 'auto' }}>
              {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
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
  background: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
};
const ghostBtn: React.CSSProperties = {
  padding: '6px 12px',
  background: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
};
const approveBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
};
const rejectBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: '#fff',
  color: '#dc2626',
  border: '1px solid #dc2626',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
};
const warnBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 999,
  background: '#fef3c7',
  color: '#92400e',
  fontSize: 12,
};
const dangerBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 999,
  background: '#fee2e2',
  color: '#b91c1c',
  fontSize: 12,
};
