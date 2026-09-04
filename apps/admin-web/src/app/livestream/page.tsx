'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';

type ChannelKey = 'sunday' | 'zone';

interface VideoInfo {
  videoId: string;
  title: string;
  publishedAt: string;
  watchUrl: string;
  embedUrl: string;
  source: 'youtube' | 'demo';
  channelUrl?: string;
  isThisWeek?: boolean;
  channel?: ChannelKey;
  channelLabel?: string;
}

const CHANNELS: Array<{ key: ChannelKey; label: string; hint: string }> = [
  {
    key: 'sunday',
    label: '主日崇拜',
    hint: '高雄靈糧堂主日信息',
  },
  {
    key: 'zone',
    label: '成二牧區專屬頻道',
    hint: '@成二牧區高雄靈糧堂',
  },
];

/** 主日崇拜預覽 — 教會主日＋成二牧區專屬 */
export default function LivestreamAdminPage() {
  const [channel, setChannel] = useState<ChannelKey>('sunday');
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    setVideo(null);
    apiFetch<VideoInfo>(`/livestream/latest?channel=${channel}`)
      .then(setVideo)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : '載入失敗'),
      )
      .finally(() => setLoading(false));
  }, [channel]);

  const active = CHANNELS.find((c) => c.key === channel)!;

  return (
    <div>
      <h2>主日崇拜（YouTube）</h2>
      <p className="muted">
        可切換「主日崇拜」與「成二牧區專屬頻道」。顯示<strong>當週最新上架</strong>
        ；當週尚無新片則改顯示近期最新一集。無 API Key 時以公開 RSS 抓取。
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CHANNELS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setChannel(c.key)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border:
                c.key === channel ? '1px solid #C46B4A' : '1px solid #EADFD6',
              background: c.key === channel ? '#F6E6DE' : '#fff',
              color: c.key === channel ? '#C46B4A' : '#3D2C29',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="muted">
        目前頻道：{active.label}（{active.hint}）
        {video?.channelUrl ? (
          <>
            {' · '}
            <a href={video.channelUrl} target="_blank" rel="noreferrer">
              開啟頻道
            </a>
          </>
        ) : null}
      </p>

      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
      {loading ? <p className="muted">載入中…</p> : null}
      {!loading && video ? (
        <div className="card">
          {video.source === 'demo' ? (
            <span className="badge">備援</span>
          ) : video.isThisWeek ? (
            <span className="badge">當週最新上架</span>
          ) : (
            <span className="badge">近期最新</span>
          )}
          <h3>{video.title}</h3>
          <p className="muted">
            {new Date(video.publishedAt).toLocaleString()}
          </p>
          <p>
            <a href={video.watchUrl} target="_blank" rel="noreferrer">
              {video.watchUrl}
            </a>
          </p>
          {video.videoId ? (
            <div
              style={{
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: 12,
              }}
            >
              <iframe
                src={video.embedUrl}
                title={video.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
