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
    const routes = await this.prismaService.trip.findMany({
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

    const routesWithBookings = await Promise.all(
      routes.map(async (route) => {
        const aggregateResult = await this.prismaService.order.aggregate({
          where: {
            from: { equals: route.from, mode: 'insensitive' },
            to: { equals: route.to, mode: 'insensitive' },
            bookingStatus: { not: 'CANCELLED' },
          },
          _sum: {
            tickets: true,
          },
        });

        // Lấy danh sách ID đơn hàng thuộc tuyến đường này để đếm và tính điểm đánh giá
        const orders = await this.prismaService.order.findMany({
          where: {
            from: { equals: route.from, mode: 'insensitive' },
            to: { equals: route.to, mode: 'insensitive' },
          },
          select: { id: true },
        });
        const orderIds = orders.map((o) => o.id);

        const reviewsAggregate = await this.prismaService.tripReview.aggregate({
          where: {
            orderId: { in: orderIds },
          },
          _count: {
            id: true,
          },
          _avg: {
            rating: true,
          },
        });

        const reviewsCount = reviewsAggregate._count.id || 0;
        const averageRating = reviewsAggregate._avg.rating || 0;

        return {
          ...route,
          bookingsCount: aggregateResult._sum.tickets || 0,
          reviewsCount,
          averageRating: Number(averageRating.toFixed(1)),
        };
      })
    );

    return routesWithBookings;
  }
}