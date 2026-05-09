import { Controller, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history') // Đường dẫn gốc sẽ là: /history
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  // Nhận request DELETE: /history/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteHistory(@Param('id') id: string) {
    return await this.historyService.deleteHistoryRecord(id);
  }
}