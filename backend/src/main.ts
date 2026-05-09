
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

console.log("JWT TEST:", process.env.JWT_SECRET);
console.log("DB TEST:", process.env.DATABASE_URL);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.use(cookieParser());

  await app.listen(3001);

  // ✅ LẤY Prisma từ Nest
  const prisma = app.get(PrismaService);

  // ✅ inject vào job
  initTripMaintenance(prisma);

  // ✅ chạy job
  startTripMaintenance();

  console.log('Backend đang chạy tại http://localhost:3001');
}

bootstrap();