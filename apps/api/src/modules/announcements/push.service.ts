import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PushAudience, Role } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';

export interface PushTarget {
  audience: PushAudience;
  pastoralAreaId?: string | null;
  targetGroupId?: string | null;
  targetRole?: string | null;
}

export interface PushResult {
  deviceCount: number;
  userCount: number;
  audience: PushAudience;
  /** 實際 FCM 尚未接線時為 stub */
  mode: 'stub' | 'fcm';
}

/**
 * 公告推播 (§二.5)。
 * 分眾：全教會 / 牧區 / 小組 / 角色。
 * Phase 2：完整解析收件人；FCM 仍為 stub（記 log + 回傳人數）。
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 解析分眾目標的使用者 ID */
  async resolveUserIds(target: PushTarget): Promise<string[]> {
    switch (target.audience) {
      case PushAudience.GROUP: {
        if (!target.targetGroupId) return [];
        const members = await this.prisma.groupMember.findMany({
          where: { groupId: target.targetGroupId },
          select: { userId: true },
        });
        return [...new Set(members.map((m) => m.userId))];
      }
      case PushAudience.PASTORAL_AREA: {
        if (!target.pastoralAreaId) return [];
        const groups = await this.prisma.smallGroup.findMany({
          where: { pastoralAreaId: target.pastoralAreaId },
          select: { id: true },
        });
        const groupIds = groups.map((g) => g.id);
        if (groupIds.length === 0) return [];
        const members = await this.prisma.groupMember.findMany({
          where: { groupId: { in: groupIds } },
          select: { userId: true },
        });
        return [...new Set(members.map((m) => m.userId))];
      }
      case PushAudience.ROLE: {
        if (!target.targetRole) return [];
        const users = await this.prisma.user.findMany({
          where: { role: target.targetRole, isActive: true },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      case PushAudience.ALL:
      default: {
        const users = await this.prisma.user.findMany({
          where: { isActive: true },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
    }
  }

  async resolveTokens(target: PushTarget): Promise<string[]> {
    const userIds = await this.resolveUserIds(target);
    if (userIds.length === 0) return [];
    const where: Prisma.DeviceWhereInput = { userId: { in: userIds } };
    const devices = await this.prisma.device.findMany({
      where,
      select: { fcmToken: true },
    });
    return devices.map((d) => d.fcmToken);
  }

  async send(
    title: string,
    body: string,
    target: PushTarget,
  ): Promise<PushResult> {
    const userIds = await this.resolveUserIds(target);
    const tokens = await this.resolveTokens(target);

    // TODO: firebase-admin messaging().sendEachForMulticast
    this.logger.log(
      `[推播 stub] "${title}" audience=${target.audience} users=${userIds.length} devices=${tokens.length}` +
        (target.pastoralAreaId ? ` area=${target.pastoralAreaId}` : '') +
        (target.targetGroupId ? ` group=${target.targetGroupId}` : '') +
        (target.targetRole ? ` role=${target.targetRole}` : ''),
    );

    return {
      deviceCount: tokens.length,
      userCount: userIds.length,
      audience: target.audience,
      mode: 'stub',
    };
  }

  /** 註冊／更新裝置 FCM token */
  async registerDevice(
    userId: string,
    fcmToken: string,
    platform: string,
  ) {
    return this.prisma.device.upsert({
      where: { fcmToken },
      create: { userId, fcmToken, platform },
      update: { userId, platform, lastSeenAt: new Date() },
    });
  }
}
