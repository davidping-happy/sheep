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
  channelUrl?: string;
  isThisWeek?: boolean;
}

/** 主日崇拜預覽 — 高雄靈糧堂頻道最新主日信息 */
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
        來源頻道：
        <a
          href="https://www.youtube.com/@breadoflifechristianchurch9830"
          target="_blank"
          rel="noreferrer"
        >
          @breadoflifechristianchurch9830
        </a>
        （高雄靈糧堂主日信息）。顯示<strong>當週最新上架</strong>
        ；當週尚無新片則改顯示近期最新一集。無 API Key 時以公開 RSS 抓取。
      </p>
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
      {video ? (
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
      ) : (
        <p className="muted">載入中…</p>
      )}
    </div>
  );
}
