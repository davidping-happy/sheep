import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/enums';
import {
  CurrentUser,
  AuthUser,
} from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PrayerService } from './prayer.service';
import {
  CreatePrayerDto,
  ModeratePrayerDto,
  ReportPrayerDto,
  RespondPrayerDto,
} from './dto/prayer.dto';

@ApiTags('prayer')
@ApiBearerAuth()
@Controller('prayer')
export class PrayerController {
  constructor(private readonly service: PrayerService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePrayerDto) {
    return this.service.create(user, dto);
  }

  @Get('feed')
  feed(@CurrentUser() user: AuthUser) {
    return this.service.feed(user);
  }

  @Roles(Role.STAFF)
  @Get('moderation/queue')
  queue(@CurrentUser() user: AuthUser) {
    return this.service.moderationQueue(user);
  }

  @Roles(Role.STAFF)
  @Get('moderation/recent')
  recent(@CurrentUser() user: AuthUser) {
    return this.service.adminRecent(user);
  }

  @Roles(Role.STAFF)
  @Post('moderation/approve-stale-public')
  approveStale(@CurrentUser() user: AuthUser) {
    return this.service.approveStalePublicPending(user);
  }

  @Roles(Role.STAFF)
  @Post(':id/moderate')
  moderate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ModeratePrayerDto,
  ) {
    return this.service.moderate(user, id, dto);
  }

  @Roles(Role.ADMIN)
  @Post(':id/reveal')
  reveal(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.revealAnonymity(user, id);
  }

  @Post(':id/respond')
  respond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RespondPrayerDto,
  ) {
    return this.service.respond(user, id, dto);
  }

  @Post(':id/report')
  report(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReportPrayerDto,
  ) {
    return this.service.report(user, id, dto.reason);
  }

  @Post(':id/takedown')
  takeDown(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.takeDown(user, id);
  }

  /** 後台刪除（軟刪除／下架），STAFF+ */
  @Roles(Role.STAFF)
  @Post(':id/admin-delete')
  adminDelete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.takeDown(user, id);
  }
}
