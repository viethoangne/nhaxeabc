import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service'; // Đảm bảo đường dẫn này đúng với project của bạn

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prismaService: PrismaService, // Thêm PrismaService vào constructor
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // API đồng bộ User từ Google Đăng nhập ở Frontend gửi qua
  @Post('api/auth/sync-google-user')
  async syncGoogleUser(
    @Body() data: { email: string; name: string; image: string },
    @Query('language') language: string = 'vi', // Lấy ngôn ngữ từ query (default là 'vi')
  ) {
    // Sử dụng upsert để: Nếu email tồn tại thì cập nhật thông tin mới, nếu chưa có thì tạo mới
    const user = await this.prismaService.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        picture: data.image,
        language: language, // Cập nhật ngôn ngữ cho người dùng
      },
      create: {
        email: data.email,
        name: data.name,
        picture: data.image,
        language: language, // Lưu ngôn ngữ khi tạo mới người dùng
      },
    });

    // Trả về ID của user để Frontend lưu vào Session
    return { id: user.id, language: user.language };
  }
}