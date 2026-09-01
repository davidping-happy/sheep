import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 部署後背景補齊靈修社群表（不阻擋 /api/health）。
 * Render 免費方案若在 listen 前跑 migrate，容易 Deploy Failed。
 */
@Injectable()
export class DevotionSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(DevotionSchemaBootstrap.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    setTimeout(() => {
      void this.ensureSocialTables();
    }, 2500);
  }

  private async ensureSocialTables() {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "devotion_likes" (
          "id" TEXT PRIMARY KEY,
          "noteId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "devotion_comments" (
          "id" TEXT PRIMARY KEY,
          "noteId" TEXT NOT NULL,
          "authorId" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "devotion_likes_noteId_idx" ON "devotion_likes"("noteId");`,
      );
      await this.prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "devotion_likes_noteId_userId_key" ON "devotion_likes"("noteId", "userId");`,
      );
      await this.prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "devotion_comments_noteId_createdAt_idx" ON "devotion_comments"("noteId", "createdAt");`,
      );
      await this.prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "devotion_notes_visibility_noteDate_idx" ON "devotion_notes"("visibility", "noteDate");`,
      );
      this.logger.log('devotion social tables ensured');
    } catch (err) {
      this.logger.warn(
        `ensureSocialTables skipped: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
