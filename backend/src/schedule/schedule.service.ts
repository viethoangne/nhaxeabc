// src/schedule/schedule.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private readonly prismaService: PrismaService) {}

  // Lấy tất cả lịch trình chuyến xe
  async getSchedules() {
    return this.prismaService.trip.findMany({
      include: {
        outboundOrders: true,  // Bao gồm các đơn đặt vé đi
        returnOrders: true,    // Bao gồm các đơn đặt vé về (nếu có)
        tickets: true,         // Bao gồm thông tin vé
      },
    });
  }

  // Lấy tất cả các tuyến xe đang khai thác
  async getRoutes() {
    return this.prismaService.trip.findMany({
      select: {
        from: true,
        to: true,
        busType: true,
        distanceKm: true,
        durationMinutes: true,
        price: true,
      },
      distinct: ['from', 'to'],  // Lọc các tuyến đi từ điểm 'from' đến điểm 'to'
    });
  }
}