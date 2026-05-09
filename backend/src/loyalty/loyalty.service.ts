import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // HÀM HỖ TRỢ: KIỂM TRA CHUYẾN ĐI ĐÃ HOÀN THÀNH CHƯA
  // =========================================================
  private checkTripCompleted(order: any): boolean {
    const lastDepartureDate = order.tripType === 'round' && order.returnDepartDateSnapshot
      ? order.returnDepartDateSnapshot
      : order.outboundDepartDateSnapshot;

    if (!lastDepartureDate) return false;

    const durationMinutes = order.tripType === 'round' 
      ? (order.returnDurationMinutesSnapshot || 0) 
      : (order.outboundDurationMinutesSnapshot || 0);

    const estimatedArrivalTime = new Date(lastDepartureDate);
    estimatedArrivalTime.setMinutes(estimatedArrivalTime.getMinutes() + durationMinutes + 60);

    return new Date().getTime() >= estimatedArrivalTime.getTime();
  }

  // =========================================================
  // 1. HÀM QUÉT CHUYẾN ĐI CỦA 1 USER (CHỈ CỘNG KHI ĐÃ ĐẾN NƠI)
  // =========================================================
  private async processPendingPoints(userId: string) {
    const pendingOrders = await this.prisma.order.findMany({
      where: {
        userId,
        paymentStatus: PaymentStatus.PAID,
        bookingStatus: BookingStatus.CONFIRMED, // ✅ Đã dùng chuẩn CONFIRMED
      },
    });

    let pointsToAdd = 0;
    let tripsToAdd = 0;

    for (const order of pendingOrders) {
      if (this.checkTripCompleted(order)) {
        // Khóa bản ghi để tránh Cronjob chạy trùng gây x2 điểm
        const updateResult = await this.prisma.order.updateMany({
          where: { 
            id: order.id, 
            bookingStatus: BookingStatus.CONFIRMED 
          },
          data: { bookingStatus: BookingStatus.COMPLETED },
        });

        if (updateResult.count > 0) {
          pointsToAdd += (order.tickets * 100); // 100 điểm x số vé
          tripsToAdd += 1;
        }
      }
    }

    if (pointsToAdd > 0 || tripsToAdd > 0) {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          points: { increment: pointsToAdd },
          totalTrips: { increment: tripsToAdd },
        },
      });

      if (updatedUser.totalTrips >= 4) {
        let trip5Voucher = await this.prisma.voucher.findUnique({ where: { code: 'TRIP5' } });
        if (!trip5Voucher) {
          trip5Voucher = await this.prisma.voucher.create({
            data: { code: 'TRIP5', title: 'Tri ân chuyến thứ 5 - Giảm 10%', type: 'percent', value: 10, maxAmount: 1000 }
          });
        }
        
        const alreadyHas = await this.prisma.userVoucher.findFirst({
           where: { userId, voucherId: trip5Voucher.id }
        });
        
        if (!alreadyHas) {
           await this.prisma.userVoucher.create({
             data: { userId, voucherId: trip5Voucher.id, isUsed: false }
           });
        }
      }
    }
  }

  // =========================================================
  // 2. LẤY DỮ LIỆU LOYALTY VÀ TẠO LỊCH SỬ GIAO DỊCH ĐIỂM
  // =========================================================
  async getUserLoyaltyData(userId: string) {
    // 1. Chạy hàm xử lý vé mới như bình thường
    await this.processPendingPoints(userId);

    // --- 🟢 BẮT ĐẦU: THÊM CƠ CHẾ TỰ ĐỘNG PHỤC HỒI ĐIỂM CHO VÉ CŨ ---
    // --- 🟢 BẮT ĐẦU: THÊM CƠ CHẾ TỰ ĐỘNG PHỤC HỒI ĐIỂM CHO VÉ CŨ ---
    const actualCompletedOrdersCount = await this.prisma.order.count({
      where: { 
        userId, 
        // 🟢 Cho phép lấy cả vé COMPLETED và ARCHIVED
        bookingStatus: { in: [BookingStatus.COMPLETED, BookingStatus.ARCHIVED as any] } 
      }
    });

    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });

    // Nếu số chuyến THỰC TẾ lớn hơn số chuyến ĐÃ GHI NHẬN (tức là có vé cũ bị sót)
    if (currentUser && actualCompletedOrdersCount > currentUser.totalTrips) {
      const missingTrips = actualCompletedOrdersCount - currentUser.totalTrips;
      const pointsToRecover = missingTrips * 100;

      // Cộng bù điểm và đồng bộ lại tổng số chuyến
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          points: { increment: pointsToRecover },
          totalTrips: actualCompletedOrdersCount 
        }
      });
      this.logger.log(`🔧 Đã tự động phục hồi ${pointsToRecover} điểm cho user từ các vé cũ.`);
    }

    // Logic tặng mã tân thủ
    let welcomeVoucher = await this.prisma.voucher.findUnique({ where: { code: 'WELCOME20' } });
    if (!welcomeVoucher) {
      welcomeVoucher = await this.prisma.voucher.create({
        data: { code: 'WELCOME20', title: 'Bạn mới - Giảm 20%', type: 'percent', value: 20, maxAmount: 2000 }
      });
    }
    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
