'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';
import { AdminLoginForm, useAdminAuth } from '../../lib/useAdminAuth';

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

const SENSITIVE_LABEL: Record<string, string> = {
  SELF_HARM: '自傷/自殺意念',
  DOMESTIC_VIOLENCE: '家暴',
  MENTAL_HEALTH_CRISIS: '精神健康危機',
  INVOLVES_THIRD_PARTY: '涉及第三人',
  INVOLVES_MINOR: '涉及未成年',
};

/** 階段三：代禱牆審核＋匿名身份稽核（僅 ADMIN） */
export default function PrayerModerationPage() {
  const auth = useAdminAuth();
  const [queue, setQueue] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revealInfo, setRevealInfo] = useState<string>('');

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
    if (auth.token) loadQueue(auth.token);
  }, [auth.token, loadQueue]);

  async function moderate(id: string, decision: 'APPROVED' | 'REJECTED') {
    if (!auth.token) return;
    setBusyId(id);
    try {
      await apiFetch(`/prayer/${id}/moderate`, {
        method: 'POST',
        token: auth.token,
        body: JSON.stringify({ decision }),
      });
      setQueue((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '操作失敗');
    } finally {
      setBusyId(null);
    }
  }

  async function reveal(id: string) {
    if (!auth.token) return;
    setBusyId(id);
    setRevealInfo('');
    try {
      const r = await apiFetch<{
        realUserId: string;
        displayName: string | null;
        email: string | null;
      }>(`/prayer/${id}/reveal`, {
        method: 'POST',
        token: auth.token,
      });
      setRevealInfo(
        `稽核揭示：${r.displayName ?? '（無姓名）'} / ${r.email ?? r.realUserId}`,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '揭示失敗（需 ADMIN）');
    } finally {
      setBusyId(null);
    }
  }

  if (!auth.token) {
    return (
      <AdminLoginForm
        title="代禱牆審核"
        hint="階段三：公開內容審核、危機標記、匿名身份稽核（ADMIN）。"
        auth={auth}
      />
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
          <button style={ghostBtn} onClick={() => auth.token && loadQueue(auth.token)}>
            重新整理
          </button>
          <button style={ghostBtn} onClick={auth.logout}>
            登出
          </button>
        </div>
      </div>
      <p className="muted">
        公開內容需發布前人工審核；危機類自動
        <span className="badge">AUTO_FLAGGED</span>
        ，不公開曝光並寫入稽核通報。
      </p>

      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
      {revealInfo ? <p style={{ color: '#92400e' }}>{revealInfo}</p> : null}
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

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
            {item.isAnonymous ? (
              <button
                style={ghostBtn}
                disabled={busyId === item.id}
                onClick={() => reveal(item.id)}
              >
                揭示身份（稽核）
              </button>
            ) : null}
            <span className="muted" style={{ marginLeft: 'auto' }}>
              {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

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
