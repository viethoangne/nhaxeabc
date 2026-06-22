import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // Lấy dữ liệu (Dùng khi F5 hoặc load trang)
  @Get()
  async getLoyalty(@Query('userId') userId: string) {
    return this.loyaltyService.getUserLoyaltyData(userId);
  }

  // Xử lý đổi điểm (Dùng khi bấm nút "Đổi mã")
  @Post('redeem')
  async redeem(@Body() body: { userId: string; voucherId: string }) {
    return this.loyaltyService.redeemVoucher(body.userId, body.voucherId);
  }

  // Xử lý game vòng quay may mắn (Trừ 50 điểm, nhận phần thưởng ngẫu nhiên)
  @Post('spin')
  async spin(@Body() body: { userId: string }) {
    return this.loyaltyService.spinGame(body.userId);
  }
}