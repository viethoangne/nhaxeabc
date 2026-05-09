import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripCronService {
  private readonly logger = new Logger(TripCronService.name);

  constructor(private prisma: PrismaService) {}

  // Chạy mỗi 1 phút một lần
  @Cron(CronExpression.EVERY_MINUTE)
  async handleTripStatusUpdate() {
    const now = new Date();

    try {
      // 1. Tự động chuyển PUBLISHED -> RUNNING (Đến giờ xuất bến)
      const runningUpdate = await this.prisma.trip.updateMany({
        where: {
          status: TripStatus.PUBLISHED,
          departDate: { lte: now }, // Giờ khởi hành <= giờ hiện tại
          driverId: { not: null },
          busId: { not: null }
        },
        data: { status: TripStatus.RUNNING },
      });

      if (runningUpdate.count > 0) {
        this.logger.log(`[Khởi hành] ${runningUpdate.count} chuyến xe vừa chuyển sang RUNNING.`);
      }

      // 2. Bonus: Tự động chuyển RUNNING -> COMPLETED (Đến giờ cập bến)
      const completedUpdate = await this.prisma.trip.updateMany({
        where: {
          status: TripStatus.RUNNING,
          // Kiểm tra arrivalDate hoặc (departDate + duration) <= now
          OR: [
            { arrivalDate: { lte: now } },
            { arrivalTime: { lte: now } }
          ]
        },
        data: { status: TripStatus.COMPLETED },
      });

      if (completedUpdate.count > 0) {
        this.logger.log(`[Cập bến] ${completedUpdate.count} chuyến xe đã hoàn thành (COMPLETED).`);
      }

    } catch (error) {
      this.logger.error('Lỗi khi chạy Cronjob cập nhật trạng thái chuyến xe', error);
    }
  }
}