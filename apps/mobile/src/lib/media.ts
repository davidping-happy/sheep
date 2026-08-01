import { getApiBase } from './api-base';

/** 將 /uploads/id 或完整網址轉成 Image 可用的絕對 URL */
export async function resolveMediaUrl(
  url?: string | null,
): Promise<string | null> {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  const base = await getApiBase();
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}
