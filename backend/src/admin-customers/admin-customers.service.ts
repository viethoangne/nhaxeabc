import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminCustomersService {
  constructor(private prisma: PrismaService) {}

  async getCustomers(search?: string) {
    const whereCondition: any = {};
    
    // Tìm kiếm theo Tên, Email hoặc Số điện thoại
    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        points: true, 
        totalTrips: true, 
        picture: true,    
      }
    });

    // Format lại dữ liệu trả về cho Frontend
    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || 'Chưa cập nhật', 
      trips: user.totalTrips || 0, 
      points: user.points || 0,
      role: user.role,
      avatar: user.picture || null 
    }));
  }

  async getCustomerOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        seats: true,
      },
    });

    return orders.map(order => ({
      id: order.id,
      orderCode: order.orderCode,
      from: order.from,
      to: order.to,
      tripType: order.tripType,
      tickets: order.tickets,
      amount: order.amount,
      bookingStatus: order.bookingStatus,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      
      outboundDepart: order.outboundDepartDateSnapshot || order.date,
      outboundBusType: order.outboundBusTypeSnapshot || 'LIMOUSINE',
      outboundSeats: order.seats
        .filter(s => s.tripDirection === 'outbound')
        .map(s => s.seatNumber),

      returnDepart: order.returnDepartDateSnapshot || order.returnDate,
      returnBusType: order.returnBusTypeSnapshot || 'LIMOUSINE',
      returnSeats: order.seats
        .filter(s => s.tripDirection === 'return')
        .map(s => s.seatNumber),
    }));
  }

  // --- ĐỘNG CƠ AI PHÂN LỚP KHÁCH HÀNG (RFM EXPERT RULE ENGINE) ---
  async getAiSegmentation() {
    const users = await this.prisma.user.findMany({
      orderBy: { points: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        points: true,
        totalTrips: true,
        picture: true,
        createdAt: true,
      }
    });

    const segmentedUsers = users.map(user => {
      let segment = 'TIỀM NĂNG';
      let segmentStyle = 'bg-blue-50 text-blue-600 border-blue-200';
      let aiNote = 'Khách mới tham gia hệ thống, cần gửi mã khuyến mãi chào mừng.';

      const trips = user.totalTrips || 0;
      const points = user.points || 0;

      if (user.role === 'ADMIN') {
        segment = 'QUẢN TRỊ VIÊN';
        segmentStyle = 'bg-purple-50 text-purple-600 border-purple-200';
        aiNote = 'Tài khoản quản trị điều hành, không áp dụng khuyến mãi.';
      } else if (trips >= 5 || points >= 500) {
        segment = 'VIP HẠNG SANG';
        segmentStyle = 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600 shadow-sm';
        aiNote = 'Khách hàng trung thành tần suất cao, đề xuất tặng Voucher riêng Lễ Tết.';
      } else if (trips >= 2 && trips < 5) {
        segment = 'THƯỜNG XUYÊN';
        segmentStyle = 'bg-emerald-50 text-emerald-600 border-emerald-200';
        aiNote = 'Khách hàng đang tin dùng dịch vụ, đề xuất mời tham gia tích điểm hạng VIP.';
      } else if (trips > 0 && points === 0) {
        segment = 'NGUY CƠ RỜI BỎ';
        segmentStyle = 'bg-rose-50 text-rose-600 border-rose-200';
        aiNote = 'Đã lâu chưa đặt vé lại, đề xuất gửi SMS tặng mã giảm giá 30K lôi kéo quay lại.';
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || 'Chưa cập nhật',
        trips,
        points,
        role: user.role,
        avatar: user.picture || null,
        segment,
        segmentStyle,
        aiNote,
      };
    });

    const summary = {
      total: segmentedUsers.length,
      vipCount: segmentedUsers.filter(u => u.segment === 'VIP HẠNG SANG').length,
      regularCount: segmentedUsers.filter(u => u.segment === 'THƯỜNG XUYÊN').length,
      churnRiskCount: segmentedUsers.filter(u => u.segment === 'NGUY CƠ RỜI BỎ').length,
      potentialCount: segmentedUsers.filter(u => u.segment === 'TIỀM NĂNG').length,
    };

    return {
      summary,
      users: segmentedUsers,
    };
  }
}