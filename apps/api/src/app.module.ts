import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

// 七大核心功能模組
import { DevotionsModule } from './modules/devotions/devotions.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { LivestreamModule } from './modules/livestream/livestream.module';
import { GroupsModule } from './modules/groups/groups.module';
import { EventsModule } from './modules/events/events.module';
import { PrayerModule } from './modules/prayer/prayer.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // 速率限制 (§四.4 NETWORK)：防暴力破解與批次爬取
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl')! * 1000,
          limit: config.get<number>('throttle.limit')!,
        },
      ],
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    DevotionsModule,
    ArticlesModule,
    LivestreamModule,
    GroupsModule,
    EventsModule,
    PrayerModule,
    AnnouncementsModule,
  ],
  controllers: [HealthController],
  providers: [
    // 全域：先驗速率、再驗身份、最後驗角色
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
