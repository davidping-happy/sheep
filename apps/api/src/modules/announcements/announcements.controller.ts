import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PushAudience, Role } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  AuthUser,
  CurrentUser,
} from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AnnouncementsService } from './announcements.service';

class CreateAnnouncementDto {
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsEnum(PushAudience) audience?: PushAudience;
  @IsOptional() @IsUUID() pastoralAreaId?: string;
  @IsOptional() @IsUUID() targetGroupId?: string;
  @IsOptional() @IsEnum(Role) targetRole?: Role;
}

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Public()
  @Get()
  list() {
    return this.service.listPublished();
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.service.create(user, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.service.publishAndPush(id);
  }
}
