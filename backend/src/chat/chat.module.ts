import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { CancelModule } from '../cancel/cancel.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [CancelModule],
  controllers: [ChatController],
  providers: [
    ChatService, 
    PrismaService, 
  ], 
  exports: [ChatService],
})
export class ChatModule {}