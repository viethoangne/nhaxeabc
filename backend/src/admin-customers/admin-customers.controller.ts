import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
}