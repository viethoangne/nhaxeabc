import { Controller, Post, Body } from '@nestjs/common';
import { OtpService } from './otp.service';

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send-otp')
  async sendOtp(@Body('email') email: string) {
    return this.otpService.sendOtp(email);
  }

  // THÊM API NÀY ĐỂ FRONTEND GỌI KHI NHẬP XONG 6 SỐ
  @Post('verify')
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.otpService.verifyOtpRightAway(body.email, body.otp);
  }
}