import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../auth/decorators/current-user.decorator';

interface GroupInput {
  pastoralAreaId: string;
  name: string;
  intro?: string;
  photoUrl?: string;
  meetingTime?: string;
  meetingPlace?: string;
  contactVisible?: boolean;
  leaderId?: string;
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

  listAreas() {
    return this.prisma.pastoralArea.findMany({
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
            meetingTime: true,
            meetingPlace: true,
            intro: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  createArea(name: string, description?: string, photoUrl?: string) {
    return this.prisma.pastoralArea.create({
      data: { name, description, photoUrl },
    });
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
    return group;
  }

  createGroup(dto: GroupInput) {
    return this.prisma.smallGroup.create({ data: dto });
  }

  async updateGroup(user: AuthUser, id: string, dto: Partial<GroupInput>) {
    await this.assertCanEdit(user, id);
    return this.prisma.smallGroup.update({ where: { id }, data: dto });
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
