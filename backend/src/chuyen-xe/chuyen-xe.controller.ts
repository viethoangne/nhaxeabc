import { Controller, Get, Query } from '@nestjs/common';
import { ChuyenXeService } from './chuyen-xe.service';

@Controller('chuyenXe')
export class ChuyenXeController {
  constructor(private readonly chuyenXeService: ChuyenXeService) {}

  @Get()
  async handleQuery(
    @Query('action') action: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date: string,
  ) {
    // Ép kiểu action để đảm bảo luôn chạy đúng hàm searchTrips
    if (action === 'searchTrips') {
      const result = await this.chuyenXeService.searchTrips(from, to, date);
      return result;
    }

    return {
      message: 'Invalid action',
      trips: [],
    };
  }
}