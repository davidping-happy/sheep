'use client';

import { useState } from 'react';
import { API_BASE, ApiError } from '../lib/api';
import { resolveMediaUrl } from '../lib/media';
import { getAccessToken } from '../lib/session';

type Props = {
  label?: string;
  token: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max: number;
};

/** 後台多圖上傳（最多 max 張） */
export function ImageGalleryField({
  label = '圖片',
  token,
  value,
  onChange,
  max,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const urls = value.filter(Boolean);

  async function uploadOne(file: File) {
    const form = new FormData();
    form.append('file', file);
    const auth = getAccessToken() ?? token;
    const res = await fetch(`${API_BASE}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}` },
      body: form,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message = data?.message
        ? Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message
        : `上傳失敗 ${res.status}`;
      throw new ApiError(res.status, message);
    }
    return data.url as string;
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = max - urls.length;
    if (room <= 0) {
      setError(`最多 ${max} 張圖片`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const picked = Array.from(files).slice(0, room);
      const uploaded: string[] = [];
      for (const f of picked) {
        uploaded.push(await uploadOne(f));
      }
      onChange([...urls, ...uploaded].slice(0, max));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '上傳失敗');
    } finally {
      setBusy(false);
    }
  }

  function removeAt(idx: number) {
    onChange(urls.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...urls];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <div>
      <label style={labelStyle}>
        {label}（{urls.length}/{max}）
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={busy || urls.length >= max}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
        可上傳 JPEG／PNG／WebP／GIF，每張上限 2MB；最多 {max} 張。第一張會當封面。
      </p>
      {busy ? <p className="muted">上傳中…</p> : null}
      {error ? <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p> : null}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 10,
        }}
      >
        {urls.map((u, idx) => {
          const src = resolveMediaUrl(u);
          return (
            <div
              key={`${u}-${idx}`}
              style={{
                width: 120,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#f8fafc',
              }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  style={{ width: '100%', height: 90, objectFit: 'cover' }}
                />
              ) : null}
              <div style={{ padding: 6, fontSize: 11 }}>
                {idx === 0 ? '封面' : `第 ${idx + 1} 張`}
              </div>
              <div style={{ display: 'flex', gap: 4, padding: '0 6px 6px' }}>
                <button
                  type="button"
                  style={tinyBtn}
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  style={tinyBtn}
                  disabled={idx === urls.length - 1}
                  onClick={() => move(idx, 1)}
                >
                  →
                </button>
                <button
                  type="button"
                  style={tinyBtn}
                  onClick={() => removeAt(idx)}
                >
                  刪
                </button>
              </div>
            </div>
          );
        })}
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
const tinyBtn: React.CSSProperties = {
  flex: 1,
  padding: '4px 0',
  background: '#fff',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 11,
};
