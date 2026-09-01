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
    // 給 Neon 一點喚醒時間（不要拖太久以免 Render health 逾時）
    const up = await this.prisma.waitForDb(4, 2000);
    return {
      ok: true,
      service: 'churchsheep-api',
      db: up ? 'up' : 'down',
    };
  }
}
