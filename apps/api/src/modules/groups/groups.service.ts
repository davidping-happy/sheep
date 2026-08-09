import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../common/enums';
import { normalizeImageUrls } from '../../common/media-urls';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../auth/decorators/current-user.decorator';

interface ZoneInput {
  pastoralAreaId: string;
  code: string;
  leaderName?: string;
  intro?: string;
  photoUrl?: string;
  imageUrls?: string[];
}

interface GroupInput {
  zoneId: string;
  pastoralAreaId?: string;
  name: string;
  intro?: string;
  leaderName?: string;
  photoUrl?: string;
  imageUrls?: string[];
  meetingTime?: string;
  meetingPlace?: string;
  contactVisible?: boolean;
  leaderId?: string;
}

const MAX_IMAGES = 7;

function withImages<
  T extends { photoUrl?: string | null; imageUrls?: string[] },
>(row: T) {
  const imageUrls = normalizeImageUrls(
    row.imageUrls,
    MAX_IMAGES,
    row.photoUrl,
  );
  return {
    ...row,
    imageUrls,
    photoUrl: imageUrls[0] ?? null,
  };
}

/**
 * 4. 牧區・小區・小組（目錄式分層）。
 */
@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAreas() {
    const areas = await this.prisma.pastoralArea.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        photoUrl: true,
        zones: {
          select: {
            id: true,
            code: true,
            leaderName: true,
            intro: true,
            photoUrl: true,
            imageUrls: true,
            groups: {
              select: {
                id: true,
                name: true,
                leaderName: true,
                photoUrl: true,
                imageUrls: true,
                meetingTime: true,
                meetingPlace: true,
                intro: true,
              },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: [{ code: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    return areas.map((area) => {
      const zones = area.zones.map((z) => ({
        ...withImages(z),
        groups: z.groups.map(withImages),
      }));
      // 扁平 groups：相容公告等舊客戶端
      const groups = zones.flatMap((z) => z.groups);
      return { ...area, zones, groups };
    });
  }

  createArea(name: string, description?: string, photoUrl?: string) {
    return this.prisma.pastoralArea.create({
      data: { name, description, photoUrl },
    });
  }

  updateArea(
    id: string,
    dto: { name?: string; description?: string; photoUrl?: string },
  ) {
    return this.prisma.pastoralArea.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
      },
    });
  }

  async removeArea(id: string) {
    const zoneCount = await this.prisma.pastoralZone.count({
      where: { pastoralAreaId: id },
    });
    if (zoneCount > 0) {
      throw new BadRequestException('請先刪除該牧區下的小區，再刪牧區');
    }
    await this.prisma.pastoralArea.delete({ where: { id } });
    return { ok: true };
  }

  async getZone(id: string) {
    const zone = await this.prisma.pastoralZone.findUnique({
      where: { id },
      include: {
        pastoralArea: { select: { id: true, name: true } },
        groups: {
          select: {
            id: true,
            name: true,
            leaderName: true,
            intro: true,
            photoUrl: true,
            imageUrls: true,
            meetingTime: true,
            meetingPlace: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!zone) throw new NotFoundException();
    return {
      ...withImages(zone),
      groups: zone.groups.map(withImages),
    };
  }

  async createZone(dto: ZoneInput) {
    const area = await this.prisma.pastoralArea.findUnique({
      where: { id: dto.pastoralAreaId },
    });
    if (!area) throw new BadRequestException('牧區不存在');
    const code = dto.code?.trim();
    if (!code) throw new BadRequestException('請填寫小區編號');
    const imageUrls = normalizeImageUrls(
      dto.imageUrls,
      MAX_IMAGES,
      dto.photoUrl,
    );
    return this.prisma.pastoralZone.create({
      data: {
        pastoralAreaId: dto.pastoralAreaId,
        code,
        leaderName: dto.leaderName?.trim() ?? '',
        intro: dto.intro,
        imageUrls,
        photoUrl: imageUrls[0] ?? null,
      },
    });
  }

  async updateZone(id: string, dto: Partial<ZoneInput>) {
    const existing = await this.prisma.pastoralZone.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException();
    const data: Record<string, unknown> = {};
    if (dto.pastoralAreaId !== undefined) {
      data.pastoralAreaId = dto.pastoralAreaId;
    }
    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (!code) throw new BadRequestException('請填寫小區編號');
      data.code = code;
    }
    if (dto.leaderName !== undefined) data.leaderName = dto.leaderName.trim();
    if (dto.intro !== undefined) data.intro = dto.intro;
    if (dto.imageUrls !== undefined || dto.photoUrl !== undefined) {
      const imageUrls = normalizeImageUrls(
        dto.imageUrls,
        MAX_IMAGES,
        dto.photoUrl,
      );
      data.imageUrls = imageUrls;
      data.photoUrl = imageUrls[0] ?? null;
    }
    return this.prisma.pastoralZone.update({ where: { id }, data });
  }

  async removeZone(id: string) {
    const count = await this.prisma.smallGroup.count({ where: { zoneId: id } });
    if (count > 0) {
      throw new BadRequestException('請先刪除該小區下的小組，再刪小區');
    }
    await this.prisma.pastoralZone.delete({ where: { id } });
    return { ok: true };
  }

  async getGroup(id: string) {
    const group = await this.prisma.smallGroup.findUnique({
      where: { id },
      include: {
        leader: { select: { id: true, displayName: true } },
        pastoralArea: { select: { id: true, name: true } },
        zone: {
          select: { id: true, code: true, leaderName: true },
        },
      },
    });
    if (!group) throw new NotFoundException();
    return withImages(group);
  }

  async createGroup(dto: GroupInput) {
    const zone = await this.prisma.pastoralZone.findUnique({
      where: { id: dto.zoneId },
    });
    if (!zone) throw new BadRequestException('小區不存在');
    const imageUrls = normalizeImageUrls(
      dto.imageUrls,
      MAX_IMAGES,
      dto.photoUrl,
    );
    return this.prisma.smallGroup.create({
      data: {
        zoneId: dto.zoneId,
        pastoralAreaId: zone.pastoralAreaId,
        name: dto.name,
        intro: dto.intro,
        leaderName: dto.leaderName?.trim() || null,
        meetingTime: dto.meetingTime,
        meetingPlace: dto.meetingPlace,
        contactVisible: dto.contactVisible,
        leaderId: dto.leaderId,
        imageUrls,
        photoUrl: imageUrls[0] ?? null,
      },
    });
  }

  async updateGroup(user: AuthUser, id: string, dto: Partial<GroupInput>) {
    await this.assertCanEdit(user, id);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.intro !== undefined) data.intro = dto.intro;
    if (dto.leaderName !== undefined) {
      data.leaderName = dto.leaderName.trim() || null;
    }
    if (dto.meetingTime !== undefined) data.meetingTime = dto.meetingTime;
    if (dto.meetingPlace !== undefined) data.meetingPlace = dto.meetingPlace;
    if (dto.contactVisible !== undefined) {
      data.contactVisible = dto.contactVisible;
    }
    if (dto.leaderId !== undefined) data.leaderId = dto.leaderId;
    if (dto.zoneId !== undefined) {
      const zone = await this.prisma.pastoralZone.findUnique({
        where: { id: dto.zoneId },
      });
      if (!zone) throw new BadRequestException('小區不存在');
      data.zoneId = zone.id;
      data.pastoralAreaId = zone.pastoralAreaId;
    }
    if (dto.imageUrls !== undefined || dto.photoUrl !== undefined) {
      const imageUrls = normalizeImageUrls(
        dto.imageUrls,
        MAX_IMAGES,
        dto.photoUrl,
      );
      data.imageUrls = imageUrls;
      data.photoUrl = imageUrls[0] ?? null;
    }
    return this.prisma.smallGroup.update({ where: { id }, data });
  }

  async removeGroup(user: AuthUser, id: string) {
    await this.assertCanEdit(user, id);
    await this.prisma.smallGroup.delete({ where: { id } });
    return { ok: true };
  }

  /** 小組長僅能編輯自己帶領的小組；同工/管理員不限 */
  private async assertCanEdit(user: AuthUser, groupId: string) {
    if (user.role === Role.STAFF || user.role === Role.ADMIN) return;
    const group = await this.prisma.smallGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException();
    if (user.role === Role.GROUP_LEADER && group.leaderId === user.id) return;
    throw new ForbiddenException('僅能編輯自己帶領的小組');
  }
}
