import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

/** Render / 負載平衡健康檢查用 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let db: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      try {
        await this.prisma.$connect();
        await this.prisma.$queryRaw`SELECT 1`;
        db = 'up';
      } catch {
        db = 'down';
      }
    }
    return { ok: true, service: 'churchsheep-api', db };
  }
}
