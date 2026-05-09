import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import axios from 'axios';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import nodeHtmlToImage from 'node-html-to-image';
import { OtpService } from '../otp/otp.service'; // Import service OTP
import {
  Prisma,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  TripDirection,
  TripType,
} from '@prisma/client';

type CreatePaymentDto = {
  tripType: 'oneway' | 'round';
  tickets: number;
  from: string;
  to: string;
  date: string;
  returnDate?: string;
  outboundTripId: number;
  returnTripId?: number;
  outboundSeats: string[];
  returnSeats?: string[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  price?: number;
  userId?: string;
  appliedPromoCode?: string; // Dữ liệu mã khuyến mãi gửi từ Frontend
  otp?: string;              // THÊM DÒNG NÀY ĐỂ NHẬN OTP
  paymentMethod?: 'MOMO' | 'VIETQR';
};

@Injectable()
export class PaymentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly otpService: OtpService, // Inject vào đây
  ) {}

  private calcTotalPrice(tickets: number, tripType: string, pricePerSeat: number) {
    return tripType === 'round'
      ? pricePerSeat * tickets * 2
      : pricePerSeat * tickets;
  }

  private signHmacSha256(rawSignature: string, secretKey: string) {
    return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
  }

  private normalizeVietnamPhone(phone?: string) {
    if (!phone) return '';
    let value = phone.trim().replace(/[\s.-]/g, '');
    if (value.startsWith('+84')) {
      value = '0' + value.slice(3);
    } else if (value.startsWith('84')) {
      value = '0' + value.slice(2);
    }
    return value;
  }

  private isValidVietnamMobile(phone?: string) {
    const normalized = this.normalizeVietnamPhone(phone);
    return /^(03|05|07|08|09)\d{8}$/.test(normalized);
  }

  async createPaymentLink(dto: CreatePaymentDto) {
    const customerName = dto.customerName?.trim() || '';
    const customerEmail = dto.customerEmail?.trim() || '';
    const normalizedPhone = this.normalizeVietnamPhone(dto.customerPhone);
    

    if (!customerName || !normalizedPhone || !customerEmail) {
      throw new BadRequestException('Vui lòng điền đầy đủ thông tin khách hàng');
    }

    if (!this.isValidVietnamMobile(normalizedPhone)) {
      throw new BadRequestException(
        'Số điện thoại không hợp lệ. Vui lòng nhập đúng số di động Việt Nam.',
      );
    }

    if (!dto.userId) {
      const isVerified = this.otpService.isEmailVerified(customerEmail);
      if (!isVerified) {
        throw new BadRequestException('Vui lòng xác thực Email trước khi thanh toán!');
      }
    }

    if (!dto.outboundSeats || dto.outboundSeats.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 ghế cho lượt đi');
    }

    // Giá `dto.price` từ Frontend truyền xuống bây giờ đã là TỔNG TIỀN CUỐI CÙNG (đã trừ khuyến mãi)
    const amount = Number(dto.price || 0);
    const totalSeatsCount = dto.outboundSeats.length + (dto.returnSeats?.length || 0);
    // Tính ngược lại giá trung bình mỗi ghế để lưu vào DB cho đẹp
    const pricePerSeat = totalSeatsCount > 0 ? Math.floor(amount / totalSeatsCount) : 0;

    const partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE');
    const accessKey = this.configService.get<string>('MOMO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MOMO_SECRET_KEY');
    const endpoint = this.configService.get<string>('MOMO_ENDPOINT');

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const backendUrl = this.configService.get<string>('BACKEND_URL');

    const orderCode = Date.now().toString().slice(-12);
    const requestId = `REQ_${orderCode}`;
    const momoOrderId = `TRIP_${orderCode}`;

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      
      // --- 1. KIỂM TRA MÃ KHUYẾN MÃI (LOYALTY) ---
      if (dto.appliedPromoCode) {
        if (!dto.userId) {
          throw new BadRequestException('Bạn cần đăng nhập để sử dụng mã ưu đãi!');
        }

        // Tìm xem user có sở hữu mã này và mã chưa được dùng không
        const userVoucher = await tx.userVoucher.findFirst({
          where: {
            userId: dto.userId,
            isUsed: false,
            voucher: { code: dto.appliedPromoCode },
          },
        });

        if (!userVoucher) {
          throw new BadRequestException('Mã ưu đãi không hợp lệ, đã hết hạn hoặc bạn không sở hữu mã này!');
        }
      }

      // --- 2. KIỂM TRA TRÙNG GHẾ LƯỢT ĐI ---
      const existingOutboundSeats = await tx.orderSeat.findMany({
        where: {
          tripId: dto.outboundTripId,
          seatNumber: { in: dto.outboundSeats },
          order: {
            paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PENDING] },
            bookingStatus: { not: BookingStatus.CANCELLED },
          },
        },
      });

      if (existingOutboundSeats.length > 0) {
        const takenSeats = existingOutboundSeats.map((s) => s.seatNumber).join(', ');
        throw new BadRequestException(
          `Rất tiếc, ghế Lượt đi (${takenSeats}) vừa có người khác nhanh tay chọn trước. Vui lòng chọn ghế khác!`,
        );
      }

      // --- 3. KIỂM TRA TRÙNG GHẾ LƯỢT VỀ ---
      if (dto.tripType === 'round' && dto.returnTripId && dto.returnSeats?.length) {
        const existingReturnSeats = await tx.orderSeat.findMany({
          where: {
            tripId: dto.returnTripId,
            seatNumber: { in: dto.returnSeats },
            order: {
              paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PENDING] },
              bookingStatus: { not: BookingStatus.CANCELLED },
            },
          },
        });

        if (existingReturnSeats.length > 0) {
          const takenSeats = existingReturnSeats.map((s) => s.seatNumber).join(', ');
          throw new BadRequestException(
            `Rất tiếc, ghế Lượt về (${takenSeats}) vừa có người khác nhanh tay chọn trước. Vui lòng chọn ghế khác!`,
          );
        }
      }

      const trip = await tx.trip.findUnique({
        where: { id: dto.outboundTripId },
      });

      if (!trip) {
        throw new BadRequestException('Không tìm thấy chuyến xe');
      }

      let returnTrip: any = null;
      if (dto.tripType === 'round' && dto.returnTripId) {
        returnTrip = await tx.trip.findUnique({
          where: { id: dto.returnTripId },
        });
      }

      // Kiểm tra 3 tiếng trước giờ khởi hành
      const MIN_BOOKING_MS = 3 * 60 * 60 * 1000; 
      const isWithinBookingWindow = trip.departDate.getTime() - Date.now() >= MIN_BOOKING_MS;

      if (!isWithinBookingWindow) {
        throw new BadRequestException('Chỉ được đặt vé trước giờ khởi hành ít nhất 3 tiếng');
      }

      // --- TẠO ORDER CHÍNH THỨC ---
      const order = await tx.order.create({
        data: {
          orderCode,
          requestId,
          momoOrderId,
          userId: dto.userId || null,
          customerName: customerName,
          customerPhone: normalizedPhone,
          customerEmail: customerEmail,
          tripType: dto.tripType as TripType,
          appliedPromoCode: dto.appliedPromoCode || null, // LƯU MÃ GIẢM GIÁ VÀO ORDER
          
          outboundTripId: dto.outboundTripId,
          returnTripId: dto.tripType === 'round' ? dto.returnTripId : null,

          from: dto.from,
          to: dto.to,

          date: trip.departDate,
          returnDate: returnTrip?.departDate || null,
          tickets: dto.tickets,
          amount,

          outboundFromSnapshot: trip.from,
          outboundToSnapshot: trip.to,
          outboundPriceSnapshot: trip.price,
          outboundBusTypeSnapshot: trip.busType,
          outboundDepartDateSnapshot: trip.departDate,
          outboundArrivalTimeSnapshot: trip.arrivalDate || trip.arrivalTime,
          outboundDurationMinutesSnapshot: trip.durationMinutes,
          outboundPickupPointSnapshot: trip.pickupPoint,
          outboundDropoffPointSnapshot: trip.dropoffPoint,
          outboundDistanceKmSnapshot: trip.distanceKm,

          returnFromSnapshot: returnTrip?.from,
          returnToSnapshot: returnTrip?.to,
          returnPriceSnapshot: returnTrip?.price,
          returnBusTypeSnapshot: returnTrip?.busType,
          returnDepartDateSnapshot: returnTrip?.departDate,
          returnArrivalTimeSnapshot: returnTrip?.arrivalDate || returnTrip?.arrivalTime,
          returnDurationMinutesSnapshot: returnTrip?.durationMinutes,
          returnPickupPointSnapshot: returnTrip?.pickupPoint,
          returnDropoffPointSnapshot: returnTrip?.dropoffPoint,
          returnDistanceKmSnapshot: returnTrip?.distanceKm,

          paymentMethod: dto.paymentMethod === 'VIETQR' ? PaymentMethod.VIETQR : PaymentMethod.MOMO,
          paymentStatus: PaymentStatus.PENDING,
          bookingStatus: BookingStatus.HOLD,
        },
      });

      // ========================================================
      // BƯỚC XỬ LÝ LỖI P2002: LÀM SẠCH DỮ LIỆU TRƯỚC KHI TẠO GHẾ
      // ========================================================
      
      // 1. Loại bỏ các mã ghế bị gửi trùng lặp từ Frontend (nếu có)
      const uniqueOutboundSeats = Array.from(new Set(dto.outboundSeats));
      const uniqueReturnSeats = dto.returnSeats ? Array.from(new Set(dto.returnSeats)) : [];

      // 2. Dọn dẹp "ghế rác": Xóa ngay các ghế cũ đang dính chặt vào các đơn hàng đã CANCELLED
      await tx.orderSeat.deleteMany({
        where: {
          OR: [
            {
              tripId: dto.outboundTripId,
              seatNumber: { in: uniqueOutboundSeats },
              order: { bookingStatus: BookingStatus.CANCELLED }
            },
            ...(dto.tripType === 'round' && dto.returnTripId && uniqueReturnSeats.length > 0 ? [{
              tripId: dto.returnTripId,
              seatNumber: { in: uniqueReturnSeats },
              order: { bookingStatus: BookingStatus.CANCELLED }
            }] : [])
          ]
        }
      });

      // 3. Tiến hành tạo ghế mới (lúc này CSDL đã hoàn toàn sạch sẽ)
      const seatsToCreate: Prisma.OrderSeatCreateManyInput[] = [
        ...uniqueOutboundSeats.map((seatNumber) => ({
          orderId: order.id,
          tripId: dto.outboundTripId,
          tripDirection: TripDirection.outbound,
          seatNumber,
          price: pricePerSeat,
        })),
        ...(dto.tripType === 'round' && dto.returnTripId && uniqueReturnSeats.length > 0
          ? uniqueReturnSeats.map((seatNumber) => ({
              orderId: order.id,
              tripId: dto.returnTripId!,
              tripDirection: TripDirection.return,
              seatNumber,
              price: pricePerSeat,
            }))
          : []),
      ];

      await tx.orderSeat.createMany({ data: seatsToCreate });

      return order;
    });

    // NẾU LÀ VIETQR
    if (dto.paymentMethod === 'VIETQR') {
      const bankBin = this.configService.get<string>('VIETQR_BANK_BIN') || '970422';
      const accountNo = this.configService.get<string>('VIETQR_ACCOUNT_NO') || '0123456789';
      const accountName = this.configService.get<string>('VIETQR_ACCOUNT_NAME') || 'NGUYEN VAN A';
      
      const qrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${amount}&addInfo=${orderCode}&accountName=${encodeURIComponent(accountName)}`;
      
      // Đặt thời gian hết hạn QR = 5 phút kể từ bây giờ
      const qrExpiredAt = new Date(Date.now() + 5 * 60 * 1000);

      await this.prisma.order.update({
        where: { id: createdOrder.id },
        data: { checkoutUrl: qrUrl, qrExpiredAt },
      });

      return { checkoutUrl: qrUrl, amount, orderCode, isVietQR: true, qrExpiredAt: qrExpiredAt.toISOString() };
    }

    // NẾU LÀ MOMO
    const redirectUrl = `${frontendUrl}/payment-success?orderCode=${orderCode}&amount=${amount}`;
    const ipnUrl = `${backendUrl}/api/payment/momo-ipn`;
    const extraData = Buffer.from(JSON.stringify({ orderCode })).toString('base64');
    
    const orderInfo = dto.tripType === 'round' 
      ? `Ve khu hoi ${dto.from}-${dto.to}` 
      : `Ve xe ${dto.from}-${dto.to}`;

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${momoOrderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=captureWallet`;

    const signature = this.signHmacSha256(rawSignature, secretKey!);

    try {
      const response = await axios.post(endpoint!, {
        partnerCode, accessKey, requestId, amount, orderId: momoOrderId, orderInfo, redirectUrl, ipnUrl, extraData, requestType: 'captureWallet', signature, lang: 'vi', autoCapture: true,
      });

      if (response.data.resultCode === 0) {
        await this.prisma.order.update({
          where: { id: createdOrder.id },
          data: { checkoutUrl: response.data.payUrl },
        });

        return { checkoutUrl: response.data.payUrl, amount, orderCode, isVietQR: false };
      }

      throw new BadRequestException(`MoMo Error: ${response.data.message}`);

    } catch (error: any) {
      console.error('MoMo Create Payment Error:', error.response?.data || error.message);
      await this.prisma.order.update({
        where: { id: createdOrder.id },
        data: { bookingStatus: BookingStatus.CANCELLED, paymentStatus: PaymentStatus.FAILED }
      });
      throw new InternalServerErrorException('Không thể kết nối tới cổng thanh toán MoMo');
    }
  }

  async handleMomoIpn(body: any) {
    const accessKey = this.configService.get<string>('MOMO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MOMO_SECRET_KEY');

    const {
      partnerCode, orderId, requestId, amount, orderInfo, orderType, transId, resultCode, message, payType, responseTime, extraData, signature,
    } = body;

    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const expectedSignature = this.signHmacSha256(rawSignature, secretKey!);

    if (expectedSignature !== signature) return { ok: false };

    const order = await this.prisma.order.findFirst({
      where: { OR: [{ momoOrderId: orderId }, { requestId }] },
    });

    if (!order) return { ok: false };

    if (Number(resultCode) === 0) {
      return this.processOrderSuccess(order.id, body);
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.FAILED,
        bookingStatus: BookingStatus.CANCELLED,
      },
    });

    return { ok: true };
  }

  // --- XỬ LÝ WEBHOOK SEPAY (VIETQR) ---
  async handleSepayIpn(body: any) {
    const { content, transferAmount, transferType, referenceCode } = body;

    // Chỉ xử lý tiền vào
    if (transferType !== 'in' && transferType !== 'CREDIT') return { ok: true };

    if (!content) return { ok: true };

    // Lấy tất cả các đơn hàng đang PENDING và thanh toán bằng VIETQR
    const pendingOrders = await this.prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.VIETQR,
      }
    });

    // Tìm xem Nội dung chuyển khoản có chứa mã đơn hàng nào không
    let matchedOrder: any = null;
    for (const order of pendingOrders) {
      if (content.includes(order.orderCode)) {
        matchedOrder = order;
        break;
      }
    }

    if (!matchedOrder) {
      console.log(`[SePay] Không tìm thấy đơn hàng phù hợp với nội dung: ${content}`);
      return { ok: true };
    }

    // Kiểm tra số tiền nhận được >= giá vé
    if (Number(transferAmount) >= matchedOrder.amount) {
      console.log(`[SePay] Khớp đơn hàng ${matchedOrder.orderCode}. Tiến hành xuất vé!`);
      return this.processOrderSuccess(matchedOrder.id, { transId: referenceCode || 'SEPAY' });
    } else {
      console.log(`[SePay] Đơn ${matchedOrder.orderCode} chuyển THIẾU TIỀN: Yêu cầu ${matchedOrder.amount}, Nhận ${transferAmount}`);
    }

    return { ok: true };
  }

  // --- XỬ LÝ SAU KHI THANH TOÁN THÀNH CÔNG (GỬI MAIL & TÍCH ĐIỂM) ---
  async processOrderSuccess(orderId: number, rawPayload: any) {
    // 1. KIỂM TRA XEM ĐƠN ĐÃ XỬ LÝ CHƯA ĐỂ TRÁNH NHÂN ĐÔI ĐIỂM VÀ MAIL
    const currentOrder = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!currentOrder || currentOrder.paymentStatus === PaymentStatus.PAID) {
      console.log(`Đơn hàng ${orderId} đã được xử lý trước đó. Bỏ qua.`);
      return { ok: true }; 
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        bookingStatus: BookingStatus.CONFIRMED,
        momoTransId: rawPayload.transId ? String(rawPayload.transId) : 'SYSTEM',
      },
      include: { 
        seats: true,
        outboundTrip: true,
        returnTrip: true
      },
    });

    // ... (Giữ nguyên toàn bộ phần Logic Loyalty và Gửi Mail bên dưới của bạn) ...

    // ==========================================
    // 1. LOGIC LOYALTY (CỘNG ĐIỂM & ĐỐT VOUCHER)
    // ==========================================
