import { Module } from '@nestjs/common';
import { AdminChatService } from './admin-chat.service';
import { AdminChatController } from './admin-chat.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AdminTripsModule } from '../admin-trips/admin-trips.module';

@Module({
  imports: [AdminTripsModule],
  controllers: [AdminChatController],
  providers: [AdminChatService, PrismaService],
  exports: [AdminChatService],
})
export class AdminChatModule {}
