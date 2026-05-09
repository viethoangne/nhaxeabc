import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

@Module({
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService], // Export nếu sau này module khác cần dùng lại service này
})
export class HistoryModule {}