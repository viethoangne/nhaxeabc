import { Module } from '@nestjs/common';
import { AdminLoyaltyController } from './admin-loyalty.controller';
import { AdminLoyaltyService } from './admin-loyalty.service';
import { PrismaModule } from '../prisma/prisma.module'; // Điều chỉnh đường dẫn theo project của bạn

@Module({
  imports: [PrismaModule],
  controllers: [AdminLoyaltyController],
  providers: [AdminLoyaltyService],
})
export class AdminLoyaltyModule {}