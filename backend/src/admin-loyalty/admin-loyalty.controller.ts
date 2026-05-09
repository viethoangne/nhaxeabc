import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AdminLoyaltyService } from './admin-loyalty.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('admin/loyalty')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminLoyaltyController {
  constructor(private readonly adminLoyaltyService: AdminLoyaltyService) {}

  @Get('users')
  getUsers(@Query('search') search: string) {
    return this.adminLoyaltyService.getUsers(search);
  }

  @Post('users/:id/adjust')
  adjustPoints(
    @Req() req: any, 
    @Param('id') userId: string, 
    @Body() body: { pointsToAdd: number; reason: string }
  ) {
    const adminId = req.user?.id || null; // Dùng null để không vi phạm FK
    return this.adminLoyaltyService.adjustPoints(adminId, userId, body.pointsToAdd, body.reason);
  }

  @Get('vouchers')
  getVouchers() {
    return this.adminLoyaltyService.getVouchers();
  }

  @Post('vouchers')
  createVoucher(@Body() data: any) {
    return this.adminLoyaltyService.createVoucher(data);
  }

  @Put('vouchers/:id')
  updateVoucher(@Param('id') id: string, @Body() data: any) {
    return this.adminLoyaltyService.updateVoucher(id, data);
  }

  @Delete('vouchers/:id')
  deleteVoucher(@Param('id') id: string) {
    return this.adminLoyaltyService.deleteVoucher(id);
  }

  @Post('ai-suggest')
  suggestVoucher(@Body() body: { topic: string; discountLevel: string }) {
    return this.adminLoyaltyService.suggestVoucherByAI(body.topic, body.discountLevel);
  }
}