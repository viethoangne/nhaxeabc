import { Module } from '@nestjs/common';
import { ChuyenXeController } from './chuyen-xe.controller';
import { ChuyenXeService } from './chuyen-xe.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChuyenXeController],
  providers: [ChuyenXeService],
})
export class ChuyenXeModule {}