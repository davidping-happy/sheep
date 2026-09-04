import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import {
  LivestreamService,
  parseLivestreamChannel,
} from './livestream.service';

@ApiTags('livestream')
@Controller('livestream')
export class LivestreamController {
  constructor(private readonly service: LivestreamService) {}

  @Public()
  @Get('channels')
  channels() {
    return this.service.listChannels();
  }

  @Public()
  @Get('latest')
  @ApiQuery({
    name: 'channel',
    required: false,
    description: 'sunday=主日崇拜（預設）；zone=成二牧區專屬頻道',
  })
  latest(@Query('channel') channel?: string) {
    return this.service.getLatest(parseLivestreamChannel(channel));
  }
}
