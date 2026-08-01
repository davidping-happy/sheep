import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/enums';
import {
  IsBoolean,
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
import { GroupsService } from './groups.service';

class CreateGroupDto {
  @IsUUID() pastoralAreaId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() intro?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() meetingTime?: string;
  @IsOptional() @IsString() meetingPlace?: string;
  @IsOptional() @IsBoolean() contactVisible?: boolean;
  @IsOptional() @IsUUID() leaderId?: string;
}

class CreateAreaDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() photoUrl?: string;
}

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Public()
  @Get('areas')
  areas() {
    return this.service.listAreas();
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Post('areas')
  createArea(@Body() dto: CreateAreaDto) {
    return this.service.createArea(dto.name, dto.description, dto.photoUrl);
  }

  @Public()
  @Get(':id')
  group(@Param('id') id: string) {
    return this.service.getGroup(id);
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.service.createGroup(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.GROUP_LEADER)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateGroupDto>,
  ) {
    return this.service.updateGroup(user, id, dto);
  }
}
