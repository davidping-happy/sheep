'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';
import { AdminLoginForm, useAdminAuth } from '../../lib/useAdminAuth';

interface Announcement {
  id: string;
  title: string;
  body: string;
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
  { value: 'ALL', label: '?®Ê??? },
  { value: 'PASTORAL_AREA', label: '?πÂ??ßÂ?' },
  { value: 'GROUP', label: '?πÂ?Â∞èÁ?' },
  { value: 'ROLE', label: '?πÂ?ËßíËâ≤' },
];

const ROLE_OPTS = [
  { value: 'MEMBER', label: '‰∏Ä?¨Ê??? },
  { value: 'GROUP_LEADER', label: 'Â∞èÁ??? },
  { value: 'STAFF', label: '?ßÂ??åÂ∑•' },
  { value: 'ADMIN', label: 'ÁÆ°Á??? },
];

/** ?éÊÆµ‰∫åÔ??ÜÁúæ?®Êí≠ÔºàÂÖ®?ôÊ?ÔºèÁâß?ÄÔºèÂ?ÁµÑÔ?ËßíËâ≤Ôº?*/
export default function AnnouncementsPage() {
  const auth = useAdminAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [pastoralAreaId, setPastoralAreaId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [targetRole, setTargetRole] = useState('MEMBER');
  const [preview, setPreview] = useState<{ userCount: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

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
      setError(e instanceof ApiError ? e.message : 'ËºâÂÖ•Â§±Ê?');
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
      setError(e instanceof ApiError ? e.message : '?êË¶ΩÂ§±Ê?');
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token) return;
    setError('');
    try {
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
      setTitle('');
      setBody('');
      await load(auth.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '?ç‰?Â§±Ê?');
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
      setError(e instanceof ApiError ? e.message : '?ºÂ?Â§±Ê?');
    } finally {
      setBusyId(null);
    }
  }

  if (!auth.token) {
    return (
      <AdminLoginForm
        title="?¨Â??®Êí≠"
        hint="?éÊÆµ‰∫åÔ??ÜÁúæ?ºÈÄÅÔ??®Ê??ÉÔ??ßÂ?ÔºèÂ?ÁµÑÔ?ËßíËâ≤Ôºâ„ÄÇFCM ‰ªçÁÇ∫ stubÔºåÊ??ûÂÇ≥?ê‰º∞?∂‰ª∂‰∫∫Êï∏??
        auth={auth}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>?¨Â??®Êí≠ÔºàÂ??æÔ?</h2>
        <button style={ghostBtn} onClick={auth.logout}>
          ?ªÂá∫
        </button>
      </div>
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
      {preview ? (
        <p className="muted">
          ?ÄËøë‰?Ê¨°Â??æÈ?‰º∞Ô??®Êí≠ÔºöÁ? <strong>{preview.userCount}</strong> ‰ΩçÊ???
          ÔºàË?ÁΩ?token ?¶Ë?ÔºõÊú™??FCM ?ÇÁÇ∫ stubÔº?
        </p>
      ) : null}

      <form className="card" onSubmit={create}>
        <h3>Âª∫Á??¨Â?</h3>
        <label style={labelStyle}>Ê®ôÈ?</label>
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <label style={labelStyle}>?ßÂÆπ</label>
        <textarea
          style={{ ...inputStyle, minHeight: 100 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <label style={labelStyle}>?ÜÁúæÂ∞çË±°</label>
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
            <label style={labelStyle}>?ßÂ?</label>
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
            <label style={labelStyle}>Â∞èÁ?</label>
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
            <label style={labelStyle}>ËßíËâ≤</label>
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
          ?ÖÂ??âÁ®øÔºàÁ?ÂæåÂ??ºÂ?Ôº?
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" style={ghostBtn} onClick={previewAudience}>
            ?ê‰º∞?∂‰ª∂‰∫∫Êï∏
          </button>
          <button style={primaryBtn} type="submit">
            {saveAsDraft ? 'Â≠òË?Á®? : 'Âª∫Á?‰∏¶ÁôºÂ∏ÉÊé®??}
          </button>
        </div>
      </form>

      <div className="card">
        <h3>?¨Â??óË°®ÔºàÂê´?âÁ®øÔº?{items.length})</h3>
        {items.map((a) => (
          <div
            key={a.id}
            style={{ borderBottom: '1px solid #f3f4f6', padding: '12px 0' }}
          >
            <strong>{a.title}</strong>
            <div className="muted">
              {AUDIENCE_OPTS.find((o) => o.value === a.audience)?.label ??
                a.audience}
              {a.isPublished ? ' ¬∑ Â∑≤ÁôºÂ∏? : ' ¬∑ ?âÁ®ø'}
              {a.pushSentAt
                ? ` ¬∑ ?®Êí≠ ${new Date(a.pushSentAt).toLocaleString()}`
                : ''}
            </div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{a.body}</p>
            {!a.isPublished || !a.pushSentAt ? (
              <button
                style={ghostBtn}
                disabled={busyId === a.id}
                onClick={() => publish(a.id)}
              >
                ?ºÂ?ÔºèÊé®??
              </button>
            ) : (
              <button
                style={ghostBtn}
                disabled={busyId === a.id}
                onClick={() => publish(a.id)}
              >
                ?çÊ¨°?®Êí≠
              </button>
            )}
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
