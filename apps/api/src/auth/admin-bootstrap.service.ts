import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums';

/**
 * 雲端首次啟動：若尚無管理員且有 SEED_ADMIN_PASSWORD，自動建立 admin@church.local。
 * 已存在則不覆寫密碼（避免每次重啟改掉你設好的密碼）。
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = 'admin@church.local';
    const password = process.env.SEED_ADMIN_PASSWORD?.trim();
    if (!password) {
      this.logger.warn(
        '未設定 SEED_ADMIN_PASSWORD；若後台登不進去，請在 Render Environment 補上後重新部署。',
      );
      return;
    }
    if (password.length < 12) {
      this.logger.error('SEED_ADMIN_PASSWORD 至少需 12 字元，已略過自動建立管理員。');
      return;
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      // 確保角色是 ADMIN（若有人誤建成一般會友）
      if (existing.role !== Role.ADMIN) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { role: Role.ADMIN },
        });
        this.logger.log(`已將 ${email} 角色升級為 ADMIN`);
      }
      return;
    }

    await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        displayName: '系統管理員',
        role: Role.ADMIN,
        consentAt: new Date(),
      },
    });
    this.logger.log(`已建立雲端管理員 ${email}（密碼取自 SEED_ADMIN_PASSWORD）`);
  }
}
