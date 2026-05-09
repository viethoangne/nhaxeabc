// src/prisma/prisma.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],  // Đảm bảo PrismaService được cung cấp
  exports: [PrismaService],    // Xuất PrismaService để có thể sử dụng trong các module khác
})
export class PrismaModule {}