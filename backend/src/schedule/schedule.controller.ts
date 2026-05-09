// src/schedule/schedule.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // API lấy toàn bộ chuyến xe (Dùng cho trang đặt vé, chọn giờ)
  @Get()
  async getAllSchedules() {
    const schedules = await this.scheduleService.getSchedules();
    return schedules.map(schedule => ({
      ...schedule,
      departDate: schedule?.departDate?.toISOString(),
      arrivalDate: schedule?.arrivalDate?.toISOString() || null,
    }));
  }

  // API lấy danh sách tuyến khai thác (Dùng cho trang Lịch trình bạn đang làm)
  @Get('routes') 
  async getRoutes() {
    return await this.scheduleService.getRoutes();
  }
}