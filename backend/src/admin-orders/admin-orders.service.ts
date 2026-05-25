import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, BookingStatus, TripDirection } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EmailService } from '../email/email.service';
import * as QRCode from 'qrcode';
import nodeHtmlToImage from 'node-html-to-image';

@Injectable()
export class AdminOrdersService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private emailService: EmailService
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

    // Gom nhóm số lần huỷ vé và đổi ghế CHỈ DỰA VÀO EMAIL khách hàng (dùng chung cho cả khách vãng lai và thành viên)
    const cancelCountsByEmail: Record<string, number> = {};
    const swapCountsByEmail: Record<string, number> = {};

    for (const order of orders) {
      if (order.customerEmail) {
        if (order.bookingStatus === BookingStatus.CANCELLED) {
          cancelCountsByEmail[order.customerEmail] = (cancelCountsByEmail[order.customerEmail] || 0) + 1;
        }

        const orderSwapCount = (order as any).seatSwapCount || 0;
        if (orderSwapCount > 0) {
          swapCountsByEmail[order.customerEmail] = (swapCountsByEmail[order.customerEmail] || 0) + orderSwapCount;
        }
      }
    }

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

      let finalCancelCount = 0;
      let finalSwapCount = 0;
      if (order.customerEmail) {
        finalCancelCount = cancelCountsByEmail[order.customerEmail] || 0;
        finalSwapCount = swapCountsByEmail[order.customerEmail] || 0;
      }

      return {
        id: order.orderCode,
        customerName: order.customerName || 'Khách vãng lai',
        customerPhone: order.customerPhone || 'Không có SĐT',
        
        route: `${order.from} ➤ ${order.to}`,
        outboundDepart,
        outboundArrival,

        returnRoute: `${order.to} ➤ ${order.from}`,
        returnDepart,
        returnArrival,

        amount: order.amount,
        refundAmount: (order as any).refundAmount ?? 0, // Số tiền đã hoàn
        netAmount: order.amount - ((order as any).refundAmount ?? 0), // Doanh thu thực
        ticketsCount: order.tickets,
        seats: seatNames,
        paymentStatus: order.paymentStatus,
        bookingStatus: order.bookingStatus, 
        tripType: order.tripType, 
        createdAt: order.createdAt,
        cancelCount: finalCancelCount,
        seatSwapCount: finalSwapCount,
        userId: order.userId,
        outboundTripId: order.outboundTripId,
        returnTripId: order.returnTripId,
      };
    });
  }

  async cancelOrder(orderCode: string, adminId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: { seats: true, user: true } 
    });

    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng!');
    if (order.paymentStatus === PaymentStatus.CANCELLED || order.bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng này đã bị huỷ trước đó!');
    }
    if (order.bookingStatus === BookingStatus.COMPLETED || (order.bookingStatus as any) === 'ARCHIVED') {
      throw new BadRequestException('Không thể huỷ vé của chuyến đi đã hoàn thành hoặc lưu trữ!');
    }
    
    // Chặn huỷ vé nếu xe đã khởi hành (chỉ cho phép huỷ vé chưa khởi hành)
    const rawDepartureDate = (order as any).outboundDepartDateSnapshot || order.date;
    if (rawDepartureDate && new Date(rawDepartureDate).getTime() < Date.now()) {
      throw new BadRequestException('Chuyến xe này đã khởi hành (hoặc đang đi), không thể huỷ vé!');
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

    // 🔴 GỬI EMAIL THÔNG BÁO HỦY BỞI ADMIN
    const targetEmail = order.customerEmail || (order as any).user?.email; 
    if (targetEmail) {
      const seatNames = order.seats.map(s => s.seatNumber).join(', ');
      const rawDepartureDate = (order as any).outboundDepartDateSnapshot || order.date;
      const departureDateStr = rawDepartureDate ? new Date(rawDepartureDate).toLocaleDateString('vi-VN') : 'N/A';
      const departureTimeStr = rawDepartureDate ? new Date(rawDepartureDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px;">
          <div style="background-color: #EF5222; padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0; text-transform: uppercase;">Thông báo Hủy vé</h2>
            <p style="margin: 5px 0 0 0;">Mã đơn hàng: #${order.orderCode}</p>
          </div>
          <div style="padding: 20px;">
            <p>Chào bạn <strong>${order.customerName || 'Quý khách'}</strong>,</p>
            <p>Chúng tôi rất tiếc phải thông báo rằng đơn đặt vé của bạn đã bị hủy bởi <strong>Quản trị viên</strong> Hệ thống.</p>
            <p><strong>Lý do hủy:</strong> ${reason}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <h3 style="color: #EF5222;">Chi tiết vé đã hủy</h3>
            <p><strong>Tuyến xe:</strong> ${order.from} ➔ ${order.to}</p>
            <p><strong>Khởi hành:</strong> ${departureTimeStr} - ${departureDateStr}</p>
            <p><strong>Vị trí ghế:</strong> ${seatNames || 'Chưa xếp'}</p>
            <p>Nếu bạn đã thanh toán, tiền sẽ được hoàn lại theo chính sách của nhà xe. Kế toán sẽ liên hệ trong thời gian sớm nhất.</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
            <p>Hệ thống Nhà Xe ABC - Chất lượng là danh dự</p>
          </div>
        </div>
      `;

      try {
        await this.emailService.sendMail({
          to: targetEmail,
          subject: `[Nhà Xe] Thông báo hủy vé từ Hệ thống - Mã ${order.orderCode}`,
          html: emailHtml,
        });
      } catch (error: any) {
        console.error(`Lỗi gửi mail hủy vé ${order.orderCode}: ${error.message}`);
      }
    }

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

  async deleteOrder(orderCode: string, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderCode }
    });

    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng!');

    if (order.bookingStatus !== BookingStatus.COMPLETED && order.bookingStatus !== BookingStatus.CANCELLED && (order.bookingStatus as any) !== 'ARCHIVED') {
      throw new BadRequestException('Chỉ có thể xoá các đơn hàng đã Hoàn thành hoặc Đã huỷ!');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderSeat.deleteMany({
        where: { orderId: order.id }
      });

      await tx.order.delete({
        where: { orderCode }
      });
    });

    await this.auditLog.logAction(
      adminId,
      'DELETE_ORDER',
      'Order',
      orderCode,
      { 
        reason: 'Admin xoá vé vĩnh viễn khỏi CSDL'
      }
    );

    return { success: true, message: 'Đã xoá vé vĩnh viễn khỏi hệ thống!' };
  }

  async previewRefund(orderCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: { outboundTrip: true }
    });

    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng!');
    if (order.bookingStatus !== BookingStatus.CANCELLED) {
      throw new BadRequestException('Chỉ có thể hoàn tiền cho vé đã huỷ!');
    }
    if (order.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Vé này đã được hoàn tiền rồi!');
    }
    if (order.paymentStatus !== PaymentStatus.PAID && order.paymentStatus !== PaymentStatus.CANCELLED) {
       // Note: Nếu admin huỷ, paymentStatus bị đổi thành CANCELLED, nhưng tiền khách đã PAID trước đó. 
       // Thường thì chỉ hoàn tiền nếu khách thực sự đã trả.
    }

    // Thời điểm huỷ vé (lần cập nhật cuối)
    const cancelTime = order.updatedAt; 
    const rawDepartureDate = order.outboundTrip?.departDate || (order as any).outboundDepartDateSnapshot || order.date;
    
    if (!rawDepartureDate) {
      throw new BadRequestException('Không xác định được thời gian khởi hành của vé này.');
    }

    const departureTime = new Date(rawDepartureDate);
    const timeDiffHours = (departureTime.getTime() - cancelTime.getTime()) / (1000 * 60 * 60);

    let refundPercentage = 0;
    if (timeDiffHours >= 24) {
      refundPercentage = 100;
    } else if (timeDiffHours >= 12 && timeDiffHours < 24) {
      refundPercentage = 50;
    } else {
      refundPercentage = 0;
    }

    const refundAmount = (order.amount * refundPercentage) / 100;

    return {
      orderCode: order.orderCode,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      amount: order.amount,
      cancelTime,
      departureTime,
      timeDiffHours: Math.max(0, timeDiffHours), // Tránh số âm nếu huỷ sau giờ chạy
      refundPercentage,
      refundAmount,
    };
  }

  async processRefund(orderCode: string, adminId: string) {
    const preview = await this.previewRefund(orderCode); // Xác thực lại
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: { user: true }
    });

    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng');

    await this.prisma.order.update({
      where: { orderCode },
      data: { 
        paymentStatus: PaymentStatus.REFUNDED,
        refundAmount: preview.refundAmount  // Lưu số tiền đã hoàn vào DB
      }
    });

    await this.auditLog.logAction(
      adminId,
      'REFUND_ORDER',
      'Order',
      orderCode,
      { 
        refundAmount: preview.refundAmount,
        refundPercentage: preview.refundPercentage
      }
    );

    // 🔴 GỬI EMAIL THÔNG BÁO HOÀN TIỀN
    const targetEmail = order.customerEmail || order.user?.email;
    if (targetEmail) {
      const formatCurrency = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px;">
          <div style="background-color: #06b6d4; padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0; text-transform: uppercase;">Thông báo Hoàn tiền</h2>
            <p style="margin: 5px 0 0 0;">Mã đơn hàng: #${order.orderCode}</p>
          </div>
          <div style="padding: 20px;">
            <p>Chào bạn <strong>${order.customerName || 'Quý khách'}</strong>,</p>
            <p>Kế toán của chúng tôi đã thực hiện chuyển khoản hoàn tiền cho vé xe đã hủy của bạn.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <h3 style="color: #06b6d4;">Chi tiết Hoàn tiền</h3>
            <p><strong>Tuyến xe:</strong> ${order.from} ➔ ${order.to}</p>
            <p><strong>Tổng tiền vé ban đầu:</strong> ${formatCurrency(order.amount)}</p>
            <p><strong>Tỉ lệ hoàn tiền áp dụng:</strong> ${preview.refundPercentage}%</p>
            <p><strong>Số tiền thực nhận:</strong> <span style="font-size: 18px; font-weight: bold; color: #ef4444;">${formatCurrency(preview.refundAmount)}</span></p>
            <p><em>Vui lòng kiểm tra tài khoản ngân hàng hoặc ví điện tử của bạn. Tùy thuộc vào hệ thống thanh toán, tiền có thể nổi trong vòng 24h.</em></p>
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
            <p>Hệ thống Nhà Xe ABC - Cảm ơn Quý khách đã tin tưởng</p>
          </div>
        </div>
      `;

      try {
        await this.emailService.sendMail({
          to: targetEmail,
          subject: `[Nhà Xe] Biên lai Hoàn tiền vé - Mã ${order.orderCode}`,
          html: emailHtml,
        });
      } catch (error: any) {
        console.error(`Lỗi gửi mail hoàn tiền ${order.orderCode}: ${error.message}`);
      }
    }

    return { success: true, message: 'Đã xác nhận hoàn tiền thành công!' };
  }

  async clearCancelled() {
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { bookingStatus: BookingStatus.CANCELLED },
          { paymentStatus: PaymentStatus.REFUNDED },
          { paymentStatus: PaymentStatus.CANCELLED }
        ]
      }
    });

    for (const o of orders) {
      await this.prisma.orderSeat.deleteMany({ where: { orderId: o.id } });
    }

    const result = await this.prisma.order.deleteMany({
      where: {
        OR: [
          { bookingStatus: BookingStatus.CANCELLED },
          { paymentStatus: PaymentStatus.REFUNDED },
          { paymentStatus: PaymentStatus.CANCELLED }
        ]
      }
    });

    return { deletedCount: result.count };
  }

  async swapSeat(orderCode: string, currentSeat: string, newSeat: string, direction: string = 'outbound') {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: {
        seats: true,
        outboundTrip: true,
        returnTrip: true
      }
    });

    if (!order) {
      throw new BadRequestException('Không tìm thấy đơn hàng!');
    }

    if (order.bookingStatus === 'CANCELLED') {
      throw new BadRequestException('Đơn hàng này đã bị huỷ trước đó, không thể đổi ghế!');
    }

    const currentSeatUpper = currentSeat.trim().toUpperCase();
    const newSeatUpper = newSeat.trim().toUpperCase();
    const directionLower = direction.trim().toLowerCase();

    const targetSeatRecord = order.seats.find(
      s => s.seatNumber.toUpperCase() === currentSeatUpper && s.tripDirection === directionLower
    );

    if (!targetSeatRecord) {
      throw new BadRequestException(`Ghế ${currentSeatUpper} không nằm trong đơn hàng #${orderCode}!`);
    }

    const tripId = targetSeatRecord.tripId;

    // 🟢 THỜI GIAN GIỚI HẠN: Chỉ được đổi trước giờ khởi hành ít nhất 5 tiếng!
    const trip = targetSeatRecord.tripDirection === 'return' ? order.returnTrip : order.outboundTrip;
    const departDateRaw = trip?.departDate || (targetSeatRecord.tripDirection === 'return' ? (order as any).returnDepartDateSnapshot || order.returnDate : (order as any).outboundDepartDateSnapshot || order.date);
    
    if (!departDateRaw) {
      throw new BadRequestException('Không xác định được giờ khởi hành chuyến xe!');
    }

    const fiveHoursInMs = 5 * 60 * 60 * 1000;
    const timeDiff = new Date(departDateRaw).getTime() - Date.now();
    if (timeDiff < fiveHoursInMs) {
      throw new BadRequestException('🚨 LỖI: Chỉ được phép đổi ghế trước giờ khởi hành ít nhất 5 tiếng!');
    }

    // Chống trùng ghế: Tìm đơn hàng active đang giữ ghế mới
    const occupiedSeat = await this.prisma.orderSeat.findFirst({
      where: {
        tripId: tripId,
        tripDirection: targetSeatRecord.tripDirection,
        seatNumber: newSeatUpper,
        order: {
          bookingStatus: {
            not: 'CANCELLED'
          }
        }
      },
      include: {
        order: true
      }
    });

    if (occupiedSeat) {
      throw new BadRequestException(`Ghế [${newSeatUpper}] đã được giữ bởi khách ${(occupiedSeat as any).order.customerName} (Đơn #${(occupiedSeat as any).order.orderCode})!`);
    }

    // Tiến hành đổi ghế trong Transaction + tăng counter
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await tx.orderSeat.update({
        where: { id: targetSeatRecord.id },
        data: { seatNumber: newSeatUpper }
      });
      return tx.order.update({
        where: { id: order.id },
        data: { seatSwapCount: { increment: 1 } } as any,
        select: { seatSwapCount: true } as any
      });
    });

    const swapCount = (updatedOrder as any).seatSwapCount;

    // 🟢 GỬI LẠI EMAIL VÉ XE ĐIỆN TỬ MỚI CHO KHÁCH HÀNG
    if (order.customerEmail) {
      const emailRecipient = order.customerEmail;
      (async () => {
        try {
          const updatedSeats = await this.prisma.orderSeat.findMany({
            where: { orderId: order.id }
          });

          const outboundSeatStrs = updatedSeats.filter(s => s.tripDirection === 'outbound').map(s => s.seatNumber).join(', ') || '--';
          const returnSeatStrs = updatedSeats.filter(s => s.tripDirection === 'return').map(s => s.seatNumber).join(', ');
          
          let seatDisplay = outboundSeatStrs;
          if (order.tripType === 'round' && returnSeatStrs) {
            seatDisplay = `Đi: ${outboundSeatStrs} | Về: ${returnSeatStrs}`;
          }

          const departAt = (order as any).outboundDepartDateSnapshot || order.outboundTrip?.departDate || order.date;
          const arrivalAt = (order as any).outboundArrivalTimeSnapshot || order.outboundTrip?.arrivalDate || order.outboundTrip?.arrivalTime || null;

          const returnDepartAt = (order as any).returnDepartDateSnapshot || order.returnTrip?.departDate || order.returnDate;
          const returnArrivalAt = (order as any).returnArrivalTimeSnapshot || order.returnTrip?.arrivalDate || order.returnTrip?.arrivalTime || null;

          const formatDateTime = (dateVal: any) => {
            if (!dateVal) return '--- | ---';
            const d = new Date(dateVal);
            const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const date = d.toLocaleDateString('vi-VN');
            return `${time} | ${date}`;
          };

          const departureFormatted = formatDateTime(departAt);
          const arrivalFormatted = formatDateTime(arrivalAt);
          const returnDepartureFormatted = formatDateTime(returnDepartAt);
          const returnArrivalFormatted = formatDateTime(returnArrivalAt);

          const totalPrice = Number(order.amount).toLocaleString('vi-VN');
          const busType = (order as any).outboundBusTypeSnapshot || order.outboundTrip?.busType || 'LIMOUSINE';

          const isRoundTrip = order.tripType === 'round';
          const ticketHeight = isRoundTrip ? 640 : 510;

          const ticketImageBuffer = (await nodeHtmlToImage({
            puppeteerArgs: {
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
              defaultViewport: {
                width: 840,
                height: ticketHeight,
              }
            },
            html: `
              <html>
                <head>
                  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                  <style>
                    * { box-sizing: border-box; }
                    body { 
                      font-family: 'Inter', system-ui, -apple-system, sans-serif; 
                      background: #f1f5f9;
                      margin: 0; 
                      padding: 20px;
                      width: 840px;
                    }
                    .ticket {
                      background: #ffffff;
                      border-radius: 20px;
                      border: 1px solid #e2e8f0;
                      box-shadow: 0 15px 35px rgba(15, 23, 42, 0.05);
                      overflow: hidden;
                      width: 800px;
                      position: relative;
                    }
                    .ticket-header {
                      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                      padding: 24px 32px;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      color: #ffffff;
                    }
                    .brand {
                      display: flex;
                      align-items: center;
                      gap: 10px;
                    }
                    .brand-logo {
                      font-size: 24px;
                    }
                    .brand-text {
                      font-size: 20px;
                      font-weight: 800;
                      letter-spacing: 1px;
                    }
                    .ticket-type {
                      font-size: 11px;
                      font-weight: 700;
                      letter-spacing: 1.5px;
                      opacity: 0.9;
                      text-transform: uppercase;
                    }
                    .ticket-body {
                      padding: 32px;
                      background: #ffffff;
                    }
                    .route-container {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      margin-bottom: 24px;
                    }
                    .station {
                      flex: 1;
                    }
                    .station.align-right {
                      text-align: right;
                    }
                    .station .label {
                      font-size: 10px;
                      font-weight: 700;
                      color: #94a3b8;
                      letter-spacing: 1px;
                      margin-bottom: 6px;
                      text-transform: uppercase;
                    }
                    .station .city {
                      font-size: 26px;
                      font-weight: 800;
                      color: #0f172a;
                    }
                    .arrow-container {
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      gap: 12px;
                      flex: 0 0 160px;
                    }
                    .arrow-line {
                      height: 2px;
                      background: #e2e8f0;
                      flex: 1;
                    }
                    .arrow-icon {
                      font-size: 18px;
                      color: #ea580c;
                      background: #fff7ed;
                      width: 36px;
                      height: 36px;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border: 1px solid #ffedd5;
                    }
                    .divider-container {
                      position: relative;
                      display: flex;
                      align-items: center;
                      margin: 16px -32px;
                      overflow: hidden;
                    }
                    .notch {
                      width: 20px;
                      height: 20px;
                      background: #f1f5f9;
                      border-radius: 50%;
                      position: absolute;
                      z-index: 2;
                      border: 1px solid #e2e8f0;
                    }
                    .notch.left {
                      left: -10px;
                    }
                    .notch.right {
                      right: -10px;
                    }
                    .dashed-line {
                      width: 100%;
                      height: 2px;
                      border-top: 2px dashed #e2e8f0;
                    }
                    .info-grid {
                      display: grid;
                      grid-template-columns: repeat(4, 1fr);
                      gap: 20px 16px;
                      margin-top: 24px;
                    }
                    .info-item {
                      display: flex;
                      flex-direction: column;
                    }
                    .info-label {
                      font-size: 10px;
                      font-weight: 700;
                      color: #94a3b8;
                      letter-spacing: 0.8px;
                      text-transform: uppercase;
                      margin-bottom: 6px;
                    }
                    .info-value {
                      font-size: 14px;
                      font-weight: 600;
                      color: #334155;
                    }
                    .info-value.highlight {
                      color: #ea580c;
                      font-weight: 700;
                    }
                    .info-value.price {
                      font-size: 16px;
                      font-weight: 800;
                      color: #0f172a;
                    }
                    .info-value.status-paid {
                      color: #10b981;
                      font-weight: 700;
                      font-size: 13px;
                    }
                    .seat-badge {
                      display: inline-block;
                      padding: 3px 10px;
                      background: #fff7ed;
                      border: 1px solid #ffedd5;
                      color: #ea580c;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 700;
                    }
                    .ticket-footer {
                      background: #f8fafc;
                      border-top: 1px solid #e2e8f0;
                      padding: 20px 32px;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    }
                    .barcode-wrapper {
                      display: flex;
                      flex-direction: column;
                      align-items: flex-start;
                      gap: 4px;
                    }
                    .barcode {
                      height: 40px;
                      width: 160px;
                      background: repeating-linear-gradient(
                        90deg,
                        #1e293b,
                        #1e293b 2px,
                        transparent 2px,
                        transparent 4px,
                        #1e293b 4px,
                        #1e293b 8px,
                        transparent 8px,
                        transparent 10px
                      );
                      opacity: 0.85;
                    }
                    .barcode-text {
                      font-size: 9px;
                      font-weight: 700;
                      color: #64748b;
                      letter-spacing: 4px;
                      text-indent: 4px;
                      margin-top: 2px;
                    }
                    .footer-note {
                      font-size: 11px;
                      font-weight: 500;
                      color: #94a3b8;
                      font-style: italic;
                    }
                  </style>
                </head>
                <body>
                  <div class="ticket">
                    <div class="ticket-header">
                      <div class="brand">
                        <span class="brand-logo">🚍</span>
                        <span class="brand-text">NHÀ XE ABC</span>
                      </div>
                      <div class="ticket-type">VÉ ĐIỆN TỬ / ELECTRONIC TICKET</div>
                    </div>
                    
                    <div class="ticket-body">
                      <!-- Route section -->
                      <div class="route-container">
                        <div class="station">
                          <div class="label">ĐIỂM ĐI</div>
                          <div class="city">${order.from}</div>
                        </div>
                        <div class="arrow-container">
                          <div class="arrow-line"></div>
                          <div class="arrow-icon">➔</div>
                          <div class="arrow-line"></div>
                        </div>
                        <div class="station align-right">
                          <div class="label">ĐIỂM ĐẾN</div>
                          <div class="city">${order.to}</div>
                        </div>
                      </div>
                      
                      <!-- Divider with notches -->
                      <div class="divider-container">
                        <div class="notch left"></div>
                        <div class="dashed-line"></div>
                        <div class="notch right"></div>
                      </div>
                      
                      <!-- Info Grid -->
                      <div class="info-grid">
                        <div class="info-item">
                          <div class="info-label">MÃ ĐẶT CHỖ</div>
                          <div class="info-value highlight">#${order.orderCode}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">HÀNH KHÁCH</div>
                          <div class="info-value">${order.customerName}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">SỐ GHẾ CẬP NHẬT</div>
                          <div class="info-value"><span class="seat-badge">${seatDisplay}</span></div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">LOẠI XE</div>
                          <div class="info-value" style="color: #ea580c; font-weight: 700; text-transform: uppercase;">${busType}</div>
                        </div>
                        
                        <div class="info-item">
                          <div class="info-label">XUẤT BẾN ${isRoundTrip ? '(CHIỀU ĐI)' : ''}</div>
                          <div class="info-value">${departureFormatted}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">ĐẾN NƠI (DỰ KIẾN)</div>
                          <div class="info-value">${arrivalFormatted}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">TỔNG TIỀN</div>
                          <div class="info-value price">${totalPrice}đ</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">TRẠNG THÁI</div>
                          <div class="info-value status-paid">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 3px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ĐÃ THANH TOÁN
                          </div>
                        </div>
                      </div>

                      ${isRoundTrip ? `
                      <div class="divider-container" style="margin-top: 15px;">
                        <div class="dashed-line"></div>
                      </div>
                      <div class="info-grid" style="margin-top: 15px; padding-top: 0; border-top: none;">
                        <div class="info-item">
                          <div class="info-label">XUẤT BẾN (CHIỀU VỀ)</div>
                          <div class="info-value">${returnDepartureFormatted}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">ĐẾN NƠI (CHIỀU VỀ)</div>
                          <div class="info-value">${returnArrivalFormatted}</div>
                        </div>
                        <div class="info-item"></div>
                        <div class="info-item"></div>
                      </div>
                      ` : ''}
                    </div>
                    
                    <div class="ticket-footer">
                      <div class="barcode-wrapper">
                        <div class="barcode"></div>
                        <div class="barcode-text">${order.orderCode}</div>
                      </div>
                      <div class="footer-note">Cảm ơn quý khách đã đồng hành cùng Nhà xe ABC!</div>
                    </div>
                  </div>
                </body>
              </html>
            `,
          })) as Buffer;

          const qrDataText =
            `Mã vé: ${order.orderCode}\n` +
            `Khách: ${order.customerName}\n` +
            `Ghế: ${seatDisplay}\n` +
            `Số lần đổi ghế: ${swapCount}\n` +
            `Lộ trình: ${order.from}->${order.to}`;

          const qrCodeUrl = await QRCode.toDataURL(qrDataText, { width: 300 });

          await this.emailService.sendMail({
            to: emailRecipient.trim(),
            subject: `[VÉ ĐIỆN TỬ CẬP NHẬT] ĐỔI GHẾ THÀNH CÔNG #${order.orderCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f8fafc; padding: 40px 20px;">
                <h2 style="color: #EF5222; margin-bottom: 20px;">XÁC NHẬN ĐẶT VÉ THÀNH CÔNG (CẬP NHẬT)</h2>
                <p style="color: #475569; margin-bottom: 30px;">Hành trình của quý khách đã được cập nhật số ghế mới thành công.</p>
                
                <div style="margin: 20px auto; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 500px; text-align: left; border: 1px solid #e2e8f0;">
                  <h3 style="color: #ea580c; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-transform: uppercase; font-size: 16px;">Thông tin vé mới cập nhật</h3>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>Mã đơn hàng:</strong> #${order.orderCode}</p>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>Hành khách:</strong> ${order.customerName}</p>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>Tuyến xe:</strong> ${order.from} ➔ ${order.to}</p>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>Số ghế mới:</strong> ${seatDisplay}</p>
                </div>

                <div style="margin-top: 30px; padding: 18px; background: #fff7ed; color: #ea580c; border-radius: 8px; display: inline-block; font-size: 14px; border: 1px solid #ffedd5; max-width: 500px; text-align: left; line-height: 1.5;">
                  <strong style="text-transform: uppercase;">Lưu ý quan trọng:</strong> <br/>
                  1. Vui lòng sử dụng thông tin vé mới này để làm thủ tục check-in lên xe. <br/>
                  2. <strong>Chi tiết vé điện tử đã cập nhật và Mã QR check-in mới</strong> đã được đính kèm trực tiếp trong Email này dưới dạng file hình ảnh (<strong>ve-xe-cap-nhat-${order.orderCode}.png</strong> và <strong>qr.png</strong>). Quý khách vui lòng mở/tải file đính kèm này để xuất trình cho nhân viên khi soát vé tại bến xe.
                </div>
              </div>
            `,
            attachments: [
              {
                filename: `ve-xe-cap-nhat-${order.orderCode}.png`,
                content: ticketImageBuffer,
                cid: 'ticket_image',
              },
              {
                filename: 'qr.png',
                content: qrCodeUrl.split('base64,')[1],
                encoding: 'base64',
                cid: 'qr_image',
              },
            ],
          });
          console.log(`[Email Success] Đã gửi lại vé điện tử mới thành công cho đơn ${order.orderCode}`);
        } catch (err: any) {
          console.error('Lỗi sinh ảnh vé hoặc gửi lại mail đổi ghế:', err);
        }
      })();
    }

    return {
      success: true,
      message: `Đã chuyển đổi ghế [${currentSeatUpper}] sang [${newSeatUpper}] thành công!`
    };
  }
}