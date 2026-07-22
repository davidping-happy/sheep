import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { LivestreamService } from './livestream.service';

@ApiTags('livestream')
@Controller('livestream')
export class LivestreamController {
  constructor(private readonly service: LivestreamService) {}

  @Public()
  @Get('latest')
  latest() {
    return this.service.getLatest();
  }
}
