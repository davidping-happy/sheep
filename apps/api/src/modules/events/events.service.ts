import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CheckinMethod,
  RegistrationStatus,
  Role,
} from '../../common/enums';
import { randomBytes } from 'crypto';
import { normalizeImageUrls } from '../../common/media-urls';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser } from '../../auth/decorators/current-user.decorator';
import { CreateEventDto, RegisterEventDto } from './dto/event.dto';

const QR_TTL_SECONDS = 30; // 動態 QR Code 每 30 秒輪替 (§6.1)
const MAX_EVENT_IMAGES = 5;

function withEventImages<
  T extends { coverUrl?: string | null; imageUrls?: string[] },
>(row: T) {
  const imageUrls = normalizeImageUrls(
    row.imageUrls,
    MAX_EVENT_IMAGES,
    row.coverUrl,
  );
  return {
    ...row,
    imageUrls,
    coverUrl: imageUrls[0] ?? null,
  };
}

/**
 * 6. 活動報名與簽到 (§6.1 / 階段三動態 QR)。
 */
@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  create(user: AuthUser, dto: CreateEventDto) {
    const imageUrls = normalizeImageUrls(
      dto.imageUrls,
      MAX_EVENT_IMAGES,
      dto.coverUrl,
    );
    return this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        imageUrls,
        coverUrl: imageUrls[0] ?? null,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        capacity: dto.capacity,
        registerDeadline: dto.registerDeadline
          ? new Date(dto.registerDeadline)
          : null,
        requiresGuardianConsent: dto.requiresGuardianConsent ?? false,
        createdBy: user.id,
      },
    });
  }

  async list() {
    const rows = await this.prisma.event.findMany({
      orderBy: { startAt: 'asc' },
    });
    return rows.map(withEventImages);
  }

  async update(id: string, dto: CreateEventDto | Partial<CreateEventDto>) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.startAt !== undefined) data.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) {
      data.endAt = dto.endAt ? new Date(dto.endAt) : null;
    }
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.registerDeadline !== undefined) {
      data.registerDeadline = dto.registerDeadline
        ? new Date(dto.registerDeadline)
        : null;
    }
    if (dto.requiresGuardianConsent !== undefined) {
      data.requiresGuardianConsent = dto.requiresGuardianConsent;
    }
    if (dto.imageUrls !== undefined || dto.coverUrl !== undefined) {
      const imageUrls = normalizeImageUrls(
        dto.imageUrls,
        MAX_EVENT_IMAGES,
        dto.coverUrl,
      );
      data.imageUrls = imageUrls;
      data.coverUrl = imageUrls[0] ?? null;
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data,
    });
    return withEventImages(updated);
  }

  async remove(id: string) {
    await this.prisma.event.delete({ where: { id } });
    return { ok: true };
  }

  myRegistrations(userId: string) {
    return this.prisma.eventRegistration.findMany({
      where: { userId },
      select: { eventId: true, status: true },
    });
  }

  /** 後台：所有待審核的取消報名申請 */
  listCancelPending() {
    return this.prisma.eventRegistration.findMany({
      where: { status: RegistrationStatus.CANCEL_PENDING },
      include: {
        event: {
          select: { id: true, title: true, startAt: true, location: true },
        },
        user: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async register(user: AuthUser, eventId: string, dto: RegisterEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException();
    if (event.registerDeadline && event.registerDeadline < new Date()) {
      throw new BadRequestException('報名已截止');
    }
    if (!dto.privacyConsent) {
      throw new BadRequestException('請先同意個資聲明');
    }
    const name = dto.registrantName?.trim();
    const group = dto.registrantGroup?.trim();
    const phone = dto.registrantPhone?.trim();
    if (!name || !group || !phone) {
      throw new BadRequestException('請填寫姓名、小組與電話');
    }
    if (event.requiresGuardianConsent && !dto.guardianConsent) {
      throw new BadRequestException('此活動需監護人同意');
    }

    const existing = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (
      existing?.status === RegistrationStatus.REGISTERED ||
      existing?.status === RegistrationStatus.CANCEL_PENDING
    ) {
      throw new BadRequestException('您已報名此活動');
    }

    // 佔名額：已報名 + 取消審核中（尚未核准取消前仍佔位）
    const activeCount = await this.prisma.eventRegistration.count({
      where: {
        eventId,
        status: {
          in: [
            RegistrationStatus.REGISTERED,
            RegistrationStatus.CANCEL_PENDING,
          ],
        },
      },
    });
    if (event.capacity != null && activeCount >= event.capacity) {
      throw new BadRequestException(
        `名額已滿，無法完成報名（上限 ${event.capacity} 人，目前已報名 ${activeCount} 人）`,
      );
    }

    const form = {
      registrantName: name,
      registrantGroup: group,
      registrantPhone: phone,
      privacyConsent: true,
      guardianConsent: dto.guardianConsent ?? false,
    };

    return this.prisma.eventRegistration.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      create: {
        eventId,
        userId: user.id,
        status: RegistrationStatus.REGISTERED,
        ...form,
      },
      update: { status: RegistrationStatus.REGISTERED, ...form },
    });
  }

  /** 會友申請取消報名：進入審核，須管理員核准後才真正取消 */
  async cancel(user: AuthUser, eventId: string) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (!reg) throw new NotFoundException('尚未報名此活動');
    if (reg.status === RegistrationStatus.CANCEL_PENDING) {
      throw new BadRequestException('取消申請審核中，請等候管理員處理');
    }
    if (reg.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException('報名已取消');
    }
    if (
      reg.status !== RegistrationStatus.REGISTERED &&
      reg.status !== RegistrationStatus.WAITLISTED
    ) {
      throw new BadRequestException('目前狀態無法申請取消');
    }

    // 候補未佔名額：可直接取消
    if (reg.status === RegistrationStatus.WAITLISTED) {
      return this.prisma.eventRegistration.update({
        where: { id: reg.id },
        data: { status: RegistrationStatus.CANCELLED },
      });
    }

    return this.prisma.eventRegistration.update({
      where: { id: reg.id },
      data: { status: RegistrationStatus.CANCEL_PENDING },
    });
  }

  /** 管理員核准取消報名 */
  async approveCancel(user: AuthUser, eventId: string, registrationId: string) {
    await this.assertOrganizer(user, eventId);
    const reg = await this.prisma.eventRegistration.findFirst({
      where: { id: registrationId, eventId },
    });
    if (!reg) throw new NotFoundException();
    if (reg.status !== RegistrationStatus.CANCEL_PENDING) {
      throw new BadRequestException('此報名並非取消審核中');
    }
    const updated = await this.prisma.eventRegistration.update({
      where: { id: reg.id },
      data: { status: RegistrationStatus.CANCELLED },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'EVENT_CANCEL_APPROVE',
      targetType: 'EventRegistration',
      targetId: reg.id,
      metadata: { eventId },
    });
    return updated;
  }

  /** 管理員駁回取消申請：恢復為已報名 */
  async rejectCancel(user: AuthUser, eventId: string, registrationId: string) {
    await this.assertOrganizer(user, eventId);
    const reg = await this.prisma.eventRegistration.findFirst({
      where: { id: registrationId, eventId },
    });
    if (!reg) throw new NotFoundException();
    if (reg.status !== RegistrationStatus.CANCEL_PENDING) {
      throw new BadRequestException('此報名並非取消審核中');
    }
    const updated = await this.prisma.eventRegistration.update({
      where: { id: reg.id },
      data: { status: RegistrationStatus.REGISTERED },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'EVENT_CANCEL_REJECT',
      targetType: 'EventRegistration',
      targetId: reg.id,
      metadata: { eventId },
    });
    return updated;
  }

  /** 產生動態簽到 Token；使舊 token 立即失效，避免截圖重用 */
  async issueCheckinToken(user: AuthUser, eventId: string) {
    await this.assertOrganizer(user, eventId);
    const now = new Date();
    await this.prisma.checkinToken.deleteMany({
      where: { eventId, expiresAt: { lt: now } },
    });
    // 將尚未過期的舊碼提前失效
    await this.prisma.checkinToken.updateMany({
      where: { eventId, expiresAt: { gte: now } },
      data: { expiresAt: now },
    });

    const token = randomBytes(16).toString('base64url');
    const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);
    await this.prisma.checkinToken.create({
      data: { eventId, token, expiresAt },
    });

    // App／QR 可掃的 payload（含 eventId，掃一次即可簽到）
    const payload = JSON.stringify({ e: eventId, t: token });
    return {
      token,
      eventId,
      payload,
      expiresAt,
      ttlSeconds: QR_TTL_SECONDS,
    };
  }

  /** 會友一鍵簽到（須已報名且狀態為 REGISTERED） */
  async checkinSelf(user: AuthUser, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException();

    const reg = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (!reg || reg.status !== RegistrationStatus.REGISTERED) {
      throw new BadRequestException('請先完成報名後再簽到');
    }

    await this.prisma.eventCheckin.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      create: {
        eventId,
        userId: user.id,
        method: CheckinMethod.MANUAL,
      },
      update: {},
    });
    return { ok: true, message: '完成簽到' };
  }

  /** 會友掃描／輸入動態碼簽到（須已報名且狀態為 REGISTERED） */
  async checkin(user: AuthUser, eventId: string, token: string) {
    let resolvedToken = token.trim();
    let resolvedEventId = eventId;
    // 支援掃 QR payload：{"e":"...","t":"..."}
    if (resolvedToken.startsWith('{')) {
      try {
        const parsed = JSON.parse(resolvedToken) as { e?: string; t?: string };
        if (parsed.e && parsed.t) {
          resolvedEventId = parsed.e;
          resolvedToken = parsed.t;
        }
      } catch {
        /* 當作純 token */
      }
    }
    if (resolvedEventId !== eventId) {
      throw new BadRequestException('簽到碼與活動不符');
    }

    const record = await this.prisma.checkinToken.findUnique({
      where: { token: resolvedToken },
    });
    if (
      !record ||
      record.eventId !== eventId ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('簽到碼無效或已過期');
    }

    const reg = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (!reg || reg.status !== RegistrationStatus.REGISTERED) {
      throw new BadRequestException('請先完成報名後再簽到');
    }

    return this.prisma.eventCheckin.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      create: {
        eventId,
        userId: user.id,
        method: CheckinMethod.DYNAMIC_QR,
      },
      update: {},
    });
  }

  /** 出席名單：含簽到狀態（行蹤資料，僅主辦同工/管理員） */
  async roster(user: AuthUser, eventId: string) {
    await this.assertOrganizer(user, eventId);
    await this.audit.log({
      actorId: user.id,
      action: 'EVENT_ROSTER_VIEW',
      targetType: 'Event',
      targetId: eventId,
    });

    const [regs, checkins] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where: { eventId },
        include: {
          user: { select: { id: true, displayName: true, phone: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.eventCheckin.findMany({
        where: { eventId },
        select: { userId: true, checkedInAt: true, method: true },
      }),
    ]);

    const checkinMap = new Map(checkins.map((c) => [c.userId, c]));
    return regs.map((r) => {
      const c = checkinMap.get(r.userId);
      return {
        ...r,
        checkedIn: !!c,
        checkedInAt: c?.checkedInAt ?? null,
        checkinMethod: c?.method ?? null,
      };
    });
  }

  /** 後台同工／管理員皆可查名單與產簽到碼（共用帳號情境） */
  private async assertOrganizer(user: AuthUser, eventId: string) {
    if (user.role === Role.ADMIN || user.role === Role.STAFF) {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true },
      });
      if (!event) throw new NotFoundException();
      return;
    }
    throw new ForbiddenException('僅牧區同工／管理員可存取活動名單與簽到碼');
  }
}
