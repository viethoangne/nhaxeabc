import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { CancelService } from '../cancel/cancel.service'; // Đảm bảo đường dẫn này đúng tới file của anh
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [ChatController],
  providers: [
    ChatService, 
    PrismaService, 
    CancelService // PHẢI THÊM DÒNG NÀY VÀO ĐÂY
  ], 
  exports: [ChatService],
})
export class ChatModule {}