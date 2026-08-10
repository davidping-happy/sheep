'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  authorDisplayName?: string;
  authorEmail?: string;
}

type Filter = 'ALL' | 'PRIVATE' | 'PUBLIC' | 'PENDING';

const SENSITIVE_LABEL: Record<string, string> = {
  SELF_HARM: '自傷/自殺意念',
  DOMESTIC_VIOLENCE: '家暴',
  MENTAL_HEALTH_CRISIS: '精神健康危機',
  INVOLVES_THIRD_PARTY: '涉及第三人',
  INVOLVES_MINOR: '涉及未成年',
};

/**
 * 代禱牆後台：私人代禱（同工關懷）＋公開／待審＋刪除。
 * 注意：私人代禱會直接核准，不會出現在「待審佇列」，請看「私人」或「全部」。
 */
export default function PrayerModerationPage() {
  const auth = useAdminAuth();
  const [queue, setQueue] = useState<PrayerItem[]>([]);
  const [recent, setRecent] = useState<PrayerItem[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revealInfo, setRevealInfo] = useState('');
  const [info, setInfo] = useState('');

  const loadQueue = useCallback(async (jwt: string) => {
    setLoading(true);
    setError('');
    try {
      const [q, r] = await Promise.all([
        apiFetch<PrayerItem[]>('/prayer/moderation/queue', { token: jwt }),
        apiFetch<PrayerItem[]>('/prayer/moderation/recent', { token: jwt }),
      ]);
      setQueue(q);
      setRecent(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth.token) loadQueue(auth.token);
  }, [auth.token, loadQueue]);

  const filtered = useMemo(() => {
    if (filter === 'PENDING') return queue;
    if (filter === 'PRIVATE') {
      return recent.filter((p) => p.visibility === 'PRIVATE');
    }
    if (filter === 'PUBLIC') {
      return recent.filter((p) => p.visibility === 'PUBLIC');
    }
    return recent;
  }, [filter, queue, recent]);

  async function moderate(id: string, decision: 'APPROVED' | 'REJECTED') {
    if (!auth.token) return;
    setBusyId(id);
    try {
      await apiFetch(`/prayer/${id}/moderate`, {
        method: 'POST',
        token: auth.token,
        body: JSON.stringify({ decision }),
      });
      await loadQueue(auth.token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '操作失敗');
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(id: string) {
    if (!auth.token) return;
    if (!confirm('確定刪除此代禱事項？會友端將不再顯示。')) return;
    setBusyId(id);
    setError('');
    try {
      await apiFetch(`/prayer/${id}/admin-delete`, {
        method: 'POST',
        token: auth.token,
      });
      setInfo('已刪除（下架）。');
      await loadQueue(auth.token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '刪除失敗');
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

  async function approveStale() {
    if (!auth.token) return;
    setInfo('');
    setError('');
    try {
      const r = await apiFetch<{ count: number }>(
        '/prayer/moderation/approve-stale-public',
        { method: 'POST', token: auth.token },
      );
      setInfo(`已將 ${r.count} 則一般公開代禱核准上牆。`);
      await loadQueue(auth.token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '批次核准失敗');
    }
  }

  if (!auth.token) {
    return (
      <AdminLoginForm
        title="代禱牆審核"
        hint="私人代禱、公開審核、危機標記、刪除（需 STAFF／ADMIN）。"
        auth={auth}
      />
    );
  }

  const privateCount = recent.filter((p) => p.visibility === 'PRIVATE').length;
  const publicCount = recent.filter((p) => p.visibility === 'PUBLIC').length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h2>代禱牆（同工）</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={ghostBtn}
            onClick={() => auth.token && loadQueue(auth.token)}
          >
            重新整理
          </button>
          <button style={ghostBtn} onClick={approveStale}>
            核准待審公開代禱
          </button>
          <button style={ghostBtn} onClick={auth.logout}>
            登出
          </button>
        </div>
      </div>

      <p className="muted">
        公開代禱送出後進入「待審」，同工核准後才會顯示給其他人。私人代禱僅作者與代禱同工可見，直接進列表。此頁是「代禱牆」，不是「課程活動報名」。
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        {(
          [
            ['ALL', `全部 (${recent.length})`],
            ['PRIVATE', `私人 (${privateCount})`],
            ['PUBLIC', `公開 (${publicCount})`],
            ['PENDING', `待審 (${queue.length})`],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            style={filter === key ? filterOn : ghostBtn}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
      {info ? <p style={{ color: '#166534' }}>{info}</p> : null}
      {revealInfo ? <p style={{ color: '#92400e' }}>{revealInfo}</p> : null}
      {loading ? <p className="muted">載入中…</p> : null}

      {!loading && filtered.length === 0 ? (
        <div className="card">
          <p className="muted">
            {filter === 'PRIVATE'
              ? '目前沒有私人代禱。若會友剛發布仍看不到，請確認對方 APP 已重新登入成功。'
              : filter === 'PENDING'
                ? '目前沒有待審項目。'
                : '尚無代禱紀錄。'}
          </p>
        </div>
      ) : null}

      {filtered.map((item) => (
        <PrayerCard
          key={`${filter}-${item.id}`}
          item={item}
          busyId={busyId}
          onApprove={
            item.moderationStatus === 'PENDING' ||
            item.moderationStatus === 'AUTO_FLAGGED'
              ? () => moderate(item.id, 'APPROVED')
              : undefined
          }
          onReject={
            item.moderationStatus === 'PENDING' ||
            item.moderationStatus === 'AUTO_FLAGGED'
              ? () => moderate(item.id, 'REJECTED')
              : undefined
          }
          onDelete={() => removeItem(item.id)}
          onReveal={item.isAnonymous ? () => reveal(item.id) : undefined}
        />
      ))}
    </div>
  );
}

function PrayerCard({
  item,
  busyId,
  onApprove,
  onReject,
  onDelete,
  onReveal,
}: {
  item: PrayerItem;
  busyId: string | null;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete: () => void;
  onReveal?: () => void;
}) {
  return (
    <div className="card">
      <div
        style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}
      >
        <span className="badge">
          {item.visibility === 'PRIVATE'
            ? '私人'
            : item.visibility === 'PUBLIC'
              ? '公開'
              : item.visibility}
        </span>
        <span className="badge">{item.moderationStatus}</span>
        {item.isAnonymous ? <span className="badge">匿名</span> : null}
        {item.reportCount > 0 ? (
          <span style={warnBadge}>檢舉 {item.reportCount}</span>
        ) : null}
        {item.sensitiveCategory !== 'NONE' ? (
          <span style={dangerBadge}>
            ⚠{' '}
            {SENSITIVE_LABEL[item.sensitiveCategory] ?? item.sensitiveCategory}
          </span>
        ) : null}
        {item.escalated ? (
          <span style={dangerBadge}>已通報關懷同工</span>
        ) : null}
      </div>

      {(item.authorDisplayName || item.authorEmail) && (
        <p className="muted" style={{ margin: '0 0 8px' }}>
          作者：{item.authorDisplayName ?? '（無姓名）'}
          {item.authorEmail ? ` · ${item.authorEmail}` : ''}
        </p>
      )}

      <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>{item.content}</p>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {onApprove ? (
          <button
            style={approveBtn}
            disabled={busyId === item.id}
            onClick={onApprove}
          >
            核准
          </button>
        ) : null}
        {onReject ? (
          <button
            style={rejectBtn}
            disabled={busyId === item.id}
            onClick={onReject}
          >
            退回
          </button>
        ) : null}
        <button
          style={rejectBtn}
          disabled={busyId === item.id}
          onClick={onDelete}
        >
          刪除
        </button>
        {onReveal ? (
          <button
            style={ghostBtn}
            disabled={busyId === item.id}
            onClick={onReveal}
          >
            揭示身份（稽核）
          </button>
        ) : null}
        <span className="muted" style={{ marginLeft: 'auto' }}>
          {new Date(item.createdAt).toLocaleString()}
        </span>
      </div>
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
const filterOn: React.CSSProperties = {
  ...ghostBtn,
  background: '#fef3c7',
  borderColor: '#d97706',
  color: '#92400e',
  fontWeight: 600,
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
