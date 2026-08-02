import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { ArticleCategory, Role } from '../../common/enums';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  AuthUser,
  CurrentUser,
} from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ArticlesService } from './articles.service';

class UpsertArticleDto {
  @IsString() title!: string;
  @IsString() slug!: string;
  @IsString() body!: string;
  @IsOptional() @IsEnum(ArticleCategory) category?: ArticleCategory;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  imageUrls?: string[];
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

class UpdateArticleDto extends PartialType(UpsertArticleDto) {}

/** 3. 靈修佳文分享（CMS 上稿，§二.3） */
@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Public()
  @Get()
  list(@Query('category') category?: ArticleCategory) {
    return this.service.listPublished(category);
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Get('manage')
  listManage() {
    return this.service.listAll();
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Get('manage/:id')
  getManage(@Param('id') id: string) {
    return this.service.getForStaff(id);
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: UpsertArticleDto) {
    return this.service.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
