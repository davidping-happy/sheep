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
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser } from '../../auth/decorators/current-user.decorator';
import { CreateEventDto, RegisterEventDto } from './dto/event.dto';

const QR_TTL_SECONDS = 30; // 動態 QR Code 每 30 秒輪替 (§6.1)

/**
 * 6. 活動報名與簽到 (§6.1)。
 *  - 報名即時扣名額，額滿轉候補 (WAITLISTED)
 *  - 簽到採短效期動態 Token，避免截圖重用
 *  - 出席名單僅主辦同工/管理員可查（行蹤資料，§四.8）
 */
@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  create(user: AuthUser, dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        location: dto.location,
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

  list() {
    return this.prisma.event.findMany({ orderBy: { startAt: 'asc' } });
  }

  async register(user: AuthUser, eventId: string, dto: RegisterEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { registrations: true } } },
    });
    if (!event) throw new NotFoundException();
    if (event.registerDeadline && event.registerDeadline < new Date()) {
      throw new BadRequestException('報名已截止');
    }
    if (event.requiresGuardianConsent && !dto.guardianConsent) {
      throw new BadRequestException('此活動需監護人同意');
    }

    const activeCount = await this.prisma.eventRegistration.count({
      where: { eventId, status: RegistrationStatus.REGISTERED },
    });
    // 額滿轉候補
    const status =
      event.capacity != null && activeCount >= event.capacity
        ? RegistrationStatus.WAITLISTED
        : RegistrationStatus.REGISTERED;

    return this.prisma.eventRegistration.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      create: {
        eventId,
        userId: user.id,
        status,
        guardianConsent: dto.guardianConsent ?? false,
      },
      update: { status, guardianConsent: dto.guardianConsent ?? false },
    });
  }

  async cancel(user: AuthUser, eventId: string) {
    return this.prisma.eventRegistration.update({
      where: { eventId_userId: { eventId, userId: user.id } },
      data: { status: RegistrationStatus.CANCELLED },
    });
  }

  /** 產生當前有效的動態簽到 Token（同工在現場螢幕輪播） */
  async issueCheckinToken(user: AuthUser, eventId: string) {
    await this.assertOrganizer(user, eventId);
    const token = randomBytes(16).toString('base64url');
    const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);
    await this.prisma.checkinToken.create({
      data: { eventId, token, expiresAt },
    });
    return { token, expiresAt, ttlSeconds: QR_TTL_SECONDS };
  }

  /** 會友掃描 QR 後帶 token 簽到 */
  async checkin(user: AuthUser, eventId: string, token: string) {
    const record = await this.prisma.checkinToken.findUnique({
      where: { token },
    });
    if (!record || record.eventId !== eventId || record.expiresAt < new Date()) {
      throw new BadRequestException('簽到碼無效或已過期');
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

  /** 出席名單：行蹤資料，僅主辦同工/管理員 + 稽核 (§四.8 / §四.9) */
  async roster(user: AuthUser, eventId: string) {
    await this.assertOrganizer(user, eventId);
    await this.audit.log({
      actorId: user.id,
      action: 'EVENT_ROSTER_VIEW',
      targetType: 'Event',
      targetId: eventId,
    });
    return this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, displayName: true, phone: true } },
      },
    });
  }

  private async assertOrganizer(user: AuthUser, eventId: string) {
    if (user.role === Role.ADMIN) return;
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException();
    if (event.createdBy !== user.id) {
      throw new ForbiddenException('僅該活動主辦同工可存取');
    }
  }
}
