import { Body, Controller, Get, Param, Post, Res, HttpStatus } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment') // Kết hợp với Global Prefix 'api' tạo thành /api/payment
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // 1. Tạo link thanh toán MoMo (Có tích hợp Validator chặn trùng ghế bên trong Service)
  @Post('create-link')
  async createLink(@Body() body: any) {
    return this.paymentService.createPaymentLink(body);
  }

  // 2. Nhận phản hồi IPN (Webhook) từ MoMo
  @Post('momo-ipn')
  async momoIpn(@Body() body: any, @Res() res: any) {
    try {
      const result = await this.paymentService.handleMomoIpn(body);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error("IPN Error:", error);
      return res.status(HttpStatus.BAD_REQUEST).json({ ok: false });
    }
  }

  // 3. Nhận phản hồi IPN từ SePay (Khi có tiền vào VietQR)
  @Post('sepay-ipn')
  async sepayIpn(@Body() body: any, @Res() res: any) {
    try {
      const result = await this.paymentService.handleSepayIpn(body);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error("SePay IPN Error:", error);
      return res.status(HttpStatus.BAD_REQUEST).json({ ok: false });
    }
  }

  // 4. API lấy danh sách ghế đã bán/đang giữ chỗ của một chuyến xe
  // Frontend sẽ gọi: GET /api/payment/booked-seats/123
  @Get('booked-seats/:tripId')
  async getBookedSeats(@Param('tripId') tripId: string) {
    return this.paymentService.getBookedSeats(Number(tripId));
  }

  // 4. Xác nhận và gửi mail thủ công (Dùng cho môi trường Local/Test)
  @Get('confirm-local/:orderCode')
  async confirmLocal(@Param('orderCode') orderCode: string) {
    return this.paymentService.verifyAndSendMailLocal(orderCode);
  }

  // 5. Lấy chi tiết đơn hàng (Dùng cho trang hóa đơn /invoice/[orderCode])
  @Get('order/:orderCode')
  async getOrderDetails(@Param('orderCode') orderCode: string) {
    return this.paymentService.getOrderByCode(orderCode);
  }

  // 6. Lấy lịch sử đặt vé (Dùng cho trang /history)
  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    return this.paymentService.getOrderHistory(userId);
  }

  // 7. Xác thực vé (Dùng cho trang /verify/[orderCode] khi nhân viên quét QR)
  @Get('verify/:orderCode')
  async verify(@Param('orderCode') orderCode: string) {
    return this.paymentService.verifyTicket(orderCode);
  }
  @Get('failed-local/:orderCode')
  async markPaymentFailed(@Param('orderCode') orderCode: string) {
    return this.paymentService.markPaymentFailedLocal(orderCode);
  }

  // 8. Kiểm tra trạng thái thanh toán (Polling từ Frontend)
  @Get('status/:orderCode')
  async getPaymentStatus(@Param('orderCode') orderCode: string) {
    return this.paymentService.getPaymentStatus(orderCode);
  }
}