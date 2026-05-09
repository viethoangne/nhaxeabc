import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { PrismaModule } from '../prisma/prisma.module'; // Đảm bảo đường dẫn này đúng với cấu trúc của bạn

@Module({
  // Thêm PrismaModule vào imports
  imports: [PrismaModule], 
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}