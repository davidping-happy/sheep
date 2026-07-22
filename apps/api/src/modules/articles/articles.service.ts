import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleCategory } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';

interface ArticleInput {
  title: string;
  slug: string;
  body: string;
  category?: ArticleCategory;
  coverUrl?: string;
  isPublished?: boolean;
}

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublished(category?: ArticleCategory) {
    return this.prisma.article.findMany({
      where: { isPublished: true, category },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        coverUrl: true,
        publishedAt: true,
      },
    });
  }

  async getBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    if (!article || !article.isPublished) throw new NotFoundException();
    return article;
  }

  create(authorId: string, dto: ArticleInput) {
    return this.prisma.article.create({
      data: {
        authorId,
        title: dto.title,
        slug: dto.slug,
        body: dto.body,
        category: dto.category ?? ArticleCategory.DAILY_BREAD,
        coverUrl: dto.coverUrl,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });
  }

  update(id: string, dto: Partial<ArticleInput>) {
    return this.prisma.article.update({
      where: { id },
      data: {
        ...dto,
        publishedAt: dto.isPublished ? new Date() : undefined,
      },
    });
  }
}
