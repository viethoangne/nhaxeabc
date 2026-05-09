
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { startTripMaintenance, initTripMaintenance } from './jobs/trip-maintenance';
import { PrismaService } from './prisma/prisma.service';

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Hỗ trợ cả localhost và Vercel domain
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.use(cookieParser());

  // Railway cung cấp $PORT tự động, fallback về 3001 cho local
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  // ✅ LẤY Prisma từ Nest
  const prisma = app.get(PrismaService);

  // ✅ inject vào job
  initTripMaintenance(prisma);

  // ✅ chạy job
  startTripMaintenance();

  console.log(`Backend đang chạy tại port ${port}`);
}

bootstrap();