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
  channelUrl?: string;
  /** 是否為當週上架 */
  isThisWeek?: boolean;
}

interface RawVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl?: string;
}

/** 高雄靈糧堂／成二牧區主日信息預設頻道 */
const DEFAULT_CHANNEL_ID = 'UCdcDDnZj76AwNqj18jtTAgw';
const DEFAULT_CHANNEL_URL =
  'https://www.youtube.com/@breadoflifechristianchurch9830';

const SUNDAY_HINT = /主崇|主日|崇拜|聚會直播/;

/**
 * 2. 主日崇拜 YouTube 連結 (§二.2)。
 *  以「當週最新上架」為主；當週無片則退回頻道最近一集。
 */
@Injectable()
export class LivestreamService {
  private readonly logger = new Logger(LivestreamService.name);
  private cache: { data: VideoInfo | null; at: number } = { data: null, at: 0 };
  private readonly TTL_MS = 3 * 60 * 1000; // 3 分鐘，較快跟上新上架

  constructor(private readonly config: ConfigService) {}

  private get channelId(): string {
    return (
      this.config.get<string>('youtube.channelId')?.trim() ||
      DEFAULT_CHANNEL_ID
    );
  }

  private get channelUrl(): string {
    return (
      this.config.get<string>('youtube.channelUrl')?.trim() ||
      DEFAULT_CHANNEL_URL
    );
  }

  async getLatest(): Promise<VideoInfo> {
    if (this.cache.data && Date.now() - this.cache.at < this.TTL_MS) {
      return this.cache.data;
    }

    const apiKey = this.config.get<string>('youtube.apiKey')?.trim();
    let list: RawVideo[] = [];

    if (apiKey) {
      list = await this.listViaApi(apiKey, this.channelId);
    }
    if (list.length === 0) {
      list = await this.listViaRss(this.channelId);
    }

    const picked = this.pickThisWeekLatest(list);
    const result = picked
      ? this.toVideoInfo(picked.video, picked.isThisWeek)
      : this.channelFallback();

    if (picked) {
      this.logger.log(
        `主日信息：${picked.isThisWeek ? '當週最新' : '近期最新'} — ${picked.video.title}`,
      );
    }

    this.cache = { data: result, at: Date.now() };
    return result;
  }

  /** 當週（台北時間週一 00:00 起）最新上架；優先主日相關標題 */
  private pickThisWeekLatest(
    list: RawVideo[],
  ): { video: RawVideo; isThisWeek: boolean } | null {
    if (list.length === 0) return null;

    const weekStart = this.taipeiWeekStart().getTime();
    const thisWeek = list
      .filter((v) => new Date(v.publishedAt).getTime() >= weekStart)
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );

    if (thisWeek.length > 0) {
      const sunday = thisWeek.find((v) => SUNDAY_HINT.test(v.title));
      return { video: sunday ?? thisWeek[0], isThisWeek: true };
    }

    // 當週尚無上架 → 頻道最近一集（已依日期排序）
    const sorted = [...list].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
    return { video: sorted[0], isThisWeek: false };
  }

  /** 台北時間：本週一 00:00 */
  private taipeiWeekStart(): Date {
    const now = new Date();
    const taipei = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }),
    );
    const day = taipei.getDay(); // 0=日 … 1=一
    const daysFromMonday = (day + 6) % 7;
    taipei.setHours(0, 0, 0, 0);
    taipei.setDate(taipei.getDate() - daysFromMonday);
    // 轉回近似 UTC：用 ISO 字串再 parse（足夠做週界比較）
    const y = taipei.getFullYear();
    const m = String(taipei.getMonth() + 1).padStart(2, '0');
    const d = String(taipei.getDate()).padStart(2, '0');
    return new Date(`${y}-${m}-${d}T00:00:00+08:00`);
  }

  private async listViaApi(
    apiKey: string,
    channelId: string,
  ): Promise<RawVideo[]> {
    try {
      const url =
        'https://www.googleapis.com/youtube/v3/search?' +
        new URLSearchParams({
          part: 'snippet',
          channelId,
          order: 'date',
          maxResults: '15',
          type: 'video',
          key: apiKey,
        }).toString();

      const res = await fetch(url);
      if (!res.ok) {
        this.logger.error(`YouTube API ${res.status}: ${await res.text()}`);
        return [];
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

      return (json.items ?? [])
        .filter((i) => i.id?.videoId)
        .map((i) => ({
          videoId: i.id.videoId,
          title: i.snippet.title,
          publishedAt: i.snippet.publishedAt,
          thumbnailUrl:
            i.snippet.thumbnails?.high?.url ??
            i.snippet.thumbnails?.default?.url,
        }));
    } catch (e) {
      this.logger.error(`YouTube API 失敗: ${String(e)}`);
      return [];
    }
  }

  private async listViaRss(channelId: string): Promise<RawVideo[]> {
    try {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const res = await fetch(url);
      if (!res.ok) {
        this.logger.error(`YouTube RSS ${res.status}`);
        return [];
      }
      const xml = await res.text();
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
      const out: RawVideo[] = [];
      for (const entry of entries) {
        const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
        const title = entry.match(/<title>([^<]+)<\/title>/)?.[1];
        const publishedAt = entry.match(
          /<published>([^<]+)<\/published>/,
        )?.[1];
        if (!videoId || !title || !publishedAt) continue;
        out.push({
          videoId,
          title: this.decodeXml(title),
          publishedAt,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        });
      }
      return out;
    } catch (e) {
      this.logger.error(`YouTube RSS 失敗: ${String(e)}`);
      return [];
    }
  }

  private toVideoInfo(v: RawVideo, isThisWeek: boolean): VideoInfo {
    return {
      videoId: v.videoId,
      title: v.title,
      publishedAt: v.publishedAt,
      embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
      thumbnailUrl: v.thumbnailUrl,
      source: 'youtube',
      channelUrl: this.channelUrl,
      isThisWeek,
    };
  }

  private channelFallback(): VideoInfo {
    return {
      videoId: '',
      title: '高雄靈糧堂主日信息（請至頻道觀看）',
      publishedAt: new Date().toISOString(),
      embedUrl: this.channelUrl,
      watchUrl: this.channelUrl,
      source: 'demo',
      channelUrl: this.channelUrl,
      isThisWeek: false,
    };
  }

  private decodeXml(s: string): string {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
