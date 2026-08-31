import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DevotionsService } from './devotions.service';
import {
  CreateDevotionCommentDto,
  CreateDevotionDto,
  UpdateDevotionDto,
} from './dto/devotion.dto';

@ApiTags('devotions')
@ApiBearerAuth()
@Controller('devotions')
export class DevotionsController {
  constructor(private readonly service: DevotionsService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDevotionDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get()
  findMine(@CurrentUser('id') userId: string) {
    return this.service.findMine(userId);
  }

  /** 牧區動態牆（PUBLIC + 我所屬小組） */
  @Get('feed')
  findFeed(@CurrentUser('id') userId: string) {
    return this.service.findFeed(userId);
  }

  @Get('shared')
  findShared(@CurrentUser('id') userId: string) {
    return this.service.findSharedWithMe(userId);
  }

  @Get(':id/comments')
  listComments(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.listComments(userId, id);
  }

  @Post(':id/comments')
  addComment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateDevotionCommentDto,
  ) {
    return this.service.addComment(userId, id, dto);
  }

  @Post(':id/like')
  toggleLike(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.toggleLike(userId, id);
  }

  @Delete('comments/:commentId')
  deleteComment(
    @CurrentUser('id') userId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.service.deleteComment(userId, commentId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDevotionDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }
}
