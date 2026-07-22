import { Injectable, NotFoundException } from '@nestjs/common';
import { PushAudience, Role } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../auth/decorators/current-user.decorator';
import { PushService } from './push.service';

interface AnnouncementInput {
  title: string;
  body: string;
  audience?: PushAudience;
  pastoralAreaId?: string;
  targetGroupId?: string;
  targetRole?: Role;
}

/** 5. 牧區最新資訊 / 公告推播 (§二.5) */
@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  listPublished() {
    return this.prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  create(user: AuthUser, dto: AnnouncementInput) {
    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.body,
        audience: dto.audience ?? PushAudience.ALL,
        pastoralAreaId: dto.pastoralAreaId,
        targetGroupId: dto.targetGroupId,
        targetRole: dto.targetRole,
        createdBy: user.id,
      },
    });
  }

  /** 發布並推播（分眾） */
  async publishAndPush(id: string) {
    const ann = await this.prisma.announcement.findUnique({ where: { id } });
    if (!ann) throw new NotFoundException();

    const count = await this.push.send(ann.title, ann.body, {
      audience: ann.audience as PushAudience,
      pastoralAreaId: ann.pastoralAreaId,
      targetGroupId: ann.targetGroupId,
      targetRole: ann.targetRole,
    });

    return this.prisma.announcement.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        pushSentAt: new Date(),
      },
    }).then((updated) => ({ ...updated, pushedDevices: count }));
  }
}
