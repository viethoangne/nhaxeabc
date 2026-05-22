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

  @Get('public/stats')
  async getPublicStats() {
    try {
      const totalDrivers = await this.prismaService.driver.count();
      const totalBuses = await this.prismaService.bus.count();
      const totalTrips = await this.prismaService.trip.count();
      const totalCustomers = await this.prismaService.user.count({
        where: { role: 'CUSTOMER' }
      });

      return {
        drivers: totalDrivers || 120,
        buses: totalBuses || 45,
        trips: totalTrips || 1980,
        customers: totalCustomers || 5400,
      };
    } catch (error) {
      console.error("Lỗi lấy thống kê public:", error);
      return {
        drivers: 120,
        buses: 45,
        trips: 1980,
        customers: 5400,
      };
    }
  }

  @Get('public/testimonials')
  async getPublicTestimonials() {
    try {
      const users = await this.prismaService.user.findMany({
        orderBy: [
          { points: 'desc' },
          { createdAt: 'asc' }
        ],
        take: 5,
        select: {
          name: true,
          picture: true,
          points: true,
          role: true,
        }
      });

      const customFeedbacks = [
        'Em vừa trải nghiệm đặt vé limousine qua Trợ lý AI, thực sự bất ngờ vì hệ thống nhận diện giọng nói cực nhạy, phản hồi chỉ mất vài giây. Xe Limousine đi êm ái, phục vụ rất chu đáo! 🥰',
        'Lần đầu tiên thấy một nhà xe tích hợp công nghệ đỉnh cao như thế này tại Việt Nam. Vừa thanh toán nhanh qua VNPAY, vừa được tích lũy điểm thưởng đổi quà. Xe siêu sạch sẽ và phục vụ chuyên nghiệp. 👍',
        'Hủy chuyến hay đổi giờ đều được Trợ lý AI xử lý trực tuyến ngay lập tức chứ không phải gọi điện chờ tổng đài như trước. ABC Bus thực sự xứng đáng nhận điểm 10 chất lượng! ⭐⭐⭐⭐⭐',
      ];

      // Format list with dynamic roles based on actual roles in database
      const finalReviews = users.map((user, idx) => {
        let role = 'Thành viên Hạng Bạc';
        if (user.role === 'ADMIN') role = 'Quản Trị Viên (ABC Admin)';
        else if (user.points >= 500) role = 'Khách hàng Kim Cương (Loyalty VIP)';
        else if (user.points >= 200) role = 'Khách hàng Thân Thiết (Gold Member)';
        else if (user.points >= 100) role = 'Khách hàng VIP (Elite Passenger)';

        return {
          name: user.name || 'Thành viên ABC',
          picture: user.picture || '',
          role,
          feedback: customFeedbacks[idx % customFeedbacks.length],
          rating: 5,
        };
      });

      return finalReviews.slice(0, 3);
    } catch (error) {
      return [
        {
          name: 'Mai Cao',
          picture: '/brand/avatar1.png',
          role: 'Khách hàng Kim Cương (Loyalty VIP)',
          feedback: 'Em vừa trải nghiệm đặt vé limousine qua Trợ lý AI, thực sự bất ngờ vì hệ thống nhận diện giọng nói cực nhạy, phản hồi chỉ mất vài giây. Xe Limousine đi êm ái, phục vụ rất chu đáo! 🥰',
          rating: 5,
        },
      ];
    }
  }
}