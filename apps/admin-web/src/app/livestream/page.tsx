'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';

interface VideoInfo {
  videoId: string;
  title: string;
  publishedAt: string;
  watchUrl: string;
  embedUrl: string;
  source: 'youtube' | 'demo';
}

/** 主日崇拜預覽（公開端點，無需登入） */
export default function LivestreamAdminPage() {
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<VideoInfo>('/livestream/latest')
      .then(setVideo)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : '載入失敗'),
      );
  }, []);

  return (
    <div>
      <h2>主日崇拜（YouTube）</h2>
      <p className="muted">
        讀取 API <code>GET /livestream/latest</code>。正式環境請在
        <code>apps/api/.env</code> 設定 <code>YOUTUBE_API_KEY</code> 與{' '}
        <code>YOUTUBE_CHANNEL_ID</code>。
      </p>
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
      {video ? (
        <div className="card">
          {video.source === 'demo' ? (
            <span className="badge">示範影片</span>
          ) : (
            <span className="badge">YouTube 即時</span>
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
        </div>
      ) : (
        <p className="muted">載入中…</p>
      )}
    </div>
  );
}
