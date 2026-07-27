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
  AuthUser,
  CurrentUser,
} from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EventsService } from './events.service';
import {
  CheckinDto,
  CreateEventDto,
  RegisterEventDto,
} from './dto/event.dto';

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

  @Get()
  list() {
    return this.service.list();
  }

  @Get('mine')
  mine(@CurrentUser('id') userId: string) {
    return this.service.myRegistrations(userId);
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
  @Post(':id/checkin-token')
  issueToken(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.issueCheckinToken(user, id);
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
