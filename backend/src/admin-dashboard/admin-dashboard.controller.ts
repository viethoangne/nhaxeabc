import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
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
  async getAiInsights(@Query('enableWeather') enableWeather?: string) {
    const isWeatherEnabled = enableWeather === 'true';
    return this.dashboardService.getAIInsights(isWeatherEnabled);
  }

  // PUBLIC: Trả về trạng thái bảo trì
  @Get('system-status')
  async getSystemStatus() {
    return this.dashboardService.getSystemStatus();
  }

  // PROTECTED: Admin bật/tắt trạng thái bảo trì
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('system-maintenance')
  async toggleMaintenance(@Body() body: { isMaintenance: boolean }) {
    return this.dashboardService.toggleMaintenance(body.isMaintenance);
  }
}