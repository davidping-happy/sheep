import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VideoInfo {
  videoId: string;
  title: string;
  publishedAt: string;
  embedUrl: string;
}

/**
 * 2. 主日崇拜 YouTube 連結 (§二.2)。
 *  - 用 YouTube Data API v3（唯讀，不需會友帳密）抓最新影片
 *  - 前端以官方 embed 播放，限白名單網域 (§四.5)
 *  - 建議快取最新影片資訊，避免每次請求打 API 配額
 *
 * 此為骨架：實際 fetch 待填入 API 呼叫。
 */
@Injectable()
export class LivestreamService {
  private readonly logger = new Logger(LivestreamService.name);
  private cache: { data: VideoInfo | null; at: number } = { data: null, at: 0 };
  private readonly TTL_MS = 5 * 60 * 1000;

  constructor(private readonly config: ConfigService) {}

  async getLatest(): Promise<VideoInfo | null> {
    if (this.cache.data && Date.now() - this.cache.at < this.TTL_MS) {
      return this.cache.data;
    }

    const apiKey = this.config.get<string>('youtube.apiKey');
    const channelId = this.config.get<string>('youtube.channelId');
    if (!apiKey || !channelId) {
      this.logger.warn('YouTube API 未設定，回傳 null');
      return null;
    }

    // TODO: 呼叫 https://www.googleapis.com/youtube/v3/search
    //   ?part=snippet&channelId=${channelId}&order=date&maxResults=1&type=video&key=${apiKey}
    // 解析後組成 VideoInfo 並寫入 cache。
    const result: VideoInfo | null = null;
    this.cache = { data: result, at: Date.now() };
    return result;
  }
}
