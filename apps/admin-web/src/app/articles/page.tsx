'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';
import { AdminLoginForm, useAdminAuth } from '../../lib/useAdminAuth';

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

const CAT_OPTIONS = [
  { value: 'DAILY_BREAD', label: '每日靈糧' },
  { value: 'PASTOR_COLUMN', label: '牧者專欄' },
  { value: 'TESTIMONY', label: '見證' },
  { value: 'OTHER', label: '其他' },
];

export default function ArticlesPage() {
  const auth = useAdminAuth();
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('DAILY_BREAD');
  const [publishNow, setPublishNow] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (jwt: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<ArticleRow[]>('/articles/manage', { token: jwt });
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth.token) load(auth.token);
  }, [auth.token, load]);

  function autoSlug(t: string) {
    return t
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fff-]/g, '')
      .slice(0, 60);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch('/articles', {
        method: 'POST',
        token: auth.token,
        body: JSON.stringify({
          title,
          slug: slug || autoSlug(title) || `article-${Date.now()}`,
          body,
          category,
          isPublished: publishNow,
        }),
      });
      setTitle('');
      setSlug('');
      setBody('');
      await load(auth.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '建立失敗');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(row: ArticleRow) {
    if (!auth.token) return;
    try {
      await apiFetch(`/articles/${row.id}`, {
        method: 'PATCH',
        token: auth.token,
        body: JSON.stringify({ isPublished: !row.isPublished }),
      });
      await load(auth.token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '更新失敗');
    }
  }

  if (!auth.token) {
    return (
      <AdminLoginForm
        title="靈修佳文 (CMS)"
        hint="同工上稿、分類與發布。需 STAFF 以上。"
        auth={auth}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>靈修佳文 (CMS)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={ghostBtn} onClick={() => auth.token && load(auth.token)}>
            重新整理
          </button>
          <button style={ghostBtn} onClick={auth.logout}>
            登出
          </button>
        </div>
      </div>
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

      <form className="card" onSubmit={create}>
        <h3>新增文章</h3>
        <label style={labelStyle}>標題</label>
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slug) setSlug(autoSlug(e.target.value));
          }}
          required
        />
        <label style={labelStyle}>Slug（網址用）</label>
        <input
          style={inputStyle}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="daily-bread-xxx"
        />
        <label style={labelStyle}>分類</label>
        <select
          style={inputStyle}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CAT_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <label style={labelStyle}>內文</label>
        <textarea
          style={{ ...inputStyle, minHeight: 140 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <label style={{ ...labelStyle, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
          />
          立即發布
        </label>
        <button style={primaryBtn} disabled={saving}>
          {saving ? '儲存中…' : '建立文章'}
        </button>
      </form>

      <div className="card">
        <h3>文章列表 {loading ? '（載入中…）' : `(${rows.length})`}</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>標題</th>
              <th style={thStyle}>分類</th>
              <th style={thStyle}>狀態</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={tdStyle}>
                  <div>{r.title}</div>
                  <div className="muted">{r.slug}</div>
                </td>
                <td style={tdStyle}>
                  <span className="badge">
                    {CAT_OPTIONS.find((c) => c.value === r.category)?.label ??
                      r.category}
                  </span>
                </td>
                <td style={tdStyle}>
                  {r.isPublished ? (
                    <span className="badge">已發布</span>
                  ) : (
                    <span style={draftBadge}>草稿</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <button style={ghostBtn} onClick={() => togglePublish(r)}>
                    {r.isPublished ? '下架' : '發布'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  marginTop: 16,
  padding: '10px 16px',
  background: '#4f46e5',
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
};
const tdStyle: React.CSSProperties = {
  padding: '10px 6px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'top',
};
const draftBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 999,
  background: '#f3f4f6',
  color: '#6b7280',
  fontSize: 12,
};
