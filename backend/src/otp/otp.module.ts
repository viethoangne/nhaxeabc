import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';

@Module({
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService], // BẮT BUỘC PHẢI CÓ DÒNG NÀY
})
export class OtpModule {}