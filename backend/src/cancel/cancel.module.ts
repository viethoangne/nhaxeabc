import { Module } from '@nestjs/common';
import { CancelController } from './cancel.controller'; // <--- Import Controller
import { CancelService } from './cancel.service';
import { PrismaModule } from '../prisma/prisma.module'; // Tùy project của bạn
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule], 
  controllers: [CancelController], // <--- BẮT BUỘC PHẢI CÓ DÒNG NÀY
  providers: [CancelService],
  exports: [CancelService],
})
export class CancelModule {}