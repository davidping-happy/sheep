'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';
import { AdminLoginForm, useAdminAuth } from '../../lib/useAdminAuth';
import { DynamicCheckinQr } from './DynamicCheckinQr';

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  capacity: number | null;
  registerDeadline: string | null;
  requiresGuardianConsent: boolean;
  createdBy: string;
}

interface RosterRow {
  id: string;
  status: string;
  guardianConsent: boolean;
  checkedIn?: boolean;
  checkedInAt?: string | null;
  checkinMethod?: string | null;
  user: { id: string; displayName: string; phone: string | null };
}

interface CheckinTokenResult {
  token: string;
  eventId: string;
  payload: string;
  expiresAt: string;
  ttlSeconds: number;
}

const STATUS_LABEL: Record<string, string> = {
  REGISTERED: 'Â∑≤Â†±??,
  WAITLISTED: '?ôË?',
  CANCELLED: 'Â∑≤Â?Ê∂?,
};

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventsPage() {
  const auth = useAdminAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [qr, setQr] = useState<CheckinTokenResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const issuingRef = useRef(false);

  // Âª∫Á?Ê¥ªÂ?Ë°®ÂñÆ
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setMinutes(0, 0, 0);
    return toLocalInputValue(d);
  });
  const [capacity, setCapacity] = useState('30');
  const [requiresGuardian, setRequiresGuardian] = useState(false);

  const loadEvents = useCallback(async (jwt: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<EventItem[]>('/events', { token: jwt });
      setEvents(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'ËºâÂÖ•Ê¥ªÂ?Â§±Ê?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth.token) loadEvents(auth.token);
  }, [auth.token, loadEvents]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token || !title.trim()) return;
    setCreating(true);
    setError('');
    try {
      await apiFetch<EventItem>('/events', {
        method: 'POST',
        token: auth.token,
        body: JSON.stringify({
          title: title.trim(),
          location: location.trim() || undefined,
          startAt: new Date(startAt).toISOString(),
          capacity: capacity ? parseInt(capacity, 10) : undefined,
          requiresGuardianConsent: requiresGuardian,
        }),
      });
      setTitle('');
      setLocation('');
      await loadEvents(auth.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Âª∫Á?Â§±Ê?');
    } finally {
      setCreating(false);
    }
  }

  async function openRoster(eventId: string) {
    if (!auth.token) return;
    setSelectedId(eventId);
    setQr(null);
    setAutoRotate(false);
    setRosterLoading(true);
    setError('');
    try {
      const data = await apiFetch<RosterRow[]>(`/events/${eventId}/roster`, {
        token: auth.token,
      });
      setRoster(data);
    } catch (e) {
      setRoster([]);
      setError(
        e instanceof ApiError
          ? e.message
          : '?°Ê?ËºâÂÖ•?çÂñÆÔºàÂ?‰∏ªËæ¶?åÂ∑•ÔºèÁÆ°?ÜÂì°Ôºå‰??ÉÂØ´?•Á®Ω?∏Ô?',
      );
    } finally {
      setRosterLoading(false);
    }
  }

  const issueQr = useCallback(async () => {
    if (!auth.token || !selectedId || issuingRef.current) return;
    issuingRef.current = true;
    setError('');
    try {
      const data = await apiFetch<CheckinTokenResult>(
        `/events/${selectedId}/checkin-token`,
        { method: 'POST', token: auth.token },
      );
      setQr(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '?¢Á?Á∞ΩÂà∞Á¢ºÂ§±??);
      setAutoRotate(false);
    } finally {
      issuingRef.current = false;
    }
  }, [auth.token, selectedId]);

  async function startLiveQr() {
    setAutoRotate(true);
    await issueQr();
  }

  /** ?çÂñÆ?ØÂá∫ CSVÔºàÂê´Á∞ΩÂà∞Ôº?*/
  function exportRosterCsv() {
    if (!selected || roster.length === 0) return;
    const header = ['ÂßìÂ?', '?ªË©±', '?Ä??, '??≠∑‰∫∫Â???, 'Â∑≤Á∞Ω??, 'Á∞ΩÂà∞?ÇÈ?'];
    const lines = roster.map((r) =>
      [
        r.user.displayName,
        r.user.phone ?? '',
        STATUS_LABEL[r.status] ?? r.status,
        r.guardianConsent ? '?? : '',
        r.checkedIn ? '?? : '',
        r.checkedInAt ? new Date(r.checkedInAt).toLocaleString() : '',
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = '\uFEFF' + [header.join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster-${selected.title.replace(/[\\/:*?"<>|]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!auth.token) {
    return (
      <AdminLoginForm
        title="Ê¥ªÂ??±Â?Á∞ΩÂà∞"
        hint="?Ä STAFF ‰ª•‰??ªÂÖ•?ÇÂá∫Â∏≠Â??ÆÂ±¨Ë°åËπ§Ë≥áÊ?ÔºåÂ?‰∏ªËæ¶?åÂ∑•ÔºèÁÆ°?ÜÂì°?ØÊü•Ôºà¬?.1 / ¬ß??8Ôºâ„Ä?
        auth={auth}
      />
    );
  }

  const selected = events.find((ev) => ev.id === selectedId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Ê¥ªÂ??±Â?Á∞ΩÂà∞</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={ghostBtn} onClick={() => auth.token && loadEvents(auth.token)}>
            ?çÊñ∞?¥Á?
          </button>
          <button style={ghostBtn} onClick={auth.logout}>
            ?ªÂá∫
          </button>
        </div>
      </div>
      <p className="muted">
        Âª∫Á?Ê¥ªÂ??ÅÊü•?ãÂ†±?çÂ??Æ„ÄÅÁî¢?üÁèæ?¥Â??ãÁ∞Ω?∞Á¢º?ÇÊü•?ãÂ??ÆÊ?ÂØ´ÂÖ•Á®ΩÊ†∏Á¥Ä?Ñ„Ä?
      </p>

      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

      <form className="card" onSubmit={handleCreate}>
        <h3>Âª∫Á?Ê¥ªÂ?</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Ê¥ªÂ??çÁ®± *</label>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="‰æãÂ?ÔºöÈ?Âπ¥Áâπ??
            />
          </div>
          <div>
            <label style={labelStyle}>?∞È?</label>
            <input
              style={inputStyle}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Â§ßÂ?"
            />
          </div>
          <div>
            <label style={labelStyle}>?ãÂ??ÇÈ? *</label>
            <input
              style={inputStyle}
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>?çÈ?‰∏äÈ?</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="‰∏çÂ°´?á‰???
            />
          </div>
        </div>
        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input
            type="checkbox"
            checked={requiresGuardian}
            onChange={(e) => setRequiresGuardian(e.target.checked)}
          />
          ?íÂ?Ê¥ªÂ?ÔºàÂ†±?çÈ???≠∑‰∫∫Â??èÔ?
        </label>
        <button style={{ ...primaryBtn, width: 'auto', marginTop: 12 }} disabled={creating}>
          {creating ? 'Âª∫Á?‰∏≠‚Ä? : 'Âª∫Á?Ê¥ªÂ?'}
        </button>
      </form>

      <div className="card">
        <h3>Ê¥ªÂ??óË°® {loading ? 'ÔºàË??•‰∏≠?¶Ô?' : `(${events.length})`}</h3>
        {events.length === 0 && !loading ? (
          <p className="muted">Â∞öÁÑ°Ê¥ªÂ?ÔºåË??à‰??πÂª∫Á´ã‰?Á≠Ü„Ä?/p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>?çÁ®±</th>
                <th style={thStyle}>?ÇÈ?</th>
                <th style={thStyle}>?∞È?</th>
                <th style={thStyle}>?çÈ?</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} style={selectedId === ev.id ? { background: '#f6e6de' } : undefined}>
                  <td style={tdStyle}>
                    {ev.title}
                    {ev.requiresGuardianConsent ? (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        ?íÂ?
                      </span>
                    ) : null}
                  </td>
                  <td style={tdStyle}>{new Date(ev.startAt).toLocaleString()}</td>
                  <td style={tdStyle}>{ev.location ?? '??}</td>
                  <td style={tdStyle}>{ev.capacity ?? '‰∏çÈ?'}</td>
                  <td style={tdStyle}>
                    <button style={ghostBtn} onClick={() => openRoster(ev.id)}>
                      ?•Á??çÂñÆ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedId ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>?∫Â∏≠ÔºèÂ†±?çÂ?????{selected?.title}</h3>
            <button style={ghostBtn} onClick={() => setSelectedId(null)}>
              ?úÈ?
            </button>
          </div>
          <p className="muted">Ê≠§Ê?‰ΩúÂ∑≤ÂØ´ÂÖ•Á®ΩÊ†∏ÔºàEVENT_ROSTER_VIEWÔºâ„Ä?/p>

          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={primaryBtnInline} onClick={startLiveQr}>
              {autoRotate ? '?çÊñ∞?¢Á??ïÊ? QR' : '?ãÂ??æÂ†¥?ïÊ? QRÔºàËá™?ïËº™?øÔ?'}
            </button>
            {autoRotate ? (
              <button
                style={ghostBtn}
                onClick={() => {
                  setAutoRotate(false);
                  setQr(null);
                }}
              >
                ?úÊ≠¢Ëº™Êõø
              </button>
            ) : null}
            <button
              style={ghostBtn}
              onClick={exportRosterCsv}
              disabled={roster.length === 0}
            >
              ?ØÂá∫?çÂñÆ CSV
            </button>
            {qr ? (
              <DynamicCheckinQr
                payload={qr.payload}
                token={qr.token}
                expiresAt={qr.expiresAt}
                ttlSeconds={qr.ttlSeconds}
                autoRotate={autoRotate}
                onRefresh={issueQr}
              />
            ) : null}
          </div>

          {rosterLoading ? (
            <p className="muted">ËºâÂÖ•?çÂñÆ‰∏≠‚Ä?/p>
          ) : roster.length === 0 ? (
            <p className="muted">Â∞öÁÑ°‰∫∫Â†±?ç„Ä?/p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ÂßìÂ?</th>
                  <th style={thStyle}>?ªË©±</th>
                  <th style={thStyle}>?Ä??/th>
                  <th style={thStyle}>Á∞ΩÂà∞</th>
                  <th style={thStyle}>??≠∑‰∫∫Â???/th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => (
                  <tr key={row.id}>
                    <td style={tdStyle}>{row.user.displayName}</td>
                    <td style={tdStyle}>{row.user.phone ?? '??}</td>
                    <td style={tdStyle}>
                      <span className="badge">
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {row.checkedIn ? (
                        <span className="badge">
                          Â∑≤Á∞Ω??
                          {row.checkedInAt
                            ? ` ${new Date(row.checkedInAt).toLocaleTimeString()}`
                            : ''}
                        </span>
                      ) : (
                        '??
                      )}
                    </td>
                    <td style={tdStyle}>{row.guardianConsent ? '?? : '??}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#6b7280',
  margin: '0 0 4px',
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
const primaryBtnInline: React.CSSProperties = {
  ...primaryBtn,
  width: 'auto',
  marginTop: 0,
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
const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 6px',
  borderBottom: '1px solid #e5e7eb',
  color: '#6b7280',
  fontWeight: 600,
};
const tdStyle: React.CSSProperties = {
  padding: '10px 6px',
  borderBottom: '1px solid #f3f4f6',
};

