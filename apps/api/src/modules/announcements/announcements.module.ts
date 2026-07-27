import { Module } from '@nestjs/common';
import {
  AnnouncementsController,
  DevicesController,
} from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { PushService } from './push.service';

@Module({
  controllers: [AnnouncementsController, DevicesController],
  providers: [AnnouncementsService, PushService],
  exports: [PushService],
})
export class AnnouncementsModule {}
