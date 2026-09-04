import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type LivestreamChannelKey = 'sunday' | 'zone';

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
  /** sunday=教會主日崇拜；zone=成二牧區專屬 */
  channel?: LivestreamChannelKey;
  channelLabel?: string;
}

interface RawVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl?: string;
}

interface ChannelDef {
  key: LivestreamChannelKey;
  label: string;
  id: string;
  url: string;
  fallbackTitle: string;
}

/** 高雄靈糧堂主日信息預設頻道 */
const DEFAULT_SUNDAY_ID = 'UCdcDDnZj76AwNqj18jtTAgw';
const DEFAULT_SUNDAY_URL =
  'https://www.youtube.com/@breadoflifechristianchurch9830';

/** 成二牧區專屬頻道 */
const DEFAULT_ZONE_ID = 'UCK2s9sv4b-RqISob2uu8aiA';
const DEFAULT_ZONE_URL =
  'https://www.youtube.com/@成二牧區高雄靈糧堂';

const SUNDAY_HINT = /主崇|主日|崇拜|聚會直播/;

/**
 * 主日崇拜／成二牧區專屬 YouTube。
 * 以「當週最新上架」為主；當週無片則退回頻道最近一集。
 */
@Injectable()
export class LivestreamService {
  private readonly logger = new Logger(LivestreamService.name);
  private readonly cache = new Map<
    LivestreamChannelKey,
    { data: VideoInfo; at: number }
  >();
  private readonly TTL_MS = 3 * 60 * 1000; // 3 分鐘，較快跟上新上架

  constructor(private readonly config: ConfigService) {}

  listChannels(): Array<{ key: LivestreamChannelKey; label: string; url: string }> {
    return (['sunday', 'zone'] as const).map((key) => {
      const ch = this.resolveChannel(key);
      return { key: ch.key, label: ch.label, url: ch.url };
    });
  }

  async getLatest(channelKey: LivestreamChannelKey = 'sunday'): Promise<VideoInfo> {
    const channel = this.resolveChannel(channelKey);
    const hit = this.cache.get(channel.key);
    if (hit && Date.now() - hit.at < this.TTL_MS) {
      return hit.data;
    }

    const apiKey = this.config.get<string>('youtube.apiKey')?.trim();
    let list: RawVideo[] = [];

    if (apiKey) {
      list = await this.listViaApi(apiKey, channel.id);
    }
    if (list.length === 0) {
      list = await this.listViaRss(channel.id);
    }

    const picked = this.pickThisWeekLatest(list);
    const result = picked
      ? this.toVideoInfo(picked.video, picked.isThisWeek, channel)
      : this.channelFallback(channel);

    if (picked) {
      this.logger.log(
        `${channel.label}：${picked.isThisWeek ? '當週最新' : '近期最新'} — ${picked.video.title}`,
      );
    }

    this.cache.set(channel.key, { data: result, at: Date.now() });
    return result;
  }

  private resolveChannel(key: LivestreamChannelKey): ChannelDef {
    if (key === 'zone') {
      return {
        key: 'zone',
        label: '成二牧區專屬頻道',
        id:
          this.config.get<string>('youtube.zoneChannelId')?.trim() ||
          DEFAULT_ZONE_ID,
        url:
          this.config.get<string>('youtube.zoneChannelUrl')?.trim() ||
          DEFAULT_ZONE_URL,
        fallbackTitle: '成二牧區專屬頻道（請至頻道觀看）',
      };
    }
    return {
      key: 'sunday',
      label: '主日崇拜',
      id:
        this.config.get<string>('youtube.channelId')?.trim() ||
        DEFAULT_SUNDAY_ID,
      url:
        this.config.get<string>('youtube.channelUrl')?.trim() ||
        DEFAULT_SUNDAY_URL,
      fallbackTitle: '高雄靈糧堂主日信息（請至頻道觀看）',
    };
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

  private toVideoInfo(
    v: RawVideo,
    isThisWeek: boolean,
    channel: ChannelDef,
  ): VideoInfo {
    return {
      videoId: v.videoId,
      title: v.title,
      publishedAt: v.publishedAt,
      embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
      thumbnailUrl: v.thumbnailUrl,
      source: 'youtube',
      channelUrl: channel.url,
      isThisWeek,
      channel: channel.key,
      channelLabel: channel.label,
    };
  }

  private channelFallback(channel: ChannelDef): VideoInfo {
    return {
      videoId: '',
      title: channel.fallbackTitle,
      publishedAt: new Date().toISOString(),
      embedUrl: channel.url,
      watchUrl: channel.url,
      source: 'demo',
      channelUrl: channel.url,
      isThisWeek: false,
      channel: channel.key,
      channelLabel: channel.label,
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

export function parseLivestreamChannel(
  raw?: string,
): LivestreamChannelKey {
  const key = (raw ?? 'sunday').trim().toLowerCase();
  if (key === 'sunday' || key === 'zone') return key;
  throw new BadRequestException(
    'channel 僅支援 sunday（主日崇拜）或 zone（成二牧區專屬）',
  );
}
