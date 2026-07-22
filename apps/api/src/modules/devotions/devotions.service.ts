import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Visibility } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service';
import { CreateDevotionDto, UpdateDevotionDto } from './dto/devotion.dto';

/**
 * 1. 晨禱靈修筆記 — 個人資料，嚴格權限隔離 (§二.1 / §四.1)。
 *  - 內容以 AES-256 加密後才存 DB
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
    if (note.authorId !== userId) {
      // 僅本人可讀；GROUP 分享的讀取邏輯另行實作（需驗證同組）
      throw new ForbiddenException('無權存取此筆記');
    }
    return this.decrypt(note);
  }

  async update(userId: string, id: string, dto: UpdateDevotionDto) {
    await this.findOne(userId, id); // 所有權檢查
    const note = await this.prisma.devotionNote.update({
      where: { id },
      data: {
        scriptureRef: dto.scriptureRef,
        contentEncrypted: dto.content
          ? this.crypto.encrypt(dto.content)
          : undefined,
        visibility: dto.visibility,
        sharedGroupId: dto.sharedGroupId,
      },
    });
    return this.decrypt(note);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.devotionNote.delete({ where: { id } });
    return { deleted: true };
  }

  private decrypt(note: { contentEncrypted: string } & Record<string, unknown>) {
    const { contentEncrypted, ...rest } = note;
    return { ...rest, content: this.crypto.decrypt(contentEncrypted) };
  }
}
