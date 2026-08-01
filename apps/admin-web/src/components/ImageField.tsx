'use client';

import { useState } from 'react';
import { API_BASE, ApiError } from '../lib/api';
import { resolveMediaUrl } from '../lib/media';

type Props = {
  label?: string;
  token: string;
  value: string;
  onChange: (url: string) => void;
};

/** 後台上傳／貼圖網址共用欄位 */
export function ImageField({
  label = '圖片',
  token,
  value,
  onChange,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const preview = resolveMediaUrl(value);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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
      onChange(data.url as string);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '上傳失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {value ? (
          <button
            type="button"
            style={ghostBtn}
            onClick={() => onChange('')}
            disabled={busy}
          >
            清除圖片
          </button>
        ) : null}
      </div>
      <input
        style={{ ...inputStyle, marginTop: 8 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="或貼上圖片網址（選填）"
      />
      <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
        可上傳 JPEG／PNG／WebP／GIF，上限 2MB；也可直接貼外部圖片網址。
      </p>
      {busy ? <p className="muted">上傳中…</p> : null}
      {error ? <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p> : null}
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="預覽"
          style={{
            marginTop: 10,
            maxWidth: '100%',
            maxHeight: 220,
            borderRadius: 8,
            objectFit: 'cover',
            border: '1px solid #e5e7eb',
          }}
        />
      ) : null}
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
const ghostBtn: React.CSSProperties = {
  padding: '6px 12px',
  background: '#fff',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
};
