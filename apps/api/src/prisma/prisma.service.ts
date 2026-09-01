import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Render 免費 Postgres 常出現 P1001（喚醒慢／瞬斷）。
 * 啟動時不阻塞 listen：連不上就背景重試，避免 Deploy 健康檢查失敗。
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('資料庫已連線');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`啟動時資料庫未就緒（稍後重試）: ${msg}`);
      this.scheduleReconnect(1);
    }
  }

  private scheduleReconnect(attempt: number) {
    if (attempt > 30) {
      this.logger.error(
        '資料庫持續連不上。請到 Render 確認 churchsheep-db 狀態與 DATABASE_URL。',
      );
      return;
    }
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.$connect();
        this.logger.log(`資料庫稍後連線成功（第 ${attempt} 次）`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`資料庫重試 ${attempt}/30: ${msg}`);
        this.scheduleReconnect(attempt + 1);
      }
    }, 4000);
  }

  async onModuleDestroy() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.$disconnect();
  }
}
