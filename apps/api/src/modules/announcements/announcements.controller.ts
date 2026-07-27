import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PushAudience, Role } from '../../common/enums';
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
import { PushService } from './push.service';

class CreateAnnouncementDto {
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsEnum(PushAudience) audience?: PushAudience;
  @IsOptional() @IsUUID() pastoralAreaId?: string;
  @IsOptional() @IsUUID() targetGroupId?: string;
  @IsOptional() @IsEnum(Role) targetRole?: Role;
}

class RegisterDeviceDto {
  @IsString() fcmToken!: string;
  @IsString() platform!: string; // ios | android | web
}

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly service: AnnouncementsService,
    private readonly push: PushService,
  ) {}

  @Public()
  @Get()
  list() {
    return this.service.listPublished();
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Get('manage')
  listManage() {
    return this.service.listAll();
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Post('preview-audience')
  preview(@Body() dto: CreateAnnouncementDto) {
    return this.service.previewAudience(dto);
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

/** 裝置推播 token 註冊（獨立 controller 路徑更清楚） */
@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly push: PushService) {}

  @Post('register')
  register(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.push.registerDevice(userId, dto.fcmToken, dto.platform);
  }
}
