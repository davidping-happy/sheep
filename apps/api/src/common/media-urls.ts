/** 正規化圖片網址陣列：去空白、去空字串、去重、截斷上限 */
export function normalizeImageUrls(
  urls: unknown,
  max: number,
  legacySingle?: string | null,
): string[] {
  const list: string[] = [];
  if (Array.isArray(urls)) {
    for (const u of urls) {
      if (typeof u !== 'string') continue;
      const t = u.trim();
      if (t && !list.includes(t)) list.push(t);
      if (list.length >= max) break;
    }
  }
  if (list.length === 0 && legacySingle?.trim()) {
    list.push(legacySingle.trim());
  }
  return list.slice(0, max);
}
