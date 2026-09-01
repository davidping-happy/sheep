import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // APK mirror for Android testers (avoid GitHub/Expo stall in TW)
  app.useStaticAssets(join(process.cwd(), 'public'), {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.apk')) {
        res.setHeader(
          'Content-Type',
          'application/vnd.android.package-archive',
        );
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  });

  // 安全標頭 (§四.5 PLATFORM)
  app.use(helmet());

  // CORS 白名單 (§四.5)；開發允許 Cloudflare 臨時通道，正式允許 Render 網域
  const allowed = config.get<string[]>('corsOrigins') ?? [];
  const isDev = config.get('env') !== 'production';
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      try {
        const host = new URL(origin).hostname;
        if (
          host.endsWith('.onrender.com') ||
          host.endsWith('.expo.app') ||
          host.endsWith('.exp.direct')
        ) {
          return callback(null, true);
        }
        if (isDev && host.endsWith('.trycloudflare.com')) {
          return callback(null, true);
        }
      } catch {
        // ignore invalid origin
      }
      return callback(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  });

  // 全域驗證：拒絕未定義欄位，強制 DTO 型別（蒐集最小化 §四.8）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // 根路徑說明（避免打開網址只看到 404；須在 listen 之前註冊）
  app.use((req: { method: string; path: string }, res: { json: (b: unknown) => void }, next: () => void) => {
    if (req.method === 'GET' && (req.path === '/' || req.path === '')) {
      return res.json({
        service: 'churchsheep-api',
        message:
          '這是 API 服務，不是管理後台。請改開 https://churchsheep-admin.onrender.com',
        health: '/api/health',
        livestream: '/api/livestream/latest',
        admin: 'https://churchsheep-admin.onrender.com',
        prayer: 'https://churchsheep-admin.onrender.com/prayer',
      });
    }
    return next();
  });

  // Swagger 文件（正式環境建議關閉或加保護）
  if (config.get('env') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('教會 APP API')
      .setDescription('核心服務層 REST API')
      .setVersion('1.1')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get<number>('port') ?? 3000;
  // Render 等雲端平台需綁 0.0.0.0，否則健康檢查會失敗
  await app.listen(port, '0.0.0.0');
  Logger.log(`API 已啟動於 http://0.0.0.0:${port}/api`, 'Bootstrap');
}
bootstrap().catch((err) => {
  Logger.error(
    err instanceof Error ? err.stack ?? err.message : String(err),
    'Bootstrap',
  );
  process.exit(1);
});
