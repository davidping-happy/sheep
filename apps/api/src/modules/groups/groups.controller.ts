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
  ArrayMaxSize,
  IsArray,
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
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsString({ each: true })
  imageUrls?: string[];
  @IsOptional() @IsString() meetingTime?: string;
  @IsOptional() @IsString() meetingPlace?: string;
  @IsOptional() @IsBoolean() contactVisible?: boolean;
  @IsOptional() @IsUUID() leaderId?: string;
}

class UpdateGroupDto extends PartialType(CreateGroupDto) {}

class CreateAreaDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() photoUrl?: string;
}

class UpdateAreaDto extends PartialType(CreateAreaDto) {}

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

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Patch('areas/:id')
  updateArea(@Param('id') id: string, @Body() dto: UpdateAreaDto) {
    return this.service.updateArea(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Delete('areas/:id')
  removeArea(@Param('id') id: string) {
    return this.service.removeArea(id);
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
    @Body() dto: UpdateGroupDto,
  ) {
    return this.service.updateGroup(user, id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.STAFF)
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.removeGroup(user, id);
  }
}
