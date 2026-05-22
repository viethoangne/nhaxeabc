import { Module } from '@nestjs/common';
import { AdminPayrollController } from './admin-payroll.controller';
import { AdminPayrollService } from './admin-payroll.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminPayrollController],
  providers: [AdminPayrollService],
})
export class AdminPayrollModule {}
