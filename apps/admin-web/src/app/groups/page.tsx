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
  leaderName?: string | null;
  meetingTime?: string | null;
  meetingPlace?: string | null;
  intro?: string | null;
  photoUrl?: string | null;
  imageUrls?: string[];
}

interface ZoneBrief {
  id: string;
  code: string;
  leaderName: string;
  intro?: string | null;
  photoUrl?: string | null;
  imageUrls?: string[];
  groups: GroupBrief[];
}

interface Area {
  id: string;
  name: string;
  description: string | null;
  photoUrl?: string | null;
  zones: ZoneBrief[];
  groups?: GroupBrief[];
}

export default function GroupsPage() {
  const auth = useAdminAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [areaName, setAreaName] = useState('');
  const [areaDesc, setAreaDesc] = useState('');
  const [areaPhotoUrl, setAreaPhotoUrl] = useState('');

  const [zoneAreaId, setZoneAreaId] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [zoneLeaderName, setZoneLeaderName] = useState('');
  const [zoneIntro, setZoneIntro] = useState('');
  const [zoneImageUrls, setZoneImageUrls] = useState<string[]>([]);

  const [groupZoneId, setGroupZoneId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupLeaderName, setGroupLeaderName] = useState('');
  const [intro, setIntro] = useState('');
  const [groupImageUrls, setGroupImageUrls] = useState<string[]>([]);
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingPlace, setMeetingPlace] = useState('');
  const [saving, setSaving] = useState(false);

  const allZones = areas.flatMap((a) =>
    (a.zones ?? []).map((z) => ({ ...z, areaName: a.name, areaId: a.id })),
  );

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiFetch<Area[]>('/groups/areas');
      setAreas(data);
      setZoneAreaId((prev) => prev || data[0]?.id || '');
      const firstZone = data[0]?.zones?.[0]?.id || '';
      setGroupZoneId((prev) => prev || firstZone);
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

  function resetZoneForm() {
    setEditingZoneId(null);
    setZoneCode('');
    setZoneLeaderName('');
    setZoneIntro('');
    setZoneImageUrls([]);
  }

  function resetGroupForm() {
    setEditingGroupId(null);
    setGroupName('');
    setGroupLeaderName('');
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

  function startEditZone(zone: ZoneBrief, areaId: string) {
    setEditingZoneId(zone.id);
    setZoneAreaId(areaId);
    setZoneCode(zone.code);
    setZoneLeaderName(zone.leaderName ?? '');
    setZoneIntro(zone.intro ?? '');
    setZoneImageUrls(
      zone.imageUrls?.length
        ? zone.imageUrls
        : zone.photoUrl
          ? [zone.photoUrl]
          : [],
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEditGroup(group: GroupBrief, zoneId: string) {
    setEditingGroupId(group.id);
    setGroupZoneId(zoneId);
    setGroupName(group.name);
    setGroupLeaderName(group.leaderName ?? '');
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

  async function saveZone(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token || !zoneAreaId) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        pastoralAreaId: zoneAreaId,
        code: zoneCode,
        leaderName: zoneLeaderName || undefined,
        intro: zoneIntro || undefined,
        imageUrls: zoneImageUrls,
        photoUrl: zoneImageUrls[0] || undefined,
      };
      if (editingZoneId) {
        await apiFetch(`/groups/zones/${editingZoneId}`, {
          method: 'PATCH',
          token: auth.token,
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/groups/zones', {
          method: 'POST',
          token: auth.token,
          body: JSON.stringify(body),
        });
      }
      resetZoneForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '儲存小區失敗');
    } finally {
      setSaving(false);
    }
  }

  async function saveGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token || !groupZoneId) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        zoneId: groupZoneId,
        name: groupName,
        leaderName: groupLeaderName || undefined,
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
        `確定刪除牧區「${area.name}」？需先無小區。此動作無法復原。`,
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

  async function removeZone(zone: ZoneBrief) {
    if (!auth.token) return;
    if (
      !window.confirm(
        `確定刪除小區「${zone.code}」？需先無小組。此動作無法復原。`,
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/groups/zones/${zone.id}`, {
        method: 'DELETE',
        token: auth.token,
      });
      if (editingZoneId === zone.id) resetZoneForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '刪除小區失敗');
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
        hint="維護牧區 → 小區 → 小組（分層目錄）。可新增、編輯、刪除。"
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
      <p className="muted">分層：牧區 → 小區（編號／區長／介紹／圖）→ 小組（名稱／組長／介紹／圖）。圖片以完整呈現為主。</p>
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
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

        <form className="card" onSubmit={saveZone}>
          <h3>{editingZoneId ? '編輯小區' : '新增小區'}</h3>
          {editingZoneId ? (
            <p className="muted">
              <button type="button" style={ghostBtn} onClick={resetZoneForm}>
                取消編輯
              </button>
            </p>
          ) : null}
          <label style={labelStyle}>所屬牧區</label>
          <select
            style={inputStyle}
            value={zoneAreaId}
            onChange={(e) => setZoneAreaId(e.target.value)}
            required
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <label style={labelStyle}>小區編號 *</label>
          <input
            style={inputStyle}
            value={zoneCode}
            onChange={(e) => setZoneCode(e.target.value)}
            required
            placeholder="例如：A1、01"
          />
          <label style={labelStyle}>區長姓名</label>
          <input
            style={inputStyle}
            value={zoneLeaderName}
            onChange={(e) => setZoneLeaderName(e.target.value)}
          />
          <label style={labelStyle}>小區介紹</label>
          <textarea
            style={{ ...inputStyle, minHeight: 72 }}
            value={zoneIntro}
            onChange={(e) => setZoneIntro(e.target.value)}
          />
          <ImageGalleryField
            label="小區圖片"
            token={auth.token}
            value={zoneImageUrls}
            onChange={setZoneImageUrls}
            max={7}
          />
          <button style={primaryBtn} disabled={saving || !zoneAreaId}>
            {saving ? '儲存中…' : editingZoneId ? '更新小區' : '建立小區'}
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
          <label style={labelStyle}>所屬小區</label>
          <select
            style={inputStyle}
            value={groupZoneId}
            onChange={(e) => setGroupZoneId(e.target.value)}
            required
          >
            {allZones.length === 0 ? (
              <option value="">請先建立小區</option>
            ) : (
              allZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.areaName} · 小區 {z.code}
                </option>
              ))
            )}
          </select>
          <label style={labelStyle}>小組名稱 *</label>
          <input
            style={inputStyle}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
          <label style={labelStyle}>小組長姓名</label>
          <input
            style={inputStyle}
            value={groupLeaderName}
            onChange={(e) => setGroupLeaderName(e.target.value)}
          />
          <label style={labelStyle}>小組介紹</label>
          <textarea
            style={{ ...inputStyle, minHeight: 72 }}
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
          <label style={labelStyle}>聚會時間（選填）</label>
          <input
            style={inputStyle}
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            placeholder="週三 19:30"
          />
          <label style={labelStyle}>聚會地點（選填）</label>
          <input
            style={inputStyle}
            value={meetingPlace}
            onChange={(e) => setMeetingPlace(e.target.value)}
          />
          <button style={primaryBtn} disabled={saving || !groupZoneId}>
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
                編輯牧區
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
                maxHeight: 200,
                objectFit: 'contain',
                background: '#f3f4f6',
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
          ) : null}

          {(area.zones ?? []).length === 0 ? (
            <p className="muted">尚無小區，請先新增小區。</p>
          ) : (
            (area.zones ?? []).map((zone) => (
              <div
                key={zone.id}
                style={{
                  borderTop: '1px solid #e5e7eb',
                  marginTop: 12,
                  paddingTop: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <strong>小區 {zone.code}</strong>
                    <span className="muted"> · 區長 {zone.leaderName || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      style={ghostBtn}
                      onClick={() => startEditZone(zone, area.id)}
                    >
                      編輯小區
                    </button>
                    <button style={dangerBtn} onClick={() => removeZone(zone)}>
                      刪除
                    </button>
                  </div>
                </div>
                {zone.intro ? <p className="muted">{zone.intro}</p> : null}
                {resolveMediaUrl(zone.photoUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(zone.photoUrl)!}
                    alt=""
                    style={{
                      width: '100%',
                      maxHeight: 180,
                      objectFit: 'contain',
                      background: '#f3f4f6',
                      borderRadius: 8,
                      margin: '8px 0',
                    }}
                  />
                ) : null}
                <ul style={{ paddingLeft: 18 }}>
                  {zone.groups.map((g) => (
                    <li key={g.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        {resolveMediaUrl(g.photoUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveMediaUrl(g.photoUrl)!}
                            alt=""
                            style={{
                              width: 72,
                              height: 72,
                              objectFit: 'contain',
                              background: '#f3f4f6',
                              borderRadius: 8,
                              flexShrink: 0,
                            }}
                          />
                        ) : null}
                        <div style={{ flex: 1 }}>
                          <strong>{g.name}</strong>
                          <div className="muted">
                            小組長：{g.leaderName || '—'}
                          </div>
                          {g.intro ? (
                            <div className="muted">{g.intro}</div>
                          ) : null}
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <button
                              style={ghostBtn}
                              onClick={() => startEditGroup(g, zone.id)}
                            >
                              編輯小組
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
            ))
          )}
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
