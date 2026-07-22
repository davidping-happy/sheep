import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * 稽核紀錄 (§四.9)：誰在何時對什麼做了什麼。
 * 特別是敏感操作務必呼叫：
 *  - 揭露代禱匿名對應 (PRAYER_ANONYMITY_REVEAL)
 *  - 查看活動出席名單 (EVENT_ROSTER_VIEW)
 *  - 修改他人資料 / 角色變更
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        // metadata 以 JSON 字串儲存（DB 無關；正式 Postgres 可改回 Json 型別）
        metadata: JSON.stringify(entry.metadata ?? {}),
        ip: entry.ip ?? null,
      },
    });
  }
}
