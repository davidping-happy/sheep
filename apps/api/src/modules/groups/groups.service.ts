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

interface GroupInput {
  pastoralAreaId: string;
  name: string;
  intro?: string;
  photoUrl?: string;
  imageUrls?: string[];
  meetingTime?: string;
  meetingPlace?: string;
  contactVisible?: boolean;
  leaderId?: string;
}

const MAX_GROUP_IMAGES = 7;

function withGroupImages<
  T extends { photoUrl?: string | null; imageUrls?: string[] },
>(row: T) {
  const imageUrls = normalizeImageUrls(
    row.imageUrls,
    MAX_GROUP_IMAGES,
    row.photoUrl,
  );
  return {
    ...row,
    imageUrls,
    photoUrl: imageUrls[0] ?? null,
  };
}

/**
 * 4. 牧區領袖・小組介紹 (§二.4)。
 *  - 目錄式資料
 *  - 聯絡資訊 contactVisible 預設 false，需當事人同意才揭露 (§四.8)
 *  - 小組長只能編輯自己帶的小組 (§四.9 最小權限)
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
        groups: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            imageUrls: true,
            meetingTime: true,
            meetingPlace: true,
            intro: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    return areas.map((area) => ({
      ...area,
      groups: area.groups.map(withGroupImages),
    }));
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
    const count = await this.prisma.smallGroup.count({
      where: { pastoralAreaId: id },
    });
    if (count > 0) {
      throw new BadRequestException('請先刪除該牧區下的小組，再刪牧區');
    }
    await this.prisma.pastoralArea.delete({ where: { id } });
    return { ok: true };
  }

  async getGroup(id: string) {
    const group = await this.prisma.smallGroup.findUnique({
      where: { id },
      include: {
        leader: { select: { id: true, displayName: true } },
        pastoralArea: { select: { id: true, name: true } },
      },
    });
    if (!group) throw new NotFoundException();
    return withGroupImages(group);
  }

  createGroup(dto: GroupInput) {
    const imageUrls = normalizeImageUrls(
      dto.imageUrls,
      MAX_GROUP_IMAGES,
      dto.photoUrl,
    );
    const { imageUrls: _i, photoUrl: _p, ...rest } = dto;
    return this.prisma.smallGroup.create({
      data: {
        ...rest,
        imageUrls,
        photoUrl: imageUrls[0] ?? null,
      },
    });
  }

  async updateGroup(user: AuthUser, id: string, dto: Partial<GroupInput>) {
    await this.assertCanEdit(user, id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.imageUrls !== undefined || dto.photoUrl !== undefined) {
      const imageUrls = normalizeImageUrls(
        dto.imageUrls,
        MAX_GROUP_IMAGES,
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
