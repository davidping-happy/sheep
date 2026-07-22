import { Module } from '@nestjs/common';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { PushService } from './push.service';

@Module({
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, PushService],
})
export class AnnouncementsModule {}
