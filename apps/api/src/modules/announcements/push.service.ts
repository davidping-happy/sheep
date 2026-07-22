import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PushAudience } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface PushTarget {
  audience: PushAudience;
  pastoralAreaId?: string | null;
  targetGroupId?: string | null;
  targetRole?: string | null;
}

/**
 * 公告推播 (§二.5 / §三.3)。
 *  - 整合 FCM（跨 iOS/Android 統一介面），可選 LINE Notify
 *  - 分眾發送：全教會 / 特定牧區 / 小組 / 角色
 *  - 服務金鑰走環境變數/密鑰管理服務，不寫死前端 (§四.6)
 *
 * 此為骨架：實際 FCM SDK 呼叫待填入。
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 依分眾目標解析收件裝置的 FCM token */
  async resolveTokens(target: PushTarget): Promise<string[]> {
    const where: Prisma.DeviceWhereInput = {};
    switch (target.audience) {
      case PushAudience.GROUP:
        if (target.targetGroupId) {
          const members = await this.prisma.groupMember.findMany({
            where: { groupId: target.targetGroupId },
            select: { userId: true },
          });
          where.userId = { in: members.map((m) => m.userId) };
        }
        break;
      case PushAudience.ROLE:
        // 依角色篩選使用者的裝置
        break;
      case PushAudience.PASTORAL_AREA:
        // 依牧區篩選（跨小組彙整成員）
        break;
      case PushAudience.ALL:
      default:
        break;
    }
    const devices = await this.prisma.device.findMany({
      where,
      select: { fcmToken: true },
    });
    return devices.map((d) => d.fcmToken);
  }

  async send(title: string, body: string, target: PushTarget): Promise<number> {
    const tokens = await this.resolveTokens(target);
    if (tokens.length === 0) return 0;
    // TODO: 呼叫 firebase-admin messaging().sendEachForMulticast({ tokens, notification })
    this.logger.log(
      `[推播] "${title}" -> ${tokens.length} 台裝置 (audience=${target.audience})`,
    );
    return tokens.length;
  }
}
