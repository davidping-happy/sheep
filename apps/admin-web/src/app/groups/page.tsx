'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';
import { AdminLoginForm, useAdminAuth } from '../../lib/useAdminAuth';

interface GroupBrief {
  id: string;
  name: string;
  meetingTime?: string | null;
  meetingPlace?: string | null;
  intro?: string | null;
}

interface Area {
  id: string;
  name: string;
  description: string | null;
  groups: GroupBrief[];
}

export default function GroupsPage() {
  const auth = useAdminAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState('');
  const [areaName, setAreaName] = useState('');
  const [areaDesc, setAreaDesc] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupAreaId, setGroupAreaId] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingPlace, setMeetingPlace] = useState('');
  const [intro, setIntro] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiFetch<Area[]>('/groups/areas');
      setAreas(data);
      setGroupAreaId((prev) => prev || data[0]?.id || '');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'ËºâÂÖ•Â§±Ê?');
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
        body: JSON.stringify({ name: areaName, description: areaDesc || undefined }),
      });
      setAreaName('');
      setAreaDesc('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Âª∫Á??ßÂ?Â§±Ê?');
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
          meetingTime: meetingTime || undefined,
          meetingPlace: meetingPlace || undefined,
        }),
      });
      setGroupName('');
      setIntro('');
      setMeetingTime('');
      setMeetingPlace('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Âª∫Á?Â∞èÁ?Â§±Ê?');
    }
  }

  if (!auth.token) {
    return (
      <AdminLoginForm
        title="?ßÂ??ªÂ?Áµ?
        hint="Á∂≠Ë≠∑?ßÂ??áÂ?ÁµÑ‰?Á¥πÔ??ÆÈ?ÂºèË??ôÔ??ÇËÅØÁµ°Ë?Ë®äÈ?Ë®≠‰??¨È???
        auth={auth}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>?ßÂ??ªÂ?Áµ?/h2>
        <button style={ghostBtn} onClick={auth.logout}>
          ?ªÂá∫
        </button>
      </div>
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

      <div className="grid">
        <form className="card" onSubmit={createArea}>
          <h3>?∞Â??ßÂ?</h3>
          <label style={labelStyle}>?çÁ®±</label>
          <input
            style={inputStyle}
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            required
          />
          <label style={labelStyle}>Á∞°‰?</label>
          <input
            style={inputStyle}
            value={areaDesc}
            onChange={(e) => setAreaDesc(e.target.value)}
          />
          <button style={primaryBtn}>Âª∫Á??ßÂ?</button>
        </form>

        <form className="card" onSubmit={createGroup}>
          <h3>?∞Â?Â∞èÁ?</h3>
          <label style={labelStyle}>?ÄÂ±¨Áâß?Ä</label>
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
          <label style={labelStyle}>Â∞èÁ??çÁ®±</label>
          <input
            style={inputStyle}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
          <label style={labelStyle}>Á∞°‰?</label>
          <input
            style={inputStyle}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
          />
          <label style={labelStyle}>?öÊ??ÇÈ?</label>
          <input
            style={inputStyle}
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            placeholder="?±‰? 19:30"
          />
          <label style={labelStyle}>?öÊ??∞È?</label>
          <input
            style={inputStyle}
            value={meetingPlace}
            onChange={(e) => setMeetingPlace(e.target.value)}
          />
          <button style={primaryBtn}>Âª∫Á?Â∞èÁ?</button>
        </form>
      </div>

      {areas.map((area) => (
        <div className="card" key={area.id}>
          <h3>{area.name}</h3>
          <p className="muted">{area.description}</p>
          <ul style={{ paddingLeft: 18 }}>
            {area.groups.map((g) => (
              <li key={g.id} style={{ marginBottom: 8 }}>
                <strong>{g.name}</strong>
                {g.meetingTime ? ` ¬∑ ${g.meetingTime}` : ''}
                {g.meetingPlace ? ` @ ${g.meetingPlace}` : ''}
                {g.intro ? (
                  <div className="muted">{g.intro}</div>
                ) : null}
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
