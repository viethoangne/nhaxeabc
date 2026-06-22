import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService
  ) {}

  async create(dto: {
    orderId: number;
    userId?: string;
    rating: number;
    tags?: string[];
    comment?: string;
  }) {
    const { orderId, userId, rating, tags, comment } = dto;

    if (rating < 1 || rating > 5) {
      throw new Error('Rating phải từ 1 đến 5 sao');
    }

    // Lấy thông tin đơn hàng để ghi nhận mã vé trong thông báo
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { orderCode: true, userId: true },
    });

    // Upsert: if already reviewed, update it
    const review = await this.prisma.tripReview.upsert({
      where: { orderId },
      create: {
        orderId,
        userId: userId || null,
        rating,
        tags: tags || [],
        comment: comment || null,
      },
      update: {
        rating,
        tags: tags || [],
        comment: comment || null,
      },
    });

    // Tạo thông báo in-app cho khách hàng khi đánh giá thành công
    const finalUserId = userId || order?.userId;
    if (finalUserId) {
      await this.notificationService.createNotification(
        finalUserId,
        'Đánh giá chuyến đi thành công ⭐',
        `Cảm ơn bạn đã gửi đánh giá ${rating} sao cho chuyến đi thuộc mã vé #${order?.orderCode || ''}. Phản hồi của bạn giúp chúng tôi cải thiện dịch vụ tốt hơn!`,
        'TRIP'
      ).catch((err) => {
        console.error('Không tạo được thông báo đánh giá:', err);
      });
    }

    return review;
  }

  async checkByOrderId(orderId: number) {
    const review = await this.prisma.tripReview.findUnique({ where: { orderId } });
    return { reviewed: !!review, review };
  }

  async checkBatch(orderIds: number[]): Promise<number[]> {
    if (!orderIds || orderIds.length === 0) return [];
    const reviews = await this.prisma.tripReview.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true },
    });
    return reviews.map((r) => r.orderId);
  }

  async getByUserId(userId: string) {
    return this.prisma.tripReview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const [total, avg] = await Promise.all([
      this.prisma.tripReview.count(),
      this.prisma.tripReview.aggregate({ _avg: { rating: true } }),
    ]);
    return {
      total,
      averageRating: avg._avg.rating ?? 0,
    };
  }
}