// ==========================================
    // 1. LOGIC LOYALTY (CHỈ ĐỐT VOUCHER ĐÃ DÙNG)
    // - Việc cộng điểm & chuyến đi sẽ do LoyaltyService lo khi xe chạy xong!
    // ==========================================
    if (order.userId) {
      try {
        // Nếu lúc thanh toán có áp dụng mã Voucher -> Đánh dấu là đã sử dụng
        if (order.appliedPromoCode) {
          const usedVoucher = await this.prisma.voucher.findUnique({ 
            where: { code: order.appliedPromoCode } 
          });
          if (usedVoucher) {
            // Tìm bản ghi sở hữu voucher chưa dùng của user này
            const userVoucherRecord = await this.prisma.userVoucher.findFirst({
              where: { userId: order.userId, voucherId: usedVoucher.id, isUsed: false }
            });
            if (userVoucherRecord) {
              await this.prisma.userVoucher.update({
                where: { id: userVoucherRecord.id },
                data: { isUsed: true }
              });
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi đốt voucher:', err);
      }
    }
    // ==========================================
    // 2. LOGIC TẠO ẢNH VÀ GỬI MAIL (GIỮ NGUYÊN)
    // ==========================================
    if (order.customerEmail) {
      try {
        const outboundSeatStrs = order.seats?.filter(s => s.tripDirection === TripDirection.outbound).map(s => s.seatNumber).join(', ') || '--';
        const returnSeatStrs = order.seats?.filter(s => s.tripDirection === TripDirection.return).map(s => s.seatNumber).join(', ');
        
        let seatDisplay = outboundSeatStrs;
        if (order.tripType === 'round' && returnSeatStrs) {
          seatDisplay = `Đi: ${outboundSeatStrs} | Về: ${returnSeatStrs}`;
        }

        const departAt = order.outboundDepartDateSnapshot || order.outboundTrip?.departDate || order.date;
        const arrivalAt = order.outboundArrivalTimeSnapshot || order.outboundTrip?.arrivalDate || order.outboundTrip?.arrivalTime || null;

        const returnDepartAt = order.returnDepartDateSnapshot || order.returnTrip?.departDate || order.returnDate;
        const returnArrivalAt = order.returnArrivalTimeSnapshot || order.returnTrip?.arrivalDate || order.returnTrip?.arrivalTime || null;

        const formatDateTime = (dateVal: any) => {
          if (!dateVal) return '--- | ---';
          const d = new Date(dateVal);
          const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const date = d.toLocaleDateString('vi-VN');
          return `${time} | ${date}`;
        };

        const departureFormatted = formatDateTime(departAt);
        const arrivalFormatted = formatDateTime(arrivalAt);
        const returnDepartureFormatted = formatDateTime(returnDepartAt);
        const returnArrivalFormatted = formatDateTime(returnArrivalAt);

        const totalPrice = Number(order.amount).toLocaleString('vi-VN');
        const busType = order.outboundBusTypeSnapshot || order.outboundTrip?.busType || 'LIMOUSINE';

        const ticketImageBuffer = (await nodeHtmlToImage({
          puppeteerArgs: { args: ['--no-sandbox'] },
          html: `
            <html>
              <head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                  * { box-sizing: border-box; }
                  body { 
                    font-family: 'Inter', system-ui, -apple-system, sans-serif; 
                    background: transparent;
                    margin: 0; 
                    padding: 20px;
                    width: 900px;
                  }
                  .ticket-container {
                    background: #ffffff;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                    overflow: hidden;
                    width: 100%;
                  }
                  .top-line {
                    height: 6px;
                    background-color: #EF5222;
                    width: 100%;
                  }
                  .content {
                    padding: 40px;
                  }
                  .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 40px;
                  }
                  .brand-name {
                    font-size: 24px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                  }
                  .brand-sub {
                    font-size: 10px;
                    font-weight: 600;
                    color: #94a3b8;
                    letter-spacing: 2px;
                    margin-top: 4px;
                    text-transform: uppercase;
                  }
                  .order-code-wrapper {
                    text-align: right;
                  }
                  .order-code-label {
                    font-size: 10px;
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                  }
                  .order-code-val {
                    font-size: 18px;
                    font-weight: 700;
                    color: #EF5222;
                    margin-top: 4px;
                    letter-spacing: 1px;
                  }
                  
                  .route-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 40px;
                  }
                  .route-point {
                    flex: 1;
                  }
                  .route-point.right {
                    text-align: right;
                  }
                  .route-label {
                    font-size: 11px;
                    color: #94a3b8;
                    font-weight: 600;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                  }
                  .route-city {
                    font-size: 22px;
                    font-weight: 700;
                    color: #1e293b;
                    text-transform: uppercase;
                  }
                  .route-arrow {
                    flex: 0 0 auto;
                    padding: 0 20px;
                    color: #fca5a5;
                    margin-top: 15px;
                  }
                  
                  .info-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 30px 20px;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 30px;
                  }
                  .info-col {
                    display: flex;
                    flex-direction: column;
                  }
                  .info-label {
                    font-size: 10px;
                    color: #94a3b8;
                    font-weight: 600;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                  }
                  .info-val {
                    font-size: 14px;
                    color: #334155;
                    font-weight: 600;
                  }
                  .info-sub {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 400;
                    margin-top: 4px;
                  }
                  .seat-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border: 1px solid #fed7aa;
                    color: #EF5222;
                    background: #fff7ed;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 13px;
                  }
                  .price-val {
                    font-size: 18px;
                    font-weight: 700;
                    color: #1e293b;
                  }
                  .price-val span {
                    color: #EF5222;
                    text-decoration: underline;
                    font-size: 15px;
                    margin-left: 2px;
                  }
                  .type-val {
                    color: #EF5222;
                    font-weight: 600;
                    text-transform: uppercase;
                  }
                  .status-val {
                    color: #10b981;
                    font-weight: 600;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                  }
                  .barcode-mock {
                    height: 35px;
                    width: 100px;
                    background-image: repeating-linear-gradient(to right, #334155, #334155 2px, transparent 2px, transparent 4px, #334155 4px, #334155 5px, transparent 5px, transparent 8px);
                    opacity: 0.8;
                    margin-top: 2px;
                  }
                </style>
              </head>
              <body>
                <div class="ticket-container">
                  <div class="top-line"></div>
                  <div class="content">
                    
                    <div class="header">
                      <div>
                        <div class="brand-name">NHÀ XE ABC</div>
                        <div class="brand-sub">VIP BOARDING PASS${order.tripType === 'round' ? ' (ROUND TRIP)' : ''}</div>
                      </div>
                      <div class="order-code-wrapper">
                        <div class="order-code-label">MÃ ĐẶT CHỖ</div>
                        <div class="order-code-val">#${order.orderCode}</div>
                      </div>
                    </div>

                    <div class="route-section">
                      <div class="route-point">
                        <div class="route-label">ĐIỂM ĐI</div>
                        <div class="route-city">${order.from}</div>
                      </div>
                      <div class="route-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="${order.tripType === 'round' ? 'M4 12h16M20 12l-6-6M20 12l-6 6 M4 16h16M4 16l6-6M4 16l6 6' : 'M4 12H20M20 12L14 6M20 12L14 18'}" stroke="#fca5a5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </div>
                      <div class="route-point right">
                        <div class="route-label">ĐIỂM ĐẾN</div>
                        <div class="route-city">${order.to}</div>
                      </div>
                    </div>

                    <div class="info-grid">
                      <div class="info-col">
                        <div class="info-label">XUẤT BẾN ${order.tripType === 'round' ? '(ĐI)' : ''}</div>
                        <div class="info-val">${departureFormatted}</div>
                      </div>
                      <div class="info-col">
                        <div class="info-label">HÀNH KHÁCH</div>
                        <div class="info-val">${order.customerName}</div>
                        <div class="info-sub">${order.customerPhone || ''}</div>
                      </div>
                      <div class="info-col">
                        <div class="info-label">SỐ GHẾ</div>
                        <div><span class="seat-badge">${seatDisplay}</span></div>
                      </div>
                      <div class="info-col">
                        <div class="info-label">TỔNG THANH TOÁN</div>
                        <div class="price-val">${totalPrice}<span>đ</span></div>
                      </div>

                      <div class="info-col">
                        <div class="info-label">ĐẾN NƠI (DỰ KIẾN) ${order.tripType === 'round' ? '(ĐI)' : ''}</div>
                        <div class="info-val">${arrivalFormatted}</div>
                      </div>
                      <div class="info-col">
                        <div class="info-label">LOẠI XE</div>
                        <div class="info-val type-val">${busType}</div>
                      </div>
                      <div class="info-col">
                        <div class="info-label">TRẠNG THÁI</div>
                        <div class="status-val">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          Đã thanh toán
                        </div>
                      </div>
                      <div class="info-col">
                         <div class="barcode-mock"></div>
                      </div>

                      ${order.tripType === 'round' ? `
                      <div class="info-col" style="border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 5px;">
                        <div class="info-label">XUẤT BẾN (VỀ)</div>
                        <div class="info-val">${returnDepartureFormatted}</div>
                      </div>
                      <div class="info-col" style="border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 5px;">
                        <div class="info-label">ĐẾN NƠI (VỀ)</div>
                        <div class="info-val">${returnArrivalFormatted}</div>
                      </div>
                      <div class="info-col" style="border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 5px;"></div>
                      <div class="info-col" style="border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 5px;"></div>
                      ` : ''}
                    </div>

                  </div>
                </div>
              </body>
            </html>
          `,
        })) as Buffer;

        const qrDataText =
          `Mã vé: ${order.orderCode}\n` +
          `Khách: ${order.customerName}\n` +
          `Ghế: ${seatDisplay}\n` +
          `Lộ trình: ${order.from}->${order.to}`;

        const qrCodeUrl = await QRCode.toDataURL(qrDataText, { width: 300 });

        await this.mailerService.sendMail({
          to: order.customerEmail,
          subject: `[VÉ ĐIỆN TỬ] XÁC NHẬN THÀNH CÔNG #${order.orderCode}`,
          html: `
            <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f8fafc; padding: 40px 20px;">
              <h2 style="color: #EF5222; margin-bottom: 20px;">XÁC NHẬN ĐẶT VÉ THÀNH CÔNG</h2>
              <p style="color: #475569; margin-bottom: 30px;">Cảm ơn bạn đã tin tưởng dịch vụ của Nhà xe ABC. Dưới đây là vé điện tử của bạn:</p>
              
              <img src="cid:ticket_image" style="width: 100%; max-width: 800px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" alt="Vé xe điện tử" />
              
              <div>
                <p style="font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase;">Mã QR Check-in</p>
                <img src="cid:qr_image" style="width: 150px; border-radius: 8px; border: 1px solid #e2e8f0; padding: 5px; background: white;" alt="QR Code" />
              </div>
              
              <div style="margin-top: 30px; padding: 15px; background: #fff7ed; color: #ea580c; border-radius: 8px; display: inline-block; font-size: 13px; border: 1px solid #ffedd5;">
                <strong>Lưu ý:</strong> Vui lòng có mặt tại bến trước 30 phút so với giờ khởi hành.
              </div>
            </div>
          `,
          attachments: [
            {
              filename: `ve-xe-${order.orderCode}.png`,
              content: ticketImageBuffer,
              cid: 'ticket_image',
            },
            {
              filename: 'qr.png',
              content: qrCodeUrl.split('base64,')[1],
              encoding: 'base64',
              cid: 'qr_image',
            },
          ],
        });
      } catch (err) {
        console.error('Lỗi gửi mail:', err);
      }
    }

    return { ok: true };
  }

  async getBookedSeats(tripId: number) {
    // 1. Lấy danh sách ghế ĐÃ BÁN (giữ nguyên logic cũ của bạn)
    const seats = await this.prisma.orderSeat.findMany({
      where: {
        tripId,
        order: {
          paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PENDING] },
          bookingStatus: { not: BookingStatus.CANCELLED },
        },
      },
      select: { seatNumber: true },
    });
    const bookedSeatNumbers = seats.map((s) => s.seatNumber);
    // 2. Lấy danh sách ghế ĐÃ KHÓA từ bảng Trip
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { lockedSeats: true } // Chỉ lấy cột lockedSeats cho nhẹ
    });
    // Ép kiểu để TypeScript không báo lỗi nếu lockedSeats là JSON/Array
    const lockedSeatNumbers = (trip as any)?.lockedSeats || [];
    // 3. 🟢 TRẢ VỀ CẢ 2 MẢNG CHO FRONTEND
    return {
      bookedSeats: bookedSeatNumbers,
      lockedSeats: lockedSeatNumbers
    };
  }

  async verifyTicket(orderCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: { 
        seats: true,
        outboundTrip: true,
        returnTrip: true
      },
    });

    if (!order) return { success: false, message: 'Vé không tồn tại!' };

    return {
      success: order.paymentStatus === 'PAID',
      message: order.paymentStatus === 'PAID' ? 'Vé hợp lệ!' : 'Vé chưa thanh toán!',
      data: order,
    };
  }
