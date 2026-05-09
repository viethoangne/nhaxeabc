import { Module } from '@nestjs/common';
import { CancelController } from './cancel.controller'; // <--- Import Controller
import { CancelService } from './cancel.service';
import { PrismaModule } from '../prisma/prisma.module'; // Tùy project của bạn

@Module({
  imports: [PrismaModule], 
  controllers: [CancelController], // <--- BẮT BUỘC PHẢI CÓ DÒNG NÀY
  providers: [CancelService],
})
export class CancelModule {}