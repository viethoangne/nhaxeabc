import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register or update the user's Expo Push Token
   */
  async registerToken(userId: string, token: string): Promise<any> {
    this.logger.log(`Registering push token for user ${userId}: ${token}`);
    return this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });
  }

  /**
   * Retrieve in-app notifications for a user, sorted by date descending.
   * Auto-populates notifications from past PAID or CANCELLED orders if they don't exist.
   */
  async getUserNotifications(userId: string): Promise<any[]> {
    try {
      // 1. Lấy tất cả các đơn hàng PAID hoặc CANCELLED của user
      const orders = await this.prisma.order.findMany({
        where: {
          userId,
          OR: [
            { paymentStatus: 'PAID' },
            { bookingStatus: 'CANCELLED' }
          ]
        }
      });

      // 2. Lấy danh sách voucher đã đổi của user
      const userVouchers = await this.prisma.userVoucher.findMany({
        where: { userId },
        include: { voucher: true }
      });

      // 3. Lấy các thông báo hiện có trong database
      const existingNotifications = await this.prisma.notification.findMany({
        where: { userId }
      });

      // 4. Duyệt và tạo thông báo bù cho các đơn hàng cũ (Đặt vé, Hủy vé, Nhận điểm tích lũy)
      for (const order of orders) {
        const orderCodePattern = `#${order.orderCode}`;

        // A. Thông báo hủy vé
        if (order.bookingStatus === 'CANCELLED') {
          const exists = existingNotifications.some(n => n.content.includes(orderCodePattern) && n.title.includes('Hủy'));
          if (!exists) {
            await this.prisma.notification.create({
              data: {
                userId,
                title: 'Hủy vé thành công 💸',
                content: `Yêu cầu hủy vé #${order.orderCode} đi ${order.to} của bạn đã được thực hiện. Số tiền hoàn lại là ${Number(order.refundAmount).toLocaleString('vi-VN')}đ.`,
                type: 'TRANSACTION',
                isRead: false,
                createdAt: order.updatedAt
              }
            });
          }
        }
        
        // B. Thông báo đặt vé thành công
        if (order.paymentStatus === 'PAID') {
          const exists = existingNotifications.some(n => n.content.includes(orderCodePattern) && n.title.includes('Đặt'));
          if (!exists) {
            const departureTime = order.outboundDepartDateSnapshot 
              ? new Date(order.outboundDepartDateSnapshot).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) 
              : new Date(order.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const departureDate = new Date(order.date).toLocaleDateString('vi-VN');

            await this.prisma.notification.create({
              data: {
                userId,
                title: 'Đặt vé thành công 🎉',
                content: `Bạn đã đặt thành công vé đi ${order.to} khởi hành lúc ${departureTime} ngày ${departureDate}. Mã vé của bạn là #${order.orderCode}.`,
                type: 'TRANSACTION',
                isRead: false,
                createdAt: order.createdAt
              }
            });
          }
        }

        // C. Thông báo tích điểm thưởng khi chuyến đi kết thúc
        if (order.paymentStatus === 'PAID' && (order.bookingStatus === 'COMPLETED' || order.bookingStatus === 'ARCHIVED')) {
          const exists = existingNotifications.some(n => n.content.includes(orderCodePattern) && n.title.includes('Điểm'));
          if (!exists) {
            const earnedPoints = Math.floor(order.amount / 10000) * 100;
            if (earnedPoints > 0) {
              await this.prisma.notification.create({
                data: {
                  userId,
                  title: 'Điểm tích lũy mới 🪙',
                  content: `Chúc mừng bạn đã được tích lũy thêm +${earnedPoints} điểm từ chuyến đi #${order.orderCode} đã hoàn thành.`,
                  type: 'MARKETING',
                  isRead: false,
                  createdAt: order.updatedAt
                }
              });
            }
          }
        }
      }

      // 5. Duyệt và tạo thông báo bù cho Voucher đổi điểm
      for (const uv of userVouchers) {
        const voucherCodePattern = uv.voucher.code;
        const exists = existingNotifications.some(n => n.content.includes(voucherCodePattern) && n.title.includes('Đổi quà'));

        if (!exists) {
          await this.prisma.notification.create({
            data: {
              userId,
              title: 'Đổi quà thành công 🎁',
              content: `Bạn đã đổi thành công ${uv.voucher.costInPoints || 0} điểm tích lũy lấy mã ưu đãi: ${uv.voucher.title} (Mã: ${uv.voucher.code}).`,
              type: 'MARKETING',
              isRead: false,
              createdAt: uv.createdAt
            }
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error auto-populating notifications for user ${userId}: ${error.message}`);
    }

    // 6. Trả về toàn bộ danh sách thông báo theo ngày giờ mới nhất
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark all notifications as read for a specific user
   */
  async markAllRead(userId: string): Promise<any> {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markRead(userId: string, notificationId: string): Promise<any> {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Create an in-app notification in database and trigger a push notification if token exists
   */
  async createNotification(
    userId: string,
    title: string,
    content: string,
    type: string = 'SYSTEM',
  ): Promise<any> {
    this.logger.log(`Creating notification [${type}] for user ${userId}: ${title}`);
    
    // 1. Save in-app notification to PostgreSQL
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        content,
        type,
        isRead: false,
      },
    });

    // 2. Fetch user to check for push token
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (user && user.pushToken) {
      // 3. Send Push Notification via Expo Push API asynchronously
      this.sendPushNotification(user.pushToken, title, content).catch((err) => {
        this.logger.error(`Failed to send push notification to user ${userId}: ${err.message}`);
      });
    }

    return notification;
  }

  /**
   * Helper to send push notification via Expo Push API HTTP post
   */
  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data: any = {},
  ): Promise<void> {
    if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken') && !expoPushToken.startsWith('ExpoPushToken')) {
      this.logger.warn(`Invalid Expo push token: ${expoPushToken}`);
      return;
    }

    const payload = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    try {
      this.logger.log(`Sending Expo push notification to ${expoPushToken}...`);
      const response = await axios.post('https://exp.host/--/api/v2/push/send', payload, {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.data) {
        const status = response.data.data.status;
        this.logger.log(`Expo push response status: ${status}`);
      }
    } catch (error) {
      const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Error sending push notification to Expo API: ${errMsg}`);
      throw error;
    }
  }

  /**
   * Delete a single notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<any> {
    this.logger.log(`Deleting notification ${notificationId} for user ${userId}`);
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }
}
