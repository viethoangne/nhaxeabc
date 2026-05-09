import { Injectable, InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CancelService } from '../cancel/cancel.service'; // Import service xịn của anh
import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import OpenAI from 'openai'; 
import { BookingStatus } from '@prisma/client';

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;
  private groq: OpenAI;           
  // --- BIẾN LƯU TRỮ CHO TẦNG 1 & 2 ---
  private userRequestCounts = new Map<string, { count: number; resetTime: number }>();
  private responseCache = new Map<string, { reply: string; expireAt: number }>();
  
  
  // 🟢 Đã bỏ chữ sài gòn, chỉ giữ tên chuẩn
  private supportedCities = [
    'hồ chí minh', 'hà nội', 'đà lạt', 
    'nha trang', 'vũng tàu', 'đà nẵng', 'cần thơ'
  ];

  constructor(
    private prisma: PrismaService,
    private readonly cancelService: CancelService // Thêm readonly ở đây, NestJS sẽ tự động hiểu và gán giá trị
  ) {
    const groqKey = process.env.GROQ_API_KEY;
    this.groq = new OpenAI({
      apiKey: groqKey?.trim(),
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  // ==========================================
  // HÀM LẤY TOÀN BỘ DỮ LIỆU KHÁCH HÀNG (ULTIMATE)
  // ==========================================
  private async getFullCustomerProfile(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          vouchers: {
            include: { voucher: true },
            where: { isUsed: false } 
          },
          chatMessages: {
            take: 20,
            orderBy: { createdAt: 'desc' }
          },
          orders: {
            orderBy: { createdAt: 'desc' },
            include: {
              outboundTrip: true, 
              returnTrip: true,   
              seats: true         
            }
          }
        }
      });

      if (!user) return null;

      return {
        profile: {
          name: user.name,
          email: user.email,
          points: user.points,
          totalTrips: user.totalTrips,
          memberSince: user.createdAt
        },
        loyalty: {
          availableVouchers: user.vouchers.map(uv => ({
            code: uv.voucher.code,
            title: uv.voucher.title,
            discount: uv.voucher.type === 'percent' ? `${uv.voucher.value}%` : `${uv.voucher.value.toLocaleString()}đ`,
            maxReduction: uv.voucher.maxAmount,
            ownedAt: uv.createdAt
          }))
        },
        bookingHistory: user.orders.map(order => ({
          orderCode: order.orderCode,
          status: {
            payment: order.paymentStatus,
            booking: order.bookingStatus
          },
          route: {
            from: order.from,
            to: order.to,
            type: order.tripType === 'round' ? 'Khứ hồi' : 'Một chiều'
          },
          tripDetails: {
            depart: order.outboundTrip?.departDate,
            pickup: order.outboundTrip?.pickupPoint,
            dropoff: order.outboundTrip?.dropoffPoint,
            busType: order.outboundTrip?.busType
          },
          tickets: {
            count: order.tickets,
            totalAmount: order.amount,
            seatNumbers: order.seats.map(s => s.seatNumber).join(', ')
          },
          createdAt: order.createdAt
        })),
        recentChat: user.chatMessages.reverse().map(msg => ({
          role: msg.role,
          text: msg.content,
          time: msg.createdAt
        }))
      };
    } catch (error) {
      console.error("🚨 Lỗi khi lấy Ultimate Profile:", error);
      return null;
    }
  }

  private async findTripsDB(from: string, to: string, dateStr: string) {
    try {
      const now = new Date(); // Thời gian thực tế lúc khách chat
      const startOfDay = new Date(`${dateStr}T00:00:00`);
      const endOfDay = new Date(`${dateStr}T23:59:59`);
  
      // --- LOGIC FIX LỖI THỜI GIAN QUÁ KHỨ ---
      // Nếu ngày khách chọn là ngày hôm nay, ta chỉ lấy chuyến từ "bây giờ" trở đi.
      // Nếu khách chọn ngày trong tương lai, ta lấy từ 00:00 của ngày đó.
      const searchStart = (now > startOfDay && now < endOfDay) ? now : startOfDay;

      const trips = await this.prisma.trip.findMany({
        where: {
          from: { contains: from, mode: 'insensitive' },
          to: { contains: to, mode: 'insensitive' },
          departDate: {
            gte: searchStart, // Sử dụng mốc thời gian đã tối ưu
            lte: endOfDay
          }
        },
        orderBy: { departDate: 'asc' },
        take: 30 
      });

      if (trips.length === 0) {
        return { error: `Dạ, hiện tại nhà xe không còn chuyến nào từ **${from.toUpperCase()}** đi **${to.toUpperCase()}** khởi hành sau thời điểm này trong ngày hôm nay ạ.` };
      }
      return { trips };
    } catch (err) {
      return { error: "Lỗi truy vấn cơ sở dữ liệu chuyến xe." };
    }
  }

  private async getUserInfoDB(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { 
          vouchers: { include: { voucher: true }, where: { isUsed: false } },
          orders: { 
            take: 5,
            orderBy: { createdAt: 'desc' }
          } 
        }
      });
      
      if (!user) return { error: "Không tìm thấy thông tin thành viên." };

      return {
        name: user.name,
        points: user.points,
        totalTrips: user.totalTrips,
        vouchers: user.vouchers.map(v => v.voucher), 
        recentOrders: user.orders.map(o => ({
          orderCode: o.orderCode,
          route: `${o.from} đi ${o.to}`,
          ticketsBought: o.tickets,
          status: o.bookingStatus
        }))
      };
    } catch (err) {
      return { error: "Lỗi lấy thông tin người dùng từ hệ thống." };
    }
  }

  // ==========================================
  // LOGIC XỬ LÝ CHAT CHÍNH (TÍCH HỢP 5 TẦNG)
  // ==========================================

  async handleChat(message: string, history: any[], userId?: string) {
    const now = Date.now();
    let sourceType = 'database_rule';

    // --------------------------------------------------
    // TẦNG 1: BẢO VỆ HỆ THỐNG (RATE LIMITING)
    // --------------------------------------------------
    if (userId) { 
      const limit = this.userRequestCounts.get(userId) || { count: 0, resetTime: now + 60000 };
      if (now > limit.resetTime) {
        limit.count = 1;
        limit.resetTime = now + 60000;
      } else {
        limit.count++;
        if (limit.count > 10) { 
          throw new HttpException('Bạn thao tác quá nhanh, vui lòng thử lại sau 1 phút.', HttpStatus.TOO_MANY_REQUESTS);
        }
      }
      this.userRequestCounts.set(userId, limit);
    }

    const normalizedMsg = this.normalizeMessage(message);

    // --------------------------------------------------
    // TẦNG 2: CACHING (NHỚ CÂU TRẢ LỜI 5 PHÚT)
    // --------------------------------------------------
    const cacheKey = `${userId || 'guest'}_${normalizedMsg}`;
    const cachedData = this.responseCache.get(cacheKey);
    if (cachedData && cachedData.expireAt > now) {
      this.saveHistoryAsync(userId, message, cachedData.reply);
      return { reply: cachedData.reply, source: 'cache' };
    }

   // --------------------------------------------------
    // TẦNG 3 & 4: REGEX & RULE-BASED (HOÀN TOÀN DÙNG CODE)
    // --------------------------------------------------
    let finalReply = "";

    // 1. Luồng xử lý Hủy/Đổi vé
    if (this.isAskingAboutCancellation(normalizedMsg)) {
      finalReply = await this.handleCancellationQuery(normalizedMsg, userId);
    }
    // 2. Tra cứu Mã Đơn Hàng cụ thể
    else if (normalizedMsg.match(/(mã vé|mã đơn|kiểm tra vé|đơn hàng)[\s:]*([a-zA-Z0-9]+)/i)) {
      const orderMatch = normalizedMsg.match(/(mã vé|mã đơn|kiểm tra vé|đơn hàng)[\s:]*([a-zA-Z0-9]+)/i);
      if (orderMatch && orderMatch[2] && orderMatch[2].length >= 5) {
        finalReply = await this.handleOrderQuery(orderMatch[2].toUpperCase());
      }
    }
    // 3. Hỏi Khuyến mãi / Tin tức
    else if (this.isAskingAboutNews(normalizedMsg)) {
      finalReply = this.handleNewsQuery();
    }
    // 4. Hỏi Chính sách / Quy định
    else if (this.isAskingAboutPolicy(normalizedMsg)) {
      finalReply = this.handlePolicyQuery(normalizedMsg);
    }
    // 5. Hỏi Hướng dẫn thao tác
    else if (this.isAskingAboutGuides(normalizedMsg)) {
      finalReply = this.handleGuideQuery(normalizedMsg);
    }
    // 6. Luồng Hỏi Lịch sử mua vé 
    else if (this.isAskingAboutHistory(normalizedMsg)) {
      if (!userId) {
        finalReply = "Dạ, để xem lịch sử mua vé, anh/chị vui lòng đăng nhập trước nhé!";
      } else {
        finalReply = await this.handleHistoryQuery(userId, normalizedMsg);
      }
    }
    // 7. Luồng Tra cứu chi tiết xe 
    else if (this.isAskingAboutBusDetails(normalizedMsg)) {
      finalReply = await this.handleBusDetailsQuery(normalizedMsg);
    }
    // 8. Luồng Tra cứu chuyến + Link ghế
    else if (this.isAskingAboutTrip(normalizedMsg)) {
      finalReply = await this.formatTripReply(normalizedMsg);
      // Chặn ngay lập tức nếu thiếu dữ liệu, không cho lọt xuống dưới
      if (!finalReply) {
        finalReply = "Dạ, để em kiểm tra lịch trình chính xác, anh/chị vui lòng nhập đầy đủ cú pháp:\n👉 **Tìm chuyến từ [Điểm đi] đi [Điểm đến] ngày [Ngày đi]**\n*(Ví dụ: Tìm chuyến Hà Nội đi TP.HCM ngày mai)*";
      }
    } 
    // 9. Luồng Hỏi Profile
    else if (this.isAskingAboutProfile(normalizedMsg)) {
      if (!userId) {
        finalReply = "Dạ, để kiểm tra tài khoản, anh/chị vui lòng đăng nhập trước nhé!";
      } else {
        finalReply = await this.formatProfileReply(userId);
      }
    }

    // --------------------------------------------------
    // TẦNG 5: AI CHUYÊN GIA TƯ VẤN (CHỈ CHẠY KHI THỎA ĐIỀU KIỆN)
    // --------------------------------------------------
    else if (this.isEmotionalOrAdviceQuery(normalizedMsg)) {
      sourceType = 'ai_groq_advisor';
      try {
        const chatCompletion = await this.groq.chat.completions.create({
          messages: [
            { 
              role: "system" as const, 
              content: `Bạn là Chuyên gia tư vấn trải nghiệm hành khách của Nhà xe ABC. 
              NHIỆM VỤ CỦA BẠN CHỈ LÀ:
              1. Tư vấn vị trí ngồi tốt nhất cho người hay say xe, người già, trẻ nhỏ, phụ nữ có thai (VD: khuyên ngồi hàng đầu tầng dưới, tránh bánh xe).
              2. Tư vấn giờ giấc di chuyển để tránh kẹt xe, hoặc để ngủ ngon.
              3. Xoa dịu cảm xúc, đồng cảm chân thành nếu khách than mệt mỏi, bực tức.
              
              ĐIỀU CẤM KỴ: 
              - TUYỆT ĐỐI KHÔNG cung cấp giá vé, lịch trình xuất bến, mã đơn hàng.
              - Nếu khách hỏi những thông tin cứng trên, hãy lịch sự bảo họ gõ "Tìm chuyến đi [Điểm đến]" để hệ thống tự động xử lý.`
            },
            ...history.slice(-10).map(m => ({ 
              role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', 
              content: m.content 
            })),
            { 
              role: "user" as const, 
              content: message 
            }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.6, 
          max_tokens: 250,
        });

        finalReply = chatCompletion.choices[0]?.message?.content || "Dạ, anh/chị cần em tư vấn thêm về vị trí ngồi hay trải nghiệm trên xe không ạ?";

      } catch (error: any) {
        console.error("🚨 Lỗi Groq AI Advisor:", error.message);
        finalReply = "Dạ, anh/chị có thể gọi trực tiếp Hotline 0565655360 để nhân viên tư vấn vị trí ngồi tốt nhất cho mình nhé!";
      }
    }

    // --------------------------------------------------
    // TẦNG 6: FALLBACK CUỐI CÙNG (CODE THUẦN - BẮT LỖI KHÔNG HIỂU)
    // --------------------------------------------------
    if (!finalReply) {
      sourceType = 'database_rule'; // Đảm bảo gán lại source
      finalReply = `Dạ, Trợ lý ABC chưa hiểu rõ ý anh/chị lắm. Để em hỗ trợ nhanh nhất, anh/chị có thể gõ theo các mẫu sau nhé:\n\n` +
                   `🚌 **Mua vé:** "Tìm chuyến Hà Nội đi Sài Gòn ngày mai"\n` +
                   `🎟️ **Hủy vé:** "Hủy vé [Mã vé của bạn]"\n` +
                   `💡 **Tư vấn:** "Tôi hay say xe thì nên chọn ghế nào?"\n` +
                   `📞 Hoặc gọi Hotline: **0565655360** ạ.`;
    }
    // --------------------------------------------------
    // LƯU TRỮ CACHE & LỊCH SỬ
    // --------------------------------------------------

    // --------------------------------------------------
    // LƯU TRỮ CACHE & LỊCH SỬ
    // --------------------------------------------------
    this.responseCache.set(cacheKey, { reply: finalReply, expireAt: now + 5 * 60 * 1000 }); 
    this.saveHistoryAsync(userId, message, finalReply);

    return { reply: finalReply, source: sourceType };
  }


  // ==========================================
  // CÁC HÀM TIỆN ÍCH, REGEX & FORMAT DỮ LIỆU
  // ==========================================

  private normalizeMessage(msg: string): string {
    let res = msg.toLowerCase().trim();

    // 🟢 ÉP TOÀN BỘ CÁC BIẾN THỂ VỀ TÊN CHUẨN TRONG DB
    const aliasMap: Record<string, string> = {
      'sài gòn': 'hồ chí minh', 'sg': 'hồ chí minh', 'hcm': 'hồ chí minh', 
      'tp.hcm': 'hồ chí minh', 'tphcm': 'hồ chí minh',
      'dl': 'đà lạt', 'hn': 'hà nội', 'vt': 'vũng tàu',
      'đn': 'đà nẵng', 'dn': 'đà nẵng', 'ct': 'cần thơ', 'nt': 'nha trang'
    };

    for (const [key, value] of Object.entries(aliasMap)) {
       const regex = new RegExp(`\\b${key}\\b`, 'gi');
       res = res.replace(regex, value);
    }
    return res;
  }
  // --------------------------------------------------
  // [MỚI CHUẨN XÁC] BỘ XỬ LÝ HỦY VÉ BẰNG CODE THUẦN
  // --------------------------------------------------
  private isAskingAboutCancellation(msg: string): boolean {
    const keywords = ['hủy', 'huỷ', 'đổi', 'trả vé', 'hoàn tiền', 'đổi chuyến'];
    return keywords.some(kw => msg.includes(kw));
  }

  private async handleCancellationQuery(msg: string, userId?: string): Promise<string> {
    // 🟢 Thêm 'hủy đơn', 'hủy chuyến' vào biểu thức chính quy
    const directMatch = msg.match(/(h(?:ủ|uỷ) vé|h(?:ủ|uỷ) mã|h(?:ủ|uỷ) đơn|h(?:ủ|uỷ) chuyến|xác nhận h(?:ủ|uỷ))[\s:]*([a-zA-Z0-9]{5,})/i);
    let targetCode = directMatch ? directMatch[2].toUpperCase() : null;
  
    const isConfirming = msg.includes('ok h') || msg.includes('xác nhận') || msg.includes('chắc chắn') || msg.includes('hủy giúp mình') || msg.includes('huỷ giúp mình');
  
    if (!targetCode && userId && isConfirming) {
      const recentChats = await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 6
      });
      for (const chat of recentChats) {
        const match = chat.content.match(/(vé|mã|đơn)[\s:]*([a-zA-Z0-9]{5,})/i);
        if (match && match[2]) {
          targetCode = match[2].toUpperCase();
          break;
        }
      }
    }
  
    // 2. Nếu không tìm thấy mã vé
    if (!targetCode) {
      return `Dạ, để hủy hoặc đổi vé, anh/chị vui lòng cung cấp mã vé theo cú pháp:\n**Hủy vé [Mã vé]** (Ví dụ: Hủy vé AB1234)\n\nHoặc anh/chị có thể thao tác trực tiếp trong mục "Tra Cứu Vé  " trên website ạ.`;
    }
  
    // 3. Lấy thông tin vé từ Database (Cần lấy cả Email/Phone để truyền vào Service hủy)
    const order = await this.prisma.order.findUnique({ 
      where: { orderCode: targetCode },
      include: { user: true } // Lấy kèm thông tin user để lấy email nếu cần
    });
  
    if (!order) {
      return `Dạ em không tìm thấy mã vé **${targetCode}** trên hệ thống. Anh/chị kiểm tra lại mã giúp em nhé!`;
    }
  
    if (order.bookingStatus === 'CANCELLED') {
      return `Dạ vé **${targetCode}** đã được hủy từ trước rồi ạ. Tiền sẽ được hoàn về theo chính sách của nhà xe.`;
    }
  
    // 4. Xử lý logic Hủy
    if (isConfirming) {
      try {
        const userEmail = order.customerEmail || order.user?.email || "";
        
        const result = await this.cancelService.cancelTicket(
          targetCode,
          order.customerPhone ?? '', 
          userEmail
        );
      
        // CẬP NHẬT: Trả về câu thông báo có tính khẳng định trạng thái đã đổi
        return `✅ **${result.message}**. Vé **${targetCode}** đã được chuyển sang trạng thái **Đã hủy**. Anh/chị có thể kiểm tra lại trong mục "Vé đã hủy" tại trang Lịch sử nhé!`;
      
      } catch (error: any) {
        const errorMsg = error.response?.message || error.message || "Không thể thực hiện yêu cầu.";
        return `❌ **Thông báo: Vé không đủ điều kiện** ${errorMsg}`;
      }
    }else {
      // Bước yêu cầu xác nhận và cảnh báo chính sách
      let reply = `Dạ em đã tìm thấy vé **${targetCode}** (${order.outboundFromSnapshot} ➔ ${order.outboundToSnapshot}).\n`;
      reply += `⚠️ **Lưu ý:** Việc hủy vé sẽ áp dụng chính sách hoàn tiền (100% nếu >24h, 50% nếu từ 12-24h, và **không thể hủy nếu dưới 12h**).\n\n`;
      reply += `Anh/chị có chắc chắn muốn hủy không? Nếu có, vui lòng nhắn:\n👉 **Ok hủy giúp mình**`;
      return reply;
    }
  }
  // --------------------------------------------------

  private isAskingAboutNews(msg: string): boolean {
    const keywords = ['khuyến mãi', 'ưu đãi', 'tin tức', 'giảm giá', 'chương trình', 'voucher mới'];
    return keywords.some(kw => msg.includes(kw));
  }

  private handleNewsQuery(): string {
    let reply = `📣 **Tin tức & Ưu đãi mới nhất từ Nhà xe ABC:**\n\n`;
    reply += `🔹 **Ưu đãi thành viên mới:** Giảm ngay 10% cho chuyến đi đầu tiên khi đăng ký tài khoản.\n`;
    reply += `🔹 **Tích điểm đổi quà:** Nhận điểm thưởng sau mỗi chuyến đi để đổi Voucher cực chất.\n`;
    reply += `\n👉 Anh/chị xem chi tiết các chương trình khuyến mãi khác tại mục **TIN TỨC** trên menu website nhé!`;
    return reply;
  }

  private isAskingAboutPolicy(msg: string): boolean {
    const keywords = ['gửi hàng', 'chuyển phát', 'hàng hóa', 'thú cưng', 'chó mèo', 'xuất hóa đơn', 'đồ ăn'];
    return keywords.some(kw => msg.includes(kw));
  }

  private handlePolicyQuery(msg: string): string {
    if (msg.includes('chó') || msg.includes('mèo') || msg.includes('thú cưng')) {
      return "Dạ, để đảm bảo không gian chung, nhà xe ABC xin phép **không nhận chuyên chở thú cưng** trên khoang hành khách ạ. Mong anh/chị thông cảm!";
    }
    if (msg.includes('hàng') || msg.includes('chuyển phát')) {
      return "📦 **Quy định gửi hàng:**\nNhà xe ABC có nhận ký gửi hàng hóa. Cước phí dao động từ 50.000đ - 150.000đ tùy theo kích thước và tuyến đường. Anh/chị vui lòng mang hàng ra văn phòng nhà xe trước giờ khởi hành 1 tiếng để nhân viên kiểm tra và báo giá chính xác nhé!";
    }
    if (msg.includes('hóa đơn')) {
      return "🧾 **Xuất hóa đơn:**\nDạ nhà xe có hỗ trợ xuất hóa đơn VAT. Anh/chị vui lòng tick vào ô 'Yêu cầu xuất hóa đơn' ở bước Thanh toán, hoặc liên hệ Hotline 0565655360 trong vòng 24h sau khi hoàn thành chuyến đi ạ.";
    }
    return "Dạ về chính sách và quy định của nhà xe, anh/chị có thể xem chi tiết trực tiếp trên mục 'Quy định' ở website nhé, hoặc gọi 0565655360 để nhân viên tư vấn cụ thể ạ.";
  }

  private isAskingAboutGuides(msg: string): boolean {
    const keywords = ['hướng dẫn', 'cách đặt', 'làm sao để mua', 'cách thanh toán', 'cách nhập mã', 'thanh toán bằng gì', 'thanh toán qua đâu'];
    return keywords.some(kw => msg.includes(kw));
  }

  private handleGuideQuery(msg: string): string {
    if (msg.includes('thanh toán')) {
      return "💳 **Hướng dẫn thanh toán:**\nHiện tại nhà xe ABC hỗ trợ thanh toán qua **Ví MoMo** (chấp nhận thẻ ATM/Visa/Mastercard qua MoMo). Khi tới bước thanh toán cuối cùng, hệ thống sẽ tự động chuyển anh/chị sang trang MoMo để quét mã an toàn ạ.";
    }
    if (msg.includes('nhập mã') || msg.includes('dùng voucher')) {
      return "🎁 **Cách dùng Voucher:**\nỞ bước điền thông tin hành khách cuối cùng (trước khi thanh toán), anh/chị sẽ thấy ô **'Nhập mã giảm giá'**. Anh/chị có thể nhập mã vào đó hoặc chọn mã đang có sẵn trong Ví Voucher của tài khoản nhé!";
    }
    return "📱 **Hướng dẫn đặt vé:**\nB1: Ở trang chủ, chọn Điểm đi, Điểm đến và Ngày khởi hành.\nB2: Chọn chuyến đi có giờ xuất phát phù hợp.\nB3: Chọn vị trí ghế trống trên sơ đồ.\nB4: Nhập thông tin liên hệ và tiến hành thanh toán trực tuyến qua MoMo.\n\n_Hệ thống sẽ gửi vé điện tử (Mã đơn hàng) về Email và hiển thị trong Lịch sử mua vé ngay lập tức ạ!_";
  }

  private async handleOrderQuery(orderCode: string): Promise<string> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { orderCode } 
      });

      if (!order) return `Dạ em không tìm thấy mã vé **${orderCode}**. Anh/chị kiểm tra lại mã giúp em nhé!`;

      const statusMap: Record<string, string> = { HOLD: 'Đang giữ chỗ', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy', COMPLETED: 'Đã hoàn thành' };
      const payMap: Record<string, string> = { PENDING: 'Chưa thanh toán', PAID: 'Đã thanh toán', FAILED: 'Thanh toán thất bại' };

      let reply = `🎟️ **Thông tin vé [${orderCode}]:**\n`;
      reply += `- Trạng thái vé: **${statusMap[order.bookingStatus] || order.bookingStatus}**\n`;
      reply += `- Thanh toán: **${payMap[order.paymentStatus] || order.paymentStatus}**\n`;
      
      if (order.amount) {
        reply += `- Tổng tiền: **${order.amount.toLocaleString('vi-VN')}đ**\n`;
      }

      if (order.paymentStatus === 'PENDING' && order.checkoutUrl) {
        reply += `\n⚠️ Vé của anh/chị chưa được thanh toán. [Nhấn vào đây để tiếp tục thanh toán](${order.checkoutUrl})`;
      }
      return reply;
    } catch (err) {
      console.error("Lỗi tra cứu đơn hàng:", err);
      return "Dạ hệ thống tra cứu mã vé đang bận, anh/chị vui lòng thử lại sau ít phút nhé.";
    }
  }

  private isAskingAboutBusDetails(msg: string): boolean {
    const keywords = ['đón ở đâu', 'trả ở đâu', 'bao lâu', 'loại xe', 'xe giường nằm', 'xe gì', 'mất mấy tiếng'];
    return keywords.some(kw => msg.includes(kw));
  }

  private async handleBusDetailsQuery(msg: string): Promise<string> {
    const mentionedCities = this.supportedCities.filter(city => msg.includes(city));
    if (mentionedCities.length === 0) return "Dạ anh/chị muốn hỏi chi tiết trạm đón trả cho tuyến đường nào ạ? (VD: Sài Gòn đi Đà Lạt)";

    const targetCity = mentionedCities[0];

    try {
      const trip = await this.prisma.trip.findFirst({
        where: { 
          OR: [
            { from: { contains: targetCity, mode: 'insensitive' } }, 
            { to: { contains: targetCity, mode: 'insensitive' } }
          ]
        }
      });

      if (!trip) return `Dạ em chưa tìm thấy thông tin chi tiết cho tuyến liên quan đến ${targetCity.toUpperCase()} ạ.`;

      let reply = `🚌 **Thông tin tuyến xe liên quan đến ${targetCity.toUpperCase()}:**\n`;
      if (trip.pickupPoint) reply += `- Điểm đón khách thường xuyên: **${trip.pickupPoint}**\n`;
      if (trip.dropoffPoint) reply += `- Điểm trả khách: **${trip.dropoffPoint}**\n`;
      if (trip.durationMinutes) reply += `- Thời gian di chuyển dự kiến: khoảng **${Math.round(trip.durationMinutes / 60)} tiếng**\n`;
      reply += `- Loại xe: **${trip.busType || 'Giường nằm cao cấp'}**\n`;
      
      return reply;
    } catch (error) {
      return ""; 
    }
  }

  private isAskingAboutTrip(msg: string): boolean {
    const keywords = ['giá', 'vé', 'chuyến', 'mấy giờ', 'lịch trình', 'đi từ', 'đi đến', 'đặt vé', 'mua vé', 'book vé'];
    
    // 🟢 LUẬT MỚI: Chỉ cần xuất hiện >= 2 tên thành phố là auto hiểu ý định Đặt Vé
    const mentionedCities = this.supportedCities.filter(city => msg.includes(city));
    
    return keywords.some(kw => msg.includes(kw)) || mentionedCities.length >= 2;
  }

  private async formatTripReply(msg: string): Promise<string> {
    const normalizedMsg = msg.toLowerCase();
    
    // 1. Nhận diện thành phố dựa trên thứ tự khách gõ (Tránh bị ngược Điểm đi - Điểm đến)
    const cityPositions = this.supportedCities
      .map(city => ({ name: city, pos: normalizedMsg.indexOf(city) }))
      .filter(item => item.pos !== -1)
      .sort((a, b) => a.pos - b.pos);

    if (cityPositions.length < 2) return ""; 

    const fromCity = cityPositions[0].name;
    const toCity = cityPositions[1].name;
    
    // 2. Trích xuất ngày từ câu chat
    const selectedDate = this.extractDate(normalizedMsg); 

    // Nếu khách quên nhập ngày -> Yêu cầu nhập ngày (Bảo vệ logic Code)
    if (!selectedDate) {
      return `Dạ, anh/chị muốn tìm chuyến từ **${fromCity.toUpperCase()}** đi **${toCity.toUpperCase()}** vào **ngày nào** ạ? (Ví dụ: ngày mai, 20/04, hôm nay...)`;
    }

    // --- ĐỊNH NGHĨA CÁC BIẾN CÒN THIẾU MÀ BẠN ĐANG BÁO LỖI ---
    const displayDate = new Date(selectedDate).toLocaleDateString('vi-VN');
    const isRoundTrip = normalizedMsg.includes('khứ hồi') || normalizedMsg.includes('đi và về') || normalizedMsg.includes('2 chiều');
  
    // 3. Truy vấn cơ sở dữ liệu
    const dbResult = await this.findTripsDB(fromCity, toCity, selectedDate); 
  
    if (dbResult.error) return dbResult.error;
    
    if (!dbResult.trips || dbResult.trips.length === 0) {
      return `Dạ, hiện tại em không tìm thấy chuyến nào từ **${fromCity.toUpperCase()}** đi **${toCity.toUpperCase()}** trong ngày **${displayDate}**. Anh/chị chọn ngày khác giúp em nhé!`;
    }
  
    let reply = `🚌 Dạ, các chuyến **${fromCity.toUpperCase()}** đi **${toCity.toUpperCase()}** ngày **${displayDate}**:\n\n`;
    
    dbResult.trips.forEach(trip => {
      const time = trip.departDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const price = trip.price ? trip.price.toLocaleString('vi-VN') + 'đ' : 'Đang cập nhật';
      
      const yyyy = trip.departDate.getFullYear();
      const mm = String(trip.departDate.getMonth() + 1).padStart(2, '0');
      const dd = String(trip.departDate.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd}`;
  
      const durationMins = trip.durationMinutes || 0; 
      const arrivalDate = new Date(trip.departDate.getTime() + durationMins * 60000);
  
      const params = new URLSearchParams({
        tripType: isRoundTrip ? 'round' : 'oneway',
        tickets: '1',
        from: trip.from,
        to: trip.to,
        date: selectedDate, 
        outboundTripId: String(trip.id),
        price: String(trip.price || 0),
        departDateTime: trip.departDate.toISOString(),
        arrivalDateTime: arrivalDate.toISOString(),
        duration: String(durationMins)
      });

      const bookingLink = `http://localhost:3000/chair?${params.toString()}`;
  
      reply += `- **${time}** | Giá: **${price}** | Đón: ${trip.pickupPoint}\n`;
      reply += `👉 [Nhấn vào đây để CHỌN GHẾ chuyến ${time}](${bookingLink})\n\n`;
    });
  
    // 4. Xử lý hiển thị chiều về nếu khách hỏi khứ hồi
    if (isRoundTrip) {
      reply += `🔄 Và các chuyến chiều về **${toCity.toUpperCase()}** đi **${fromCity.toUpperCase()}**:\n\n`;
      const returnResult = await this.findTripsDB(toCity, fromCity, selectedDate);
      
      if (returnResult.trips && returnResult.trips.length > 0) {
        returnResult.trips.forEach(trip => {
          const time = trip.departDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const price = trip.price ? trip.price.toLocaleString('vi-VN') + 'đ' : 'Đang cập nhật';
          reply += `- **${time}** | Giá: **${price}** | Đón: ${trip.pickupPoint}\n`;
        });
        reply += `\n*(Anh/chị vui lòng chọn ghế chiều đi ở trên trước, hệ thống sẽ tự động hướng dẫn chọn chiều về ạ)*\n`;
      } else {
        reply += `- _Dạ hiện tại nhà xe chưa có lịch chuyến về phù hợp trong ngày này ạ._\n`;
      }
    }
  
    return reply.trim();
  }

  private async formatProfileReply(userId: string): Promise<string> {
    const data = await this.getFullCustomerProfile(userId);

    if (!data) {
      return "Dạ, em không tìm thấy thông tin tài khoản của mình trên hệ thống ạ.";
    }

    const { profile, loyalty, bookingHistory } = data;

    let reply = `👤 **Xin chào ${profile.name || 'anh/chị'}!**\n`;
    reply += `✨ Hạng: **${profile.totalTrips > 10 ? 'Thành viên Vàng' : 'Thành viên Thân thiết'}**\n`;
    reply += `💰 Điểm tích lũy: **${profile.points.toLocaleString('vi-VN')}đ**\n`;
    reply += `🎫 Tổng chuyến đã đi: **${profile.totalTrips} chuyến**\n\n`;

    if (bookingHistory.length > 0) {
      const latest = bookingHistory[0]; 
      const departDate = latest.tripDetails.depart 
        ? new Date(latest.tripDetails.depart).toLocaleDateString('vi-VN') 
        : 'Đang cập nhật';
      const departTime = latest.tripDetails.depart 
        ? new Date(latest.tripDetails.depart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) 
        : '';

      reply += `🕒 **Chuyến gần nhất [${latest.orderCode}]:**\n`;
      reply += `📍 Tuyến: ${latest.route.from} ➡️ ${latest.route.to}\n`;
      reply += `⏰ Khởi hành: **${departTime} - ${departDate}**\n`;
      if (latest.tripDetails.pickup) reply += `🏢 Điểm đón: ${latest.tripDetails.pickup}\n`;
      if (latest.tickets.seatNumbers) reply += `💺 Số ghế: **${latest.tickets.seatNumbers}**\n`;
      reply += `📝 Trạng thái: _${latest.status.booking === 'CONFIRMED' ? 'Đã xác nhận' : (latest.status.booking === 'CANCELLED' ? 'Đã hủy' : 'Đang xử lý')}_\n\n`;
    }

    if (loyalty.availableVouchers.length > 0) {
      reply += `🎁 **Voucher ưu đãi của anh/chị:**\n`;
      loyalty.availableVouchers.forEach(v => {
        reply += `- Mã **${v.code}**: Giảm ${v.discount} (${v.title})\n`;
      });
    } else {
      reply += `🎁 Hiện tại anh/chị chưa có voucher mới. Hãy tích thêm điểm để đổi quà nhé!`;
    }

    reply += `\n\n_Anh/chị cần hỗ trợ gì thêm về chuyến đi không ạ?_`;

    return reply;
  }

  // --- DATABASE HELPER ---
  async getHistory(userId: string) {
    if (!userId) return [];
    return this.prisma.chatMessage.findMany({
      where: { userId }, 
      orderBy: { createdAt: 'asc' }, // Giữ nguyên asc để tin mới nhất nằm dưới cùng
      take: 100, 
      select: { 
        role: true, 
        content: true 
      }
    });
  }

  // THÊM HÀM NÀY ĐỂ XÓA LỊCH SỬ CHAT TRONG CSDL
  async deleteHistory(userId: string) {
    if (!userId) return { success: false, message: 'Không có user ID' };
    try {
      await this.prisma.chatMessage.deleteMany({
        where: { userId: userId }
      });
      return { success: true, message: 'Đã xóa toàn bộ lịch sử' };
    } catch (error) {
      console.error("Lỗi xóa lịch sử DB:", error);
      throw new InternalServerErrorException("Không thể xóa lịch sử lúc này.");
    }
  }
  private async saveHistoryAsync(userId: string | undefined, userMsg: string, aiMsg: string) {
    // 1. Kiểm tra xem có nhận được userId không
    if (!userId) {
      console.log("🚨 LỖI: Không tìm thấy userId, hệ thống từ chối lưu lịch sử!");
      return;
    }
  
    try {
      // 2. CHỈ LƯU TIN NHẮN CỦA KHÁCH HÀNG (USER)
      await this.prisma.chatMessage.create({
        data: { userId: userId, role: 'user', content: userMsg }
      });
  
      // ĐÃ XÓA PHẦN LƯU TIN NHẮN CỦA ASSISTANT Ở ĐÂY
  
      console.log("✅ Đã lưu câu hỏi của khách vào CSDL thành công!");
    } catch (err) {
      console.error("🚨 Lỗi Database khi lưu chat:", err);
    }
  }

  private isAskingAboutHistory(msg: string): boolean {
    if (['thì', 'nếu', 'cộng bao nhiêu', 'tích điểm', 'được bao nhiêu'].some(kw => msg.includes(kw))) {
      return false; 
    }
    const keywords = ['đã mua', 'từng mua', 'lịch sử', 'tôi đã', 'tổng cộng bao nhiêu vé'];
    return keywords.some(kw => msg.includes(kw));
  }

  private isAskingAboutProfile(msg: string): boolean {
    if (['thì', 'nếu', 'cộng bao nhiêu', 'cách tính', 'làm sao để', 'quy định'].some(kw => msg.includes(kw))) {
      return false;
    }
    const keywords = ['điểm của tôi', 'voucher của tôi', 'có voucher nào', 'thông tin của tôi', 'xem điểm', 'điểm hiện tại', 'tôi có bao nhiêu điểm'];
    return keywords.some(kw => msg.includes(kw));
  }

  private async handleHistoryQuery(userId: string, msg: string): Promise<string> {
    try {
      const queryMsg = msg.replace(/sài gòn/g, 'hồ chí minh');
      const mentionedCities = this.supportedCities.filter(city => queryMsg.includes(city));

      // chat.service.ts - Dòng 489
      const orders = await this.prisma.order.findMany({
        where: { 
          userId: userId,
          bookingStatus: { 
            in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED] 
          } 
        },
        orderBy: { createdAt: 'desc' }
      });
      if (orders.length === 0) {
        return "Dạ, hiện tại em chưa thấy anh/chị có lịch sử mua vé thành công nào trên hệ thống ạ.";
      }

      if (mentionedCities.length > 0) {
        const filteredOrders = orders.filter(o => 
          mentionedCities.some(city => o.from.toLowerCase().includes(city) || o.to.toLowerCase().includes(city))
        );

        if (filteredOrders.length === 0) {
          const cityNames = mentionedCities.map(c => c.toUpperCase()).join(' - ');
          return `Dạ, anh/chị chưa mua vé nào cho tuyến có liên quan đến **${cityNames}** ạ.`;
        }

        const totalTickets = filteredOrders.reduce((sum, order) => sum + order.tickets, 0);
        const cityNames = mentionedCities.map(c => c.toUpperCase()).join(' - ');
        return `Dạ, tính đến hiện tại anh/chị đã mua tổng cộng **${totalTickets} vé** cho các chuyến liên quan đến **${cityNames}** ạ.`;
      }

      const totalTickets = orders.reduce((sum, order) => sum + order.tickets, 0);
      return `Dạ, anh/chị đã mua tổng cộng **${totalTickets} vé** tại Nhà xe ABC. Cảm ơn anh/chị đã luôn đồng hành cùng nhà xe ạ! 🥰`;

    } catch (err) {
      console.error("Lỗi truy vấn lịch sử:", err);
      return ""; 
    }
  }

  // --- CHỈ GỌI AI KHI KHÁCH HỎI TƯ VẤN, SAY XE, CẢM XÚC ---
  private isEmotionalOrAdviceQuery(msg: string): boolean {
    const keywords = [
      'say xe', 'ói', 'mệt', 'buồn nôn', 'chóng mặt', 'nhức đầu', 
      'kẹt xe', 'tắc đường', 'đông khách', 'ồn ào', 'nóng',
      'tư vấn', 'nên ngồi', 'ngồi đâu', 'chọn ghế nào', 'khuyên', 'trẻ em', 'người già', 'bà bầu',
      'sợ', 'lo lắng', 'bực', 'cáu', 'tệ', 'chán', 'thái độ'
    ];
    return keywords.some(kw => msg.includes(kw));
  }
  private extractDate(msg: string): string | null {
    const now = new Date();
    const currentYear = now.getFullYear(); // Lấy năm hiện tại của hệ thống
  
    if (msg.includes('mai')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      return `${currentYear}-${mm}-${dd}`;
    }
  
    const dateMatch = msg.match(/(?:ngày\s*)?(\d{1,2})[\/\-](\d{1,2})|ngày\s*(\d{1,2})/i);
    if (dateMatch) {
      const day = Number(dateMatch[1] || dateMatch[3]);
      const month = Number(dateMatch[2] || (now.getMonth() + 1));
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${currentYear}-${mm}-${dd}`;
    }

    if (msg.includes('hôm nay')) {
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      return `${currentYear}-${mm}-${dd}`;
    }
  
    // ĐIỂM MẤU CHỐT: Nếu không thấy từ khóa ngày tháng, trả về null để bắt chatbot hỏi lại
    return null; 
  }
}