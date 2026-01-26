import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChuyenXeController } from './chuyen-xe/chuyen-xe.controller';
import { AuthController } from './auth/auth.controller';

@Module({
  imports: [],
  controllers: [AppController, ChuyenXeController, AuthController],
  providers: [AppService],
})
export class AppModule {}
