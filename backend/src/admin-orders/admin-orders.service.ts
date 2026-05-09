import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class AdminOrdersService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService
  ) {}

  async getAllOrders() {
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        seats: true,
        outboundTrip: true,
        returnTrip: true 
      }
    });

    return orders.map((order) => {
      const seatNames = order.seats.map(seat => seat.seatNumber);
      
      // Hàm dự phòng: Nếu xui rủi DB thiếu sạch data thì mới phải tự cộng thời gian
      const calculateArrival = (departDate: any, durationMinutes: number) => {
        if (!departDate) return null;
        const arrival = new Date(departDate);
        arrival.setMinutes(arrival.getMinutes() + (durationMinutes || 0));
        return arrival;
      };

      // 🟢 CHIỀU ĐI: Ưu tiên lấy từ chuyến đi thực tế -> Nếu không có thì lấy Snapshot trong Order -> Cuối cùng mới tính toán
      const outboundDepart = order.outboundTrip?.departDate || (order as any).outboundDepartDateSnapshot || order.date;
      const outboundArrival = order.outboundTrip?.arrivalDate || (order as any).outboundArrivalTimeSnapshot || calculateArrival(outboundDepart, order.outboundTrip?.durationMinutes || 240);

      // 🟢 CHIỀU VỀ: Tương tự như chiều đi
      const returnDepart = order.returnTrip?.departDate || (order as any).returnDepartDateSnapshot || order.returnDate;
      const returnArrival = order.returnTrip?.arrivalDate || (order as any).returnArrivalTimeSnapshot || calculateArrival(returnDepart, order.returnTrip?.durationMinutes || 240);

      return {
        id: order.orderCode,
        customerName: order.customerName || 'Khách vãng lai',
        customerPhone: order.customerPhone || 'Không có SĐT',
        
        route: `${order.from} ➔ ${order.to}`,
        outboundDepart,
        outboundArrival,

        returnRoute: `${order.to} ➔ ${order.from}`,
        returnDepart,
        returnArrival,

        amount: order.amount,
        ticketsCount: order.tickets,
        seats: seatNames,
        paymentStatus: order.paymentStatus,
        bookingStatus: order.bookingStatus, 
        tripType: order.tripType, 
        createdAt: order.createdAt,
      };
    });
  }

  async cancelOrder(orderCode: string, adminId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: { seats: true } 
    });

    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng!');
    if (order.paymentStatus === PaymentStatus.CANCELLED || order.bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng này đã bị huỷ trước đó!');
    }
    // Chặn huỷ vé đã hoàn thành/lưu trữ (Giữ nguyên tính năng bảo mật tuyệt đối)
    if (order.bookingStatus === BookingStatus.COMPLETED || (order.bookingStatus as any) === 'ARCHIVED') {
      throw new BadRequestException('Không thể huỷ vé của chuyến đi đã hoàn thành hoặc lưu trữ!');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.update({
        where: { orderCode },
        data: { 
          paymentStatus: PaymentStatus.CANCELLED,
          bookingStatus: BookingStatus.CANCELLED
        }
      });

      await tx.orderSeat.deleteMany({
        where: { orderId: order.id }
      });

      return cancelled;
    });

    await this.auditLog.logAction(
      adminId,
      'CANCEL_ORDER',
      'Order',
      orderCode,
      { 
        oldStatus: order.paymentStatus, 
        newStatus: 'CANCELLED',
        reason: reason,
        freedSeats: order.tickets
      }
    );

    return { success: true, message: 'Đã huỷ vé và nhả ghế thành công!' };
  }
}