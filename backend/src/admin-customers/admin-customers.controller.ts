import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { AdminCustomersService } from './admin-customers.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('admin/customers')
@UseGuards(RolesGuard)
export class AdminCustomersController {
  constructor(private readonly customersService: AdminCustomersService) {}

  @Get()
  @Roles('ADMIN', 'STAFF') // Tuỳ bạn quyết định Staff có được xem không
  async getAllCustomers(@Query('search') search: string) {
    const data = await this.customersService.getCustomers(search);
    return {
      success: true,
      data
    };
  }

  @Get('ai/segmentation')
  @Roles('ADMIN', 'STAFF')
  async getAiSegmentation() {
    const data = await this.customersService.getAiSegmentation();
    return {
      success: true,
      data
    };
  }

  @Get(':id/orders')
  @Roles('ADMIN', 'STAFF')
  async getCustomerOrders(@Param('id') id: string) {
    const data = await this.customersService.getCustomerOrders(id);
    return {
      success: true,
      data
    };
  }
}