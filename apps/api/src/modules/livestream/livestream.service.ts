import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VideoInfo {
  videoId: string;
  title: string;
  publishedAt: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl?: string;
  source: 'youtube' | 'demo';
}

/**
 * 2. 主日崇拜 YouTube 連結 (§二.2)。
 *  - YouTube Data API v3 抓頻道最新影片
 *  - 5 分鐘快取
 *  - 未設定 API Key 時回傳示範影片，方便本地 MVP 演示
 */
@Injectable()
export class LivestreamService {
  private readonly logger = new Logger(LivestreamService.name);
  private cache: { data: VideoInfo | null; at: number } = { data: null, at: 0 };
  private readonly TTL_MS = 5 * 60 * 1000;

  /** 示範用公開影片（官方 YouTube 說明頻道），無 API Key 時使用 */
  private readonly DEMO: VideoInfo = {
    videoId: 'aqz-KE-bpKQ',
    title: '【示範】主日崇拜直播／回放（請於後端設定 YouTube API）',
    publishedAt: new Date().toISOString(),
    embedUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
    watchUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnailUrl: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg',
    source: 'demo',
  };

  constructor(private readonly config: ConfigService) {}

  async getLatest(): Promise<VideoInfo> {
    if (this.cache.data && Date.now() - this.cache.at < this.TTL_MS) {
      return this.cache.data;
    }

    const apiKey = this.config.get<string>('youtube.apiKey')?.trim();
    const channelId = this.config.get<string>('youtube.channelId')?.trim();

    if (!apiKey || !channelId) {
      this.logger.warn(
        'YOUTUBE_API_KEY / YOUTUBE_CHANNEL_ID 未設定，回傳示範影片',
      );
      this.cache = { data: this.DEMO, at: Date.now() };
      return this.DEMO;
    }

    try {
      const url =
        'https://www.googleapis.com/youtube/v3/search?' +
        new URLSearchParams({
          part: 'snippet',
          channelId,
          order: 'date',
          maxResults: '1',
          type: 'video',
          key: apiKey,
        }).toString();

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`YouTube API ${res.status}: ${text}`);
        this.cache = { data: this.DEMO, at: Date.now() };
        return this.DEMO;
      }

      const json = (await res.json()) as {
        items?: Array<{
          id: { videoId: string };
          snippet: {
            title: string;
            publishedAt: string;
            thumbnails?: { high?: { url: string }; default?: { url: string } };
          };
        }>;
      };

      const item = json.items?.[0];
      if (!item?.id?.videoId) {
        this.logger.warn('YouTube 頻道尚無影片，回傳示範');
        this.cache = { data: this.DEMO, at: Date.now() };
        return this.DEMO;
      }

      const videoId = item.id.videoId;
      const result: VideoInfo = {
        videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl:
          item.snippet.thumbnails?.high?.url ??
          item.snippet.thumbnails?.default?.url,
        source: 'youtube',
      };
      this.cache = { data: result, at: Date.now() };
      return result;
    } catch (e) {
      this.logger.error(`YouTube 請求失敗: ${String(e)}`);
      this.cache = { data: this.DEMO, at: Date.now() };
      return this.DEMO;
    }
  }
}