if (!userExists) {
  return null; // Bỏ qua nếu user không tồn tại (do db reset hoặc lỗi session)
}
    const hasWelcome = await this.prisma.userVoucher.findFirst({ where: { userId, voucherId: welcomeVoucher.id } });
    if (!hasWelcome) {
      await this.prisma.userVoucher.create({ data: { userId, voucherId: welcomeVoucher.id, isUsed: false } });
    }

    // Tự động tạo danh sách mã đổi điểm
    const checkNewVouchers = await this.prisma.voucher.findFirst({ where: { code: 'GIAM2K' } });
    if (!checkNewVouchers) {
      await this.prisma.voucher.createMany({
        data: [
          { code: 'GIAM10PT', title: 'Giảm 10%', type: 'percent', value: 10, costInPoints: 100, maxAmount: 1000 },
          { code: 'GIAM30PT', title: 'Giảm 30%', type: 'percent', value: 30, costInPoints: 200, maxAmount: 3000 },
          { code: 'GIAM50PT', title: 'Giảm 50%', type: 'percent', value: 50, costInPoints: 300, maxAmount: 5000 },
          { code: 'GIAM2K', title: 'Giảm 2.000đ', type: 'fixed', value: 2000, costInPoints: 250, maxAmount: 2000 },
          { code: 'GIAM3K', title: 'Giảm 3.000đ', type: 'fixed', value: 3000, costInPoints: 400, maxAmount: 3000 },
          { code: 'GIAM5K', title: 'Giảm 5.000đ', type: 'fixed', value: 5000, costInPoints: 600, maxAmount: 5000 },
        ]
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        vouchers: {
          include: { voucher: true },
          orderBy: { createdAt: 'desc' }, 
        },
      },
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const completedOrders = await this.prisma.order.findMany({
      where: { 
        userId, 
        // 🟢 Hiển thị lịch sử cho cả vé COMPLETED và ARCHIVED
        bookingStatus: { in: [BookingStatus.COMPLETED, BookingStatus.ARCHIVED as any] } 
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    const earnHistory = completedOrders.map(order => ({
      type: 'earn',
      amount: 100,
      description: `Hoàn thành chuyến đi #${order.orderCode}`,
      date: order.updatedAt,
    }));

    const spendHistory = user.vouchers
      .filter(uv => uv.voucher.costInPoints) 
      .map(uv => ({
        type: 'spend',
        amount: uv.voucher.costInPoints,
        description: `Đổi mã ưu đãi: ${uv.voucher.title}`,
        date: uv.createdAt,
      }));

    const rawHistory = [...earnHistory, ...spendHistory].sort((a, b) => b.date.getTime() - a.date.getTime());

    const history = rawHistory.map(item => ({
      type: item.type,
      amount: item.amount,
      description: item.description,
      date: new Intl.DateTimeFormat('vi-VN', { 
        dateStyle: 'short', timeStyle: 'short' 
      }).format(item.date) 
    }));

    const myVouchers = user.vouchers.map((uv) => ({
      id: uv.id, // ✅ Lấy ID của bảng UserVoucher (mỗi lượt đổi là 1 ID duy nhất không bao giờ trùng)
      voucherId: uv.voucher.id, // (Có thể giữ lại ID gốc nếu Frontend cần dùng việc khác)
      code: uv.voucher.code,
      title: uv.voucher.title, type: uv.voucher.type,
      value: uv.voucher.value, maxAmount: uv.voucher.maxAmount, isUsed: uv.isUsed,
    }));

    const redeemableVouchersRaw = await this.prisma.voucher.findMany({
      where: { 
        costInPoints: { not: null },
      },
      orderBy: { costInPoints: 'asc' }
    });

    const redeemableVouchers = redeemableVouchersRaw.map((v) => ({
      id: v.id, code: v.code, title: v.title, type: v.type, value: v.value, maxAmount: v.maxAmount, cost: v.costInPoints,
    }));

    return {
      points: user.points,
      totalTrips: user.totalTrips,
      myVouchers,
      redeemableVouchers,
      history, 
    };
  }

  // =========================================================
  // 3. HÀM ĐỔI VOUCHER (LƯU TRỰC TIẾP VÀO CSDL)
  // =========================================================
  async redeemVoucher(userId: string, voucherId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.findUnique({ where: { id: voucherId } });
      if (!voucher || !voucher.costInPoints) {
        throw new Error('Mã giảm giá không hợp lệ');
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.points < voucher.costInPoints) {
        throw new Error('Bạn không đủ điểm tích lũy');
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: voucher.costInPoints } },
      });

      const userVoucher = await tx.userVoucher.create({
        data: { userId, voucherId, isUsed: false },
        include: { voucher: true },
      });

      return {
        message: 'Đổi quà thành công',
        newPoints: updatedUser.points,
        newVoucher: {
          id: userVoucher.voucher.id,
          code: userVoucher.voucher.code,
          title: userVoucher.voucher.title,
          type: userVoucher.voucher.type,
          value: userVoucher.voucher.value,
          isUsed: userVoucher.isUsed,
        },
      };
    });
  }

  // =========================================================
  // 4. CRON JOB TỰ ĐỘNG QUÉT TOÀN BỘ HỆ THỐNG (CHẠY NGẦM)
  // =========================================================
  @Cron('0 */15 * * * *')
  async autoProcessCompletedTrips() {
    this.logger.log('⏳ Bắt đầu CronJob: Quét các chuyến đi đã hoàn thành...');

    const pendingOrders = await this.prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        bookingStatus: BookingStatus.CONFIRMED, // ✅ Chuẩn
        userId: { not: null },
      },
    });

    if (pendingOrders.length === 0) {
      this.logger.log('✅ CronJob: Không có chuyến đi nào cần cập nhật.');
      return;
    }

    let updatedCount = 0;

    for (const order of pendingOrders) {
      if (this.checkTripCompleted(order)) {
        try {
          const updateResult = await this.prisma.order.updateMany({
            where: { 
              id: order.id,
              bookingStatus: BookingStatus.CONFIRMED 
            },
            data: { bookingStatus: BookingStatus.COMPLETED },
          });

          if (updateResult.count > 0) {
            const earnedPoints = order.tickets * 100; // 100 điểm x số vé
            const updatedUser = await this.prisma.user.update({
              where: { id: order.userId! },
              data: {
                points: { increment: earnedPoints },
                totalTrips: { increment: 1 },
              },
            });

            if (updatedUser.totalTrips >= 4) {
              let trip5Voucher = await this.prisma.voucher.findUnique({ where: { code: 'TRIP5' } });
              if (!trip5Voucher) {
                trip5Voucher = await this.prisma.voucher.create({
                  data: { code: 'TRIP5', title: 'Tri ân chuyến thứ 5 - Giảm 10%', type: 'percent', value: 10, maxAmount: 1000 }
                });
              }
              
              const alreadyHas = await this.prisma.userVoucher.findFirst({
                 where: { userId: order.userId!, voucherId: trip5Voucher.id }
              });
              
              if (!alreadyHas) {
                 await this.prisma.userVoucher.create({
                   data: { userId: order.userId!, voucherId: trip5Voucher.id, isUsed: false }
                 });
              }
            }
            updatedCount++;
          }
        } catch (error: any) {
          this.logger.error(`❌ Lỗi khi cập nhật điểm cho mã vé ${order.orderCode}: ${error.message}`);
        }
      }
    }

    if (updatedCount > 0) {
      this.logger.log(`✅ CronJob hoàn tất: Đã cộng điểm thành công cho ${updatedCount} chuyến đi.`);
    }
  }
}