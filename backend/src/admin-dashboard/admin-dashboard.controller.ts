import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  async getDashboardSummary(
    @Query('timeRange') timeRange: string,
    @Query('startDate') startDate: string, // 🟢 Bổ sung startDate
    @Query('endDate') endDate: string      // 🟢 Bổ sung endDate
  ) {
    // Đẩy cả 3 biến xuống Service
    const data = await this.dashboardService.getDashboardData(timeRange, startDate, endDate);
    return { success: true, message: 'Thành công', data: data };
  }
  @Get('ai-insights')
  async getAiInsights() {
    return this.dashboardService.getAIInsights();
  }
}