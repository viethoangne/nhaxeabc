import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, BookingStatus } from '@prisma/client';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  private getStartOfDay(date: Date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(0 - 7, 0, 0, 0);
    return d;
  }

  async getDashboardData(timeRange: string = 'today', startDateStr?: string, endDateStr?: string) {
    let now = new Date();
    let startDate = this.getStartOfDay();
    let previousStartDate = new Date(startDate);
    let previousEndDate = new Date(startDate);

    if (startDateStr && endDateStr) {
      startDate = new Date(`${startDateStr}T00:00:00.000Z`);
      startDate.setUTCHours(startDate.getUTCHours() - 7); 

      const endDateObj = new Date(`${endDateStr}T23:59:59.999Z`);
      endDateObj.setUTCHours(endDateObj.getUTCHours() - 7);
      now = endDateObj;

      const diffTime = now.getTime() - startDate.getTime();
      previousEndDate = new Date(startDate.getTime() - 1000); 
      previousStartDate = new Date(previousEndDate.getTime() - diffTime);
    } 
    else {
      if (timeRange === 'yesterday') {
        startDate.setDate(startDate.getDate() - 1);
        now.setDate(now.getDate() - 1);
        now.setUTCHours(23 - 7, 59, 59, 999);
        previousStartDate.setDate(previousStartDate.getDate() - 2);
        previousEndDate = new Date(startDate);
      } else if (timeRange === '7days') {
        startDate.setDate(startDate.getDate() - 7);
        previousStartDate.setDate(previousStartDate.getDate() - 14);
        previousEndDate = new Date(startDate);
      } else if (timeRange === 'thisMonth') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setUTCHours(0 - 7, 0, 0, 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousStartDate.setUTCHours(0 - 7, 0, 0, 0);
        previousEndDate = new Date(startDate);
      }
    }

    const [ currentOrdersResult, previousOrdersResult, activeTripsCount, newCustomersCount, recentOrders, allCurrentOrders ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: startDate, lte: now } },
        _sum: { amount: true, tickets: true }
      }),
      this.prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: previousStartDate, lt: previousEndDate } },
        _sum: { amount: true, tickets: true }
      }),
      this.prisma.trip.count({ where: { status: 'RUNNING' } }),
      this.prisma.user.count({ where: { createdAt: { gte: startDate, lte: now } } }),
      this.prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: { orderCode: true, customerName: true, from: true, to: true, amount: true, paymentStatus: true, createdAt: true }
      }),
      this.prisma.order.findMany({
        where: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: startDate, lte: now } },
        select: { amount: true, createdAt: true }
      })
    ]);

    const currentRevenue = currentOrdersResult._sum.amount || 0;
    const previousRevenue = previousOrdersResult._sum.amount || 0;
    const currentTickets = currentOrdersResult._sum.tickets || 0;
    
    let revenueGrowth = 0;
    if (previousRevenue > 0) revenueGrowth = Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1));
    else if (currentRevenue > 0) revenueGrowth = 100;

    let chartData: number[] = [];
    if (timeRange === 'today' || timeRange === 'yesterday') {
      chartData = new Array(12).fill(0); 
      allCurrentOrders.forEach(o => {
        const vnDate = new Date(o.createdAt.getTime() + 7 * 60 * 60 * 1000); 
        const index = Math.floor(vnDate.getUTCHours() / 2);
        if (index >= 0 && index < 12) chartData[index] += o.amount;
      });
    } else if (timeRange === '7days') {
      chartData = new Array(7).fill(0); 
      const startMs = startDate.getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      allCurrentOrders.forEach(o => {
        const index = Math.floor((o.createdAt.getTime() - startMs) / dayMs);
        if (index >= 0 && index < 7) chartData[index] += o.amount;
      });
    } else if (timeRange === 'thisMonth') {
      chartData = new Array(5).fill(0); 
      const startMs = startDate.getTime();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      allCurrentOrders.forEach(o => {
        const index = Math.floor((o.createdAt.getTime() - startMs) / weekMs);
        if (index >= 0 && index < 5) chartData[index] += o.amount;
      });
    } else {
      chartData = new Array(7).fill(0);
      const startMs = startDate.getTime();
      const bucketMs = (now.getTime() - startMs) / 7;
      if (bucketMs > 0) {
        allCurrentOrders.forEach(o => {
          let index = Math.floor((o.createdAt.getTime() - startMs) / bucketMs);
          if (index === 7) index = 6;
          if (index >= 0 && index < 7) chartData[index] += o.amount;
        });
      }
    }

    return {
      stats: { revenue: currentRevenue, revenueGrowth, ticketsSold: currentTickets, activeTrips: activeTripsCount, newCustomers: newCustomersCount },
      recentOrders: recentOrders.map(o => ({
        id: `#${o.orderCode}`, customer: o.customerName || 'Khách vãng lai', route: `${o.from} → ${o.to}`, amount: o.amount, status: o.paymentStatus, createdAt: o.createdAt
      })),
      chartData: chartData 
    };
  }

  // =======================================================
  // 🤖 HỆ THỐNG GIÁM ĐỐC PHÂN TÍCH TỰ ĐỘNG (100% CODE THUẦN)
  // Không dùng API Groq/OpenAI - Hoạt động siêu tốc & ổn định
  // =======================================================
  async getAIInsights() {
    const now = new Date();
    const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Quét chuyến ế (Khởi hành trong 48h tới nhưng có cực ít khách)
    const upcomingTrips = await this.prisma.trip.findMany({
      where: { departDate: { gte: now, lte: next48h }, status: 'PUBLISHED' },
      include: { _count: { select: { orderSeats: true } } }
    });
    // Lọc chuyến có sức chứa < 30% (Giả sử xe 34 chỗ -> < 10 ghế)
    const emptyTrips = upcomingTrips.filter(t => t._count.orderSeats < 10);

    // 2. Thống kê 7 ngày qua (Tỷ lệ hủy & Tuyến Hot)
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: last7Days } }
    });
    
    const totalOrders = orders.length;
    const cancelledOrders = orders.filter(o => o.bookingStatus === 'CANCELLED').length;
    const cancelRateNum = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
    const cancelRate = cancelRateNum.toFixed(1);

    const routeCounts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.bookingStatus !== 'CANCELLED') {
        const r = `${o.from} ➔ ${o.to}`;
        routeCounts[r] = (routeCounts[r] || 0) + 1;
      }
    });
    const hotRoute = Object.keys(routeCounts).sort((a,b) => routeCounts[b] - routeCounts[a])[0] || 'Chưa có đủ dữ liệu';

    // Đóng gói số liệu cho UI
    const metrics = { emptyTrips: emptyTrips.length, hotRoute, cancelRate };

    // =========================================================
    // 🧠 LOGIC TỰ ĐỘNG PHÁT SINH VĂN BẢN (AUTO-GENERATOR)
    // =========================================================
    let generatedText = '';

    // Phân tích 1: Tình trạng lấp đầy (Chuyến ế)
    if (emptyTrips.length > 0) {
      generatedText += `⚠️ **Cảnh báo Chuyến Ế:** Hiện có ${emptyTrips.length} chuyến khởi hành trong 48h tới nhưng tỷ lệ lấp đầy dưới 30%. Đề xuất: Tung ngay mã ưu đãi giờ chót trên Website hoặc chạy chiến dịch SMS ZNS để kích cầu hành khách.\n\n`;
    } else {
      generatedText += `✅ **Công suất Tối ưu:** Tuyệt vời! Toàn bộ các chuyến xe xuất bến trong 48h tới đều đạt tỷ lệ lấp đầy an toàn. Hãy tiếp tục duy trì phong độ và chất lượng phục vụ này.\n\n`;
    }

    // Phân tích 2: Điểm nóng doanh thu
    if (hotRoute !== 'Chưa có đủ dữ liệu') {
      generatedText += `🔥 **Điểm nóng Doanh thu:** Tuyến "${hotRoute}" đang dẫn đầu lượng vé bán ra trong 7 ngày qua. Đề xuất: Cân nhắc điều phối thêm xe Limousine dự phòng hoặc tăng phiên tài xế cho tuyến này để tối đa hóa lợi nhuận cuối tuần.\n\n`;
    } else {
      generatedText += `📊 **Điểm nóng Doanh thu:** Hiện chưa có tuyến xe nào bứt phá rõ rệt trong tuần qua. Cần đẩy mạnh các gói voucher marketing đa kênh.\n\n`;
    }

    // Phân tích 3: Tỷ lệ khách hủy vé
    if (cancelRateNum > 10) {
      generatedText += `🚨 **Báo động Tỷ lệ hủy:** Tỷ lệ hủy vé đang ở mức báo động (${cancelRate}%). Đề xuất: Yêu cầu ngay bộ phận CSKH gọi điện xác nhận lý do hủy của khách và thiết lập chính sách siết chặt thời gian giữ chỗ tự động.`;
    } else {
      generatedText += `📈 **Tỷ lệ Hủy vé Ổn định:** Tỷ lệ hủy đang kiểm soát tốt ở mức an toàn (${cancelRate}%). Khách hàng có độ cam kết cực kỳ cao với dịch vụ của nhà xe chúng ta.`;
    }

    // Trả về kết quả cho Giao diện
    return {
      success: true,
      insightText: generatedText,
      metrics
    };
  }
}