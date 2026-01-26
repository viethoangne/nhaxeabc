import { Controller, Get, Query } from '@nestjs/common';

@Controller('api/ChuyenXe')
export class ChuyenXeController {
  @Get()
  getBusStations(@Query('action') action: string) {
    if (action === 'getBusStations') {
      return {
        stations: [
          { id: 1, name: 'Bến xe Miền Đông' },
          { id: 2, name: 'Bến xe Miền Tây' },
          { id: 3, name: 'Bến xe Đà Lạt' },
        ],
      };
    }
    return { stations: [] };
  }
}
