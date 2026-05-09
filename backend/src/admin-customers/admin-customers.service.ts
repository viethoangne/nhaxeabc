import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminCustomersService {
  constructor(private prisma: PrismaService) {}

  async getCustomers(search?: string) {
    const whereCondition: any = {};
    
    // 🟢 Chức năng tìm kiếm theo Tên hoặc Email (Đã bỏ phone vì DB không có)
    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        points: true, 
        totalTrips: true, // 🟢 Kéo thẳng cột totalTrips có sẵn trong DB của bạn ra
        picture: true,    // 🟢 Lấy luôn link ảnh đại diện
      }
    });

    // Format lại dữ liệu trả về cho Frontend
    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: 'Chưa cập nhật', // Vì DB không có cột số điện thoại nên để mặc định như thế này
      trips: user.totalTrips || 0, 
      points: user.points || 0,
      role: user.role,
      avatar: user.picture || null 
    }));
  }
}