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
import { CreateDevotionDto, UpdateDevotionDto } from './dto/devotion.dto';

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

  @Get('shared')
  findShared(@CurrentUser('id') userId: string) {
    return this.service.findSharedWithMe(userId);
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
