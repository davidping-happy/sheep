import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleCategory } from '../../common/enums';
import { normalizeImageUrls } from '../../common/media-urls';
import { PrismaService } from '../../prisma/prisma.service';

interface ArticleInput {
  title: string;
  slug: string;
  body: string;
  category?: ArticleCategory;
  coverUrl?: string;
  imageUrls?: string[];
  isPublished?: boolean;
}

const MAX_IMAGES = 5;

function withImages<T extends { coverUrl?: string | null; imageUrls?: string[] }>(
  row: T,
) {
  const imageUrls = normalizeImageUrls(row.imageUrls, MAX_IMAGES, row.coverUrl);
  return {
    ...row,
    imageUrls,
    coverUrl: imageUrls[0] ?? null,
  };
}

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(category?: ArticleCategory) {
    const rows = await this.prisma.article.findMany({
      where: { isPublished: true, category },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        coverUrl: true,
        imageUrls: true,
        publishedAt: true,
      },
    });
    return rows.map(withImages);
  }

  /** 後台 CMS：含草稿 */
  async listAll() {
    const rows = await this.prisma.article.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        coverUrl: true,
        imageUrls: true,
        isPublished: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    return rows.map(withImages);
  }

  /** 後台編輯：含未發布全文 */
  async getForStaff(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException();
    return withImages(article);
  }

  async getBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    if (!article || !article.isPublished) throw new NotFoundException();
    return withImages(article);
  }

  create(authorId: string, dto: ArticleInput) {
    const imageUrls = normalizeImageUrls(dto.imageUrls, MAX_IMAGES, dto.coverUrl);
    return this.prisma.article.create({
      data: {
        authorId,
        title: dto.title,
        slug: dto.slug,
        body: dto.body,
        category: dto.category ?? ArticleCategory.DAILY_BREAD,
        imageUrls,
        coverUrl: imageUrls[0] ?? null,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });
  }

  update(id: string, dto: Partial<ArticleInput>) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.imageUrls !== undefined || dto.coverUrl !== undefined) {
      const imageUrls = normalizeImageUrls(dto.imageUrls, MAX_IMAGES, dto.coverUrl);
      data.imageUrls = imageUrls;
      data.coverUrl = imageUrls[0] ?? null;
    }
    if (dto.isPublished === true) {
      data.publishedAt = new Date();
    } else if (dto.isPublished === false) {
      data.publishedAt = null;
    }
    return this.prisma.article.update({
      where: { id },
      data,
    });
  }
}
