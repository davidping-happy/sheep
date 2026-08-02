'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageGalleryField } from '../../components/ImageGalleryField';
import { apiFetch, ApiError } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { AdminLoginForm, useAdminAuth } from '../../lib/useAdminAuth';
import { DynamicCheckinQr } from './DynamicCheckinQr';

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  coverUrl?: string | null;
  imageUrls?: string[];
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
  REGISTERED: '已報名',
  WAITLISTED: '候補',
  CANCELLED: '已取消',
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

  // 建立活動表單
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
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const loadEvents = useCallback(async (jwt: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<EventItem[]>('/events', { token: jwt });
      setEvents(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入活動失敗');
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
          imageUrls,
          coverUrl: imageUrls[0] || undefined,
        }),
      });
      setTitle('');
      setLocation('');
      setImageUrls([]);
      await loadEvents(auth.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '建立失敗');
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
          : '無法載入名單（僅主辦同工／管理員，且會寫入稽核）',
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
      setError(e instanceof ApiError ? e.message : '產生簽到碼失敗');
      setAutoRotate(false);
    } finally {
      issuingRef.current = false;
    }
  }, [auth.token, selectedId]);

  async function startLiveQr() {
    setAutoRotate(true);
    await issueQr();
  }

  /** 名單匯出 CSV（含簽到） */
  function exportRosterCsv() {
    if (!selected || roster.length === 0) return;
    const header = ['姓名', '電話', '狀態', '監護人同意', '已簽到', '簽到時間'];
    const lines = roster.map((r) =>
      [
        r.user.displayName,
        r.user.phone ?? '',
        STATUS_LABEL[r.status] ?? r.status,
        r.guardianConsent ? '是' : '',
        r.checkedIn ? '是' : '',
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
        title="活動報名簽到"
        hint="需 STAFF 以上登入。出席名單屬行蹤資料，僅主辦同工／管理員可查（§6.1 / §四.8）。"
        auth={auth}
      />
    );
  }

  const selected = events.find((ev) => ev.id === selectedId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>活動報名簽到</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={ghostBtn} onClick={() => auth.token && loadEvents(auth.token)}>
            重新整理
          </button>
          <button style={ghostBtn} onClick={auth.logout}>
            登出
          </button>
        </div>
      </div>
      <p className="muted">
        建立活動、查看報名名單、產生現場動態簽到碼。查看名單會寫入稽核紀錄。
      </p>

      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

      <form className="card" onSubmit={handleCreate}>
        <h3>建立活動</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>活動名稱 *</label>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="例如：青年特會"
            />
          </div>
          <div>
            <label style={labelStyle}>地點</label>
            <input
              style={inputStyle}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="大堂"
            />
          </div>
          <div>
            <label style={labelStyle}>開始時間 *</label>
            <input
              style={inputStyle}
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>名額上限</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="不填則不限"
            />
          </div>
        </div>
        {auth.token ? (
          <ImageGalleryField
            label="活動圖片"
            token={auth.token}
            value={imageUrls}
            onChange={setImageUrls}
            max={5}
          />
        ) : null}
        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input
            type="checkbox"
            checked={requiresGuardian}
            onChange={(e) => setRequiresGuardian(e.target.checked)}
          />
          兒少活動（報名需監護人同意）
        </label>
        <button style={{ ...primaryBtn, width: 'auto', marginTop: 12 }} disabled={creating}>
          {creating ? '建立中…' : '建立活動'}
        </button>
      </form>

      <div className="card">
        <h3>活動列表 {loading ? '（載入中…）' : `(${events.length})`}</h3>
        {events.length === 0 && !loading ? (
          <p className="muted">尚無活動，請先上方建立一筆。</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>名稱</th>
                <th style={thStyle}>時間</th>
                <th style={thStyle}>地點</th>
                <th style={thStyle}>名額</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} style={selectedId === ev.id ? { background: '#f6e6de' } : undefined}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {resolveMediaUrl(ev.coverUrl ?? ev.imageUrls?.[0]) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(ev.coverUrl ?? ev.imageUrls?.[0])!}
                          alt=""
                          style={{
                            width: 40,
                            height: 40,
                            objectFit: 'cover',
                            borderRadius: 6,
                          }}
                        />
                      ) : null}
                      <div>
                        {ev.title}
                        {ev.requiresGuardianConsent ? (
                          <span className="badge" style={{ marginLeft: 6 }}>
                            兒少
                          </span>
                        ) : null}
                        {(ev.imageUrls?.length ?? 0) > 0 ? (
                          <div className="muted" style={{ fontSize: 12 }}>
                            圖片 {ev.imageUrls!.length} 張
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>{new Date(ev.startAt).toLocaleString()}</td>
                  <td style={tdStyle}>{ev.location ?? '—'}</td>
                  <td style={tdStyle}>{ev.capacity ?? '不限'}</td>
                  <td style={tdStyle}>
                    <button style={ghostBtn} onClick={() => openRoster(ev.id)}>
                      查看名單
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
            <h3>出席／報名名單 — {selected?.title}</h3>
            <button style={ghostBtn} onClick={() => setSelectedId(null)}>
              關閉
            </button>
          </div>
          <p className="muted">此操作已寫入稽核（EVENT_ROSTER_VIEW）。</p>

          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={primaryBtnInline} onClick={startLiveQr}>
              {autoRotate ? '重新產生動態 QR' : '開始現場動態 QR（自動輪替）'}
            </button>
            {autoRotate ? (
              <button
                style={ghostBtn}
                onClick={() => {
                  setAutoRotate(false);
                  setQr(null);
                }}
              >
                停止輪替
              </button>
            ) : null}
            <button
              style={ghostBtn}
              onClick={exportRosterCsv}
              disabled={roster.length === 0}
            >
              匯出名單 CSV
            </button>
          </div>
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

          {rosterLoading ? (
            <p className="muted">載入名單中…</p>
          ) : roster.length === 0 ? (
            <p className="muted">尚無人報名。</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>姓名</th>
                  <th style={thStyle}>電話</th>
                  <th style={thStyle}>狀態</th>
                  <th style={thStyle}>簽到</th>
                  <th style={thStyle}>監護人同意</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => (
                  <tr key={row.id}>
                    <td style={tdStyle}>{row.user.displayName}</td>
                    <td style={tdStyle}>{row.user.phone ?? '—'}</td>
                    <td style={tdStyle}>
                      <span className="badge">
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {row.checkedIn ? (
                        <span className="badge">
                          已簽到
                          {row.checkedInAt
                            ? ` ${new Date(row.checkedInAt).toLocaleTimeString()}`
                            : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={tdStyle}>{row.guardianConsent ? '是' : '—'}</td>
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

