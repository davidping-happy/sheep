import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(file?: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('請選擇圖片檔');
    }
    if (!ALLOWED.has(file.mimetype)) {
      throw new BadRequestException('僅支援 JPEG / PNG / WebP / GIF');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('圖片請小於 2MB');
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        mimeType: file.mimetype,
        data: Uint8Array.from(file.buffer),
        byteSize: file.size,
      },
    });

    return {
      id: asset.id,
      url: `/uploads/${asset.id}`,
      mimeType: asset.mimeType,
      byteSize: asset.byteSize,
    };
  }

  async get(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('找不到圖片');
    return asset;
  }
}
