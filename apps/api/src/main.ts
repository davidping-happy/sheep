import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // 安全標頭 (§四.5 PLATFORM)
  app.use(helmet());

  // CORS 白名單 (§四.5)
  app.enableCors({
    origin: config.get<string[]>('corsOrigins'),
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
  await app.listen(port);
  Logger.log(`API 已啟動於 http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
