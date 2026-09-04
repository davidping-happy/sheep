import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';

const execFileAsync = promisify(execFile);

/**
 * Neon／新資料庫常是空的；啟動後若缺 users 表就自動 prisma db push。
 * 不阻擋 listen（避免 Render 健康檢查失敗）。
 */
@Injectable()
export class SchemaSyncBootstrap implements OnModuleInit {
  private readonly logger = new Logger(SchemaSyncBootstrap.name);
  private synced = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    setTimeout(() => {
      void this.ensureSchema();
    }, 2000);
  }

  /** 供 auth 在註冊／登入前呼叫 */
  async ensureSchema(): Promise<void> {
    if (this.synced) return;
    try {
      await this.prisma.$connect();
      // 必須 ::text：Prisma 無法反序列化 PostgreSQL regclass
      const rows = (await this.prisma.$queryRawUnsafe(
        `SELECT to_regclass('public.users')::text AS reg`,
      )) as Array<{ reg: string | null }>;
      if (rows[0]?.reg) {
        this.synced = true;
        this.logger.log('schema ok (users exists)');
        return;
      }
      this.logger.warn('users 表不存在 — 執行 prisma db push…');
      await execFileAsync('npx', [
        'prisma',
        'db',
        'push',
        '--skip-generate',
        '--accept-data-loss',
      ], {
          env: process.env,
          cwd: process.cwd(),
          timeout: 120_000,
          maxBuffer: 10 * 1024 * 1024,
          shell: true,
        },
      );
      this.synced = true;
      this.logger.log('prisma db push 完成');
    } catch (err) {
      this.logger.error(
        `schema sync failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
