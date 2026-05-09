import { Module } from '@nestjs/common';
import { AdminTripsController } from './admin-trips.controller';
import { AdminTripsService } from './admin-trips.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminTripsController],
  providers: [AdminTripsService], // 🟢 Đã thêm Service vào đây
})
export class AdminTripsModule {}