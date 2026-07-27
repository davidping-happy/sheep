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

interface ArticleFull extends ArticleRow {
  body: string;
  coverUrl: string | null;
}

const CAT_OPTIONS = [
  { value: 'DAILY_BREAD', label: '每日靈糧' },
  { value: 'PASTOR_COLUMN', label: '牧者專欄' },
  { value: 'TESTIMONY', label: '見證' },
  { value: 'OTHER', label: '其他' },
];

/** 階段二：完整 CMS — 新增／編輯／預覽／發布／下架 */
export default function ArticlesPage() {
  const auth = useAdminAuth();
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('DAILY_BREAD');
  const [publishNow, setPublishNow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async (jwt: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<ArticleRow[]>('/articles/manage', {
        token: jwt,
      });
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

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setBody('');
    setCategory('DAILY_BREAD');
    setPublishNow(false);
    setShowPreview(false);
  }

  async function loadEdit(id: string) {
    if (!auth.token) return;
    setError('');
    try {
      const a = await apiFetch<ArticleFull>(`/articles/manage/${id}`, {
        token: auth.token,
      });
      setEditingId(a.id);
      setTitle(a.title);
      setSlug(a.slug);
      setBody(a.body);
      setCategory(a.category);
      setPublishNow(a.isPublished);
      setShowPreview(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入文章失敗');
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.token) return;
    setSaving(true);
    setError('');
    const payload = {
      title,
      slug: slug || autoSlug(title) || `article-${Date.now()}`,
      body,
      category,
      isPublished: publishNow,
    };
    try {
      if (editingId) {
        await apiFetch(`/articles/${editingId}`, {
          method: 'PATCH',
          token: auth.token,
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/articles', {
          method: 'POST',
          token: auth.token,
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      await load(auth.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '儲存失敗');
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
        hint="階段二：草稿、編輯、預覽、發布／下架。"
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

      <form className="card" onSubmit={save}>
        <h3>{editingId ? '編輯文章' : '新增文章'}</h3>
        {editingId ? (
          <p className="muted">
            正在編輯 <code>{editingId.slice(0, 8)}…</code>{' '}
            <button type="button" style={ghostBtn} onClick={resetForm}>
              取消編輯
            </button>
          </p>
        ) : null}
        <label style={labelStyle}>標題</label>
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!editingId && !slug) setSlug(autoSlug(e.target.value));
          }}
          required
        />
        <label style={labelStyle}>Slug</label>
        <input
          style={inputStyle}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
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
          style={{ ...inputStyle, minHeight: 160 }}
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
          發布（取消勾選＝草稿）
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={primaryBtn} disabled={saving} type="submit">
            {saving ? '儲存中…' : editingId ? '更新' : '建立'}
          </button>
          <button
            type="button"
            style={ghostBtn}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? '關閉預覽' : '預覽'}
          </button>
        </div>
        {showPreview ? (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <span className="badge">
              {CAT_OPTIONS.find((c) => c.value === category)?.label}
            </span>
            <h3 style={{ margin: '8px 0' }}>{title || '（無標題）'}</h3>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                margin: 0,
                lineHeight: 1.7,
              }}
            >
              {body || '（無內容）'}
            </pre>
          </div>
        ) : null}
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
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={ghostBtn} onClick={() => loadEdit(r.id)}>
                      編輯
                    </button>
                    <button style={ghostBtn} onClick={() => togglePublish(r)}>
                      {r.isPublished ? '下架' : '發布'}
                    </button>
                  </div>
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
