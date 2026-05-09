import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global() // 🟢 Đặt là Global để các module khác không cần import lại nhiều lần
@Module({
  imports: [PrismaModule],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService], // Export để module khác dùng ghi log
})
export class AuditLogModule {}