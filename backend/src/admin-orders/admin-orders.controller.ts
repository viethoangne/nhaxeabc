import { Controller, Get, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/orders')
@UseGuards(RolesGuard)
export class AdminOrdersController {
  constructor(private readonly ordersService: AdminOrdersService) {}

  @Get()
  @Roles('ADMIN', 'STAFF') // Staff cũng được xem danh sách
  async getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Put(':orderCode/cancel')
  @Roles('ADMIN') // 🔴 CHỈ ADMIN mới có quyền huỷ vé/nhả ghế (Tuỳ bạn config)
  async cancelOrder(
    @Param('orderCode') orderCode: string,
    @Body('reason') reason: string,
    @Request() req: any
  ) {
    // Lấy ID từ thẻ thông hành do FE truyền lên
    const currentUserId = req.headers['x-user-id'] || 'unknown-admin'; 
    return this.ordersService.cancelOrder(orderCode, currentUserId, reason || 'Admin huỷ thủ công');
  }
}