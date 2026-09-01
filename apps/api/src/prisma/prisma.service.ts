import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function dbHostHint(): string {
  const raw = process.env.DATABASE_URL ?? '';
  if (!raw) return '(DATABASE_URL 未設定)';
  try {
    const normalized = raw.replace(/^postgresql:/i, 'http:').replace(/^postgres:/i, 'http:');
    return new URL(normalized).hostname || '(無法解析 host)';
  } catch {
    return '(DATABASE_URL 格式異常)';
  }
}

/**
 * Neon 免費方案會休眠；喚醒時可能連續 P1001。
 * 提供 waitForDb 重試，供登入／註冊／健康檢查使用。
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  async onModuleInit() {
    this.logger.log(`資料庫目標 host=${dbHostHint()}`);
    const ok = await this.waitForDb(5, 2000);
    if (ok) {
      this.logger.log('資料庫已連線');
      return;
    }
    this.logger.warn('啟動時資料庫未就緒，改背景重試');
    this.scheduleReconnect(1);
  }

  /**
   * 喚醒 Neon／重連：失敗就重試，不立刻放棄。
   */
  async waitForDb(maxAttempts = 10, delayMs = 2500): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        try {
          await this.$disconnect();
        } catch {
          /* ignore */
        }
        await this.$connect();
        await this.$queryRaw`SELECT 1`;
        if (attempt > 1) {
          this.logger.log(`資料庫連線成功（第 ${attempt} 次）`);
        }
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `資料庫連線失敗 ${attempt}/${maxAttempts} host=${dbHostHint()}: ${msg}`,
        );
        if (attempt < maxAttempts) await sleep(delayMs);
      }
    }
    return false;
  }

  private scheduleReconnect(attempt: number) {
    if (attempt > 40) {
      this.logger.error(
        `資料庫持續連不上 host=${dbHostHint()}。請確認 Render Environment 的 DATABASE_URL 是 Neon URI（含 sslmode=require）。`,
      );
      return;
    }
    this.reconnectTimer = setTimeout(async () => {
      const ok = await this.waitForDb(1, 0);
      if (ok) {
        this.logger.log(`背景重連成功（第 ${attempt} 輪）`);
        return;
      }
      this.scheduleReconnect(attempt + 1);
    }, 5000);
  }

  async onModuleDestroy() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.$disconnect();
  }
}
