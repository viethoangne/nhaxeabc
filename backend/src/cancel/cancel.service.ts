import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class CancelService {
  private readonly logger = new Logger(CancelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  async cancelTicket(orderCode: string, phone: string, email: string) {
    // 1. Tìm đơn hàng
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: { 
        seats: true,
        user: true 
      },
    });

    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng');

    // 2. XÁC THỰC SỐ ĐIỆN THOẠI
    if (order.customerPhone !== phone) {
      throw new BadRequestException('Số điện thoại không khớp với đơn hàng');
    }

    // 3. XÁC THỰC EMAIL
    const targetEmail = order.customerEmail || order.user?.email; 
    
    if (!targetEmail) {
      throw new BadRequestException('Đơn hàng này không có email. Vui lòng liên hệ tổng đài để hủy.');
    }

    if (targetEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
      throw new BadRequestException('Email xác nhận không hợp lệ hoặc không khớp với email đặt vé.');
    }

    // 4. KIỂM TRA TRẠNG THÁI VÉ
    if (order.bookingStatus === 'CANCELLED') throw new BadRequestException('Vé này đã được hủy trước đó');
    if (order.bookingStatus === 'COMPLETED') throw new BadRequestException('Chuyến đi đã hoàn thành, không thể hủy');

    // 5. KIỂM TRA THỜI GIAN HỦY
    const now = new Date();
    const rawDepartureDate = order.outboundDepartDateSnapshot || order.date;
    
    if (!rawDepartureDate) {
      throw new BadRequestException('Không xác định được thời gian khởi hành của vé này.');
    }
    
    const departureTime = new Date(rawDepartureDate);
    const timeDiffHours = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (timeDiffHours < 12) {
      throw new BadRequestException('Chỉ có thể hủy vé trước giờ khởi hành ít nhất 12 tiếng. Vui lòng liên hệ tổng đài.');
    }

    let refundPercentage = 0;
    let newPaymentStatus = order.paymentStatus; 

    if (timeDiffHours >= 24) {
      refundPercentage = 100;
      newPaymentStatus = order.paymentStatus === 'PAID' ? PaymentStatus.REFUNDED : order.paymentStatus;
    } else if (timeDiffHours >= 12 && timeDiffHours < 24) {
      refundPercentage = 50;
      newPaymentStatus = order.paymentStatus === 'PAID' ? PaymentStatus.REFUNDED : order.paymentStatus; 
    }

    const refundAmount = (order.amount * refundPercentage) / 100;

    // 6. CẬP NHẬT DATABASE (Xóa ghế)
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          bookingStatus: BookingStatus.CANCELLED,
          paymentStatus: newPaymentStatus,
        },
      });

      await tx.orderSeat.deleteMany({
        where: { orderId: order.id },
      });

      return updatedOrder;
    });

    // 7. GỬI EMAIL THÔNG BÁO
    // Định dạng danh sách ghế để hiển thị trong mail
const seatNames = order.seats.map(s => s.seatNumber).join(', ');
const departureDateStr = new Date(rawDepartureDate).toLocaleDateString('vi-VN');
const departureTimeStr = new Date(rawDepartureDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const emailHtml = `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 15px; overflow: hidden;">
    <div style="background-color: #EF5222; padding: 20px; text-align: center; color: white;">
      <h2 style="margin: 0; text-transform: uppercase;">Thông báo hủy vé thành công</h2>
      <p style="margin: 5px 0 0 0; opacity: 0.8;">Mã đơn hàng: #${order.orderCode}</p>
    </div>

    <div style="padding: 30px;">
      <p>Chào bạn <strong>${order.customerName || 'Quý khách'}</strong>,</p>
      <p>Yêu cầu hủy vé của bạn đã được xử lý thành công. Dưới đây là thông tin chi tiết về vé đã hủy và chính sách hoàn tiền:</p>

      <h3 style="color: #EF5222; border-bottom: 2px solid #fef2ee; padding-bottom: 10px;">1. Chi tiết hành trình đã hủy</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 40%;">Tuyến xe:</td>
          <td style="padding: 8px 0; font-weight: bold;">${order.outboundFromSnapshot} ➔ ${order.outboundToSnapshot}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Khởi hành:</td>
          <td style="padding: 8px 0; font-weight: bold;">${departureTimeStr} - ${departureDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Vị trí ghế:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #EF5222;">${seatNames}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Số điện thoại:</td>
          <td style="padding: 8px 0; font-weight: bold;">${order.customerPhone}</td>
        </tr>
      </table>

      <h3 style="color: #EF5222; border-bottom: 2px solid #fef2ee; padding-bottom: 10px;">2. Thông tin hoàn tiền</h3>
      <div style="background-color: #fff8f6; padding: 20px; border-radius: 10px; border: 1px dashed #EF5222;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0;">Thời gian hủy:</td>
            <td style="padding: 5px 0; text-align: right;">Trước ${Math.floor(timeDiffHours)} tiếng</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Tỷ lệ hoàn trả:</td>
            <td style="padding: 5px 0; text-align: right; font-weight: bold;">${refundPercentage}%</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-top: 1px solid #ddd; font-size: 16px;"><strong>Số tiền hoàn lại:</strong></td>
            <td style="padding: 10px 0; border-top: 1px solid #ddd; text-align: right; font-size: 18px; color: #28a745;">
              <strong>${refundAmount.toLocaleString('vi-VN')} VNĐ</strong>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 25px; font-size: 13px; color: #666; line-height: 1.6;">
        <p><strong>* Lưu ý quan trọng:</strong></p>
        <ul style="padding-left: 20px;">
          <li>Tiền hoàn sẽ được chuyển về tài khoản của bạn trong vòng <strong>3-5 ngày làm việc</strong>.</li>
          <li>Bộ phận kế toán sẽ liên hệ qua số điện thoại <strong>${order.customerPhone}</strong> nếu cần thêm thông tin xác nhận.</li>
        </ul>
      </div>
    </div>

    <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999;">
      <p>Đây là email tự động, vui lòng không trả lời email này.</p>
      <p>© 2026 Hệ thống Nhà Xe ABC - Chất lượng là danh dự</p>
    </div>
  </div>
`;

    try {
      await this.mailerService.sendMail({
        to: targetEmail,
        subject: `[Nhà Xe] Xác nhận hủy vé & Hoàn tiền - Mã ${order.orderCode}`,
        html: emailHtml,
      });
    } catch (error: any) {
      this.logger.error(`Lỗi gửi mail hủy vé ${order.orderCode}: ${error.message}`);
    }

    return {
      success: true,
      message: `Hủy vé thành công. Sẽ hoàn lại ${refundPercentage}% tiền. Đã gửi email xác nhận.`,
      data: result
    };
  }
}