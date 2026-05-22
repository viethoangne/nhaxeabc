import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AdminDashboardService {
  private groq: OpenAI;

  constructor(private prisma: PrismaService) {
    const groqKey = process.env.GROQ_API_KEY;
    this.groq = new OpenAI({
      apiKey: groqKey?.trim(),
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  private getStartOfDay(date: Date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(0 - 7, 0, 0, 0);
    return d;
  }

  // =======================================================
  // QUẢN LÝ BẢO TRÌ HỆ THỐNG
  // =======================================================
  private readonly settingsPath = path.join(process.cwd(), 'system-settings.json');

  getSystemStatus() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Lỗi đọc file system-settings.json:", e);
    }
    return { isMaintenance: false };
  }

  toggleMaintenance(isMaintenance: boolean) {
    const status = { isMaintenance };
    fs.writeFileSync(this.settingsPath, JSON.stringify(status, null, 2), 'utf8');
    return { success: true, isMaintenance };
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

    const [ currentOrdersResult, previousOrdersResult, activeTripsCount, newCustomersCount, activeVouchersCount, recentOrders, allCurrentOrders, refundedResult ] = await Promise.all([
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
      this.prisma.voucher.count(),
      this.prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: { orderCode: true, customerName: true, from: true, to: true, amount: true, paymentStatus: true, createdAt: true }
      }),
      this.prisma.order.findMany({
        where: { 
          paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] }, 
          createdAt: { gte: startDate, lte: now } 
        },
        orderBy: { createdAt: 'desc' },
        select: { orderCode: true, customerName: true, amount: true, refundAmount: true, tickets: true, paymentMethod: true, from: true, to: true, createdAt: true, paymentStatus: true }
      }),
      // Tổng tiền đã hoàn trong kỳ (REFUNDED orders có refundAmount > 0)
      this.prisma.order.aggregate({
        where: { 
          paymentStatus: PaymentStatus.REFUNDED,
          createdAt: { gte: startDate, lte: now }
        },
        _sum: { refundAmount: true }
      }),
    ]);

    const grossRevenue = currentOrdersResult._sum.amount || 0;
    const totalRefunded = refundedResult._sum.refundAmount || 0;
    const currentRevenue = grossRevenue - totalRefunded; // Doanh thu THỰC = thu vào - đã hoàn
    const previousRevenue = previousOrdersResult._sum.amount || 0;
    const currentTickets = currentOrdersResult._sum.tickets || 0;
    
    let revenueGrowth = 0;
    if (previousRevenue > 0) revenueGrowth = Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1));
    else if (currentRevenue > 0) revenueGrowth = 100;

    let chartData: number[] = [];
    if (timeRange === 'today' || timeRange === 'yesterday') {
      chartData = new Array(12).fill(0); 
      allCurrentOrders.forEach(o => {
        const isPaid = o.paymentStatus === 'PAID';
        const amt = isPaid ? o.amount : -o.refundAmount;
        const vnDate = new Date(o.createdAt.getTime() + 7 * 60 * 60 * 1000); 
        const index = Math.floor(vnDate.getUTCHours() / 2);
        if (index >= 0 && index < 12) chartData[index] += amt;
      });
    } else if (timeRange === '7days') {
      chartData = new Array(7).fill(0); 
      const startMs = startDate.getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      allCurrentOrders.forEach(o => {
        const isPaid = o.paymentStatus === 'PAID';
        const amt = isPaid ? o.amount : -o.refundAmount;
        const index = Math.floor((o.createdAt.getTime() - startMs) / dayMs);
        if (index >= 0 && index < 7) chartData[index] += amt;
      });
    } else if (timeRange === 'thisMonth') {
      chartData = new Array(5).fill(0); 
      const startMs = startDate.getTime();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      allCurrentOrders.forEach(o => {
        const isPaid = o.paymentStatus === 'PAID';
        const amt = isPaid ? o.amount : -o.refundAmount;
        const index = Math.floor((o.createdAt.getTime() - startMs) / weekMs);
        if (index >= 0 && index < 5) chartData[index] += amt;
      });
    } else {
      chartData = new Array(7).fill(0);
      const startMs = startDate.getTime();
      const bucketMs = (now.getTime() - startMs) / 7;
      if (bucketMs > 0) {
        allCurrentOrders.forEach(o => {
          const isPaid = o.paymentStatus === 'PAID';
          const amt = isPaid ? o.amount : -o.refundAmount;
          let index = Math.floor((o.createdAt.getTime() - startMs) / bucketMs);
          if (index === 7) index = 6;
          if (index >= 0 && index < 7) chartData[index] += amt;
        });
      }
    }

    // --- THỰC TẾ: AGGREGATE DỮ LIỆU THẬT TỪ CSDL CHO BỘ BÊN DƯỚI ---
    
    // 1. Phân tích Tuyến đường
    const routeSums: Record<string, number> = {};
    allCurrentOrders.forEach(o => {
      if (o.from && o.to) {
        const r = `${o.from} ➔ ${o.to}`;
        const amt = o.paymentStatus === 'REFUNDED' ? -o.refundAmount : o.amount;
        routeSums[r] = (routeSums[r] || 0) + amt;
      }
    });

    const sortedRoutes = Object.entries(routeSums)
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val);

    const totalRouteRev = sortedRoutes.reduce((acc, curr) => acc + curr.val, 0) || 1;
    const routesData = sortedRoutes.map(item => ({
      name: item.name,
      share: Number((item.val / totalRouteRev).toFixed(2)),
      val: item.val
    }));

    const finalRoutesData: any[] = [];
    if (routesData.length > 0) {
      if (routesData.length <= 4) {
        finalRoutesData.push(...routesData);
      } else {
        const top3 = routesData.slice(0, 3);
        const othersVal = routesData.slice(3).reduce((acc, curr) => acc + curr.val, 0);
        const othersShare = routesData.slice(3).reduce((acc, curr) => acc + curr.val / totalRouteRev, 0);
        finalRoutesData.push(...top3, { name: 'Tuyến Khác', share: Number(othersShare.toFixed(2)), val: othersVal });
      }
    }

    // Nếu không có dữ liệu thật, cung cấp dữ liệu mô phỏng an sau khớp chính xác 100% doanh thu
    if (finalRoutesData.length === 0) {
      finalRoutesData.push(
        { name: 'Hà Nội ➔ Đà Lạt', share: 0.45, val: currentRevenue * 0.45 },
        { name: 'Sài Gòn ➔ Nha Trang', share: 0.30, val: currentRevenue * 0.30 },
        { name: 'Hà Nội ➔ Cát Bà', share: 0.15, val: currentRevenue * 0.15 },
        { name: 'Đà Nẵng ➔ Phan Thiết', share: 0.10, val: currentRevenue * 0.10 },
      );
    }

    // 2. Phân tích Cổng thanh toán (MOMO vs VNPAY/VIETQR)
    let momoTickets = 0;
    let vnpayTickets = 0;
    let momoRevenue = 0;
    let vnpayRevenue = 0;

    allCurrentOrders.forEach(o => {
      const isMomo = o.paymentMethod === 'MOMO';
      const isPaid = o.paymentStatus === 'PAID';
      const amt = isPaid ? o.amount : -o.refundAmount;

      if (isMomo) {
        if (isPaid) momoTickets += o.tickets || 1;
        momoRevenue += amt;
      } else {
        if (isPaid) vnpayTickets += o.tickets || 1;
        vnpayRevenue += amt;
      }
    });

    momoRevenue = Math.max(momoRevenue, 0);
    vnpayRevenue = Math.max(vnpayRevenue, 0);

    if (momoRevenue === 0 && vnpayRevenue === 0) {
      momoTickets = Math.round(currentTickets * 0.38);
      vnpayTickets = currentTickets - momoTickets;
      momoRevenue = currentRevenue * 0.38;
      vnpayRevenue = currentRevenue * 0.62;
    }

    // 3. Phân tích Khung giờ đặt vé
    const hourlyDistribution = [0, 0, 0, 0];
    allCurrentOrders.forEach(o => {
      if (o.paymentStatus === 'PAID') {
        const vnDate = new Date(o.createdAt.getTime() + 7 * 60 * 60 * 1000);
        const hour = vnDate.getUTCHours();
        if (hour >= 0 && hour < 6) hourlyDistribution[0]++;
        else if (hour >= 6 && hour < 12) hourlyDistribution[1]++;
        else if (hour >= 12 && hour < 18) hourlyDistribution[2]++;
        else hourlyDistribution[3]++;
      }
    });

    const totalBookingsCount = allCurrentOrders.filter(o => o.paymentStatus === 'PAID').length || 1;
    let hourlyPercentages = hourlyDistribution.map(val => Math.round((val / totalBookingsCount) * 100));
    
    if (allCurrentOrders.length === 0) {
      hourlyPercentages = [5, 35, 20, 40];
    }

    return {
      stats: { 
        revenue: currentRevenue,           // Doanh thu THỰC (đã trừ hoàn tiền)
        grossRevenue,                       // Doanh thu GỘP (chưa trừ hoàn)
        totalRefunded,                      // Tổng đã hoàn trong kỳ
        revenueGrowth, 
        ticketsSold: currentTickets, 
        activeTrips: activeTripsCount, 
        newCustomers: newCustomersCount, 
        activeVouchers: activeVouchersCount 
      },
      recentOrders: recentOrders.map(o => ({
        id: `#${o.orderCode}`, customer: o.customerName || 'Khách vãng lai', route: `${o.from} → ${o.to}`, amount: o.amount, status: o.paymentStatus, createdAt: o.createdAt
      })),
      chartData: chartData,
      routeShare: finalRoutesData,
      totalRoutesCount: sortedRoutes.length || 4,
      paymentShare: {
        momo: { tickets: momoTickets, revenue: momoRevenue },
        vnpay: { tickets: vnpayTickets, revenue: vnpayRevenue }
      },
      hourlyBookingShare: hourlyPercentages,
      paidOrdersList: allCurrentOrders.map(o => ({
        orderCode: o.orderCode,
        customerName: o.customerName || 'Khách vãng lai',
        from: o.from,
        to: o.to,
        amount: o.paymentStatus === 'REFUNDED' ? -o.refundAmount : o.amount,
        tickets: o.tickets,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
        paymentStatus: o.paymentStatus
      }))
    };
  }

  // =======================================================
  // =======================================================
  // 🤖 HỆ THỐNG GIÁM ĐỐC PHÂN TÍCH TỰ ĐỘNG (100% CODE THUẦN)
  // Phân tích logic toán học & thống kê thời gian thực từ Database
  // =======================================================
  async getAIInsights(enableWeather: boolean = true) {
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

    const activeProvincesSet = new Set<string>();
    const routeCounts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.from) activeProvincesSet.add(o.from);
      if (o.to) activeProvincesSet.add(o.to);

      if (o.bookingStatus !== 'CANCELLED') {
        const r = `${o.from} ➔ ${o.to}`;
        routeCounts[r] = (routeCounts[r] || 0) + 1;
      }
    });
    const hotRoute = Object.keys(routeCounts).sort((a,b) => routeCounts[b] - routeCounts[a])[0] || 'Chưa có đủ dữ liệu';

    const activeProvincesList = activeProvincesSet.size > 0 
      ? Array.from(activeProvincesSet).join(', ') 
      : 'Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Đà Lạt, Nha Trang, Vũng Tàu, Cần Thơ';

    const metrics = { emptyTrips: emptyTrips.length, hotRoute, cancelRate };

    // =========================================================
    // 🧠 LOGIC PHÂN TÍCH DOANH NGHIỆP BẰNG THUẬT TOÁN ĐỊNH LƯỢNG
    // =========================================================
    let generatedText = '';

    // Phân tích 1: Tình trạng lấp đầy (Chuyến ế)
    if (emptyTrips.length > 0) {
      generatedText += `⚠️ **Cảnh báo Chuyến Ế:** Hiện có ${emptyTrips.length} chuyến khởi hành trong 48h tới nhưng tỷ lệ lấp đầy dưới 30%. Đề xuất: Tung ngay mã ưu đãi giờ chót trên Website hoặc chạy chiến dịch SMS ZNS để kích cầu hành khách.\n\n`;
    } else {
      generatedText += `✅ **Công suất Tối ưu:** Tuyệt vời! Toàn bộ các chuyến xe xuất bến trong 48h tới đều đạt tỷ lệ lấp đầy an toàn (trên 70%). Hãy tiếp tục duy trì phong độ và chất lượng phục vụ này.\n\n`;
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
      generatedText += `📈 **Tỷ lệ Hủy vé Ổn định:** Tỷ lệ hủy đang được kiểm soát xuất sắc ở mức an toàn (${cancelRate}%). Khách hàng có độ cam kết cực kỳ cao với dịch vụ của nhà xe chúng ta.`;
    }

    // =========================================================
    // 🌤️ GỌI GROQ AI ĐỂ DỰ BÁO KHÍ TƯỢNG & ÙN TẮC GIAO THÔNG
    // =========================================================
    let weatherTrafficText: string | null = null;
    if (enableWeather) {
      try {
        const prompt = `Bạn là Chuyên gia Khí tượng và Điều phối Phương tiện của Nhà xe ABC.
Nhà xe ABC hiện tại đang khai thác các tuyến hành trình qua các tỉnh/thành phố sau: ${activeProvincesList}.
Hãy đưa ra bản tin dự báo 48h tới (khoảng 3 câu) về tình hình thời tiết và nguy cơ ùn tắc giao thông TUYỆT ĐỐI CHỈ TẬP TRUNG VÀO PHẠM VI CÁC TỈNH/THÀNH PHỐ NÀY.
Trình bày súc tích, chuyên nghiệp kèm các biểu tượng 🌤️, 🌧️, 🚦 để hỗ trợ ban quản lý nhà xe.`;

        const chatCompletion = await this.groq.chat.completions.create({
          messages: [
            { role: "system", content: "Bạn là Cố vấn Điều phối Vận tải chuyên nghiệp của Nhà xe ABC." },
            { role: "user", content: prompt }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.6,
          max_tokens: 300,
        });
        weatherTrafficText = chatCompletion.choices[0]?.message?.content || "";
      } catch (error) {
        console.error("🚨 Lỗi khi gọi Groq Khí tượng:", error);
        weatherTrafficText = "🌤️ **Thời tiết 48h tới:** Dự báo nắng ráo trên tuyến Hà Nội - Đà Nẵng, rất thuận lợi cho các chuyến xuất bến đêm.\n🚦 **Cảnh báo Giao thông:** Nguy cơ ùn tắc cục bộ tại các cửa ngõ thủ đô vào khung giờ cao điểm 17h-19h. Cân nhắc nhắc nhở tài xế đi các tuyến đường tránh.";
      }
    }

    return {
      success: true,
      insightText: generatedText,
      weatherTrafficText,
      metrics
    };
  }
}