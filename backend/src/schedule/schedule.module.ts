// src/schedule/schedule.module.ts
import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { PrismaModule } from '../prisma/prisma.module';  // Import PrismaModule để sử dụng PrismaService

@Module({
  imports: [PrismaModule],  // Đảm bảo PrismaModule được import
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}