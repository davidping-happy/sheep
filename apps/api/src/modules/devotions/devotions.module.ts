import { Module } from '@nestjs/common';
import { DevotionsController } from './devotions.controller';
import { DevotionsService } from './devotions.service';
import { DevotionSchemaBootstrap } from './devotion-schema.bootstrap';

@Module({
  controllers: [DevotionsController],
  providers: [DevotionsService, DevotionSchemaBootstrap],
})
export class DevotionsModule {}
