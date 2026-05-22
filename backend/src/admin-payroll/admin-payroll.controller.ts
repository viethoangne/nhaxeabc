import { Controller, Get, Put, Param, Body, UseGuards, Query, Headers } from '@nestjs/common';
import { AdminPayrollService } from './admin-payroll.service';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/payroll')
@UseGuards(RolesGuard)
export class AdminPayrollController {
  constructor(private readonly payrollService: AdminPayrollService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  async getPayroll(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.payrollService.calculatePayroll(startDate, endDate);
  }

  @Put('config/:driverId')
  @Roles('ADMIN')
  async updateSalaryConfig(
    @Param('driverId') driverId: string,
    @Body('baseSalary') baseSalary: number,
    @Body('salaryPerKm') salaryPerKm: number,
    @Headers('x-user-id') adminId: string
  ) {
    return this.payrollService.updateSalaryConfig(
      Number(driverId),
      Number(baseSalary),
      Number(salaryPerKm),
      adminId
    );
  }
}
