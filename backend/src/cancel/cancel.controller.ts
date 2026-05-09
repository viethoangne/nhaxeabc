import { Controller, Post, Body } from '@nestjs/common';
import { CancelService } from './cancel.service'; // Đảm bảo import đúng đường dẫn service của bạn

@Controller() // Khai báo tiền tố /api
export class CancelController {
  constructor(private readonly cancelService: CancelService) {}

  @Post('cancel-ticket') // Kết hợp lại thành /api/cancel-ticket
  async cancelTicket(
    @Body() body: { orderCode: string; phone: string; email: string }
  ) {
    return this.cancelService.cancelTicket(body.orderCode, body.phone, body.email);
  }
}