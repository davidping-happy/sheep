import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ModerationStatus,
  Role,
  Visibility,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser } from '../../auth/decorators/current-user.decorator';
import {
  CreatePrayerDto,
  ModeratePrayerDto,
  RespondPrayerDto,
} from './dto/prayer.dto';
import {
  detectSensitiveCategory,
  isCrisisCategory,
} from './sensitive-content.util';

const ANON_DISPLAY = '一位弟兄姊妹';

/**
 * 7. 禱告代禱牆 — 隱私與內容審核為第一優先 (§6.2)。
 *  - 預設 PRIVATE
 *  - 公開內容須經人工審核 (moderationStatus)
 *  - 匿名貼文的真實身份加密後另存 PrayerAnonymityMap，存取須稽核
 *  - 危機類內容 (自傷/家暴/精神危機) 不公開曝光，escalated 通報牧者
 */
@Injectable()
export class PrayerService {
  private readonly logger = new Logger(PrayerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldEncryptionService,
    private readonly audit: AuditService,
  ) {}

  async create(user: AuthUser, dto: CreatePrayerDto) {
    const visibility = dto.visibility ?? Visibility.PRIVATE;
    const sensitiveCategory = detectSensitiveCategory(dto.content);
    const crisis = isCrisisCategory(sensitiveCategory);

    // 公開內容需人工審核；私人/小組可見可略過以加快流通 (§6.2 選項一)
    const moderationStatus =
      visibility === Visibility.PUBLIC
        ? ModerationStatus.PENDING
        : ModerationStatus.APPROVED;

    const request = await this.prisma.prayerRequest.create({
      data: {
        authorId: user.id,
        content: dto.content,
        visibility,
        sharedGroupId:
          visibility === Visibility.GROUP ? dto.sharedGroupId : null,
        isAnonymous: dto.isAnonymous ?? false,
        sensitiveCategory,
        // 危機內容強制不公開、標記待關懷同工處理
        moderationStatus: crisis
          ? ModerationStatus.AUTO_FLAGGED
          : moderationStatus,
        escalated: crisis,
      },
    });

    // 匿名貼文：真實身份加密後另表儲存（供濫用稽核）
    if (dto.isAnonymous) {
      await this.prisma.prayerAnonymityMap.create({
        data: {
          prayerRequestId: request.id,
          realUserIdEncrypted: this.crypto.encrypt(user.id),
        },
      });
    }

    if (crisis) {
      // TODO: 串接通知服務，優先通報 PASTORAL_CARE / 牧者，而非公開曝光
      this.logger.warn(
        `[危機通報] prayerRequest=${request.id} category=${sensitiveCategory} 已標記待關懷同工處理`,
      );
    }

    return this.toPublicView(request, user);
  }

  /** 依可見範圍與審核狀態回傳可見清單 */
  async feed(user: AuthUser) {
    const myGroupIds = await this.myGroupIds(user.id);
    const requests = await this.prisma.prayerRequest.findMany({
      where: {
        takenDownAt: null,
        archivedAt: null,
        OR: [
          { authorId: user.id },
          {
            visibility: Visibility.PUBLIC,
            moderationStatus: ModerationStatus.APPROVED,
          },
          {
            visibility: Visibility.GROUP,
            sharedGroupId: { in: myGroupIds },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => this.toPublicView(r, user));
  }

  /** 審核佇列（同工 / 代禱牆管理同工） */
  async moderationQueue(user: AuthUser) {
    this.assertModerator(user);
    return this.prisma.prayerRequest.findMany({
      where: {
        moderationStatus: {
          in: [ModerationStatus.PENDING, ModerationStatus.AUTO_FLAGGED],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async moderate(user: AuthUser, id: string, dto: ModeratePrayerDto) {
    this.assertModerator(user);
    const updated = await this.prisma.prayerRequest.update({
      where: { id },
      data: {
        moderationStatus:
          dto.decision === 'APPROVED'
            ? ModerationStatus.APPROVED
            : ModerationStatus.REJECTED,
      },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'PRAYER_MODERATE',
      targetType: 'PrayerRequest',
      targetId: id,
      metadata: { decision: dto.decision, note: dto.note },
    });
    return updated;
  }

  /**
   * 揭露匿名貼文的真實身份（僅濫用稽核時）。
   * 最高敏感操作：限管理員 + 必留稽核紀錄 (§6.2 / §四.9)。
   */
  async revealAnonymity(user: AuthUser, id: string) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('僅系統管理員可執行匿名身份稽核');
    }
    const map = await this.prisma.prayerAnonymityMap.findUnique({
      where: { prayerRequestId: id },
    });
    if (!map) throw new NotFoundException('此貼文非匿名或無對應紀錄');

    const realUserId = this.crypto.decrypt(map.realUserIdEncrypted);
    await this.audit.log({
      actorId: user.id,
      action: 'PRAYER_ANONYMITY_REVEAL',
      targetType: 'PrayerRequest',
      targetId: id,
      metadata: { revealedUserId: realUserId },
    });
    return { prayerRequestId: id, realUserId };
  }

  async respond(user: AuthUser, id: string, dto: RespondPrayerDto) {
    return this.prisma.prayerResponse.upsert({
      where: { prayerRequestId_userId: { prayerRequestId: id, userId: user.id } },
      create: {
        prayerRequestId: id,
        userId: user.id,
        showIdentity: dto.showIdentity ?? false,
      },
      update: { showIdentity: dto.showIdentity ?? false },
    });
  }

  async report(user: AuthUser, id: string, reason?: string) {
    await this.prisma.prayerReport.create({
      data: { prayerRequestId: id, reporterId: user.id, reason },
    });
    await this.prisma.prayerRequest.update({
      where: { id },
      data: { reportCount: { increment: 1 } },
    });
    return { reported: true };
  }

  /** 發文者自行下架（§6.2 保留刪除/下架機制） */
  async takeDown(user: AuthUser, id: string) {
    const req = await this.prisma.prayerRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException();
    if (req.authorId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException('只能下架自己的代禱事項');
    }
    return this.prisma.prayerRequest.update({
      where: { id },
      data: { takenDownAt: new Date() },
    });
  }

  private assertModerator(user: AuthUser) {
    if (user.role !== Role.STAFF && user.role !== Role.ADMIN) {
      // TODO: 另判斷 SpecialAssignment.PRAYER_WALL_MODERATOR
      throw new ForbiddenException('僅代禱牆管理同工可審核');
    }
  }

  private async myGroupIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    return memberships.map((m) => m.groupId);
  }

  /** 依匿名設定決定回傳的作者顯示名稱（不洩漏真實身份） */
  private toPublicView(
    req: { authorId: string; isAnonymous: boolean } & Record<string, unknown>,
    viewer: AuthUser,
  ) {
    const isOwner = req.authorId === viewer.id;
    return {
      ...req,
      authorId: req.isAnonymous && !isOwner ? null : req.authorId,
      authorDisplay: req.isAnonymous ? ANON_DISPLAY : undefined,
    };
  }
}
