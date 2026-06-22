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
          // Tính điểm: 100 điểm cho mỗi 10.000đ giá trị vé
          const earned = Math.floor(order.amount / 10000) * 100;
          pointsToAdd += earned;
          tripsToAdd += 1;

          if (earned > 0) {
            await this.prisma.notification.create({
              data: {
                userId,
                title: 'Điểm tích lũy mới 🪙',
                content: `Chúc mừng bạn đã được tích lũy thêm +${earned} điểm từ chuyến đi #${order.orderCode} đã hoàn thành.`,
                type: 'MARKETING',
                isRead: false
              }
            });
          }
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

    // --- 🟢 BẮT ĐẦU: CƠ CHẾ TỰ ĐỘNG PHỤC HỒI & ĐỒNG BỘ ĐIỂM TOÀN DIỆN ---
    const actualCompletedOrders = await this.prisma.order.findMany({
      where: { 
        userId, 
        paymentStatus: PaymentStatus.PAID,
        // 🟢 Cho phép lấy cả vé COMPLETED và ARCHIVED
        bookingStatus: { in: [BookingStatus.COMPLETED, BookingStatus.ARCHIVED as any] } 
      }
    });

    const expectedPointsFromCompletedOrders = actualCompletedOrders.reduce((sum, o) => {
      return sum + (Math.floor(o.amount / 10000) * 100);
    }, 0);

    const currentUser = await this.prisma.user.findUnique({ 
      where: { id: userId },
      include: {
        vouchers: {
          include: { voucher: true }
        }
      }
    });

    if (currentUser) {
      // Tính số điểm đã dùng để đổi voucher
      const pointsSpent = currentUser.vouchers
        .filter(uv => uv.voucher.costInPoints)
        .reduce((sum, uv) => sum + (uv.voucher.costInPoints || 0), 0);

      // Tính số điểm điều chỉnh thủ công từ admin log
      const adminAdjustments = await this.prisma.adminLog.findMany({
        where: { entityType: 'User', entityId: userId, action: 'ADJUST_POINTS' }
      });
      const manualPoints = adminAdjustments.reduce((sum, log) => {
        const details = log.details as any;
        const amount = typeof details?.amount === 'number' ? details.amount : 0;
        return sum + amount;
      }, 0);

      // Điểm số chính xác lý thuyết phải có
      const correctPoints = Math.max(0, expectedPointsFromCompletedOrders - pointsSpent + manualPoints);

      // Đồng bộ lại điểm số và số chuyến đi nếu có lệch
      if (currentUser.points !== correctPoints || currentUser.totalTrips !== actualCompletedOrders.length) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            points: correctPoints,
            totalTrips: actualCompletedOrders.length 
          }
        });
        this.logger.log(`🔧 Đã tự động đồng bộ điểm số (${correctPoints}) và số chuyến (${actualCompletedOrders.length}) chính xác cho user ${userId}.`);
      }
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
        paymentStatus: PaymentStatus.PAID,
        // 🟢 Hiển thị lịch sử cho cả vé COMPLETED và ARCHIVED
        bookingStatus: { in: [BookingStatus.COMPLETED, BookingStatus.ARCHIVED as any] } 
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    const earnHistory = completedOrders.map(order => ({
      type: 'earn',
      amount: Math.floor(order.amount / 10000) * 100,
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

      // Tạo thông báo đổi quà thành công
      await tx.notification.create({
        data: {
          userId,
          title: 'Đổi quà thành công 🎁',
          content: `Bạn đã đổi thành công ${voucher.costInPoints} điểm tích lũy lấy mã ưu đãi: ${voucher.title} (Mã: ${voucher.code}).`,
          type: 'MARKETING',
          isRead: false
        }
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
            const earnedPoints = Math.floor(order.amount / 10000) * 100;
            const updatedUser = await this.prisma.user.update({
              where: { id: order.userId! },
              data: {
                points: { increment: earnedPoints },
                totalTrips: { increment: 1 },
              },
            });

            if (earnedPoints > 0) {
              await this.prisma.notification.create({
                data: {
                  userId: order.userId!,
                  title: 'Điểm tích lũy mới 🪙',
                  content: `Chúc mừng bạn đã được tích lũy thêm +${earnedPoints} điểm từ chuyến đi #${order.orderCode} đã hoàn thành.`,
                  type: 'MARKETING',
                  isRead: false
                }
              });
            }

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

  // =========================================================
  // 5. GAME VÒNG QUAY MAY MẮN (TRỪ 50 ĐIỂM ĐỔI VOUCHER NGẪU NHIÊN)
  // =========================================================
  async spinGame(userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('Không tìm thấy người dùng');
      }

      const spinCost = 50;
      if (user.points < spinCost) {
        throw new Error('Bạn không đủ điểm để quay vòng quay may mắn (yêu cầu 50 điểm)');
      }

      // 1. Trừ điểm người dùng
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: spinCost } },
      });

      // 2. Quay thưởng: 60% trúng, 40% trượt
      const isWin = Math.random() < 0.6;

      if (!isWin) {
        // Tạo thông báo trượt
        await tx.notification.create({
          data: {
            userId,
            title: 'Kết quả vòng quay may mắn 🎡',
            content: `Bạn đã tiêu tốn 50 điểm nhưng chưa trúng thưởng lần này. Chúc bạn may mắn lần sau!`,
            type: 'MARKETING',
            isRead: false
          }
        });

        return {
          status: 'lose',
          message: 'Chúc bạn may mắn lần sau!',
          newPoints: updatedUser.points,
          voucher: null,
        };
      }

      // Trúng thưởng: Lấy ngẫu nhiên voucher đang có trong hệ thống có costInPoints không null
      const vouchers = await tx.voucher.findMany({
        where: { costInPoints: { not: null } }
      });

      if (vouchers.length === 0) {
        throw new Error('Hiện tại không có phần quà nào trong hệ thống');
      }

      const randomIndex = Math.floor(Math.random() * vouchers.length);
      const chosenVoucher = vouchers[randomIndex];

      // Thêm voucher vào UserVoucher
      const userVoucher = await tx.userVoucher.create({
        data: { userId, voucherId: chosenVoucher.id, isUsed: false },
        include: { voucher: true },
      });

      // Tạo thông báo trúng
      await tx.notification.create({
        data: {
          userId,
          title: 'Trúng thưởng vòng quay may mắn! 🎉',
          content: `Chúc mừng bạn đã quay trúng mã ưu đãi: ${chosenVoucher.title} (Mã: ${chosenVoucher.code}).`,
          type: 'MARKETING',
          isRead: false
        }
      });

      return {
        status: 'win',
        message: `Chúc mừng bạn đã trúng voucher: ${chosenVoucher.title}!`,
        newPoints: updatedUser.points,
        voucher: {
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
}