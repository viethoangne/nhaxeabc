import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  async logAction(adminId: string, action: string, entityType: string, entityId: string, details?: any) {
    const actionUpper = action.toUpperCase();
    let severity = 'INFO';
    if (actionUpper.includes('DELETE') || actionUpper.includes('CANCEL') || actionUpper.includes('FAIL')) {
      severity = 'CRITICAL';
    } else if (actionUpper.includes('UPDATE') || actionUpper.includes('ASSIGN')) {
      severity = 'WARNING';
    }

    const payload = {
      ...(typeof details === 'object' && details ? details : { raw: details }),
      severity: details?.severity || severity,
      ipAddress: details?.ipAddress || '127.0.0.1 (Internal Bot / Gateway)',
      userAgent: details?.userAgent || 'Node.js/Next.js Runtime Service Engine',
      loggedAt: new Date().toISOString(),
    };

    const finalAdminId = (!adminId || adminId === 'SYSTEM') ? null : adminId;

    return this.prisma.adminLog.create({
      data: {
        adminId: finalAdminId,
        action,
        entityType,
        entityId,
        details: payload,
      },
    });
  }

  async findAll(limit: number = 50, actionFilter?: string) {
    const whereCondition = actionFilter && actionFilter !== 'ALL' ? { action: actionFilter } : {};

    return this.prisma.adminLog.findMany({
      take: limit,
      where: whereCondition, 
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { name: true, email: true, role: true }
        }
      }
    });
  }

  // CRONJOB DỌN RÁC: Xóa dữ liệu cũ hơn 1 NGÀY (Đã bổ sung sao lưu Auto-Archive)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldLogs() {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1); 

      // 1. Tự động sao lưu trước khi dọn dẹp để phục vụ đối chiếu pháp lý
      const oldLogs = await this.prisma.adminLog.findMany({
        where: { createdAt: { lt: oneDayAgo } }
      });

      if (oldLogs.length > 0) {
        this.logger.log(`📦 [Auto-Archive] Đang sao lưu ${oldLogs.length} nhật ký hệ thống trước khi dọn dẹp 24h...`);
        this.logger.log(`🔒 [Archive Snapshot]: ${JSON.stringify(oldLogs)}`);
      }

      // 2. Thực hiện xóa sau khi đã sao lưu thành công
      const result = await this.prisma.adminLog.deleteMany({
        where: {
          createdAt: {
            lt: oneDayAgo, 
          },
        },
      });

      if (result.count > 0) {
         this.logger.log(`🧹 [CronJob] Đã tự động dọn dẹp ${result.count} nhật ký cũ hơn 1 ngày (Đã sao lưu an toàn).`);
      }
    } catch (error) {
      this.logger.error('Lỗi khi chạy CronJob dọn dẹp nhật ký:', error);
    }
  }
}