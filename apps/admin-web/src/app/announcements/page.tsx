'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';
import { AdminLoginForm, useAdminAuth } from '../../lib/useAdminAuth';

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  isPublished: boolean;
  publishedAt: string | null;
  pushSentAt: string | null;
}

export default function AnnouncementsPage() {
  const auth = useAdminAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (jwt: string) => {
    setError('');
    try {
      // Phase 1：公開列表即已發布公告；草稿建立後立即 publish
      const data = await apiFetch<Announcement[]>('/announcements', {
        token: jwt,
      });
      setItems(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    }
  }, []);

  useEffect(() => {
    if (auth.token) load(auth.token);
  }, [auth.token, load]);

  async function createAndPublish(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token) return;
    setError('');
    try {
      const created = await apiFetch<Announcement>('/announcements', {
        method: 'POST',
        token: auth.token,
        body: JSON.stringify({ title, body, audience: 'ALL' }),
      });
      await apiFetch(`/announcements/${created.id}/publish`, {
        method: 'POST',
        token: auth.token,
      });
      setTitle('');
      setBody('');
      await load(auth.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '發布失敗');
    }
  }

  async function republish(id: string) {
    if (!auth.token) return;
    setBusyId(id);
    try {
      await apiFetch(`/announcements/${id}/publish`, {
        method: 'POST',
        token: auth.token,
      });
      await load(auth.token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '推播失敗');
    } finally {
      setBusyId(null);
    }
  }

  if (!auth.token) {
    return (
      <AdminLoginForm
        title="公告推播"
        hint="建立全教會公告並發布。推播目前為 FCM 骨架（會寫入 pushSentAt），正式環境再接 Firebase。"
        auth={auth}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>公告推播</h2>
        <button style={ghostBtn} onClick={auth.logout}>
          登出
        </button>
      </div>
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

      <form className="card" onSubmit={createAndPublish}>
        <h3>發布新公告</h3>
        <label style={labelStyle}>標題</label>
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <label style={labelStyle}>內容</label>
        <textarea
          style={{ ...inputStyle, minHeight: 120 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <p className="muted">分眾：目前預設全教會（ALL）。階段二再做牧區／小組分眾。</p>
        <button style={primaryBtn}>建立並發布</button>
      </form>

      <div className="card">
        <h3>已發布公告 ({items.length})</h3>
        {items.map((a) => (
          <div
            key={a.id}
            style={{
              borderBottom: '1px solid #f3f4f6',
              padding: '12px 0',
            }}
          >
            <strong>{a.title}</strong>
            <div className="muted">
              {a.publishedAt
                ? new Date(a.publishedAt).toLocaleString()
                : '—'}
              {a.pushSentAt ? ' · 已標記推播' : ''}
            </div>
            <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{a.body}</p>
            <button
              style={ghostBtn}
              disabled={busyId === a.id}
              onClick={() => republish(a.id)}
            >
              再次推播（骨架）
            </button>
          </div>
        ))}
      </div>
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
  padding: '10px 16px',
  background: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  padding: '6px 12px',
  background: '#fff',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
};
