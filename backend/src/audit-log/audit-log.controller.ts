import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('admin/audit-logs')
@UseGuards(RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles('ADMIN') 
  async getLogs(
    @Query('limit') limit: string,
    @Query('action') action: string // 🟢 BẮT BUỘC THÊM DÒNG NÀY ĐỂ NHẬN BỘ LỌC
  ) {
    // 🟢 Truyền action xuống service
    const logs = await this.auditLogService.findAll(Number(limit) || 100, action );
    return {
      success: true,
      data: logs
    };
  }
}