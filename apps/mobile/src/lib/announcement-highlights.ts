/** 從公告內文擷取列表用「重點」：優先條列，否則取前幾句。 */
export function extractAnnouncementHighlights(
  body: string,
  max = 3,
): string[] {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bullets: string[] = [];
  for (const line of lines) {
    const m = line.match(/^([-*•●]|◎|※|\d+[\.\)、])\s*(.+)$/);
    if (m?.[2]) bullets.push(m[2].trim());
  }
  if (bullets.length > 0) {
    return bullets.slice(0, max).map(clip);
  }

  const sentences = body
    .replace(/\s+/g, ' ')
    .split(/[。！？!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  if (sentences.length === 0) {
    const t = body.trim();
    return t ? [clip(t)] : [];
  }
  return sentences.slice(0, max).map(clip);
}

function clip(s: string, n = 72) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
