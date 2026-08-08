import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DevotionCategory, Visibility } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service';
import { CreateDevotionDto, UpdateDevotionDto } from './dto/devotion.dto';

/**
 * 1. 靈修隨記 — 個人資料，嚴格權限隔離 (§二.1 / §四.1)。
 *  - 內容以 AES-256 加密後才存 DB
 *  - 分類：講道／晨禱／靈修
 *  - 預設 PRIVATE；只有本人可讀寫；GROUP 才對小組成員可見
 */
@Injectable()
export class DevotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldEncryptionService,
  ) {}

  async create(userId: string, dto: CreateDevotionDto) {
    const note = await this.prisma.devotionNote.create({
      data: {
        authorId: userId,
        noteDate: new Date(dto.noteDate),
        category: dto.category ?? DevotionCategory.DEVOTION,
        scriptureRef: dto.scriptureRef,
        contentEncrypted: this.crypto.encrypt(dto.content),
        visibility: dto.visibility ?? Visibility.PRIVATE,
        sharedGroupId:
          dto.visibility === Visibility.GROUP ? dto.sharedGroupId : null,
      },
    });
    return this.decrypt(note);
  }

  async findMine(userId: string) {
    const notes = await this.prisma.devotionNote.findMany({
      where: { authorId: userId },
      orderBy: { noteDate: 'desc' },
    });
    return notes.map((n) => this.decrypt(n));
  }

  async findOne(userId: string, id: string) {
    const note = await this.prisma.devotionNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException();
    if (note.authorId === userId) return this.decrypt(note);

    // 小組可見：同組成員可讀
    if (
      note.visibility === Visibility.GROUP &&
      note.sharedGroupId
    ) {
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: note.sharedGroupId,
            userId,
          },
        },
      });
      if (membership) return this.decrypt(note);
    }
    throw new ForbiddenException('無權存取此筆記');
  }

  /** 與我分享到小組的筆記（他人分享） */
  async findSharedWithMe(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) return [];

    const notes = await this.prisma.devotionNote.findMany({
      where: {
        visibility: Visibility.GROUP,
        sharedGroupId: { in: groupIds },
        authorId: { not: userId },
      },
      orderBy: { noteDate: 'desc' },
      take: 50,
    });
    return notes.map((n) => this.decrypt(n));
  }

  async update(userId: string, id: string, dto: UpdateDevotionDto) {
    await this.assertOwner(userId, id);
    const note = await this.prisma.devotionNote.update({
      where: { id },
      data: {
        category: dto.category,
        scriptureRef: dto.scriptureRef,
        contentEncrypted: dto.content
          ? this.crypto.encrypt(dto.content)
          : undefined,
        visibility: dto.visibility,
        sharedGroupId:
          dto.visibility === Visibility.GROUP
            ? dto.sharedGroupId
            : dto.visibility === Visibility.PRIVATE
              ? null
              : dto.sharedGroupId,
      },
    });
    return this.decrypt(note);
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.devotionNote.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertOwner(userId: string, id: string) {
    const note = await this.prisma.devotionNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException();
    if (note.authorId !== userId) {
      throw new ForbiddenException('僅作者可修改／刪除筆記');
    }
    return note;
  }

  private decrypt(note: { contentEncrypted: string } & Record<string, unknown>) {
    const { contentEncrypted, ...rest } = note;
    return { ...rest, content: this.crypto.decrypt(contentEncrypted) };
  }
}
