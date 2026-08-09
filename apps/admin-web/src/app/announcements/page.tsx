'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageField } from '../../components/ImageField';
import { apiFetch, ApiError } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { AdminLoginForm, useAdminAuth } from '../../lib/useAdminAuth';

interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  audience: string;
  pastoralAreaId: string | null;
  targetGroupId: string | null;
  targetRole: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  pushSentAt: string | null;
}

interface Area {
  id: string;
  name: string;
  groups: { id: string; name: string }[];
}

const AUDIENCE_OPTS = [
  { value: 'ALL', label: '全教會' },
  { value: 'PASTORAL_AREA', label: '特定牧區' },
  { value: 'GROUP', label: '特定小組' },
  { value: 'ROLE', label: '特定角色' },
];

const ROLE_OPTS = [
  { value: 'MEMBER', label: '一般會友' },
  { value: 'GROUP_LEADER', label: '小組長' },
  { value: 'STAFF', label: '牧區同工' },
  { value: 'ADMIN', label: '管理員' },
];

/** 階段二：分眾推播（全教會／牧區／小組／角色） */
export default function AnnouncementsPage() {
  const auth = useAdminAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [pastoralAreaId, setPastoralAreaId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [targetRole, setTargetRole] = useState('MEMBER');
  const [preview, setPreview] = useState<{ userCount: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async (jwt: string) => {
    setError('');
    try {
      const [anns, areaList] = await Promise.all([
        apiFetch<Announcement[]>('/announcements/manage', { token: jwt }),
        apiFetch<Area[]>('/groups/areas'),
      ]);
      setItems(anns);
      setAreas(areaList);
      setPastoralAreaId((prev) => prev || areaList[0]?.id || '');
      setTargetGroupId((prev) => prev || areaList[0]?.groups[0]?.id || '');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    }
  }, []);

  useEffect(() => {
    if (auth.token) load(auth.token);
  }, [auth.token, load]);

  const groups = areas.flatMap((a) =>
    a.groups.map((g) => ({ ...g, areaName: a.name })),
  );

  function buildPayload() {
    return {
      title,
      body,
      imageUrl: imageUrl || undefined,
      audience,
      pastoralAreaId:
        audience === 'PASTORAL_AREA' ? pastoralAreaId : undefined,
      targetGroupId: audience === 'GROUP' ? targetGroupId : undefined,
      targetRole: audience === 'ROLE' ? targetRole : undefined,
    };
  }

  async function previewAudience() {
    if (!auth.token) return;
    try {
      const r = await apiFetch<{ userCount: number }>(
        '/announcements/preview-audience',
        {
          method: 'POST',
          token: auth.token,
          body: JSON.stringify(buildPayload()),
        },
      );
      setPreview(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '預覽失敗');
    }
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setBody('');
    setImageUrl('');
    setAudience('ALL');
    setSaveAsDraft(false);
  }

  function loadEdit(a: Announcement) {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setImageUrl(a.imageUrl ?? '');
    setAudience(a.audience);
    setPastoralAreaId(a.pastoralAreaId ?? areas[0]?.id ?? '');
    setTargetGroupId(a.targetGroupId ?? groups[0]?.id ?? '');
    setTargetRole(a.targetRole ?? 'MEMBER');
    setSaveAsDraft(!a.isPublished);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token) return;
    setError('');
    try {
      if (editingId) {
        await apiFetch(`/announcements/${editingId}`, {
          method: 'PATCH',
          token: auth.token,
          body: JSON.stringify(buildPayload()),
        });
        if (!saveAsDraft) {
          const pub = await apiFetch<Announcement & { push?: { userCount: number } }>(
            `/announcements/${editingId}/publish`,
            { method: 'POST', token: auth.token },
          );
          setPreview({ userCount: pub.push?.userCount ?? 0 });
        }
      } else {
        const created = await apiFetch<Announcement>('/announcements', {
          method: 'POST',
          token: auth.token,
          body: JSON.stringify(buildPayload()),
        });
        if (!saveAsDraft) {
          const pub = await apiFetch<Announcement & { push?: { userCount: number } }>(
            `/announcements/${created.id}/publish`,
            { method: 'POST', token: auth.token },
          );
          setPreview({ userCount: pub.push?.userCount ?? 0 });
        }
      }
      resetForm();
      await load(auth.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失敗');
    }
  }

  async function removeAnnouncement(a: Announcement) {
    if (!auth.token) return;
    if (!window.confirm(`確定刪除公告「${a.title}」？此動作無法復原。`)) {
      return;
    }
    try {
      await apiFetch(`/announcements/${a.id}`, {
        method: 'DELETE',
        token: auth.token,
      });
      if (editingId === a.id) resetForm();
      await load(auth.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '刪除失敗');
    }
  }

  async function publish(id: string) {
    if (!auth.token) return;
    setBusyId(id);
    try {
      const pub = await apiFetch<{ push?: { userCount: number } }>(
        `/announcements/${id}/publish`,
        { method: 'POST', token: auth.token },
      );
      setPreview({ userCount: pub.push?.userCount ?? 0 });
      await load(auth.token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '發布失敗');
    } finally {
      setBusyId(null);
    }
  }

  if (!auth.token) {
    return (
      <AdminLoginForm
        title="公告推播"
        hint="階段二：分眾發送（全教會／牧區／小組／角色）。FCM 仍為 stub，會回傳預估收件人數。"
        auth={auth}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>公告推播（分眾）</h2>
        <button style={ghostBtn} onClick={auth.logout}>
          登出
        </button>
      </div>
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
      {preview ? (
        <p className="muted">
          最近一次分眾預估／推播：約 <strong>{preview.userCount}</strong> 位會友
          （裝置 token 另計；未接 FCM 時為 stub）
        </p>
      ) : null}

      <form className="card" onSubmit={create}>
        <h3>{editingId ? '編輯公告' : '建立公告'}</h3>
        {editingId ? (
          <p className="muted">
            <button type="button" style={ghostBtn} onClick={resetForm}>
              取消編輯
            </button>
          </p>
        ) : null}
        <label style={labelStyle}>標題</label>
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <label style={labelStyle}>內容</label>
        <p className="muted" style={{ marginTop: 0, marginBottom: 6 }}>
          App 列表會顯示前幾點「重點」。建議用條列撰寫，例如：
          <br />- 時間：週日上午 10:00
          <br />- 地點：本堂
          <br />- 備註：請提早到場
        </p>
        <textarea
          style={{ ...inputStyle, minHeight: 100 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          placeholder={'- 重點一\n- 重點二\n\n詳細說明…'}
        />
        <ImageField
          label="公告圖片"
          token={auth.token}
          value={imageUrl}
          onChange={setImageUrl}
        />
        <label style={labelStyle}>分眾對象</label>
        <select
          style={inputStyle}
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
        >
          {AUDIENCE_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {audience === 'PASTORAL_AREA' ? (
          <>
            <label style={labelStyle}>牧區</label>
            <select
              style={inputStyle}
              value={pastoralAreaId}
              onChange={(e) => setPastoralAreaId(e.target.value)}
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {audience === 'GROUP' ? (
          <>
            <label style={labelStyle}>小組</label>
            <select
              style={inputStyle}
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.areaName} / {g.name}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {audience === 'ROLE' ? (
          <>
            <label style={labelStyle}>角色</label>
            <select
              style={inputStyle}
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            >
              {ROLE_OPTS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <label style={{ ...labelStyle, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={saveAsDraft}
            onChange={(e) => setSaveAsDraft(e.target.checked)}
          />
          僅存草稿（稍後再發布）
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" style={ghostBtn} onClick={previewAudience}>
            預估收件人數
          </button>
          <button style={primaryBtn} type="submit">
            {editingId
              ? saveAsDraft
                ? '更新草稿'
                : '更新並發布'
              : saveAsDraft
                ? '存草稿'
                : '建立並發布推播'}
          </button>
        </div>
      </form>

      <div className="card">
        <h3>公告列表（含草稿）({items.length})</h3>
        {items.map((a) => (
          <div
            key={a.id}
            style={{ borderBottom: '1px solid #f3f4f6', padding: '12px 0' }}
          >
            <strong>{a.title}</strong>
            <div className="muted">
              {AUDIENCE_OPTS.find((o) => o.value === a.audience)?.label ??
                a.audience}
              {a.isPublished ? ' · 已發布' : ' · 草稿'}
              {a.pushSentAt
                ? ` · 推播 ${new Date(a.pushSentAt).toLocaleString()}`
                : ''}
            </div>
            {resolveMediaUrl(a.imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaUrl(a.imageUrl)!}
                alt=""
                style={{
                  marginTop: 8,
                  maxWidth: '100%',
                  maxHeight: 180,
                  objectFit: 'cover',
                  borderRadius: 8,
                }}
              />
            ) : null}
            <p style={{ whiteSpace: 'pre-wrap' }}>{a.body}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button style={ghostBtn} onClick={() => loadEdit(a)}>
                編輯
              </button>
              {!a.isPublished || !a.pushSentAt ? (
                <button
                  style={ghostBtn}
                  disabled={busyId === a.id}
                  onClick={() => publish(a.id)}
                >
                  發布／推播
                </button>
              ) : (
                <button
                  style={ghostBtn}
                  disabled={busyId === a.id}
                  onClick={() => publish(a.id)}
                >
                  再次推播
                </button>
              )}
              <button style={dangerBtn} onClick={() => removeAnnouncement(a)}>
                刪除
              </button>
            </div>
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
  padding: '10px 16px',
  background: '#c46b4a',
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
const dangerBtn: React.CSSProperties = {
  ...ghostBtn,
  color: '#b91c1c',
  borderColor: '#fecaca',
};
