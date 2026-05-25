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
    'nha trang', 'vũng tàu', 'đà nẵng', 'cần thơ', 'phan thiết'
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
          outboundTripDetails: {
            depart: order.outboundDepartDateSnapshot || order.outboundTrip?.departDate || order.date,
            pickup: order.outboundPickupPointSnapshot || order.outboundTrip?.pickupPoint,
            dropoff: order.outboundDropoffPointSnapshot || order.outboundTrip?.dropoffPoint,
            busType: order.outboundBusTypeSnapshot || order.outboundTrip?.busType
          },
          returnTripDetails: order.tripType === 'round' ? {
            depart: order.returnDepartDateSnapshot || order.returnTrip?.departDate || order.returnDate,
            pickup: order.returnPickupPointSnapshot || order.returnTrip?.pickupPoint,
            dropoff: order.returnDropoffPointSnapshot || order.returnTrip?.dropoffPoint,
            busType: order.returnBusTypeSnapshot || order.returnTrip?.busType
          } : null,
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

  async handleChat(message: string, history: any[], userId?: string, locale?: string) {
    let activeLocale = locale;
    if (this.isEnglishMessage(message)) {
      activeLocale = 'en';
    }

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
          throw new HttpException(
            activeLocale === 'en' 
              ? 'You are operating too fast, please try again in 1 minute.' 
              : 'Bạn thao tác quá nhanh, vui lòng thử lại sau 1 phút.', 
            HttpStatus.TOO_MANY_REQUESTS
          );
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

    // 0. Chào hỏi và Cảm ơn (0đ quota Groq)
    if (normalizedMsg.match(/^(chào|hello|hi|xin chào|bạn là ai|giới thiệu|alo|helo|heyy)/i)) {
      finalReply = activeLocale === 'en'
        ? "Hello! I am the **ABC AI Assistant**, ready to help you search for trips, book tickets quickly, cancel/refund tickets, or answer any journey questions. How can I help you today?"
        : "Dạ, em xin chào anh/chị! Em là **Trợ lý AI ABC** luôn sẵn sàng hỗ trợ mình tra cứu chuyến xe, đặt vé nhanh, hủy vé/hoàn tiền hoặc giải đáp mọi thắc mắc hành trình ạ. Anh/chị cần em hỗ trợ gì hôm nay ạ?";
    }
    else if (normalizedMsg.match(/^(cảm ơn|cám ơn|thank|tks|ok cảm ơn|ok cám ơn)/i)) {
      finalReply = activeLocale === 'en'
        ? "You're very welcome! Wish you safe and pleasant journeys with ABC Bus! 🥰"
        : "Dạ không có gì ạ! Chúc anh/chị có những hành trình thượng lộ bình an và nhiều niềm vui cùng nhà xe ABC nhé! 🥰";
    }
    // Hotline & Văn phòng (0đ quota Groq)
    else if (normalizedMsg.match(/(số điện thoại|hotline|liên hệ|sđt|điện thoại|địa chỉ|văn phòng|ở đâu|trụ sở|phone|contact|address|office|headquarter)/i)) {
      finalReply = activeLocale === 'en'
        ? "📞 **Contact Info & Offices of ABC Bus:**\n\n" +
          "🔹 **24/7 Hotline & Support:** **0565655360**\n" +
          "🔹 **Head Office:** 391 Dinh Bo Linh, Ward 26, Binh Thanh District, Ho Chi Minh City.\n" +
          "🔹 **Nha Trang Office:** 10 Hung Vuong, Loc Tho, Nha Trang City.\n" +
          "🔹 **Da Lat Office:** 01 To Hien Thanh, Ward 3, Da Lat City.\n\n" +
          "_You can contact our Hotline or bring your luggage directly to the office 45 minutes before departure for best support!_"
        : "📞 **Thông tin liên hệ & Văn phòng Nhà xe ABC:**\n\n" +
          "🔹 **Hotline đặt vé & hỗ trợ 24/7:** **0565655360**\n" +
          "🔹 **Trụ sở chính:** Văn phòng 391 Đinh Bộ Lĩnh, Phường 26, Quận Bình Thạnh, TP. Hồ Chí Minh.\n" +
          "🔹 **Văn phòng Nha Trang:** Số 10 Hùng Vương, Lộc Thọ, TP. Nha Trang.\n" +
          "🔹 **Văn phòng Đà Lạt:** Số 01 Tô Hiến Thành, Phường 3, TP. Đà Lạt.\n\n" +
          "_Anh/chị có thể liên hệ Hotline hoặc mang hành lý ra trực tiếp văn phòng trước giờ chạy 45 phút để được hỗ trợ tốt nhất ạ!_";
    }
    // Chính sách trẻ em (0đ quota Groq)
    else if (normalizedMsg.match(/(trẻ em|em bé|dưới 6 tuổi|bế|bồng|phụ thu|child|children|baby|infant|kid|under 6)/i)) {
      finalReply = activeLocale === 'en'
        ? "👶 **Child Ticket Policy at ABC Bus:**\n\n" +
          "🔹 Children **under 6 years old** or under **1.2m** tall are **free of charge** if they share a seat/bed with parents.\n" +
          "🔹 Children **6 years old and above** or **1.2m and above** tall are charged full fare to ensure they have their own seat and safety belt throughout the journey.\n\n" +
          "_Please notify us in advance via Hotline 0565655360 if traveling with children so we can arrange lower deck seating for convenience!_"
        : "👶 **Chính sách vé trẻ em tại Nhà xe ABC:**\n\n" +
          "🔹 Trẻ em **dưới 6 tuổi** hoặc cao dưới **1.2m** được **miễn phí vé** nếu ngồi chung ghế/giường với bố mẹ.\n" +
          "🔹 Trẻ em từ **6 tuổi trở lên** hoặc cao từ **1.2m trở lên** tính vé như người lớn để đảm bảo có vị trí ngồi riêng và thắt dây an toàn đầy đủ trên suốt hành trình.\n\n" +
          "_Anh/chị lưu ý đăng ký trước với nhà xe qua Hotline 0565655360 nếu có bé đi kèm để nhân viên sắp xếp chỗ ngồi gầm thấp tiện lợi nhất nhé!_";
    }
    // 1. Luồng xử lý Hủy/Đổi vé
    else if (this.isAskingAboutCancellation(normalizedMsg)) {
      finalReply = await this.handleCancellationQuery(normalizedMsg, userId, activeLocale);
    }
    // 2. Tra cứu Mã Đơn Hàng cụ thể (Chỉ khớp khi có mã số từ 10-15 ký tự số)
    else if (normalizedMsg.match(/(mã vé|mã đơn|kiểm tra vé|đơn hàng|ticket|order)[\s:]*([0-9]{10,15})/i)) {
      const orderMatch = normalizedMsg.match(/(mã vé|mã đơn|kiểm tra vé|đơn hàng|ticket|order)[\s:]*([0-9]{10,15})/i);
      if (orderMatch && orderMatch[2]) {
        finalReply = await this.handleOrderQuery(orderMatch[2].toUpperCase(), activeLocale);
      }
    }
    // 3. Hỏi Khuyến mãi / Tin tức
    else if (this.isAskingAboutNews(normalizedMsg)) {
      finalReply = this.handleNewsQuery(activeLocale);
    }
    // 4. Hỏi Chính sách / Quy định
    else if (this.isAskingAboutPolicy(normalizedMsg)) {
      finalReply = this.handlePolicyQuery(normalizedMsg, activeLocale);
    }
    // 5. Hỏi Hướng dẫn thao tác
    else if (this.isAskingAboutGuides(normalizedMsg)) {
      finalReply = this.handleGuideQuery(normalizedMsg, activeLocale);
    }
    // 6. Luồng Hỏi Lịch sử mua vé 
    else if (this.isAskingAboutHistory(normalizedMsg)) {
      if (!userId) {
        finalReply = activeLocale === 'en' 
          ? "To check your ticket history, please login first!" 
          : "Dạ, để xem lịch sử mua vé, anh/chị vui lòng đăng nhập trước nhé!";
      } else {
        finalReply = await this.handleHistoryQuery(userId, normalizedMsg, activeLocale);
      }
    }
    // 7. Luồng Tra cứu chi tiết xe 
    else if (this.isAskingAboutBusDetails(normalizedMsg)) {
      finalReply = await this.handleBusDetailsQuery(normalizedMsg, activeLocale);
    }
    // 8. Luồng Tra cứu chuyến + Link ghế
    else if (this.isAskingAboutTrip(normalizedMsg)) {
      finalReply = await this.formatTripReply(normalizedMsg, activeLocale);
      // Chặn ngay lập tức nếu thiếu dữ liệu, không cho lọt xuống dưới
      if (!finalReply) {
        finalReply = activeLocale === 'en'
          ? "To search the schedule, please enter your trip details in the following format:\n👉 **Find trips from [Origin] to [Destination] on [Departure Date]**\n*(e.g., Find trips from Hanoi to Saigon tomorrow)*"
          : "Dạ, để em kiểm tra lịch trình chính xác, anh/chị vui lòng nhập đầy đủ cú pháp:\n👉 **Tìm chuyến từ [Điểm đi] đi [Điểm đến] ngày [Ngày đi]**\n*(Ví dụ: Tìm chuyến Hà Nội đi TP.HCM ngày mai)*";
      }
    } 
    // 9. Luồng Hỏi Profile
    else if (this.isAskingAboutProfile(normalizedMsg)) {
      if (!userId) {
        finalReply = activeLocale === 'en'
          ? "To check your account details, please login first!"
          : "Dạ, để kiểm tra tài khoản, anh/chị vui lòng đăng nhập trước nhé!";
      } else {
        finalReply = await this.formatProfileReply(userId, activeLocale);
      }
    }

    // --------------------------------------------------
    // TẦNG 5: AI CHUYÊN GIA TƯ VẤN (CHỈ CHẠY KHI THỎA ĐIỀU KIỆN)
    // --------------------------------------------------
    else if (this.isEmotionalOrAdviceQuery(normalizedMsg)) {
      sourceType = 'ai_groq_advisor';
      try {
        const systemPrompt = activeLocale === 'en'
          ? `You are a passenger experience advisor for ABC Bus. 
          YOUR SOLE TASKS ARE:
          1. Advise on the best seat locations for passengers with motion sickness, elderly, children, pregnant women (e.g. recommend front rows on the lower deck, avoiding the wheel areas).
          2. Advise on departure times to avoid traffic jams or sleep well.
          3. Calm emotions and express empathy if passengers complain about tiredness or anger.
          
          STRICT PROHIBITION:
          - DO NOT provide ticket prices, schedules, or order numbers.
          - If passengers ask for these structured data, politely ask them to type "Find trips to [Destination]" so the system can handle it automatically.`
          : `Bạn là Chuyên gia tư vấn trải nghiệm hành khách của Nhà xe ABC. 
          NHIỆM VỤ CỦA BẠN CHỈ LÀ:
          1. Tư vấn vị trí ngồi tốt nhất cho người hay say xe, người già, trẻ nhỏ, phụ nữ có thai (VD: khuyên ngồi hàng đầu tầng dưới, tránh bánh xe).
          2. Tư vấn giờ giấc di chuyển để tránh kẹt xe, hoặc để ngủ ngon.
          3. Xoa dịu cảm xúc, đồng cảm chân thành nếu khách than mệt mỏi, bực tức.
          
          ĐIỀU CẤM KỴ: 
          - TUYỆT ĐỐI KHÔNG cung cấp giá vé, lịch trình xuất bến, mã đơn hàng.
          - Nếu khách hỏi những thông tin cứng trên, hãy lịch sự bảo họ gõ "Tìm chuyến đi [Điểm đến]" để hệ thống tự động xử lý.`;

        const chatCompletion = await this.groq.chat.completions.create({
          messages: [
            { 
              role: "system" as const, 
              content: systemPrompt
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

        finalReply = chatCompletion.choices[0]?.message?.content || (
          activeLocale === 'en'
            ? "Do you need any further advice regarding seat selection or travel experience?"
            : "Dạ, anh/chị cần em tư vấn thêm về vị trí ngồi hay trải nghiệm trên xe không ạ?"
        );

      } catch (error: any) {
        console.error("🚨 Lỗi Groq AI Advisor:", error.message);
        finalReply = activeLocale === 'en'
          ? "Please call our Hotline 0565655360 directly so our staff can assist in choosing the best seat for you!"
          : "Dạ, anh/chị có thể gọi trực tiếp Hotline 0565655360 để nhân viên tư vấn vị trí ngồi tốt nhất cho mình nhé!";
      }
    }

    // --------------------------------------------------
    // TẦNG 6: FALLBACK CUỐI CÙNG (CODE THUẦN - BẮT LỖI KHÔNG HIỂU)
    // --------------------------------------------------
    if (!finalReply) {
      sourceType = 'database_rule'; // Đảm bảo gán lại source
      finalReply = activeLocale === 'en'
        ? `I apologize, I didn't quite get that. To help you quickly, please try the following examples:\n\n` +
          `🚌 **Book ticket:** "Find trips from Hanoi to Saigon tomorrow"\n` +
          `🎟️ **Cancel ticket:** "Cancel ticket [Your ticket code]"\n` +
          `💡 **Advice:** "Which seat is best if I get motion sick?"\n` +
          `📞 Or call our Hotline: **0565655360**.`
        : `Dạ, Trợ lý ABC chưa hiểu rõ ý anh/chị lắm. Để em hỗ trợ nhanh nhất, anh/chị có thể gõ theo các mẫu sau nhé:\n\n` +
          `🚌 **Mua vé:** "Tìm chuyến Hà Nội đi Sài Gòn ngày mai"\n` +
          `🎟️ **Hủy vé:** "Hủy vé [Mã vé của bạn]"\n` +
          `💡 **Tư vấn:** "Tôi hay say xe thì nên chọn ghế nào?"\n` +
          `📞 Hoặc gọi Hotline: **0565655360** ạ.`;
    }

    // --------------------------------------------------
    // LƯU TRỮ CACHE & LỊCH SỬ
    // --------------------------------------------------
    this.responseCache.set(cacheKey, { reply: finalReply, expireAt: now + 5 * 60 * 1000 }); 
    this.saveHistoryAsync(userId, message, finalReply).catch(err => 
      console.error("Lỗi lưu lịch sử chat:", err)
    );

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
      'tp.hcm': 'hồ chí minh', 'tphcm': 'hồ chí minh', 'saigon': 'hồ chí minh',
      'sai gon': 'hồ chí minh', 'ho chi minh': 'hồ chí minh',
      'dl': 'đà lạt', 'hn': 'hà nội', 'vt': 'vũng tàu',
      'đn': 'đà nẵng', 'dn': 'đà nẵng', 'ct': 'cần thơ', 'nt': 'nha trang',
      'hanoi': 'hà nội', 'ha noi': 'hà nội',
      'dalat': 'đà lạt', 'da lat': 'đà lạt',
      'nhatrang': 'nha trang', 'nha trang': 'nha trang',
      'vungtau': 'vũng tàu', 'vung tau': 'vũng tàu',
      'danang': 'đà nẵng', 'da nang': 'đà nẵng',
      'cantho': 'cần thơ', 'can tho': 'cần thơ',
      'pt': 'phan thiết', 'phanthiet': 'phan thiết', 'phan thiet': 'phan thiết'
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
    const keywords = ['hủy', 'huỷ', 'đổi', 'trả vé', 'hoàn tiền', 'đổi chuyến', 'cancel', 'refund', 'change ticket'];
    return keywords.some(kw => msg.includes(kw));
  }

  private async handleCancellationQuery(msg: string, userId?: string, locale?: string): Promise<string> {
    // 🟢 Nhận diện hành động hủy cùng mã số 10-15 chữ số (hỗ trợ cả tiếng Việt không dấu/có dấu và tiếng Anh)
    const directMatch = msg.match(/(h(?:u|ủ|uy|uỷ|ủy)|cancel|refund)(?:[\s:]*(?:v(?:é|e)|m(?:ã|a)|đ(?:ơ|o)n|don|chuy(?:ế|e)n|ticket|order))?[\s:]*([0-9]{10,15})/i);
    let targetCode = directMatch ? directMatch[2].toUpperCase() : null;
  
    const isConfirming = msg.includes('ok h') || msg.includes('xác nhận') || msg.includes('chắc chắn') || msg.includes('hủy giúp mình') || msg.includes('huỷ giúp mình') || msg.includes('ok cancel') || msg.includes('confirm') || msg.includes('yes') || msg.includes('cancel it');
  
    if (!targetCode && userId && isConfirming) {
      const recentChats = await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 6
      });
      for (const chat of recentChats) {
        const match = chat.content.match(/(vé|mã|đơn|ticket|order)[\s:]*([0-9]{10,15})/i);
        if (match && match[2]) {
          targetCode = match[2].toUpperCase();
          break;
        }
      }
    }
  
    // 2. Nếu không tìm thấy mã vé
    if (!targetCode) {
      return locale === 'en'
        ? `To cancel or change your ticket, please provide your ticket code in this format:\n**Cancel ticket [Ticket Code]** (e.g., Cancel ticket AB1234)\n\nYou can also do this directly in the "Ticket Search" section on our website.`
        : `Dạ, để hủy hoặc đổi vé, anh/chị vui lòng cung cấp mã vé theo cú pháp:\n**Hủy vé [Mã vé]** (Ví dụ: Hủy vé AB1234)\n\nHoặc anh/chị có thể thao tác trực tiếp trong mục "Tra Cứu Vé  " trên website ạ.`;
    }
  
    // 3. Lấy thông tin vé từ Database (Cần lấy cả Email/Phone để truyền vào Service hủy)
    const order = await this.prisma.order.findUnique({ 
      where: { orderCode: targetCode },
      include: { user: true } // Lấy kèm thông tin user để lấy email nếu cần
    });
  
    if (!order) {
      return locale === 'en'
        ? `I could not find ticket code **${targetCode}** in our system. Please check the code and try again!`
        : `Dạ em không tìm thấy mã vé **${targetCode}** trên hệ thống. Anh/chị kiểm tra lại mã giúp em nhé!`;
    }
  
    if (order.bookingStatus === 'CANCELLED') {
      return locale === 'en'
        ? `Ticket **${targetCode}** has already been cancelled. The refund will be processed according to our policy.`
        : `Dạ vé **${targetCode}** đã được hủy từ trước rồi ạ. Tiền sẽ được hoàn về theo chính sách của nhà xe.`;
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
        return locale === 'en'
          ? `✅ **${result.message}**. Ticket **${targetCode}** has been successfully set to **Cancelled**. You can check it under "Cancelled Tickets" in your Booking History page!`
          : `✅ **${result.message}**. Vé **${targetCode}** đã được chuyển sang trạng thái **Đã hủy**. Anh/chị có thể kiểm tra lại trong mục "Vé đã hủy" tại trang Lịch sử nhé!`;
      
      } catch (error: any) {
        const errorMsg = error.response?.message || error.message || (locale === 'en' ? "Could not fulfill request." : "Không thể thực hiện yêu cầu.");
        return locale === 'en'
          ? `❌ **Notice: Ticket not eligible for cancellation** ${errorMsg}`
          : `❌ **Thông báo: Vé không đủ điều kiện** ${errorMsg}`;
      }
    } else {
      // Bước yêu cầu xác nhận và cảnh báo chính sách
      if (locale === 'en') {
        let reply = `I have found ticket **${targetCode}** (${order.outboundFromSnapshot} ➔ ${order.outboundToSnapshot}).\n`;
        reply += `⚠️ **Note:** Cancellation is subject to our refund policy (100% refund if >24h, 50% if 12-24h, and **non-cancellable if under 12h**).\n\n`;
        reply += `Are you sure you want to cancel? If yes, please reply:\n👉 **Ok cancel it for me**`;
        return reply;
      } else {
        let reply = `Dạ em đã tìm thấy vé **${targetCode}** (${order.outboundFromSnapshot} ➔ ${order.outboundToSnapshot}).\n`;
        reply += `⚠️ **Lưu ý:** Việc hủy vé sẽ áp dụng chính sách hoàn tiền (100% nếu >24h, 50% nếu từ 12-24h, và **không thể hủy nếu dưới 12h**).\n\n`;
        reply += `Anh/chị có chắc chắn muốn hủy không? Nếu có, vui lòng nhắn:\n👉 **Ok hủy giúp mình**`;
        return reply;
      }
    }
  }
  // --------------------------------------------------

  private isAskingAboutNews(msg: string): boolean {
    const keywords = ['khuyến mãi', 'ưu đãi', 'tin tức', 'giảm giá', 'chương trình', 'voucher mới', 'promotion', 'news', 'discount', 'voucher'];
    return keywords.some(kw => msg.includes(kw));
  }

  private handleNewsQuery(locale?: string): string {
    if (locale === 'en') {
      let reply = `📣 **Latest News & Offers from ABC Bus:**\n\n`;
      reply += `🔹 **New Member Offer:** Get 10% off your first trip when registering an account.\n`;
      reply += `🔹 **Loyalty Points:** Earn reward points after every journey to redeem great Vouchers.\n`;
      reply += `\n👉 View details of other promotions under the **NEWS** tab on our website!`;
      return reply;
    }
    let reply = `📣 **Tin tức & Ưu đãi mới nhất từ Nhà xe ABC:**\n\n`;
    reply += `🔹 **Ưu đãi thành viên mới:** Giảm ngay 10% cho chuyến đi đầu tiên khi đăng ký tài khoản.\n`;
    reply += `🔹 **Tích điểm đổi quà:** Nhận điểm thưởng sau mỗi chuyến đi để đổi Voucher cực chất.\n`;
    reply += `\n👉 Anh/chị xem chi tiết các chương trình khuyến mãi khác tại mục **TIN TỨC** trên menu website nhé!`;
    return reply;
  }

  private isAskingAboutPolicy(msg: string): boolean {
    const keywords = ['gửi hàng', 'chuyển phát', 'hàng hóa', 'thú cưng', 'chó mèo', 'xuất hóa đơn', 'đồ ăn', 'hành lý', 'vali', 'mang theo', 'luggage', 'baggage', 'pet', 'dog', 'cat', 'invoice', 'cargo', 'goods'];
    return keywords.some(kw => msg.includes(kw));
  }

  private handlePolicyQuery(msg: string, locale?: string): string {
    if (locale === 'en') {
      if (msg.includes('pet') || msg.includes('dog') || msg.includes('cat') || msg.includes('chó') || msg.includes('mèo') || msg.includes('thú cưng')) {
        return "We are sorry, but to ensure comfortable space for all passengers, ABC Bus does **not allow pets** in the passenger cabin. Thank you for your understanding!";
      }
      if (msg.includes('luggage') || msg.includes('baggage') || msg.includes('vali') || msg.includes('hành lý') || msg.includes('mang theo')) {
        return "🧳 **Luggage Regulations:**\nABC Bus allows each passenger to bring up to **20kg** of free luggage (including suitcases, small backpacks placed under the bus). For bulky luggage exceeding dimensions or weight, an additional cargo fee of 30,000đ - 50,000đ will apply depending on the item.";
      }
      if (msg.includes('cargo') || msg.includes('goods') || msg.includes('hàng') || msg.includes('chuyển phát') || msg.includes('gửi hàng')) {
        return "📦 **Cargo Shipment:**\nABC Bus offers cargo shipment services. Rates range from 50,000đ to 150,000đ depending on size and route. Please bring your items to the office 1 hour before departure for check and exact pricing!";
      }
      if (msg.includes('invoice') || msg.includes('hóa đơn')) {
        return "🧾 **VAT Invoice Request:**\nYes, we support VAT invoices. Please check the 'Request VAT Invoice' box during the checkout step, or contact our Hotline 0565655360 within 24 hours of completing your journey.";
      }
      return "For our detailed terms and policies, please check the 'Regulations' section on the website or call 0565655360 for direct support.";
    }

    if (msg.includes('chó') || msg.includes('mèo') || msg.includes('thú cưng')) {
      return "Dạ, để đảm bảo không gian chung, nhà xe ABC xin phép **không nhận chuyên chở thú cưng** trên khoang hành khách ạ. Mong anh/chị thông cảm!";
    }
    if (msg.includes('hành lý') || msg.includes('vali') || msg.includes('mang theo')) {
      return "🧳 **Quy định hành lý mang theo:**\nNhà xe ABC hỗ trợ hành khách mang theo hành lý miễn phí tối đa **20kg** mỗi người (bao gồm vali, balo nhỏ đặt dưới gầm xe). Đối với hành lý cồng kềnh vượt quá kích thước hoặc cân nặng quy định, nhà xe sẽ thu thêm phụ phí ký gửi từ 30.000đ - 50.000đ tùy loại ạ.";
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
    const keywords = ['hướng dẫn', 'cách đặt', 'làm sao để mua', 'cách thanh toán', 'cách nhập mã', 'thanh toán bằng gì', 'thanh toán qua đâu', 'guide', 'how to book', 'how to pay', 'payment method'];
    return keywords.some(kw => msg.includes(kw));
  }

  private handleGuideQuery(msg: string, locale?: string): string {
    if (locale === 'en') {
      if (msg.includes('pay') || msg.includes('thanh toán')) {
        return "💳 **Payment Methods & Guide:**\n\n" +
               "Currently, ABC Bus supports two secure and convenient online payment options:\n\n" +
               "1️⃣ **VNPAY Gateway:** Scan QR code via Mobile Banking app or pay with domestic ATM cards / international cards (Visa, Mastercard, JCB).\n" +
               "2️⃣ **MoMo E-wallet:** Quick payment via MoMo app.\n\n" +
               "_At the checkout step, select your preferred method. The system will automatically direct you to VNPAY or MoMo gateway to complete the payment safely!_";
      }
      if (msg.includes('voucher') || msg.includes('coupon') || msg.includes('code') || msg.includes('nhập mã')) {
        return "🎁 **How to use Vouchers:**\nAt the checkout info step (before payment), you will see the **'Promo Code'** input field. You can enter your voucher code there or select one from your voucher wallet!";
      }
      return "📱 **How to Book Tickets:**\nStep 1: Choose your Departure point, Destination, and Date on the homepage.\nStep 2: Choose a departure time that suits you.\nStep 3: Select your preferred seat on the layout.\nStep 4: Enter passenger details and complete payment via **VNPAY** or **MoMo**.\n\n_The system will send your E-ticket (order code) to your Email and display it under Booking History immediately!_";
    }

    if (msg.includes('thanh toán')) {
      return "💳 **Phương thức & Hướng dẫn thanh toán:**\n\n" +
             "Hiện tại Nhà xe ABC hỗ trợ hai phương thức thanh toán trực tuyến vô cùng an toàn và tiện lợi:\n\n" +
             "1️⃣ **Cổng thanh toán VNPAY:** Hỗ trợ quét mã QR qua ứng dụng Ngân hàng (Mobile Banking) hoặc thanh toán bằng thẻ ATM nội địa / thẻ quốc tế (Visa, Mastercard, JCB).\n" +
             "2️⃣ **Ví điện tử MoMo:** Hỗ trợ thanh toán nhanh bằng ứng dụng ví MoMo.\n\n" +
             "_Khi tới bước thanh toán cuối cùng, anh/chị chọn phương thức mong muốn. Hệ thống sẽ tự động chuyển sang cổng thanh toán VNPAY hoặc MoMo để hoàn tất an toàn 100% ạ!_";
    }
    if (msg.includes('nhập mã') || msg.includes('dùng voucher')) {
      return "🎁 **Cách dùng Voucher:**\nỞ bước điền thông tin hành khách cuối cùng (trước khi thanh toán), anh/chị sẽ thấy ô **'Nhập mã giảm giá'**. Anh/chị có thể nhập mã vào đó hoặc chọn mã đang có sẵn trong Ví Voucher của tài khoản nhé!";
    }
    return "📱 **Hướng dẫn đặt vé:**\nB1: Ở trang chủ, chọn Điểm đi, Điểm đến và Ngày khởi hành.\nB2: Chọn chuyến đi có giờ xuất phát phù hợp.\nB3: Chọn vị trí ghế trống trên sơ đồ.\nB4: Nhập thông tin liên hệ và tiến hành thanh toán trực tuyến qua **VNPAY** hoặc **MoMo**.\n\n_Hệ thống sẽ gửi vé điện tử (Mã đơn hàng) về Email và hiển thị trong Lịch sử mua vé ngay lập tức ạ!_";
  }

  private async handleOrderQuery(orderCode: string, locale?: string): Promise<string> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { orderCode } 
      });
  
      if (!order) {
        return locale === 'en'
          ? `I could not find ticket code **${orderCode}**. Please check your code and try again!`
          : `Dạ em không tìm thấy mã vé **${orderCode}**. Anh/chị kiểm tra lại mã giúp em nhé!`;
      }
  
      const statusMapVN: Record<string, string> = { HOLD: 'Đang giữ chỗ', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy', COMPLETED: 'Đã hoàn thành' };
      const payMapVN: Record<string, string> = { PENDING: 'Chưa thanh toán', PAID: 'Đã thanh toán', FAILED: 'Thanh toán thất bại' };

      const statusMapEN: Record<string, string> = { HOLD: 'Holding', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled', COMPLETED: 'Completed' };
      const payMapEN: Record<string, string> = { PENDING: 'Pending', PAID: 'Paid', FAILED: 'Payment Failed' };
  
      let reply = locale === 'en'
        ? `🎟️ **Ticket Info [${orderCode}]:**\n`
        : `🎟️ **Thông tin vé [${orderCode}]:**\n`;
      
      const statusText = locale === 'en' 
        ? (statusMapEN[order.bookingStatus] || order.bookingStatus) 
        : (statusMapVN[order.bookingStatus] || order.bookingStatus);
      
      const payText = locale === 'en'
        ? (payMapEN[order.paymentStatus] || order.paymentStatus)
        : (payMapVN[order.paymentStatus] || order.paymentStatus);

      reply += locale === 'en'
        ? `- Ticket Status: **${statusText}**\n`
        : `- Trạng thái vé: **${statusText}**\n`;
      
      reply += locale === 'en'
        ? `- Payment: **${payText}**\n`
        : `- Thanh toán: **${payText}**\n`;
      
      if (order.amount) {
        reply += locale === 'en'
          ? `- Total Amount: **${order.amount.toLocaleString('en-US')} VND**\n`
          : `- Tổng tiền: **${order.amount.toLocaleString('vi-VN')}đ**\n`;
      }
  
      if (order.paymentStatus === 'PENDING' && order.checkoutUrl) {
        reply += locale === 'en'
          ? `\n⚠️ Your ticket has not been paid. [Click here to proceed to payment](${order.checkoutUrl})`
          : `\n⚠️ Vé của anh/chị chưa được thanh toán. [Nhấn vào đây để tiếp tục thanh toán](${order.checkoutUrl})`;
      }
      return reply;
    } catch (err) {
      console.error("Lỗi tra cứu đơn hàng:", err);
      return locale === 'en'
        ? "The ticket lookup system is busy right now, please try again in a few minutes."
        : "Dạ hệ thống tra cứu mã vé đang bận, anh/chị vui lòng thử lại sau ít phút nhé.";
    }
  }

  private isAskingAboutBusDetails(msg: string): boolean {
    const keywords = [
      'đón ở đâu', 'trả ở đâu', 'bao lâu', 'loại xe', 'xe giường nằm', 'xe gì', 'mất mấy tiếng',
      'where to pick up', 'where to drop off', 'pickup point', 'dropoff point', 'how long', 'duration', 'bus type', 'sleeper bus', 'what bus'
    ];
    return keywords.some(kw => msg.includes(kw));
  }

  private async handleBusDetailsQuery(msg: string, locale?: string): Promise<string> {
    const mentionedCities = this.supportedCities.filter(city => msg.includes(city));
    if (mentionedCities.length === 0) {
      return locale === 'en'
        ? "Which route would you like to know the pickup/drop-off stations for? (e.g., Saigon to Da Lat)"
        : "Dạ anh/chị muốn hỏi chi tiết trạm đón trả cho tuyến đường nào ạ? (VD: Sài Gòn đi Đà Lạt)";
    }

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

      if (!trip) {
        return locale === 'en'
          ? `I couldn't find detailed information for routes related to ${targetCity.toUpperCase()} yet.`
          : `Dạ em chưa tìm thấy thông tin chi tiết cho tuyến liên quan đến ${targetCity.toUpperCase()} ạ.`;
      }

      let reply = locale === 'en'
        ? `🚌 **Route info related to ${targetCity.toUpperCase()}:**\n`
        : `🚌 **Thông tin tuyến xe liên quan đến ${targetCity.toUpperCase()}:**\n`;
      
      if (trip.pickupPoint) {
        reply += locale === 'en'
          ? `- Regular pickup point: **${trip.pickupPoint}**\n`
          : `- Điểm đón khách thường xuyên: **${trip.pickupPoint}**\n`;
      }
      if (trip.dropoffPoint) {
        reply += locale === 'en'
          ? `- Drop-off point: **${trip.dropoffPoint}**\n`
          : `- Điểm trả khách: **${trip.dropoffPoint}**\n`;
      }
      if (trip.durationMinutes) {
        reply += locale === 'en'
          ? `- Estimated travel duration: about **${Math.round(trip.durationMinutes / 60)} hours**\n`
          : `- Thời gian di chuyển dự kiến: khoảng **${Math.round(trip.durationMinutes / 60)} tiếng**\n`;
      }
      reply += locale === 'en'
        ? `- Bus type: **${trip.busType || 'Premium Sleeper Bus'}**\n`
        : `- Loại xe: **${trip.busType || 'Giường nằm cao cấp'}**\n`;
      
      return reply;
    } catch (error) {
      return ""; 
    }
  }

  private cleanCityName(name: string): string {
    let cleaned = name.trim().toLowerCase();
    
    const noiseWords = [
      'hôm nay', 'ngày mai', 'ngày mốt', 'ngày kia', 'ngày', 'hôm',
      'today', 'tomorrow', 'tonight',
      'khứ hồi', 'một chiều', '1 chiều', '2 chiều', 'đi về', 'đi và về', 'roundtrip', 'round trip', 'oneway', 'one way',
      'giá rẻ', 'giá', 'vé', 'chuyến', 'lịch trình', 'giờ', 'mấy giờ',
      'sáng', 'trưa', 'chiều', 'tối', 'đêm', 'khuya', 'tìm', 'cho', 'hỏi', 'có', 'không'
    ];
    
    let changed = true;
    while (changed) {
      changed = false;
      for (const word of noiseWords) {
        // End of string
        const endRegex = new RegExp(`\\s+${word}$`, 'i');
        if (endRegex.test(cleaned)) {
          cleaned = cleaned.replace(endRegex, '').trim();
          changed = true;
        }
        // Start of string
        const startRegex = new RegExp(`^${word}\\s+`, 'i');
        if (startRegex.test(cleaned)) {
          cleaned = cleaned.replace(startRegex, '').trim();
          changed = true;
        }
        // Isolated noise word
        if (cleaned === word) {
          cleaned = '';
          changed = true;
        }
      }
      
      const dateRegexes = [
        /\bngày\s+\d{1,2}[\/\-]\d{1,2}\b/g,
        /\b\d{1,2}[\/\-]\d{1,2}\b/g,
        /\bngày\s+\d{1,2}\b/g
      ];
      for (const r of dateRegexes) {
        if (r.test(cleaned)) {
          cleaned = cleaned.replace(r, '').trim();
          changed = true;
        }
      }
    }

    cleaned = cleaned.replace(/^[^a-zđàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹđ]+/i, '');
    cleaned = cleaned.replace(/[^a-zđàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹđ]+$/i, '');
    
    return cleaned.trim();
  }

  private extractCitiesFromMessage(normalizedMsg: string): { from: string; to: string } | null {
    // Regex 1: Matches "[Prefix] [From] đi/đến [To]"
    const regex1 = /(?:tìm chuyến|mua vé|đặt vé|vé|chuyến|từ|đi từ)\s+([a-zđàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹđ\s\.\-]+)\s+(?:đi|đến|tới|sang|➔|->|\-|chiều)\s+([a-zđàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹđ\s\.\-]+)/i;
    let match = normalizedMsg.match(regex1);
    
    // Regex 2: Matches "[From] đi/đến [To]"
    if (!match) {
      const regex2 = /\b([a-zđàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹđ\s\.\-]+)\s+(?:đi|đến|tới|sang|➔|->|\-)\s+([a-zđàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹđ\s\.\-]+)/i;
      match = normalizedMsg.match(regex2);
    }

    if (match) {
      const from = this.cleanCityName(match[1]);
      const to = this.cleanCityName(match[2]);
      if (from && to && from !== to && from.length >= 2 && to.length >= 2) {
        return { from, to };
      }
    }
    return null;
  }

  private capitalizeCityName(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private isAskingAboutTrip(msg: string): boolean {
    const keywords = [
      'giá', 'vé', 'chuyến', 'mấy giờ', 'lịch trình', 'đi từ', 'đi đến', 'đặt vé', 'mua vé', 'book vé',
      'price', 'ticket', 'trip', 'schedule', 'book', 'buy'
    ];
    
    const mentionedCities = this.supportedCities.filter(city => msg.includes(city));
    const extracted = this.extractCitiesFromMessage(msg);
    
    return keywords.some(kw => msg.includes(kw)) || mentionedCities.length >= 2 || !!extracted;
  }

  private async formatTripReply(msg: string, locale?: string): Promise<string> {
    const normalizedMsg = msg.toLowerCase();
    
    // 1. Trích xuất Thành phố Đi và Đến bằng bộ phân tích thông minh
    let extracted = this.extractCitiesFromMessage(normalizedMsg);
    if (!extracted) {
      const cityPositions = this.supportedCities
        .map(city => ({ name: city, pos: normalizedMsg.indexOf(city) }))
        .filter(item => item.pos !== -1)
        .sort((a, b) => a.pos - b.pos);

      if (cityPositions.length < 2) return ""; 
      extracted = { from: cityPositions[0].name, to: cityPositions[1].name };
    }

    const fromCity = extracted.from;
    const toCity = extracted.to;

    // Kiểm tra xem tuyến đường này nhà xe có khai thác không
    const routeExists = await this.prisma.trip.count({
      where: {
        from: { contains: fromCity, mode: 'insensitive' },
        to: { contains: toCity, mode: 'insensitive' }
      }
    });

    if (routeExists === 0) {
      const capFrom = this.capitalizeCityName(fromCity);
      const capTo = this.capitalizeCityName(toCity);
      return locale === 'en'
        ? `I apologize, ABC Bus does not operate routes from **${capFrom}** to **${capTo}** at the moment.\n` +
          `👉 You can refer to the routes we are currently serving: **Hanoi, Saigon, Da Lat, Nha Trang, Vung Tau, Phan Thiet, Da Nang, Can Tho**.`
        : `Dạ, hiện tại nhà xe ABC chưa khai thác tuyến đường từ **${capFrom}** đi **${capTo}** ạ.\n` +
          `👉 Anh/chị có thể tham khảo các tuyến đường nhà xe đang phục vụ: **Hà Nội, Sài Gòn, Đà Lạt, Nha Trang, Vũng Tàu, Phan Thiết, Đà Nẵng, Cần Thơ**.`;
    }
    
    // 2. Trích xuất ngày từ câu chat
    const selectedDate = this.extractDate(normalizedMsg); 

    // Nếu khách quên nhập ngày -> Yêu cầu nhập ngày (Bảo vệ logic Code)
    if (!selectedDate) {
      return locale === 'en'
        ? `Which date would you like to travel from **${fromCity.toUpperCase()}** to **${toCity.toUpperCase()}**? (e.g., tomorrow, 20/04, today...)`
        : `Dạ, anh/chị muốn tìm chuyến từ **${fromCity.toUpperCase()}** đi **${toCity.toUpperCase()}** vào **ngày nào** ạ? (Ví dụ: ngày mai, 20/04, hôm nay...)`;
    }

    // --- ĐỊNH NGHĨA CÁC BIẾN CÒN THIẾU MÀ BẠN ĐANG BÁO LỖI ---
    const displayDate = new Date(selectedDate).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const isRoundTrip = normalizedMsg.includes('khứ hồi') || normalizedMsg.includes('đi và về') || normalizedMsg.includes('2 chiều') || normalizedMsg.includes('roundtrip') || normalizedMsg.includes('round trip');
  
    // 3. Truy vấn cơ sở dữ liệu
    const dbResult = await this.findTripsDB(fromCity, toCity, selectedDate); 
  
    if (dbResult.error) return dbResult.error;
    
    if (!dbResult.trips || dbResult.trips.length === 0) {
      return locale === 'en'
        ? `I apologize, currently I couldn't find any trips from **${fromCity.toUpperCase()}** to **${toCity.toUpperCase()}** on **${displayDate}**. Please choose another date!`
        : `Dạ, hiện tại em không tìm thấy chuyến nào từ **${fromCity.toUpperCase()}** đi **${toCity.toUpperCase()}** trong ngày **${displayDate}**. Anh/chị chọn ngày khác giúp em nhé!`;
    }
  
    let reply = locale === 'en'
      ? `🚌 Trips from **${fromCity.toUpperCase()}** to **${toCity.toUpperCase()}** on **${displayDate}**:\n\n`
      : `🚌 Dạ, các chuyến **${fromCity.toUpperCase()}** đi **${toCity.toUpperCase()}** ngày **${displayDate}**:\n\n`;
    
    dbResult.trips.forEach(trip => {
      const time = trip.departDate.toLocaleTimeString(locale === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
      const price = trip.price 
        ? (locale === 'en' ? trip.price.toLocaleString('en-US') + ' VND' : trip.price.toLocaleString('vi-VN') + 'đ')
        : (locale === 'en' ? 'Updating' : 'Đang cập nhật');
      
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

      const bookingLink = `/chair?${params.toString()}`;
  
      reply += locale === 'en'
        ? `- **${time}** | Price: **${price}** | Pickup: ${trip.pickupPoint}\n`
        : `- **${time}** | Giá: **${price}** | Đón: ${trip.pickupPoint}\n`;
      
      reply += locale === 'en'
        ? `👉 [Click here to CHOOSE SEATS for departure at ${time}](${bookingLink})\n\n`
        : `👉 [Nhấn vào đây để CHỌN GHẾ chuyến ${time}](${bookingLink})\n\n`;
    });
  
    // 4. Xử lý hiển thị chiều về nếu khách hỏi khứ hồi
    if (isRoundTrip) {
      reply += locale === 'en'
        ? `🔄 And return trips from **${toCity.toUpperCase()}** to **${fromCity.toUpperCase()}**:\n\n`
        : `🔄 Và các chuyến chiều về **${toCity.toUpperCase()}** đi **${fromCity.toUpperCase()}**:\n\n`;
      
      const returnResult = await this.findTripsDB(toCity, fromCity, selectedDate);
      
      if (returnResult.trips && returnResult.trips.length > 0) {
        returnResult.trips.forEach(trip => {
          const time = trip.departDate.toLocaleTimeString(locale === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
          const price = trip.price 
            ? (locale === 'en' ? trip.price.toLocaleString('en-US') + ' VND' : trip.price.toLocaleString('vi-VN') + 'đ')
            : (locale === 'en' ? 'Updating' : 'Đang cập nhật');
          
          reply += locale === 'en'
            ? `- **${time}** | Price: **${price}** | Pickup: ${trip.pickupPoint}\n`
            : `- **${time}** | Giá: **${price}** | Đón: ${trip.pickupPoint}\n`;
        });
        
        reply += locale === 'en'
          ? `\n*(Please select seats for the outbound trip first, the system will automatically guide you to choose the return trip seats)*\n`
          : `\n*(Anh/chị vui lòng chọn ghế chiều đi ở trên trước, hệ thống sẽ tự động hướng dẫn chọn chiều về ạ)*\n`;
      } else {
        reply += locale === 'en'
          ? `- _I apologize, currently we do not have matching return trips on this date._\n`
          : `- _Dạ hiện tại nhà xe chưa có lịch chuyến về phù hợp trong ngày này ạ._\n`;
      }
    }
  
    return reply.trim();
  }

  private async formatProfileReply(userId: string, locale?: string): Promise<string> {
    const data = await this.getFullCustomerProfile(userId);

    if (!data) {
      return locale === 'en'
        ? "I couldn't find your account information in our system."
        : "Dạ, em không tìm thấy thông tin tài khoản của mình trên hệ thống ạ.";
    }

    const { profile, loyalty, bookingHistory } = data;

    let reply = locale === 'en'
      ? `👤 **Hello ${profile.name || 'passenger'}!**\n`
      : `👤 **Xin chào ${profile.name || 'anh/chị'}!**\n`;
    
    reply += locale === 'en'
      ? `✨ Tier: **${profile.totalTrips > 10 ? 'Gold Member' : 'Loyal Member'}**\n`
      : `✨ Hạng: **${profile.totalTrips > 10 ? 'Thành viên Vàng' : 'Thành viên Thân thiết'}**\n`;
    
    reply += locale === 'en'
      ? `💰 Accumulated Points: **${profile.points.toLocaleString('en-US')} points**\n`
      : `💰 Điểm tích lũy: **${profile.points.toLocaleString('vi-VN')}đ**\n`;
    
    reply += locale === 'en'
      ? `🎫 Total Trips: **${profile.totalTrips} trips**\n\n`
      : `🎫 Tổng chuyến đã đi: **${profile.totalTrips} chuyến**\n\n`;

    if (bookingHistory.length > 0) {
      const latest = bookingHistory[0]; 
      const departDate = latest.outboundTripDetails.depart 
        ? new Date(latest.outboundTripDetails.depart).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) 
        : (locale === 'en' ? 'Updating' : 'Đang cập nhật');
      const departTime = latest.outboundTripDetails.depart 
        ? new Date(latest.outboundTripDetails.depart).toLocaleTimeString(locale === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) 
        : '';

      reply += locale === 'en'
        ? `🕒 **Most Recent Trip [${latest.orderCode}]:**\n`
        : `🕒 **Chuyến gần nhất [${latest.orderCode}]:**\n`;
      
      const tripType = latest.route.type === 'Khứ hồi' 
        ? (locale === 'en' ? 'Round-trip' : 'Khứ hồi') 
        : (locale === 'en' ? 'One-way' : 'Một chiều');
      
      reply += locale === 'en'
        ? `📍 Route: ${latest.route.from} ➡️ ${latest.route.to} (${tripType})\n`
        : `📍 Tuyến: ${latest.route.from} ➡️ ${latest.route.to} (${latest.route.type})\n`;
      
      reply += locale === 'en'
        ? `⏰ Outbound Trip: **${departTime} - ${departDate}**\n`
        : `⏰ Chiều đi: **${departTime} - ${departDate}**\n`;
      
      if (latest.outboundTripDetails.pickup) {
        reply += locale === 'en'
          ? `🏢 Outbound Pickup: ${latest.outboundTripDetails.pickup}\n`
          : `🏢 Đón chiều đi: ${latest.outboundTripDetails.pickup}\n`;
      }
      
      if (latest.route.type === 'Khứ hồi' && latest.returnTripDetails) {
        const returnDate = latest.returnTripDetails.depart 
          ? new Date(latest.returnTripDetails.depart).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) 
          : (locale === 'en' ? 'Updating' : 'Đang cập nhật');
        const returnTime = latest.returnTripDetails.depart 
          ? new Date(latest.returnTripDetails.depart).toLocaleTimeString(locale === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) 
          : '';
        
        reply += locale === 'en'
          ? `⏰ Return Trip: **${returnTime} - ${returnDate}**\n`
          : `⏰ Chiều về: **${returnTime} - ${returnDate}**\n`;
        
        if (latest.returnTripDetails.pickup) {
          reply += locale === 'en'
            ? `🏢 Return Pickup: ${latest.returnTripDetails.pickup}\n`
            : `🏢 Đón chiều về: ${latest.returnTripDetails.pickup}\n`;
        }
      }
      
      if (latest.tickets.seatNumbers) {
        reply += locale === 'en'
          ? `💺 Seats: **${latest.tickets.seatNumbers}**\n`
          : `💺 Số ghế: **${latest.tickets.seatNumbers}**\n`;
      }
      
      const statusMapVN: Record<string, string> = { CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy', ARCHIVED: 'Đã hoàn thành', PENDING: 'Đang xử lý' };
      const statusMapEN: Record<string, string> = { CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled', ARCHIVED: 'Completed', PENDING: 'Pending' };
      const statusVal = latest.status.booking || 'PENDING';
      const statusText = locale === 'en' ? (statusMapEN[statusVal] || statusVal) : (statusMapVN[statusVal] || statusVal);
      
      reply += locale === 'en'
        ? `📝 Status: _${statusText}_\n\n`
        : `📝 Trạng thái: _${statusText}_\n\n`;
    }

    if (loyalty.availableVouchers.length > 0) {
      reply += locale === 'en'
        ? `🎁 **Your discount vouchers:**\n`
        : `🎁 **Voucher ưu đãi của anh/chị:**\n`;
      
      loyalty.availableVouchers.forEach(v => {
        reply += locale === 'en'
          ? `- Code **${v.code}**: Discount ${v.discount} (${v.title})\n`
          : `- Mã **${v.code}**: Giảm ${v.discount} (${v.title})\n`;
      });
    } else {
      reply += locale === 'en'
        ? `🎁 You don't have new vouchers at the moment. Keep earning points to redeem rewards!`
        : `🎁 Hiện tại anh/chị chưa có voucher mới. Hãy tích thêm điểm để đổi quà nhé!`;
    }

    reply += locale === 'en'
      ? `\n\n_Do you need any further assistance regarding your trip?_`
      : `\n\n_Anh/chị cần hỗ trợ gì thêm về chuyến đi không ạ?_`;

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
      console.log("ℹ️ Khách vãng lai chat, không lưu lịch sử vào CSDL.");
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
    const keywords = [
      'đã mua', 'từng mua', 'lịch sử', 'tôi đã', 'tổng cộng bao nhiêu vé',
      'history', 'booked', 'purchased', 'my trips', 'my tickets', 'past trips', 'past tickets', 'ticket history', 'order history'
    ];
    return keywords.some(kw => msg.includes(kw));
  }
    

  private isAskingAboutProfile(msg: string): boolean {
    if (['thì', 'nếu', 'cộng bao nhiêu', 'cách tính', 'làm sao để', 'quy định'].some(kw => msg.includes(kw))) {
      return false;
    }
    const keywords = [
      'điểm của tôi', 'voucher của tôi', 'có voucher nào', 'thông tin của tôi', 'xem điểm', 'điểm hiện tại', 'tôi có bao nhiêu điểm',
      'my points', 'my vouchers', 'do i have vouchers', 'my information', 'check points', 'current points', 'how many points'
    ];
    return keywords.some(kw => msg.includes(kw));
  }
    

  private async handleHistoryQuery(userId: string, msg: string, locale?: string): Promise<string> {
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
        return locale === 'en'
          ? "I couldn't find any successful booking history for you in our system."
          : "Dạ, hiện tại em chưa thấy anh/chị có lịch sử mua vé thành công nào trên hệ thống ạ.";
      }

      if (mentionedCities.length > 0) {
        const filteredOrders = orders.filter(o => 
          mentionedCities.some(city => o.from.toLowerCase().includes(city) || o.to.toLowerCase().includes(city))
        );

        if (filteredOrders.length === 0) {
          const cityNames = mentionedCities.map(c => c.toUpperCase()).join(' - ');
          return locale === 'en'
            ? `You haven't purchased any tickets for routes related to **${cityNames}** yet.`
            : `Dạ, anh/chị chưa mua vé nào cho tuyến có liên quan đến **${cityNames}** ạ.`;
        }

        const totalTickets = filteredOrders.reduce((sum, order) => sum + order.tickets, 0);
        const cityNames = mentionedCities.map(c => c.toUpperCase()).join(' - ');
        return locale === 'en'
          ? `Up to now, you have purchased a total of **${totalTickets} tickets** for routes related to **${cityNames}**.`
          : `Dạ, tính đến hiện tại anh/chị đã mua tổng cộng **${totalTickets} vé** cho các chuyến liên quan đến **${cityNames}** ạ.`;
      }

      const totalTickets = orders.reduce((sum, order) => sum + order.tickets, 0);
      return locale === 'en'
        ? `You have purchased a total of **${totalTickets} tickets** at ABC Bus. Thank you for always traveling with us! 🥰`
        : `Dạ, anh/chị đã mua tổng cộng **${totalTickets} vé** tại Nhà xe ABC. Cảm ơn anh/chị đã luôn đồng hành cùng nhà xe ạ! 🥰`;

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
  
    if (msg.includes('mai') || msg.includes('tomorrow')) {
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

    if (msg.includes('hôm nay') || msg.includes('today') || msg.includes('tonight')) {
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      return `${currentYear}-${mm}-${dd}`;
    }
  
    // ĐIỂM MẤU CHỐT: Nếu không thấy từ khóa ngày tháng, trả về null để bắt chatbot hỏi lại
    return null; 
  }

  private isEnglishMessage(msg: string): boolean {
    const normalized = msg.toLowerCase();
    
    // Check if it contains Vietnamese diacritics / accented characters (including 'đ')
    const hasVietnameseDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(normalized);
    if (hasVietnameseDiacritics) {
      return false;
    }

    // List of common English keywords/words
    const englishKeywords = [
      'find', 'search', 'book', 'buy', 'get', 'show', 'cancel', 'refund', 'change', 
      'ticket', 'order', 'trip', 'route', 'bus', 'price', 'how', 'what', 'where', 
      'when', 'why', 'can', 'do', 'want', 'need', 'please', 'hello', 'hi', 'thanks', 
      'thank', 'office', 'phone', 'address', 'pet', 'dog', 'cat', 'luggage', 'baggage', 
      'child', 'kid', 'baby', 'tomorrow', 'today', 'yesterday'
    ];

    return englishKeywords.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(normalized);
    });
  }

}