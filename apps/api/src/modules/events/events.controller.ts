import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { Role } from '../../common/enums';
import {
  AuthUser,
  CurrentUser,
} from '../../auth/decorators/current-user.decorator';
import { OptionalAuth } from '../../auth/decorators/optional-auth.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EventsService } from './events.service';
import {
  CheckinDto,
  CreateEventDto,
  RegisterEventDto,
} from './dto/event.dto';

class UpdateEventDto extends PartialType(CreateEventDto) {}

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Roles(Role.STAFF)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.service.create(user, dto);
  }

  /** 活動目錄公開；報名／簽到仍需登入 */
  @Public()
  @Get()
  list() {
    return this.service.list();
  }

  @Roles(Role.STAFF)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.STAFF)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  /** 登入失效時回空陣列，避免 APP 整頁載入失敗 */
  @OptionalAuth()
  @Get('mine')
  mine(@CurrentUser('id') userId?: string) {
    if (!userId) return [];
    return this.service.myRegistrations(userId);
  }

  /** 待審核取消報名（後台首屏顯示，勿藏在名單內） */
  @Roles(Role.STAFF)
  @Get('cancel-pending')
  cancelPending() {
    return this.service.listCancelPending();
  }

  @Post(':id/register')
  register(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RegisterEventDto,
  ) {
    return this.service.register(user, id, dto);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.cancel(user, id);
  }

  @Roles(Role.STAFF)
  @Post(':id/registrations/:regId/approve-cancel')
  approveCancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('regId') regId: string,
  ) {
    return this.service.approveCancel(user, id, regId);
  }

  @Roles(Role.STAFF)
  @Post(':id/registrations/:regId/reject-cancel')
  rejectCancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('regId') regId: string,
  ) {
    return this.service.rejectCancel(user, id, regId);
  }

  @Roles(Role.STAFF)
  @Post(':id/checkin-token')
  issueToken(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.issueCheckinToken(user, id);
  }

  /** 會友一鍵簽到（課程活動） */
  @Post(':id/checkin-self')
  checkinSelf(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.checkinSelf(user, id);
  }

  @Post(':id/checkin')
  checkin(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CheckinDto,
  ) {
    return this.service.checkin(user, id, dto.token);
  }

  @Roles(Role.STAFF)
  @Get(':id/roster')
  roster(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.roster(user, id);
  }
}