// ==========================================
  // HÀM NHẢ GHẾ KHI KHÁCH ẤN HỦY THANH TOÁN MOMO
  // ==========================================
  async markPaymentFailedLocal(orderCode: string) {
    const order = await this.prisma.order.findUnique({ where: { orderCode } });

    if (!order) return { success: false, message: 'Đơn hàng không tồn tại' };

    if (order.paymentStatus === PaymentStatus.PAID) {
      return { success: false, message: 'Đơn hàng đã được thanh toán' };
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.FAILED,
        bookingStatus: BookingStatus.CANCELLED,
      },
    });

    return { success: true, message: 'Đã hủy giao dịch và giải phóng ghế!' };
  }
  async verifyAndSendMailLocal(orderCode: string) {
    const order = await this.prisma.order.findUnique({ where: { orderCode } });

    if (!order) return { success: false, message: 'Đơn hàng không tồn tại' };

    await this.processOrderSuccess(order.id, { transId: 'LOCAL_TEST' });
    return { success: true, message: 'Đã xác nhận và gửi mail!' };
  }

  async getOrderByCode(orderCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: { 
        seats: true,
        outboundTrip: true,
        returnTrip: true 
      },
    });

    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng');
    return order;
  }

  async getOrderHistory(userId: string) {
    return this.prisma.order.findMany({
      where: {
        userId,
        paymentStatus: PaymentStatus.PAID,
      },
      include: { 
        seats: true,
        outboundTrip: true,
        returnTrip: true 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- POLLING: KIỂM TRA TRẠNG THÁI THANH TOÁN ---
  async getPaymentStatus(orderCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      select: { paymentStatus: true, qrExpiredAt: true, orderCode: true, id: true },
    });

    if (!order) return { status: 'NOT_FOUND', isPaid: false };

    const isPaid = order.paymentStatus === PaymentStatus.PAID;
    const isExpired = order.qrExpiredAt ? new Date() > order.qrExpiredAt : false;

    return {
      status: order.paymentStatus,
      isPaid,
      isExpired,
      qrExpiredAt: order.qrExpiredAt?.toISOString() ?? null,
    };
  }
}