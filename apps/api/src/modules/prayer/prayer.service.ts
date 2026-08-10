import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ModerationStatus,
  Role,
  SensitiveCategory,
  Visibility,
} from '../../common/enums';
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
 * 7. 禱告代禱牆 — 隱私與內容審核為第一優先 (§6.2 / 階段三)。
 *  - 預設 PRIVATE（僅作者＋代禱／牧區同工）
 *  - GROUP：須為小組成員；PUBLIC：發布前人工審核
 *  - 匿名貼文真實身份加密另表；危機內容不公開並稽核通報
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

    let sharedGroupId: string | null = null;
    if (visibility === Visibility.GROUP) {
      if (!dto.sharedGroupId) {
        throw new BadRequestException('小組可見須指定 sharedGroupId');
      }
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: dto.sharedGroupId,
            userId: user.id,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenException('只能分享到自己所屬的小組');
      }
      sharedGroupId = dto.sharedGroupId;
    }

    // 公開：發布前人工審核；私人／小組直接可用；危機類自動標記不公開
    let moderationStatus: ModerationStatus;
    if (crisis) {
      moderationStatus = ModerationStatus.AUTO_FLAGGED;
    } else if (visibility === Visibility.PUBLIC) {
      moderationStatus = ModerationStatus.PENDING;
    } else {
      moderationStatus = ModerationStatus.APPROVED;
    }

    const request = await this.prisma.prayerRequest.create({
      data: {
        authorId: user.id,
        content: dto.content,
        visibility,
        sharedGroupId,
        isAnonymous: dto.isAnonymous ?? false,
        sensitiveCategory,
        moderationStatus,
        escalated: crisis,
        // 公開牆預設 30 天後可封存（延伸；排程另接）
        archiveAt:
          visibility === Visibility.PUBLIC
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : null,
      },
    });

    if (dto.isAnonymous) {
      await this.prisma.prayerAnonymityMap.create({
        data: {
          prayerRequestId: request.id,
          realUserIdEncrypted: this.crypto.encrypt(user.id),
        },
      });
    }

    if (crisis) {
      this.logger.warn(
        `[危機通報] prayerRequest=${request.id} category=${sensitiveCategory}`,
      );
      await this.audit.log({
        actorId: user.id,
        action: 'PRAYER_CRISIS_ESCALATE',
        targetType: 'PrayerRequest',
        targetId: request.id,
        metadata: { category: sensitiveCategory },
      });
    }

    return this.toPublicView(request, user, { responseCount: 0, iPrayed: false });
  }

  /** 依可見範圍與審核狀態回傳可見清單 */
  async feed(user: AuthUser) {
    const myGroupIds = await this.myGroupIds(user.id);
    const isCareStaff =
      user.role === Role.STAFF || user.role === Role.ADMIN;

    const requests = await this.prisma.prayerRequest.findMany({
      where: {
        takenDownAt: null,
        archivedAt: null,
        OR: [
          { authorId: user.id },
          // 設計：私人＝作者＋代禱／牧區同工
          ...(isCareStaff
            ? [
                {
                  visibility: Visibility.PRIVATE,
                  moderationStatus: {
                    in: [
                      ModerationStatus.APPROVED,
                      ModerationStatus.AUTO_FLAGGED,
                    ],
                  },
                },
              ]
            : []),
          {
            visibility: Visibility.PUBLIC,
            moderationStatus: ModerationStatus.APPROVED,
          },
          {
            visibility: Visibility.GROUP,
            sharedGroupId: { in: myGroupIds },
            moderationStatus: {
              in: [ModerationStatus.APPROVED, ModerationStatus.AUTO_FLAGGED],
            },
          },
        ],
      },
      include: {
        _count: { select: { responses: true } },
        responses: {
          where: { userId: user.id },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) =>
      this.toPublicView(r, user, {
        responseCount: r._count.responses,
        iPrayed: r.responses.length > 0,
      }),
    );
  }

  async moderationQueue(user: AuthUser) {
    this.assertModerator(user);
    return this.prisma.prayerRequest.findMany({
      where: {
        takenDownAt: null,
        moderationStatus: {
          in: [ModerationStatus.PENDING, ModerationStatus.AUTO_FLAGGED],
        },
      },
      orderBy: [{ escalated: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /** 後台：近期代禱（含私人／公開／待審），方便同工關懷與刪除 */
  async adminRecent(user: AuthUser, take = 100) {
    this.assertModerator(user);
    const rows = await this.prisma.prayerRequest.findMany({
      where: { takenDownAt: null },
      include: {
        author: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 200),
    });
    return rows.map((r) => {
      const { author, ...rest } = r;
      return {
        ...rest,
        authorDisplayName: author.displayName,
        authorEmail: author.email,
      };
    });
  }

  /** 將仍卡在 PENDING 的一般公開代禱一次核准上牆（部署後補救用） */
  async approveStalePublicPending(user: AuthUser) {
    this.assertModerator(user);
    const result = await this.prisma.prayerRequest.updateMany({
      where: {
        takenDownAt: null,
        visibility: Visibility.PUBLIC,
        moderationStatus: ModerationStatus.PENDING,
        sensitiveCategory: SensitiveCategory.NONE,
      },
      data: { moderationStatus: ModerationStatus.APPROVED },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'PRAYER_APPROVE_STALE_PUBLIC',
      targetType: 'PrayerRequest',
      metadata: { count: result.count },
    });
    return result;
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

  async revealAnonymity(user: AuthUser, id: string) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('僅系統管理員可執行匿名身份稽核');
    }
    const map = await this.prisma.prayerAnonymityMap.findUnique({
      where: { prayerRequestId: id },
    });
    if (!map) throw new NotFoundException('此貼文非匿名或無對應紀錄');

    const realUserId = this.crypto.decrypt(map.realUserIdEncrypted);
    const realUser = await this.prisma.user.findUnique({
      where: { id: realUserId },
      select: { id: true, displayName: true, email: true },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'PRAYER_ANONYMITY_REVEAL',
      targetType: 'PrayerRequest',
      targetId: id,
      metadata: { revealedUserId: realUserId },
    });
    return {
      prayerRequestId: id,
      realUserId,
      displayName: realUser?.displayName ?? null,
      email: realUser?.email ?? null,
    };
  }

  async respond(user: AuthUser, id: string, dto: RespondPrayerDto) {
    await this.assertCanView(user, id);
    return this.prisma.prayerResponse.upsert({
      where: {
        prayerRequestId_userId: { prayerRequestId: id, userId: user.id },
      },
      create: {
        prayerRequestId: id,
        userId: user.id,
        showIdentity: dto.showIdentity ?? false,
      },
      update: { showIdentity: dto.showIdentity ?? false },
    });
  }

  async report(user: AuthUser, id: string, reason?: string) {
    await this.assertCanView(user, id);
    await this.prisma.prayerReport.create({
      data: { prayerRequestId: id, reporterId: user.id, reason },
    });
    await this.prisma.prayerRequest.update({
      where: { id },
      data: { reportCount: { increment: 1 } },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'PRAYER_REPORT',
      targetType: 'PrayerRequest',
      targetId: id,
      metadata: { reason },
    });
    return { reported: true };
  }

  async takeDown(user: AuthUser, id: string) {
    const req = await this.prisma.prayerRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException();
    const isCareStaff =
      user.role === Role.STAFF || user.role === Role.ADMIN;
    if (req.authorId !== user.id && !isCareStaff) {
      throw new ForbiddenException('只能下架自己的代禱事項，或由代禱同工處理');
    }
    const updated = await this.prisma.prayerRequest.update({
      where: { id },
      data: { takenDownAt: new Date() },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'PRAYER_TAKEDOWN',
      targetType: 'PrayerRequest',
      targetId: id,
      metadata: { byStaff: isCareStaff && req.authorId !== user.id },
    });
    return updated;
  }

  private assertModerator(user: AuthUser) {
    if (user.role !== Role.STAFF && user.role !== Role.ADMIN) {
      throw new ForbiddenException('僅代禱牆管理同工／牧區同工可審核');
    }
  }

  private async myGroupIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    return memberships.map((m) => m.groupId);
  }

  private async assertCanView(user: AuthUser, id: string) {
    const req = await this.prisma.prayerRequest.findUnique({ where: { id } });
    if (!req || req.takenDownAt) throw new NotFoundException();
    if (req.authorId === user.id) return req;

    const isCareStaff =
      user.role === Role.STAFF || user.role === Role.ADMIN;
    if (
      req.visibility === Visibility.PRIVATE &&
      isCareStaff &&
      (req.moderationStatus === ModerationStatus.APPROVED ||
        req.moderationStatus === ModerationStatus.AUTO_FLAGGED)
    ) {
      return req;
    }
    if (
      req.visibility === Visibility.PUBLIC &&
      req.moderationStatus === ModerationStatus.APPROVED
    ) {
      return req;
    }
    if (req.visibility === Visibility.GROUP && req.sharedGroupId) {
      const m = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: req.sharedGroupId,
            userId: user.id,
          },
        },
      });
      if (m) return req;
    }
    throw new ForbiddenException('無權檢視此代禱事項');
  }

  private toPublicView(
    req: { authorId: string; isAnonymous: boolean } & Record<string, unknown>,
    viewer: AuthUser,
    extra: { responseCount: number; iPrayed: boolean },
  ) {
    const isOwner = req.authorId === viewer.id;
    const isCareStaff =
      viewer.role === Role.STAFF || viewer.role === Role.ADMIN;
    const { _count, responses, ...rest } = req as typeof req & {
      _count?: unknown;
      responses?: unknown;
    };
    return {
      ...rest,
      authorId: req.isAnonymous && !isOwner ? null : req.authorId,
      authorDisplay: req.isAnonymous
        ? ANON_DISPLAY
        : isOwner
          ? '我'
          : isCareStaff
            ? '會友'
            : '會友',
      isOwner,
      canTakeDown: isOwner || isCareStaff,
      responseCount: extra.responseCount,
      iPrayed: extra.iPrayed,
    };
  }
}
