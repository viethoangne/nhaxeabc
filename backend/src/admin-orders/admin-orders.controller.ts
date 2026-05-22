import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
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

  @Delete(':orderCode')
  @Roles('ADMIN') // 🔴 CHỈ ADMIN mới có quyền xoá vé khỏi DB
  async deleteOrder(
    @Param('orderCode') orderCode: string,
    @Request() req: any
  ) {
    const currentUserId = req.headers['x-user-id'] || 'unknown-admin'; 
    return this.ordersService.deleteOrder(orderCode, currentUserId);
  }

  @Get(':orderCode/refund-preview')
  @Roles('ADMIN')
  async previewRefund(@Param('orderCode') orderCode: string) {
    return this.ordersService.previewRefund(orderCode);
  }

  @Put(':orderCode/refund')
  @Roles('ADMIN')
  async processRefund(
    @Param('orderCode') orderCode: string,
    @Request() req: any
  ) {
    const currentUserId = req.headers['x-user-id'] || 'unknown-admin'; 
    return this.ordersService.processRefund(orderCode, currentUserId);
  }

  @Put(':orderCode/swap-seat')
  @Roles('ADMIN', 'STAFF')
  async swapSeat(
    @Param('orderCode') orderCode: string,
    @Body('currentSeat') currentSeat: string,
    @Body('newSeat') newSeat: string,
    @Body('direction') direction?: string
  ) {
    return this.ordersService.swapSeat(orderCode, currentSeat, newSeat, direction || 'outbound');
  }

  @Delete('temp/clear-cancelled')
  async clearCancelled() {
    return this.ordersService.clearCancelled();
  }
}