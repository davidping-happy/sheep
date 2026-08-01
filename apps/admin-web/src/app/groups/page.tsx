'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageField } from '../../components/ImageField';
import { apiFetch, ApiError } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { AdminLoginForm, useAdminAuth } from '../../lib/useAdminAuth';

interface GroupBrief {
  id: string;
  name: string;
  meetingTime?: string | null;
  meetingPlace?: string | null;
  intro?: string | null;
  photoUrl?: string | null;
}

interface Area {
  id: string;
  name: string;
  description: string | null;
  photoUrl?: string | null;
  groups: GroupBrief[];
}

export default function GroupsPage() {
  const auth = useAdminAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState('');
  const [areaName, setAreaName] = useState('');
  const [areaDesc, setAreaDesc] = useState('');
  const [areaPhotoUrl, setAreaPhotoUrl] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupAreaId, setGroupAreaId] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingPlace, setMeetingPlace] = useState('');
  const [intro, setIntro] = useState('');
  const [groupPhotoUrl, setGroupPhotoUrl] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiFetch<Area[]>('/groups/areas');
      setAreas(data);
      setGroupAreaId((prev) => prev || data[0]?.id || '');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createArea(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token) return;
    try {
      await apiFetch('/groups/areas', {
        method: 'POST',
        token: auth.token,
        body: JSON.stringify({
          name: areaName,
          description: areaDesc || undefined,
          photoUrl: areaPhotoUrl || undefined,
        }),
      });
      setAreaName('');
      setAreaDesc('');
      setAreaPhotoUrl('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '建立牧區失敗');
    }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token || !groupAreaId) return;
    try {
      await apiFetch('/groups', {
        method: 'POST',
        token: auth.token,
        body: JSON.stringify({
          pastoralAreaId: groupAreaId,
          name: groupName,
          intro: intro || undefined,
          photoUrl: groupPhotoUrl || undefined,
          meetingTime: meetingTime || undefined,
          meetingPlace: meetingPlace || undefined,
        }),
      });
      setGroupName('');
      setIntro('');
      setGroupPhotoUrl('');
      setMeetingTime('');
      setMeetingPlace('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '建立小組失敗');
    }
  }

  if (!auth.token) {
    return (
      <AdminLoginForm
        title="牧區・小組"
        hint="維護牧區與小組介紹（目錄式資料）。聯絡資訊預設不公開。"
        auth={auth}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>牧區・小組</h2>
        <button style={ghostBtn} onClick={auth.logout}>
          登出
        </button>
      </div>
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

      <div className="grid">
        <form className="card" onSubmit={createArea}>
          <h3>新增牧區</h3>
          <label style={labelStyle}>名稱</label>
          <input
            style={inputStyle}
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            required
          />
          <label style={labelStyle}>簡介</label>
          <input
            style={inputStyle}
            value={areaDesc}
            onChange={(e) => setAreaDesc(e.target.value)}
          />
          <ImageField
            label="牧區圖片"
            token={auth.token}
            value={areaPhotoUrl}
            onChange={setAreaPhotoUrl}
          />
          <button style={primaryBtn}>建立牧區</button>
        </form>

        <form className="card" onSubmit={createGroup}>
          <h3>新增小組</h3>
          <label style={labelStyle}>所屬牧區</label>
          <select
            style={inputStyle}
            value={groupAreaId}
            onChange={(e) => setGroupAreaId(e.target.value)}
            required
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <label style={labelStyle}>小組名稱</label>
          <input
            style={inputStyle}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
          <label style={labelStyle}>簡介</label>
          <input
            style={inputStyle}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
          />
          <ImageField
            label="小組圖片"
            token={auth.token}
            value={groupPhotoUrl}
            onChange={setGroupPhotoUrl}
          />
          <label style={labelStyle}>聚會時間</label>
          <input
            style={inputStyle}
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            placeholder="週三 19:30"
          />
          <label style={labelStyle}>聚會地點</label>
          <input
            style={inputStyle}
            value={meetingPlace}
            onChange={(e) => setMeetingPlace(e.target.value)}
          />
          <button style={primaryBtn}>建立小組</button>
        </form>
      </div>

      {areas.map((area) => (
        <div className="card" key={area.id}>
          <h3>{area.name}</h3>
          <p className="muted">{area.description}</p>
          {resolveMediaUrl(area.photoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaUrl(area.photoUrl)!}
              alt=""
              style={{
                width: '100%',
                maxHeight: 160,
                objectFit: 'cover',
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
          ) : null}
          <ul style={{ paddingLeft: 18 }}>
            {area.groups.map((g) => (
              <li key={g.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {resolveMediaUrl(g.photoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(g.photoUrl)!}
                      alt=""
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: 'cover',
                        borderRadius: 8,
                        flexShrink: 0,
                      }}
                    />
                  ) : null}
                  <div>
                    <strong>{g.name}</strong>
                    {g.meetingTime ? ` · ${g.meetingTime}` : ''}
                    {g.meetingPlace ? ` @ ${g.meetingPlace}` : ''}
                    {g.intro ? (
                      <div className="muted">{g.intro}</div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
};
