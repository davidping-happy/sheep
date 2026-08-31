import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DevotionCategory, Visibility } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service';
import {
  CreateDevotionCommentDto,
  CreateDevotionDto,
  UpdateDevotionDto,
} from './dto/devotion.dto';

type NoteRow = {
  id: string;
  authorId: string;
  noteDate: Date;
  category: string;
  scriptureRef: string | null;
  contentEncrypted: string;
  visibility: string;
  sharedGroupId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author?: { id: string; displayName: string; avatarUrl: string | null };
  _count?: { likes: number; comments: number };
  likes?: { userId: string }[];
};

/**
 * 1. 靈修隨記 — 個人資料，嚴格權限隔離 (§二.1 / §四.1)。
 *  - 內容以 AES-256 加密後才存 DB
 *  - 預設 PRIVATE；PUBLIC 牧區動態牆；GROUP 小組成員可見
 *  - PUBLIC／GROUP 支援按讚與留言
 */
@Injectable()
export class DevotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldEncryptionService,
  ) {}

  async create(userId: string, dto: CreateDevotionDto) {
    if (dto.visibility === Visibility.GROUP && !dto.sharedGroupId) {
      throw new BadRequestException('小組分享需指定 sharedGroupId');
    }
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
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    return this.toPublic(note, userId, false);
  }

  async findMine(userId: string) {
    const notes = await this.prisma.devotionNote.findMany({
      where: { authorId: userId },
      orderBy: { noteDate: 'desc' },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { userId: true } },
      },
    });
    return notes.map((n) =>
      this.toPublic(n, userId, (n.likes?.length ?? 0) > 0),
    );
  }

  /**
   * 牧區動態牆：PUBLIC 筆記 + 我所屬小組的 GROUP 筆記（含自己）
   */
  async findFeed(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    const notes = await this.prisma.devotionNote.findMany({
      where: {
        OR: [
          { visibility: Visibility.PUBLIC },
          ...(groupIds.length
            ? [
                {
                  visibility: Visibility.GROUP,
                  sharedGroupId: { in: groupIds },
                },
              ]
            : []),
        ],
      },
      orderBy: [{ noteDate: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { userId: true } },
      },
    });
    return notes.map((n) =>
      this.toPublic(n, userId, (n.likes?.length ?? 0) > 0),
    );
  }

  async findOne(userId: string, id: string) {
    const note = await this.prisma.devotionNote.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { userId: true } },
      },
    });
    if (!note) throw new NotFoundException();
    await this.assertCanRead(userId, note);
    return this.toPublic(note, userId, (note.likes?.length ?? 0) > 0);
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
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { userId: true } },
      },
    });
    return notes.map((n) =>
      this.toPublic(n, userId, (n.likes?.length ?? 0) > 0),
    );
  }

  async update(userId: string, id: string, dto: UpdateDevotionDto) {
    await this.assertOwner(userId, id);
    if (dto.visibility === Visibility.GROUP && !dto.sharedGroupId) {
      // allow keeping existing sharedGroupId if not sent
      const existing = await this.prisma.devotionNote.findUnique({
        where: { id },
      });
      if (!existing?.sharedGroupId && !dto.sharedGroupId) {
        throw new BadRequestException('小組分享需指定 sharedGroupId');
      }
    }
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
            : dto.visibility === Visibility.PRIVATE ||
                dto.visibility === Visibility.PUBLIC
              ? null
              : dto.sharedGroupId,
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { userId: true } },
      },
    });
    return this.toPublic(note, userId, (note.likes?.length ?? 0) > 0);
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.devotionNote.delete({ where: { id } });
    return { deleted: true };
  }

  async toggleLike(userId: string, noteId: string) {
    const note = await this.prisma.devotionNote.findUnique({
      where: { id: noteId },
    });
    if (!note) throw new NotFoundException();
    await this.assertCanInteract(userId, note);

    const existing = await this.prisma.devotionLike.findUnique({
      where: { noteId_userId: { noteId, userId } },
    });
    if (existing) {
      await this.prisma.devotionLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.devotionLike.create({ data: { noteId, userId } });
    }
    const likeCount = await this.prisma.devotionLike.count({
      where: { noteId },
    });
    return { liked: !existing, likeCount };
  }

  async listComments(userId: string, noteId: string) {
    const note = await this.prisma.devotionNote.findUnique({
      where: { id: noteId },
    });
    if (!note) throw new NotFoundException();
    await this.assertCanRead(userId, note);

    const comments = await this.prisma.devotionComment.findMany({
      where: { noteId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: c.author,
      isMine: c.authorId === userId,
    }));
  }

  async addComment(
    userId: string,
    noteId: string,
    dto: CreateDevotionCommentDto,
  ) {
    const note = await this.prisma.devotionNote.findUnique({
      where: { id: noteId },
    });
    if (!note) throw new NotFoundException();
    await this.assertCanInteract(userId, note);

    const comment = await this.prisma.devotionComment.create({
      data: {
        noteId,
        authorId: userId,
        content: dto.content.trim(),
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: comment.author,
      isMine: true,
    };
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.devotionComment.findUnique({
      where: { id: commentId },
      include: { note: true },
    });
    if (!comment) throw new NotFoundException();
    if (
      comment.authorId !== userId &&
      comment.note.authorId !== userId
    ) {
      throw new ForbiddenException('僅留言者或筆記作者可刪除');
    }
    await this.prisma.devotionComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  private async assertCanRead(
    userId: string,
    note: {
      authorId: string;
      visibility: string;
      sharedGroupId: string | null;
    },
  ) {
    if (note.authorId === userId) return;
    if (note.visibility === Visibility.PUBLIC) return;
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
      if (membership) return;
    }
    throw new ForbiddenException('無權存取此筆記');
  }

  /** 按讚／留言：僅 PUBLIC 或可見小組筆記 */
  private async assertCanInteract(
    userId: string,
    note: {
      authorId: string;
      visibility: string;
      sharedGroupId: string | null;
    },
  ) {
    if (note.visibility === Visibility.PRIVATE) {
      throw new ForbiddenException('私人筆記無法按讚或留言');
    }
    await this.assertCanRead(userId, note);
  }

  private async assertOwner(userId: string, id: string) {
    const note = await this.prisma.devotionNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException();
    if (note.authorId !== userId) {
      throw new ForbiddenException('僅作者可修改／刪除筆記');
    }
    return note;
  }

  private toPublic(note: NoteRow, userId: string, likedByMe: boolean) {
    const { contentEncrypted, likes: _likes, _count, author, ...rest } = note;
    return {
      ...rest,
      content: this.crypto.decrypt(contentEncrypted),
      author: author ?? undefined,
      likeCount: _count?.likes ?? 0,
      commentCount: _count?.comments ?? 0,
      likedByMe,
      isMine: note.authorId === userId,
    };
  }
}
