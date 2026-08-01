import { API_BASE } from './api';

/** 將 API 回傳的相對路徑（/uploads/id）轉成可顯示的絕對網址 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE}${path}`;
}
