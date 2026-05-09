import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { PrismaModule } from '../prisma/prisma.module'; // Đường dẫn trỏ tới PrismaModule của bạn

@Module({
  imports: [PrismaModule], // Import PrismaModule để LoyaltyService dùng được PrismaService
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService], // Export ra nếu sau này có module khác (ví dụ PaymentModule) cần gọi hàm của LoyaltyService
})
export class LoyaltyModule {}