'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageField } from '../../components/ImageField';
import { ImageGalleryField } from '../../components/ImageGalleryField';
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
  imageUrls?: string[];
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
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [areaName, setAreaName] = useState('');
  const [areaDesc, setAreaDesc] = useState('');
  const [areaPhotoUrl, setAreaPhotoUrl] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupAreaId, setGroupAreaId] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingPlace, setMeetingPlace] = useState('');
  const [intro, setIntro] = useState('');
  const [groupImageUrls, setGroupImageUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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

  function resetAreaForm() {
    setEditingAreaId(null);
    setAreaName('');
    setAreaDesc('');
    setAreaPhotoUrl('');
  }

  function resetGroupForm() {
    setEditingGroupId(null);
    setGroupName('');
    setIntro('');
    setGroupImageUrls([]);
    setMeetingTime('');
    setMeetingPlace('');
  }

  function startEditArea(area: Area) {
    setEditingAreaId(area.id);
    setAreaName(area.name);
    setAreaDesc(area.description ?? '');
    setAreaPhotoUrl(area.photoUrl ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEditGroup(group: GroupBrief, areaId: string) {
    setEditingGroupId(group.id);
    setGroupAreaId(areaId);
    setGroupName(group.name);
    setIntro(group.intro ?? '');
    setGroupImageUrls(
      group.imageUrls?.length
        ? group.imageUrls
        : group.photoUrl
          ? [group.photoUrl]
          : [],
    );
    setMeetingTime(group.meetingTime ?? '');
    setMeetingPlace(group.meetingPlace ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveArea(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        name: areaName,
        description: areaDesc || undefined,
        photoUrl: areaPhotoUrl || undefined,
      };
      if (editingAreaId) {
        await apiFetch(`/groups/areas/${editingAreaId}`, {
          method: 'PATCH',
          token: auth.token,
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/groups/areas', {
          method: 'POST',
          token: auth.token,
          body: JSON.stringify(body),
        });
      }
      resetAreaForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '儲存牧區失敗');
    } finally {
      setSaving(false);
    }
  }

  async function saveGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token || !groupAreaId) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        pastoralAreaId: groupAreaId,
        name: groupName,
        intro: intro || undefined,
        imageUrls: groupImageUrls,
        photoUrl: groupImageUrls[0] || undefined,
        meetingTime: meetingTime || undefined,
        meetingPlace: meetingPlace || undefined,
      };
      if (editingGroupId) {
        await apiFetch(`/groups/${editingGroupId}`, {
          method: 'PATCH',
          token: auth.token,
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/groups', {
          method: 'POST',
          token: auth.token,
          body: JSON.stringify(body),
        });
      }
      resetGroupForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '儲存小組失敗');
    } finally {
      setSaving(false);
    }
  }

  async function removeArea(area: Area) {
    if (!auth.token) return;
    if (
      !window.confirm(
        `確定刪除牧區「${area.name}」？需先無小組。此動作無法復原。`,
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/groups/areas/${area.id}`, {
        method: 'DELETE',
        token: auth.token,
      });
      if (editingAreaId === area.id) resetAreaForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '刪除牧區失敗');
    }
  }

  async function removeGroup(group: GroupBrief) {
    if (!auth.token) return;
    if (!window.confirm(`確定刪除小組「${group.name}」？此動作無法復原。`)) {
      return;
    }
    try {
      await apiFetch(`/groups/${group.id}`, {
        method: 'DELETE',
        token: auth.token,
      });
      if (editingGroupId === group.id) resetGroupForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '刪除小組失敗');
    }
  }

  if (!auth.token) {
    return (
      <AdminLoginForm
        title="牧區・小組"
        hint="維護牧區與小組介紹（目錄式資料）。可新增、編輯、刪除。"
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
        <form className="card" onSubmit={saveArea}>
          <h3>{editingAreaId ? '編輯牧區' : '新增牧區'}</h3>
          {editingAreaId ? (
            <p className="muted">
              <button type="button" style={ghostBtn} onClick={resetAreaForm}>
                取消編輯
              </button>
            </p>
          ) : null}
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
          <button style={primaryBtn} disabled={saving}>
            {saving ? '儲存中…' : editingAreaId ? '更新牧區' : '建立牧區'}
          </button>
        </form>

        <form className="card" onSubmit={saveGroup}>
          <h3>{editingGroupId ? '編輯小組' : '新增小組'}</h3>
          {editingGroupId ? (
            <p className="muted">
              <button type="button" style={ghostBtn} onClick={resetGroupForm}>
                取消編輯
              </button>
            </p>
          ) : null}
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
          <ImageGalleryField
            label="小組圖片"
            token={auth.token}
            value={groupImageUrls}
            onChange={setGroupImageUrls}
            max={7}
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
          <button style={primaryBtn} disabled={saving}>
            {saving ? '儲存中…' : editingGroupId ? '更新小組' : '建立小組'}
          </button>
        </form>
      </div>

      {areas.map((area) => (
        <div className="card" key={area.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <h3 style={{ margin: 0 }}>{area.name}</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={ghostBtn} onClick={() => startEditArea(area)}>
                編輯
              </button>
              <button style={dangerBtn} onClick={() => removeArea(area)}>
                刪除
              </button>
            </div>
          </div>
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
              <li key={g.id} style={{ marginBottom: 12 }}>
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
                  <div style={{ flex: 1 }}>
                    <strong>{g.name}</strong>
                    {g.meetingTime ? ` · ${g.meetingTime}` : ''}
                    {g.meetingPlace ? ` @ ${g.meetingPlace}` : ''}
                    {(g.imageUrls?.length ?? (g.photoUrl ? 1 : 0)) > 0 ? (
                      <div className="muted">
                        圖片 {g.imageUrls?.length ?? 1} 張
                      </div>
                    ) : null}
                    {g.intro ? (
                      <div className="muted">{g.intro}</div>
                    ) : null}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        style={ghostBtn}
                        onClick={() => startEditGroup(g, area.id)}
                      >
                        編輯
                      </button>
                      <button
                        style={dangerBtn}
                        onClick={() => removeGroup(g)}
                      >
                        刪除
                      </button>
                    </div>
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
  fontSize: 13,
};
const dangerBtn: React.CSSProperties = {
  ...ghostBtn,
  color: '#b91c1c',
  borderColor: '#fecaca',
};
