import { Module } from '@nestjs/common';
import { LookupController } from './lookup.controller';
import { LookupService } from './lookup.service';
import { PrismaModule } from '../prisma/prisma.module'; // Thêm dòng này

@Module({
  imports: [PrismaModule], // Thêm PrismaModule vào mảng imports
  controllers: [LookupController],
  providers: [LookupService],
})
export class LookupModule {}