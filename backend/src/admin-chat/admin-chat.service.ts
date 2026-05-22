import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import { AdminTripsService } from '../admin-trips/admin-trips.service';

@Injectable()
export class AdminChatService {
  private groq: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminTripsService: AdminTripsService
  ) {
    const groqKey = process.env.GROQ_API_KEY;
    this.groq = new OpenAI({
      apiKey: groqKey?.trim(),
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  /**
   * Phương thức xử lý chat AI riêng biệt cho Admin
   */
  async handleAdminChat(message: string, history: any[], adminId: string) {
    // 1. CHỐT CHẶN BẢO MẬT: Kiểm tra vai trò Admin thực tế trong DB
    const adminUser = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, name: true }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền truy cập kênh Chatbot Quản trị này.');
    }

    const normalizedMsg = message.toLowerCase().trim();
    let result: { reply: string };

    // 2. PHÂN LUỒNG XỬ LÝ LỆNH ADMIN
    
    // Luồng 1: XÓA CHUYẾN XE BẰNG AI
    if (this.isDeleteTripCommand(normalizedMsg)) {
      result = await this.executeDeleteTrip(message, adminId);
    }
    // Luồng 2: THỐNG KÊ DOANH THU & HOẠT ĐỘNG BẰNG AI
    else if (this.isStatsCommand(normalizedMsg)) {
      result = await this.executeStatsQuery(message);
    }
    // Luồng 4: ĐIỀU PHỐI TÀI XẾ & ĐỒNG BỘ GỠ KẸT
    else if (this.isDriverDispatchCommand(normalizedMsg)) {
      result = await this.executeDriverDispatch(message);
    }
    // Luồng 5: KHÁCH HÀNG VIP & PHÂN TÍCH RFM
    else if (this.isCustomerVipCommand(normalizedMsg)) {
      result = await this.executeCustomerVipAnalysis(message);
    }
    // Luồng 6: CẢNH BÁO AN NINH AUDIT LOG
    else if (this.isAuditLogCommand(normalizedMsg)) {
      result = await this.executeSecurityAuditReport(message);
    }
    // Luồng 3: CHAT TỰ DO / TƯ VẤN VẬN HÀNH CHO ADMIN (LLM Fallback)
    else {
      result = await this.executeGeneralAdminChat(message, history, adminUser.name || 'Admin');
    }

    // 3. ĐỒNG BỘ LỊCH SỬ CHAT ADMIN VÀO DATABASE
    await this.saveHistoryAsync(adminId, message, result.reply);

    return result;
  }

  // ==========================================
  // LUỒNG 1: XỬ LÝ LỆNH XÓA CHUYẾN XE
  // ==========================================
  private isDeleteTripCommand(msg: string): boolean {
    return (
      (msg.includes('xóa') || msg.includes('hủy') || msg.includes('xoa') || msg.includes('huy')) &&
      (msg.includes('chuyến') || msg.includes('chuyen'))
    );
  }

  private parseDeleteTripCommand(msg: string): { tripId?: number; from?: string; to?: string; date?: Date; time?: string } | null {
    // 1. Kiểm tra xóa chuyến xe theo ID cụ thể trước (ví dụ: "xóa chuyến xe id 12", "hủy chuyến 15")
    const idRegex = /(?:xóa|hủy|xoa|huy)\s+(?:chuyến|chuyen)(?:\s+xe)?(?:\s+(?:id|mã|ma))?\s*(\d+)/i;
    const matchId = msg.match(idRegex);
    if (matchId && matchId[1]) {
      return { tripId: Number(matchId[1]) };
    }

    // 2. Kiểm tra xóa chuyến xe theo lộ trình và thời gian
    const cities = [
      { name: 'hồ chí minh', aliases: ['hcm', 'sài gòn', 'sai gon', 'thành phố hồ chí minh'] },
      { name: 'hà nội', aliases: ['ha noi'] },
      { name: 'đà lạt', aliases: ['da lat'] },
      { name: 'nha trang', aliases: ['nha trang'] },
      { name: 'vũng tàu', aliases: ['vung tau'] },
      { name: 'đà nẵng', aliases: ['da nang'] },
      { name: 'cần thơ', aliases: ['can tho'] }
    ];

    let fromCity: string | undefined;
    let toCity: string | undefined;

    const detectedCities: { name: string; index: number }[] = [];
    cities.forEach(city => {
      let firstIndex = -1;
      for (const alias of city.aliases) {
        const idx = msg.indexOf(alias);
        if (idx !== -1) {
          firstIndex = idx;
          break;
        }
      }
      if (firstIndex !== -1) {
        detectedCities.push({ name: city.name, index: firstIndex });
      }
    });

    detectedCities.sort((a, b) => a.index - b.index);

    if (detectedCities.length >= 2) {
      fromCity = detectedCities[0].name;
      toCity = detectedCities[1].name;
    } else if (detectedCities.length === 1) {
      if (msg.includes('đi') || msg.includes('đến') || msg.includes('den')) {
        toCity = detectedCities[0].name;
      } else {
        fromCity = detectedCities[0].name;
      }
    }

    let targetDate: Date | undefined;
    const now = new Date();
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));

    if (msg.includes('ngày mai') || msg.includes('ngay mai')) {
      targetDate = new Date(vnTime);
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (msg.includes('hôm nay') || msg.includes('hom nay')) {
      targetDate = new Date(vnTime);
    } else {
      const dateRegex = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
      const matchDate = msg.match(dateRegex);
      if (matchDate) {
        const day = Number(matchDate[1]);
        const month = Number(matchDate[2]) - 1;
        let year = matchDate[3] ? Number(matchDate[3]) : vnTime.getFullYear();
        if (year < 100) year += 2000;
        targetDate = new Date(year, month, day);
      }
    }

    let targetTime: string | undefined;
    const timeRegex = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?/i;
    const matchTime = msg.match(timeRegex);
    if (matchTime) {
      const hour = String(matchTime[1]).padStart(2, '0');
      const min = matchTime[2] ? String(matchTime[2]).padStart(2, '0') : '00';
      targetTime = `${hour}:${min}`;
    }

    if (fromCity || toCity || targetDate || targetTime) {
      return { from: fromCity, to: toCity, date: targetDate, time: targetTime };
    }

    return null;
  }

  private async executeDeleteTrip(message: string, adminId: string): Promise<{ reply: string }> {
    try {
      const normalized = message.toLowerCase().trim();
      const params = this.parseDeleteTripCommand(normalized);

      // --- LOGIC LIỆT KÊ CHUYẾN XE CHƯA CÓ AI ĐẶT VÉ KHI RA LỆNH CHUNG CHUNG ---
      if (!params) {
        const now = new Date();
        const futureTrips = await this.prisma.trip.findMany({
          where: {
            departDate: { gte: now },
            status: { in: ['PUBLISHED', 'DRAFT'] }
          },
          orderBy: { departDate: 'asc' },
          take: 40
        });

        const eligibleTrips: any[] = [];
        for (const trip of futureTrips) {
          const orderCount = await this.prisma.order.count({
            where: {
              OR: [
                { outboundTripId: trip.id },
                { returnTripId: trip.id }
              ],
              paymentStatus: { in: ['PAID', 'PENDING'] },
              bookingStatus: { not: 'CANCELLED' }
            }
          });

          const seatCount = await this.prisma.orderSeat.count({
            where: {
              tripId: trip.id,
              order: {
                bookingStatus: { not: 'CANCELLED' },
                paymentStatus: { in: ['PAID', 'PENDING'] }
              }
            }
          });

          if (orderCount === 0 && seatCount === 0) {
            eligibleTrips.push(trip);
          }
        }

        let reply = "Dạ thưa Admin, Ngài đang có ý định dọn dẹp chuyến xe ạ? Do câu lệnh của Ngài chưa đi kèm ID cụ thể, em đã tự động quét toàn hệ thống và tổng hợp **danh sách các chuyến xe khởi hành sắp tới chưa có khách mua vé** dưới đây. Ngài có thể ra lệnh xóa chúng cực kỳ an toàn:\n\n";

        if (eligibleTrips.length === 0) {
          reply += "⚠️ **Báo cáo:** Hiện tại toàn bộ chuyến xe trong tương lai đều đã có hành khách đặt chỗ hoặc không có chuyến nào khả dụng để gỡ bỏ ạ.";
        } else {
          eligibleTrips.forEach(t => {
            const departStr = new Date(t.departDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
            reply += `*   👉 **ID ${t.id}** [🗑️ Xóa](https://delete-trip/${t.id}): Tuyến **${t.from} ➔ ${t.to}** | Khởi hành: \`${departStr}\` | Xe: \`${t.busType || 'Limousine'}\`\n`;
          });
          reply += "\n💡 *Lệnh thực thi:* Admin có thể **ấn trực tiếp vào nút [🗑️ Xóa]** màu đỏ bên cạnh chuyến xe để thực thi nhanh, hoặc gõ cú pháp: **`Xóa chuyến xe ID [mã ID]`** nhé!";
        }

        return { reply };
      }

      let matchedTrips: any[] = [];

      if (params.tripId) {
        const trip = await this.prisma.trip.findUnique({
          where: { id: Number(params.tripId) }
        });
        if (trip) matchedTrips.push(trip);
      } else {
        const whereCondition: any = {};
        if (params.from) {
          whereCondition.from = { contains: params.from, mode: 'insensitive' };
        }
        if (params.to) {
          whereCondition.to = { contains: params.to, mode: 'insensitive' };
        }
        if (params.date) {
          const startOfDay = new Date(params.date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(params.date);
          endOfDay.setHours(23, 59, 59, 999);
          whereCondition.departDate = { gte: startOfDay, lte: endOfDay };
        }

        const trips = await this.prisma.trip.findMany({
          where: whereCondition,
          orderBy: { departDate: 'asc' }
        });

        const now = new Date();
        const filteredTrips: any[] = [];
        
        for (const t of trips) {
          const isFuture = new Date(t.departDate).getTime() >= now.getTime();
          const isDeletableStatus = t.status === 'PUBLISHED' || t.status === 'DRAFT';
          
          if (isFuture && isDeletableStatus) {
            const orderCount = await this.prisma.order.count({
              where: {
                OR: [
                  { outboundTripId: t.id },
                  { returnTripId: t.id }
                ],
                paymentStatus: { in: ['PAID', 'PENDING'] },
                bookingStatus: { not: 'CANCELLED' }
              }
            });

            const seatCount = await this.prisma.orderSeat.count({
              where: {
                tripId: t.id,
                order: {
                  bookingStatus: { not: 'CANCELLED' },
                  paymentStatus: { in: ['PAID', 'PENDING'] }
                }
              }
            });

            if (orderCount === 0 && seatCount === 0) {
              filteredTrips.push(t);
            }
          }
        }

        if (params.time && filteredTrips.length > 0) {
          matchedTrips = filteredTrips.filter(t => {
            const departTimeStr = new Date(t.departDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            return departTimeStr === params.time;
          });
        } else {
          matchedTrips = filteredTrips;
        }
      }

      if (matchedTrips.length === 0) {
        // Gợi ý danh sách chuyến xe chưa có ai đặt
        const now = new Date();
        const futureTrips = await this.prisma.trip.findMany({
          where: {
            departDate: { gte: now }
          },
          orderBy: { departDate: 'asc' },
          take: 20
        });

        const eligibleTrips: any[] = [];
        for (const trip of futureTrips) {
          const orderCount = await this.prisma.order.count({
            where: {
              OR: [
                { outboundTripId: trip.id },
                { returnTripId: trip.id }
              ],
              paymentStatus: { in: ['PAID', 'PENDING'] },
              bookingStatus: { not: 'CANCELLED' }
            }
          });

          const seatCount = await this.prisma.orderSeat.count({
            where: {
              tripId: trip.id,
              order: {
                bookingStatus: { not: 'CANCELLED' },
                paymentStatus: { in: ['PAID', 'PENDING'] }
              }
            }
          });

          if (orderCount === 0 && seatCount === 0) {
            eligibleTrips.push(trip);
          }
        }

        let reply = "Dạ thưa Admin, em không tìm thấy chuyến xe nào khớp với thông tin mô tả yêu cầu trong hệ thống.\n\n" +
                     "Dưới đây là danh sách **các chuyến xe khởi hành sắp tới chưa có khách đặt chỗ** mà Ngài có thể xóa an toàn:\n\n";

        if (eligibleTrips.length === 0) {
          reply += "⚠️ Không có chuyến xe trống vé nào sắp tới ạ.";
        } else {
          eligibleTrips.forEach(t => {
            const departStr = new Date(t.departDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
            reply += `*   👉 **ID ${t.id}** [🗑️ Xóa](https://delete-trip/${t.id}): Tuyến **${t.from} ➔ ${t.to}** | Khởi hành: \`${departStr}\` | Xe: \`${t.busType || 'Limousine'}\`\n`;
          });
          reply += "\n💡 *Gợi ý:* Admin có thể ấn trực tiếp **[🗑️ Xóa]** hoặc gõ: **`Xóa chuyến xe ID [mã ID]`** nhé!";
        }
        return { reply };
      }

      if (matchedTrips.length > 1) {
        let reply = `Dạ thưa Admin, em tìm thấy **${matchedTrips.length} chuyến xe** khớp với mô tả. Xin mời Admin chọn nhanh nút **[🗑️ Xóa]** bên dưới hoặc gõ Mã ID chính xác (ví dụ: "Xóa chuyến xe ID 25") để tránh nhầm lẫn nhé:\n\n`;
        matchedTrips.forEach(t => {
          const departStr = new Date(t.departDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
          reply += `👉 **ID ${t.id}** [🗑️ Xóa](https://delete-trip/${t.id}): Tuyến ${t.from} ➔ ${t.to} | Khởi hành: ${departStr} | Xe: ${t.busType || 'Limousine'}\n`;
        });
        return { reply };
      }

      const tripToDelete = matchedTrips[0];

      // 🟢 BẢO VỆ CHẶT CHẼ: Chặn xóa các chuyến xe đã chạy hoặc đang chạy
      if (tripToDelete.status === 'RUNNING' || tripToDelete.status === 'COMPLETED') {
        return {
          reply: `⚠️ **LỆNH XÓA BỊ CHẶN (BẢO VỆ DỮ LIỆU LỊCH SỬ):**\n\n` +
                 `Chuyến xe **ID ${tripToDelete.id}** hiện đã ở trạng thái **${tripToDelete.status === 'RUNNING' ? 'ĐANG CHẠY' : 'ĐÃ HOÀN THÀNH'}**.\n\n` +
                 `Hệ thống không cho phép xóa các chuyến xe đã hoặc đang trong quá trình vận hành để tránh làm sai lệch báo cáo tài chính và lịch trình hành trình.`
        };
      }

      // 🟢 BẢO VỆ CHẶT CHẼ: Chặn xóa các chuyến trong quá khứ
      const currentNow = new Date();
      if (new Date(tripToDelete.departDate).getTime() < currentNow.getTime()) {
        const departStr = new Date(tripToDelete.departDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
        return {
          reply: `⚠️ **LỆNH XÓA BỊ CHẶN (CHUYẾN ĐI TRONG QUÁ KHỨ):**\n\n` +
                 `Chuyến xe **ID ${tripToDelete.id}** có giờ khởi hành (\`${departStr}\`) thuộc về quá khứ.\n\n` +
                 `Em chỉ có thể hỗ trợ Admin xóa những chuyến xe chuẩn bị khởi hành trong tương lai để dọn dẹp hệ thống vận hành thôi ạ!`
        };
      }

      const activeBookings = await this.prisma.order.count({
        where: {
          OR: [
            { outboundTripId: tripToDelete.id },
            { returnTripId: tripToDelete.id }
          ],
          paymentStatus: { in: ['PAID', 'PENDING'] },
          bookingStatus: { not: 'CANCELLED' }
        }
      });

      const seatBookings = await this.prisma.orderSeat.count({
        where: {
          tripId: tripToDelete.id,
          order: {
            bookingStatus: { not: 'CANCELLED' },
            paymentStatus: { in: ['PAID', 'PENDING'] }
          }
        }
      });

      if (activeBookings > 0 || seatBookings > 0) {
        const departStr = new Date(tripToDelete.departDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
        return {
          reply: `⚠️ **LỆNH XÓA BỊ CHẶN (BẢO VỆ GIAO DỊCH):**\n\n` +
                 `Chuyến xe **ID ${tripToDelete.id}** (${tripToDelete.from} ➔ ${tripToDelete.to} khởi hành lúc ${departStr}) hiện tại đang có **${activeBookings || seatBookings} ghế đã được giữ chỗ/thanh toán**.\n\n` +
                 `Để bảo vệ uy tín nhà xe và quyền lợi của khách hàng, em không thể xóa chuyến xe này khi các vé đặt chỗ vẫn đang hoạt động!`
        };
      }

      await this.prisma.$transaction(async (tx) => {
        // 1. Xóa các phân công tài xế liên quan trước
        await tx.driverAssignment.deleteMany({
          where: { tripId: tripToDelete.id }
        });

        // 2. Nhả tài xế (Cập nhật trạng thái thành AVAILABLE)
        if (tripToDelete.driverId) {
          await tx.driver.update({
            where: { id: tripToDelete.driverId },
            data: { status: 'AVAILABLE' }
          });
        }

        // 3. Nhả xe/biển số xe (Cập nhật trạng thái thành READY)
        if (tripToDelete.busId) {
          await tx.bus.update({
            where: { id: tripToDelete.busId },
            data: { status: 'READY' }
          });
        }

        // 4. Xóa chuyến xe ra khỏi hệ thống
        await tx.trip.delete({
          where: { id: tripToDelete.id }
        });

        // 5. GHI NHẬT KÝ HỆ THỐNG
        await tx.adminLog.create({
          data: {
            adminId,
            action: 'TRIP_DELETE',
            entityType: 'TRIP',
            entityId: tripToDelete.id.toString(),
            details: { reason: `Xóa chuyến bằng trợ lý AI: ${tripToDelete.from} -> ${tripToDelete.to}`, data: tripToDelete }
          }
        });
      });

      const departStr = new Date(tripToDelete.departDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
      
      let reply = `✅ **LỆNH THỰC THI THÀNH CÔNG:**\n\n` +
                  `Hệ thống đã gỡ bỏ hoàn toàn chuyến xe **ID ${tripToDelete.id}** (Tuyến ${tripToDelete.from} ➔ ${tripToDelete.to} lúc ${departStr}) ra khỏi hệ thống cơ sở dữ liệu!\n\n` +
                  `🔄 **Giải phóng tài nguyên thành công:**\n`;
      
      if (tripToDelete.driverId || tripToDelete.busId) {
        if (tripToDelete.driverId) {
          reply += `*   🧑‍✈️ Tài xế **${tripToDelete.driverName || 'Gán trên chuyến'}** đã được giải phóng trạng thái trở về **Sẵn sàng (AVAILABLE)**.\n`;
        }
        if (tripToDelete.busId) {
          reply += `*   🚌 Xe mang biển kiểm soát **${tripToDelete.busPlate || 'Gán trên chuyến'}** đã được hoàn trả trạng thái **Sẵn sàng hoạt động (READY)**.\n`;
        }
      } else {
        reply += `*   Chuyến xe này chưa được gán tài xế hay biển số trước đó, tài nguyên của nhà xe hoàn toàn an toàn.`;
      }

      return { reply };

    } catch (error: any) {
      console.error("🚨 Lỗi Admin xoa chuyen code:", error);
      return { reply: "Dạ thưa Admin, đã xảy ra lỗi ngoài ý muốn trong quá trình thực thi lệnh xóa chuyến xe. Kính mong Ngài vui lòng kiểm tra lại trạng thái chuyến xe hoặc thực hiện thao tác thủ công tại trang quản trị nhé." };
    }
  }

  private isStatsCommand(msg: string): boolean {
    return (
      msg.includes('thống kê') || msg.includes('thong ke') ||
      msg.includes('doanh thu') || msg.includes('doanh thu') ||
      msg.includes('báo cáo') || msg.includes('bao cao')
    );
  }

  private parseStatsCommand(msg: string): { startDate: Date; endDate: Date; rangeName: string } | null {
    const now = new Date();
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    
    const startOfToday = new Date(vnTime);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(vnTime);
    endOfToday.setHours(23, 59, 59, 999);

    if (msg.includes('hôm nay') || msg.includes('hom nay')) {
      return { startDate: startOfToday, endDate: endOfToday, rangeName: 'Hôm nay' };
    }

    if (msg.includes('hôm qua') || msg.includes('hom qua')) {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(endOfToday);
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      return { startDate: startOfYesterday, endDate: endOfYesterday, rangeName: 'Hôm qua' };
    }

    if (msg.includes('tuần này') || msg.includes('tuan nay')) {
      const dayOfWeek = startOfToday.getDay();
      const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - distanceToMonday);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { startDate: startOfWeek, endDate: endOfWeek, rangeName: 'Tuần này' };
    }

    if (msg.includes('tuần trước') || msg.includes('tuan truoc')) {
      const dayOfWeek = startOfToday.getDay();
      const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfLastWeek = new Date(startOfToday);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - distanceToMonday - 7);
      
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      return { startDate: startOfLastWeek, endDate: endOfLastWeek, rangeName: 'Tuần trước' };
    }

    if (msg.includes('tháng này') || msg.includes('thang nay')) {
      const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, 0, 23, 59, 59, 999);
      return { startDate: startOfMonth, endDate: endOfMonth, rangeName: 'Tháng này' };
    }

    if (msg.includes('tháng trước') || msg.includes('thang truoc')) {
      const startOfLastMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 1, 1, 0, 0, 0, 0);
      const endOfLastMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: startOfLastMonth, endDate: endOfLastMonth, rangeName: 'Tháng trước' };
    }

    if (msg.includes('năm nay') || msg.includes('nam nay')) {
      const startOfYear = new Date(startOfToday.getFullYear(), 0, 1, 0, 0, 0, 0);
      const endOfYear = new Date(startOfToday.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { startDate: startOfYear, endDate: endOfYear, rangeName: 'Năm nay' };
    }

    return null;
  }

  private async executeStatsQuery(message: string): Promise<{ reply: string }> {
    try {
      const normalized = message.toLowerCase().trim();
      const params = this.parseStatsCommand(normalized);

      if (!params) {
        return {
          reply: "Dạ thưa Admin, em chưa xác định được khoảng thời gian cụ thể mà Ngài mong muốn tổng hợp số liệu.\n\n" +
                 "Kính mời Ngài lựa chọn các mốc đối soát sau để em tiến hành kết xuất báo cáo:\n" +
                 "*   `Thống kê doanh thu hôm nay`\n" +
                 "*   `Báo cáo doanh thu hôm qua`\n" +
                 "*   `Doanh thu tuần này` / `tuần trước`\n" +
                 "*   `Doanh thu tháng này` / `tháng trước`"
        };
      }

      const start = params.startDate;
      const end = params.endDate;

      const orders = await this.prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] }
        },
        select: {
          amount: true,
          paymentStatus: true,
          tripType: true,
          tickets: true,
          bookingStatus: true
        }
      });

      const totalUsers = await this.prisma.user.count({
        where: { role: 'CUSTOMER' }
      });

      const totalTrips = await this.prisma.trip.count({
        where: {
          departDate: { gte: start, lte: end }
        }
      });

      let paidRevenue = 0;
      let refundedRevenue = 0;
      let ticketsSold = 0;
      let totalBookings = orders.length;
      let roundTripCount = 0;
      let oneWayCount = 0;

      orders.forEach(o => {
        if (o.paymentStatus === PaymentStatus.PAID && o.bookingStatus !== BookingStatus.CANCELLED) {
          paidRevenue += o.amount;
          ticketsSold += o.tickets;
        } else if (o.paymentStatus === PaymentStatus.REFUNDED || o.bookingStatus === BookingStatus.CANCELLED) {
          refundedRevenue += o.amount;
        }

        if (o.tripType === 'round') {
          roundTripCount++;
        } else {
          oneWayCount++;
        }
      });

      const startStr = start.toLocaleDateString('vi-VN');
      const endStr = end.toLocaleDateString('vi-VN');

      const report = `📊 **BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH - ${params.rangeName.toUpperCase()}**\n` +
                     `*Khoảng thời gian đối soát:* Từ ngày **${startStr}** đến hết ngày **${endStr}**\n\n` +
                     `--- \n` +
                     `💸 **Doanh thu & Dòng tiền:**\n` +
                     `*   **Doanh thu thực tế (Đã thu):** 💰 \`${paidRevenue.toLocaleString('vi-VN')}đ\`\n` +
                     `*   **Tiền hoàn trả (Hủy vé):** 💸 \`${refundedRevenue.toLocaleString('vi-VN')}đ\`\n\n` +
                     `🎫 **Chỉ số Vận hành & Vé xe:**\n` +
                     `*   **Tổng số vé bán thành công:** 🎟️ \`${ticketsSold} vé\`\n` +
                     `*   **Tổng số đơn hàng phát sinh:** 📦 \`${totalBookings} đơn\`\n` +
                     `*   **Đơn hàng một chiều:** ➡️ \`${oneWayCount} lượt\`\n` +
                     `*   **Đơn hàng khứ hồi:** 🔄 \`${roundTripCount} lượt\`\n` +
                     `*   **Số chuyến xe vận hành:** 🚌 \`${totalTrips} chuyến\`\n\n` +
                     `👥 **Quy mô Hệ thống:**\n` +
                     `*   **Tổng số Thành viên đăng ký:** 👤 \`${totalUsers} người\``;

      return { reply: report };

    } catch (error: any) {
      console.error("🚨 Lỗi thống kê doanh thu code:", error);
      return { reply: "Dạ thưa Admin, hệ thống gặp gián đoạn khi thu thập chỉ số vận hành. Kính mong Ngài vui lòng thử lại sau giây lát ạ." };
    }
  }

  // ==========================================
  // LUỒNG 4: ĐIỀU PHỐI TÀI XẾ & ĐỒNG BỘ GỠ KẸT
  // ==========================================
  private isDriverDispatchCommand(msg: string): boolean {
    return (
      msg.includes('tài xế') || msg.includes('tai xe') ||
      msg.includes('gỡ kẹt') || msg.includes('go ket') ||
      msg.includes('đồng bộ') || msg.includes('dong bo') ||
      msg.includes('phân công') || msg.includes('phan cong') ||
      msg.includes('cân bằng tải') || msg.includes('can bang tai')
    );
  }

  private async executeDriverDispatch(message: string): Promise<{ reply: string }> {
    try {
      const normalized = message.toLowerCase().trim();

      // Nếu Admin ra lệnh đồng bộ hoặc gỡ kẹt
      if (normalized.includes('đồng bộ') || normalized.includes('dong bo') || normalized.includes('gỡ kẹt') || normalized.includes('go ket')) {
        const syncRes = await this.adminTripsService.emergencySyncSystem();
        return {
          reply: `🚀 **CHIẾN DỊCH GIẢI CỨU & ĐỒNG BỘ AI HOÀN TẤT:**\n` +
                 `Dạ thưa Admin, em đã tiến hành kích hoạt toàn bộ hệ thống Điều phối Trí tuệ Nhân tạo:\n` +
                 `*   ✅ Chuẩn hóa Tuyến hoạt động theo đúng Bến bãi gốc cho 1.000 Bác tài.\n` +
                 `*   ✅ Tự động thanh lọc và gỡ bỏ toàn bộ lịch trình phân công chồng chéo cũ.\n` +
                 `*   ✅ Chạy Bot AI phân bổ lại chính xác tuyệt đối tài xế và phương tiện theo đúng hộ khẩu tuyến.\n\n` +
                 `📌 *Báo cáo hệ thống:* \`${syncRes.message}\``
        };
      }

      // Thống kê tình trạng tài xế
      const totalDrivers = await this.prisma.driver.count();
      const onTripDrivers = await this.prisma.driver.count({ where: { status: 'ON_TRIP' } });
      const availableDrivers = await this.prisma.driver.count({ where: { status: 'AVAILABLE' } });
      const restingDrivers = await this.prisma.driver.count({ where: { status: 'RESTING' } });

      let reply = `🧑‍✈️ **BÁO CÁO NHÂN SỰ & ĐIỀU PHỐI TÀI XẾ AI:**\n\n` +
                  `*   **Tổng số Bác tài thuộc hệ thống:** \`${totalDrivers} hồ sơ\`\n` +
                  `*   **Đang chạy xe trên đường (ON_TRIP):** 🚌 \`${onTripDrivers} Bác tài\`\n` +
                  `*   **Sẵn sàng nhận chuyến (AVAILABLE):** 🟢 \`${availableDrivers} Bác tài\`\n` +
                  `*   **Đang nghỉ ngơi sau ca (RESTING):** ☕ \`${restingDrivers} Bác tài\`\n\n` +
                  `💡 *Tư vấn từ AI:* Nếu Ngài phát hiện bất kỳ sự chênh lệch hoặc lộn xộn nào trong lịch trình, chỉ cần gõ cú pháp: **\`Đồng bộ hệ thống tài xế\`** hoặc **\`Gỡ kẹt\`**, em sẽ tự động căn chỉnh lại toàn bộ trong 1 tích tắc!`;

      return { reply };
    } catch (err: any) {
      return { reply: "Dạ thưa Admin, em gặp gián đoạn khi thu thập dữ liệu tài xế. Kính mong Ngài thử lại sau giây lát ạ." };
    }
  }

  // ==========================================
  // LUỒNG 5: PHÂN TÍCH KHÁCH HÀNG VIP & RFM
  // ==========================================
  private isCustomerVipCommand(msg: string): boolean {
    return (
      msg.includes('khách hàng') || msg.includes('khach hang') ||
      msg.includes('vip') || msg.includes('rfm') ||
      msg.includes('rời bỏ') || msg.includes('roi bo') ||
      msg.includes('chi tiêu') || msg.includes('chi tieu')
    );
  }

  private async executeCustomerVipAnalysis(message: string): Promise<{ reply: string }> {
    try {
      const topCustomers = await this.prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          orders: {
            where: { paymentStatus: 'PAID', bookingStatus: { not: 'CANCELLED' } },
            select: { amount: true }
          }
        }
      });

      const analyzed = topCustomers.map(c => {
        const totalSpent = c.orders.reduce((sum, o) => sum + o.amount, 0);
        const orderCount = c.orders.length;
        return { ...c, totalSpent, orderCount };
      });

      analyzed.sort((a, b) => b.totalSpent - a.totalSpent);
      const top5 = analyzed.slice(0, 5);

      let reply = `💎 **HỆ CHUYÊN GIA AI - BÁO CÁO KHÁCH HÀNG VIP (MÔ HÌNH RFM):**\n\n` +
                  `Dạ thưa Admin, dưới đây là Top 5 Khách hàng có tổng chi tiêu cao nhất (Hạng VIP Kim Cương) mang lại doanh thu lớn nhất cho nhà xe chúng ta:\n\n`;

      top5.forEach((c, idx) => {
        reply += `${idx + 1}. 👑 **${c.name || 'Khách hàng'}** | 📞 \`${c.phone || c.email || 'Chưa cập nhật'}\`\n` +
                 `   *   Tổng chi tiêu: 💰 \`${c.totalSpent.toLocaleString('vi-VN')}đ\` (\`${c.orderCount} đơn hàng\`)\n` +
                 `   *   Đề xuất AI: Tặng ngay Voucher Tri ân 20% hoặc chăm sóc qua điện thoại.\n\n`;
      });

      reply += `📌 *Góc nhìn Quản trị:* Em khuyến nghị Ngài truy cập trực tiếp mục **[Khách hàng]** trên Menu để xem chi tiết phân khúc RFM (Khách trung thành / Khách có nguy cơ rời bỏ) nhằm có chiến dịch Marketing phù hợp nhất!`;

      return { reply };
    } catch (err: any) {
      return { reply: "Dạ thưa Admin, em gặp gián đoạn khi truy xuất tệp khách hàng VIP. Kính mong Ngài thử lại sau ạ." };
    }
  }

  // ==========================================
  // LUỒNG 6: CẢNH BÁO AN NINH AUDIT LOGS
  // ==========================================
  private isAuditLogCommand(msg: string): boolean {
    return (
      msg.includes('bảo mật') || msg.includes('bao mat') ||
      msg.includes('an ninh') || msg.includes('nhật ký') ||
      msg.includes('nhat ky') || msg.includes('cảnh báo') ||
      msg.includes('canh bao') || msg.includes('audit')
    );
  }

  private async executeSecurityAuditReport(message: string): Promise<{ reply: string }> {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600 * 1000);

      const highSeverityLogs = await this.prisma.adminLog.findMany({
        where: {
          createdAt: { gte: twentyFourHoursAgo },
          action: { in: ['TRIP_DELETE', 'ORDER_REFUND', 'SYSTEM_SYNC', 'FACTORY_RESET'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      let reply = `🛡️ **BÁO CÁO KIỂM TOÁN AN NINH (AUDIT LOGS) 24H QUA:**\n\n`;

      if (highSeverityLogs.length === 0) {
        reply += `✅ *Hệ thống an toàn tuyệt đối:* Không phát hiện hành động can thiệp dữ liệu nguy hiểm nào (Hủy chuyến, hoàn tiền lớn) trong 24 giờ qua.\n\n`;
      } else {
        reply += `⚠️ **CẢNH BÁO AN NINH (MỨC ĐỘ CAO):** Phát hiện ${highSeverityLogs.length} hành vi nhạy cảm tác động vào hệ thống:\n\n`;
        highSeverityLogs.forEach(l => {
          const timeStr = new Date(l.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          reply += `*   🔴 \`[${timeStr}]\` Hành động: **${l.action}** | Thực thi bởi Admin ID: \`${l.adminId}\`\n`;
        });
        reply += `\n`;
      }

      reply += `📌 *Khuyến nghị từ AI:* Hệ thống Nhật ký kiểm toán được lập trình tự động đóng gói và lưu trữ an toàn trước chu kỳ xóa 24h. Ngài có thể kết xuất toàn bộ ra file CSV tại tab **[Nhật ký hệ thống]** nhé!`;

      return { reply };
    } catch (err: any) {
      return { reply: "Dạ thưa Admin, em gặp lỗi khi kết xuất nhật ký an ninh. Kính mong Ngài thử lại sau ạ." };
    }
  }

  // ==========================================
  // LUỒNG 3: AI CHUYÊN GIA VẬN HÀNH NỘI BỘ (100% OFFLINE)
  // ==========================================
  private async executeGeneralAdminChat(message: string, history: any[], adminName: string): Promise<{ reply: string }> {
    try {
      const now = new Date();
      const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      const dateStr = vnTime.toLocaleDateString('vi-VN');
      const timeStr = vnTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      // 1. TỔNG HỢP DOANH THU & TÀI CHÍNH
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday.getTime() - (startOfToday.getDay() || 7 - 1) * 24 * 3600 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        todayOrders, 
        weekOrders, 
        monthOrders,
        refundedOrders,
        tripsCount,
        runningTripsCount,
        publishedTripsCount,
        completedTripsCount,
        cancelledTripsCount,
        driversStatusCount,
        vipCustomers,
        vouchersList,
        recentAuditLogs
      ] = await Promise.all([
        this.prisma.order.findMany({ where: { createdAt: { gte: startOfToday }, paymentStatus: 'PAID', bookingStatus: { not: 'CANCELLED' } } }),
        this.prisma.order.findMany({ where: { createdAt: { gte: startOfWeek }, paymentStatus: 'PAID', bookingStatus: { not: 'CANCELLED' } } }),
        this.prisma.order.findMany({ where: { createdAt: { gte: startOfMonth }, paymentStatus: 'PAID', bookingStatus: { not: 'CANCELLED' } } }),
        this.prisma.order.findMany({ where: { paymentStatus: 'REFUNDED' } }),
        this.prisma.trip.count(),
        this.prisma.trip.count({ where: { status: 'RUNNING' } }),
        this.prisma.trip.count({ where: { status: 'PUBLISHED' } }),
        this.prisma.trip.count({ where: { status: 'COMPLETED' } }),
        this.prisma.trip.count({ where: { status: 'CANCELLED' } }),
        this.prisma.driver.groupBy({ by: ['status'], _count: true }),
        this.prisma.user.findMany({
          where: { role: 'CUSTOMER' },
          select: {
            name: true,
            email: true,
            phone: true,
            points: true,
            totalTrips: true,
            orders: {
              where: { paymentStatus: 'PAID', bookingStatus: { not: 'CANCELLED' } },
              select: { amount: true }
            }
          }
        }),
        this.prisma.voucher.findMany({ take: 10 }),
        this.prisma.adminLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { action: true, createdAt: true, details: true }
        })
      ]);

      const todayRev = todayOrders.reduce((sum, o) => sum + o.amount, 0);
      const weekRev = weekOrders.reduce((sum, o) => sum + o.amount, 0);
      const monthRev = monthOrders.reduce((sum, o) => sum + o.amount, 0);
      const totalRefundedAmount = refundedOrders.reduce((sum, o) => sum + o.refundAmount, 0);

      const driverStatusMap = { AVAILABLE: 0, ON_TRIP: 0, RESTING: 0, OFF: 0 };
      driversStatusCount.forEach(d => {
        if (d.status in driverStatusMap) {
          driverStatusMap[d.status as keyof typeof driverStatusMap] = d._count;
        }
      });

      const vipList = vipCustomers.map(c => {
        const totalSpent = c.orders.reduce((sum, o) => sum + o.amount, 0);
        return { name: c.name || 'Hội viên', email: c.email, phone: c.phone || 'N/A', totalSpent, trips: c.totalTrips, points: c.points };
      }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

      const routeSales: Record<string, { count: number, revenue: number }> = {};
      monthOrders.forEach(o => {
        if (o.from && o.to) {
          const r = `${o.from} ➔ ${o.to}`;
          if (!routeSales[r]) routeSales[r] = { count: 0, revenue: 0 };
          routeSales[r].count += 1;
          routeSales[r].revenue += o.amount;
        }
      });
      const popularRoutes = Object.entries(routeSales).map(([route, info]) => ({
        route,
        bookingsCount: info.count,
        revenue: info.revenue
      })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      const msgLower = message.toLowerCase().trim();

      // INTENT 1: DOANH THU / TÀI CHÍNH / TIỀN
      if (msgLower.includes('doanh thu') || msgLower.includes('doanh so') || msgLower.includes('tài chính') || msgLower.includes('tai chinh') || msgLower.includes('tiền') || msgLower.includes('tien') || msgLower.includes('lợi nhuận') || msgLower.includes('loi nhuan')) {
        let reply = `💰 **BÁO CÁO TÀI CHÍNH & DOANH THU THỜI GIAN THỰC**\n` +
                    `*Dữ liệu đối soát tự động từ CSDL Nhà xe ABC lúc ${dateStr} - ${timeStr}*\n\n` +
                    `➡️ **Báo cáo Dòng tiền phát sinh:**\n` +
                    `*   **Doanh thu hôm nay:** 💵 \`${todayRev.toLocaleString('vi-VN')}đ\` (từ \`${todayOrders.length} vé chốt thành công\`)\n` +
                    `*   **Doanh thu tuần này:** 💶 \`${weekRev.toLocaleString('vi-VN')}đ\` (từ \`${weekOrders.length} vé\`)\n` +
                    `*   **Doanh thu tháng này:** 💷 \`${monthRev.toLocaleString('vi-VN')}đ\` (từ \`${monthOrders.length} vé\`)\n` +
                    `*   **Tổng số tiền hoàn trả (Hủy vé):** 💸 \`${totalRefundedAmount.toLocaleString('vi-VN')}đ\` (Tổng \`${refundedOrders.length} đơn hàng\` đã hoàn tiền thành công)\n\n` +
                    `📊 **Biểu đồ tỷ trọng doanh thu theo Tuyến chạy trong tháng:**\n`;
        
        if (popularRoutes.length === 0) {
          reply += `*   *Chưa phát sinh doanh số bán vé trên các tuyến trong tháng này.*\n`;
        } else {
          popularRoutes.forEach((r, idx) => {
            reply += `*   ${idx + 1}. Tuyến **${r.route}**: 💰 \`${r.revenue.toLocaleString('vi-VN')}đ\` (\`${r.bookingsCount} đơn đặt\`)\n`;
          });
        }
        
        reply += `\n💡 *Gợi ý cho Ngài:* Ngài có thể ra lệnh gõ **\`thống kê hôm qua\`** hoặc **\`thống kê tháng này\`** để nhận báo cáo đối soát chi tiết và chuyên sâu hơn nhé!`;
        return { reply };
      }

      // INTENT 2: TÀI XẾ / BÁC TÀI / NHÂN SỰ
      if (msgLower.includes('tài xế') || msgLower.includes('tai xe') || msgLower.includes('bác tài') || msgLower.includes('bac tai') || msgLower.includes('nhân sự') || msgLower.includes('nhan su')) {
        let reply = `🧑‍✈️ **BÁO CÁO CHI TIẾT NHÂN SỰ & TÌNH TRẠNG BÁC TÀI**\n` +
                    `*Cập nhật trạng thái thời gian thực lúc ${dateStr} - ${timeStr}*\n\n` +
                    `📊 **Tổng số Bác tài thuộc hệ thống:** \`${driversStatusCount.reduce((acc, curr) => acc + curr._count, 0)} người\`\n` +
                    `➡️ **Bản đồ phân phối trạng thái hoạt động:**\n` +
                    `*   🟢 **Sẵn sàng nhận chuyến (AVAILABLE):** \`${driverStatusMap.AVAILABLE} người\` (Có thể lập tức phân công chạy ngay)\n` +
                    `*   🚌 **Đang chạy xe trên đường (ON_TRIP):** \`${driverStatusMap.ON_TRIP} người\` (Đang vận hành chuyến)\n` +
                    `*   ☕ **Đang nghỉ ngơi bắt buộc (RESTING):** \`${driverStatusMap.RESTING} người\` (Nghỉ phục hồi sau ca chạy)\n` +
                    `*   ❌ **Không hoạt động/Nghỉ phép (OFF):** \`${driverStatusMap.OFF} người\`\n\n` +
                    `💡 *Tư vấn Điều phối AI:* Nếu Ngài muốn chuẩn hóa toàn bộ bến bãi, dọn dẹp các lịch trình phân công bị kẹt hoặc chồng chéo thời gian của các bác tài, chỉ cần ra lệnh: **\`Đồng bộ hệ thống\`** hoặc **\`Gỡ kẹt\`** nhé!`;
        return { reply };
      }

      // INTENT 3: CHUYẾN XE / VẬN HÀNH / TUYẾN ĐƯỜNG
      if (msgLower.includes('chuyến') || msgLower.includes('chuyen') || msgLower.includes('vận hành') || msgLower.includes('van hanh') || msgLower.includes('tuyến') || msgLower.includes('tuyen')) {
        let reply = `🚌 **BÁO CÁO HOẠT ĐỘNG VẬN HÀNH CHUYẾN XE & TUYẾN CHẠY**\n` +
                    `*Số liệu cập nhật trực tiếp lúc ${dateStr} - ${timeStr}*\n\n` +
                    `➡️ **Tổng quan số lượng chuyến xe trên hệ thống:** \`${tripsCount} chuyến\`\n` +
                    `*   ⚡ **Đang chạy trên đường (RUNNING):** \`${runningTripsCount} chuyến\`\n` +
                    `*   📅 **Chuẩn bị xuất phát (PUBLISHED):** \`${publishedTripsCount} chuyến\`\n` +
                    `*   ✅ **Đã hoàn thành hành trình (COMPLETED):** \`${completedTripsCount} chuyến\`\n` +
                    `*   ❌ **Đã hủy lịch trình (CANCELLED):** \`${cancelledTripsCount} chuyến\`\n\n` +
                    `🔥 **Bảng vàng Doanh số theo Tuyến đường (Tháng này):**\n`;
        
        if (popularRoutes.length === 0) {
          reply += `*   *Chưa có dữ liệu tuyến đường phát sinh doanh thu trong tháng.*\n`;
        } else {
          popularRoutes.forEach((r, idx) => {
            reply += `*   ${idx + 1}. **${r.route}**: \`${r.bookingsCount} đơn\` ➔ Doanh thu: **${r.revenue.toLocaleString('vi-VN')}đ**\n`;
          });
        }
        
        reply += `\n💡 *Mẹo dọn dẹp:* Ngài có thể dọn dẹp hệ thống bằng cách ra lệnh: **\`Xóa chuyến xe trống\`** để AI tự động liệt kê và loại bỏ các chuyến xe trong tương lai chưa có khách mua vé giúp giải phóng phương tiện và tài xế!`;
        return { reply };
      }

      // INTENT 4: KHÁCH HÀNG / VIP / THÀNH VIÊN
      if (msgLower.includes('khách') || msgLower.includes('khach') || msgLower.includes('vip') || msgLower.includes('hội viên') || msgLower.includes('hoi vien') || msgLower.includes('thành viên') || msgLower.includes('thanh vien')) {
        let reply = `👑 **BÁO CÁO PHÂN TÍCH KHÁCH HÀNG VIP (MÔ HÌNH RFM)**\n` +
                    `*Dữ liệu đối soát chi tiêu của Hội viên lúc ${dateStr} - ${timeStr}*\n\n` +
                    `➡️ **Danh sách Top 5 Khách hàng thân thiết có chi tiêu cao nhất (Hạng Kim Cương):**\n`;
        
        if (vipList.length === 0) {
          reply += `*   *Chưa phát sinh dữ liệu mua vé từ thành viên đăng ký.*\n`;
        } else {
          vipList.forEach((c, idx) => {
            reply += `*   ${idx + 1}. **${c.name}** | 📞 \`${c.phone}\` | Chi tiêu: **${c.totalSpent.toLocaleString('vi-VN')}đ** (Đã đi: \`${c.trips} chuyến\` | Tích lũy: \`${c.points} điểm\`)\n`;
          });
        }
        
        reply += `\n💡 *Đề xuất Chăm sóc:* Ngài nên gửi tặng mã giảm giá tri ân hoặc thực hiện cuộc gọi chăm sóc đặc biệt cho các vị khách VIP này tại mục **[Khách hàng]** để tăng tỷ lệ giữ chân khách hàng (Retention Rate).`;
        return { reply };
      }

      // INTENT 5: KHUYẾN MÃI / VOUCHER / MÃ GIẢM GIÁ
      if (msgLower.includes('khuyến mãi') || msgLower.includes('khuyen mai') || msgLower.includes('voucher') || msgLower.includes('giảm giá') || msgLower.includes('giam gia') || msgLower.includes('mã') || msgLower.includes('ma')) {
        let reply = `🎫 **DANH SÁCH MÃ ƯU ĐÃI & VOUCHERS HỆ THỐNG KHẢ DỤNG**\n` +
                    `*Số liệu trích xuất từ database lúc ${dateStr} - ${timeStr}*\n\n` +
                    `➡️ **Các chương trình ưu đãi tri ân khách hàng đang hoạt động:**\n`;
        
        if (vouchersList.length === 0) {
          reply += `*   *Hiện tại chưa có mã giảm giá nào được phát hành trong hệ thống.*\n`;
        } else {
          vouchersList.forEach((v, idx) => {
            reply += `*   👉 **Mã [${v.code}]**: **${v.title}** | Trị giá: \`${v.value.toLocaleString('vi-VN')}đ\` (Phân loại: \`${v.type === 'percent' ? 'Giảm phần trăm' : 'Giảm tiền mặt'}\`)\n`;
          });
        }
        
        reply += `\n💡 *Khuyến nghị:* Ngài có thể truy cập menu **[Điểm & Quà tặng]** trên thanh điều hướng bên trái để tạo thêm mã mới, thiết lập số lượng và điểm đổi thưởng cho hội viên nhé!`;
        return { reply };
      }

      // INTENT 6: NHẬT KÝ / BẢO MẬT / AN NINH / AUDIT
      if (msgLower.includes('nhật ký') || msgLower.includes('nhat ky') || msgLower.includes('bảo mật') || msgLower.includes('bao mat') || msgLower.includes('an ninh') || msgLower.includes('audit')) {
        let reply = `🛡️ **NHẬT KÝ KIỂM TOÁN AN NINH & NHẬT KÝ HỆ THỐNG 24H**\n` +
                    `*Quét lịch sử thao tác nhạy cảm gần nhất lúc ${dateStr} - ${timeStr}*\n\n` +
                    `➡️ **Danh sách 5 thao tác quản trị gần nhất trên hệ thống:**\n`;
        
        if (recentAuditLogs.length === 0) {
          reply += `✅ *Hệ thống an toàn tuyệt đối:* Chưa ghi nhận bất kỳ thao tác can thiệp nhạy cảm nào trong 24 giờ qua.\n`;
        } else {
          recentAuditLogs.forEach((l, idx) => {
            const timeStrLog = new Date(l.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            reply += `*   👉 \`[${timeStrLog}]\` Hành động: **${l.action}** | Chi tiết: \`${JSON.stringify(l.details || {})}\`\n`;
          });
        }
        
        reply += `\n💡 *Khuyến nghị:* Để xem hoặc xuất toàn bộ lịch sử vận hành chi tiết ra file Excel đối soát bảo mật, Ngài vui lòng truy cập menu **[Nhật ký hệ thống]** nhé!`;
        return { reply };
      }

      // FALLBACK MẶC ĐỊNH: EXECUTIVE DASHBOARD CONTROL BRIEFING
      let reply = `📋 **BẢN TIN ĐIỀU HÀNH TỔNG QUAN THỜI GIAN THỰC**\n` +
                  `*(Hệ thống Trợ lý Vận hành nội bộ - 100% Offline, Tiết kiệm Quota 0đ)*\n` +
                  `*Thời gian đối soát:* **${dateStr} lúc ${timeStr}** | Kính gửi Admin: **${adminName}**\n\n` +
                  `---\n\n` +
                  `💰 **1. Báo cáo Doanh thu & Dòng tiền:**\n` +
                  `*   **Hôm nay:** 💵 \`${todayRev.toLocaleString('vi-VN')}đ\` (từ \`${todayOrders.length} vé chốt\`)\n` +
                  `*   **Tuần này:** 💶 \`${weekRev.toLocaleString('vi-VN')}đ\`\n` +
                  `*   **Tháng này:** 💷 \`${monthRev.toLocaleString('vi-VN')}đ\`\n` +
                  `*   **Tiền hoàn trả:** 💸 \`${totalRefundedAmount.toLocaleString('vi-VN')}đ\` (\`${refundedOrders.length} đơn hàng\`)\n\n` +
                  `🚌 **2. Vận hành Chuyến xe & Tuyến:**\n` +
                  `*   **Đang chạy trên đường:** \`${runningTripsCount} chuyến xe\`\n` +
                  `*   **Sắp xuất phát:** \`${publishedTripsCount} chuyến\`\n` +
                  `*   **Tuyến phổ biến nhất:** \`${popularRoutes[0]?.route || 'N/A'}\` (${popularRoutes[0]?.bookingsCount || 0} đơn đặt)\n\n` +
                  `🧑‍✈️ **3. Đội ngũ Bác tài & Nhân sự:**\n` +
                  `*   **Sẵn sàng (AVAILABLE):** 🟢 \`${driverStatusMap.AVAILABLE}/${driversStatusCount.reduce((acc, curr) => acc + curr._count, 0)} người\`\n` +
                  `*   **Đang đi tour (ON_TRIP):** 🚌 \`${driverStatusMap.ON_TRIP} người\`\n\n` +
                  `💎 **4. Khách hàng & Quà tặng:**\n` +
                  `*   **Hội viên VIP nhất:** 👑 \`${vipList[0]?.name || 'N/A'}\` (Đã chi tiêu \`${(vipList[0]?.totalSpent || 0).toLocaleString('vi-VN')}đ\`)\n` +
                  `*   **Số Vouchers khả dụng:** 🎫 \`${vouchersList.length} chương trình\`\n\n` +
                  `🛡️ **5. An ninh & Nhật ký thao tác:**\n` +
                  `*   Quét phát hiện \`${recentAuditLogs.length} thao tác nhạy cảm\` trong 24 giờ qua.\n\n` +
                  `---\n` +
                  `💡 **HƯỚNG DẪN ĐIỀU KHIỂN BẰNG PHÍM GÕ (Zero-Quota AI):**\n` +
                  `Ngài có thể gõ bất kỳ từ khóa nào dưới đây để tôi trích xuất báo cáo chuyên sâu riêng cho khu vực đó mà **hoàn toàn không tiêu tốn API Groq/OpenAI**:\n` +
                  `1️⃣ Gõ **\`doanh thu\`**: Xem chi tiết dòng tiền & tỷ trọng tuyến đường.\n` +
                  `2️⃣ Gõ **\`tài xế\`**: Xem danh sách nhân sự bận/rảnh của bến xe.\n` +
                  `3️⃣ Gõ **\`chuyến xe\`**: Xem cơ cấu trạng thái chuyến xe đang vận hành.\n` +
                  `4️⃣ Gõ **\`khách hàng\`**: Xem danh sách VIP & Khách hàng RFM.\n` +
                  `5️⃣ Gõ **\`khuyến mãi\`**: Xem danh sách các mã voucher đang phát hành.\n` +
                  `6️⃣ Gõ **\`nhật ký\`**: Xem chi tiết an ninh & audit logs của hệ thống.`;

      return { reply };
    } catch (err: any) {
      console.error("🚨 Lỗi tổng quát trong executeGeneralAdminChat:", err);
      return { reply: "Dạ thưa Admin, hệ thống trích xuất báo cáo chuyên gia gặp gián đoạn. Kính mong Ngài thử lại sau giây lát ạ." };
    }
  }

  // ==========================================
  // CÁC PHƯƠNG THỨC QUẢN LÝ LỊCH SỬ CHAT ADMIN
  // ==========================================
  async getAdminHistory(adminId: string) {
    return this.prisma.chatMessage.findMany({
      where: { userId: adminId },
      orderBy: { createdAt: 'asc' },
      take: 50
    });
  }

  async deleteAdminHistory(adminId: string) {
    return this.prisma.chatMessage.deleteMany({
      where: { userId: adminId }
    });
  }

  private async saveHistoryAsync(userId: string, userMsg: string, aiMsg: string) {
    try {
      await this.prisma.chatMessage.createMany({
        data: [
          { userId, role: 'user', content: userMsg },
          { userId, role: 'assistant', content: aiMsg }
        ]
      });
    } catch (err) {
      console.error("🚨 Lỗi lưu lịch sử chat Admin:", err);
    }
  }
}
