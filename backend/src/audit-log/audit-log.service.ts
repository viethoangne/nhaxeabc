import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  async logAction(adminId: string, action: string, entityType: string, entityId: string, details?: any) {
    if (!adminId || adminId === 'SYSTEM') {
      return null; 
    }
    return this.prisma.adminLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        details: details || null,
      },
    });
  }

  // 🟢 HÀM NÀY ĐÃ ĐƯỢC THÊM BỘ LỌC ACTION ĐỂ TÌM ĐÚNG "TẠO CHUYẾN MỚI"
  async findAll(limit: number = 50, actionFilter?: string) {
    const whereCondition = actionFilter && actionFilter !== 'ALL' ? { action: actionFilter } : {};

    return this.prisma.adminLog.findMany({
      take: limit,
      where: whereCondition, // Bắt buộc phải có dòng này thì DB mới lọc
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { name: true, email: true, role: true }
        }
      }
    });
  }

  // 🟢 CRONJOB DỌN RÁC: Xóa dữ liệu cũ hơn 1 NGÀY
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldLogs() {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1); // Trừ đi 1 ngày

      const result = await this.prisma.adminLog.deleteMany({
        where: {
          createdAt: {
            lt: oneDayAgo, 
          },
        },
      });

      if (result.count > 0) {
         this.logger.log(`🧹 [CronJob] Đã tự động dọn dẹp ${result.count} nhật ký cũ hơn 1 ngày.`);
      }
    } catch (error) {
      this.logger.error('Lỗi khi chạy CronJob dọn dẹp nhật ký:', error);
    }
  }
}