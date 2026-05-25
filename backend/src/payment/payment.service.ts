import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import axios from 'axios';
import * as crypto from 'crypto';
import * as qs from 'qs';
import * as QRCode from 'qrcode';
import nodeHtmlToImage from 'node-html-to-image';
import { OtpService } from '../otp/otp.service'; // Import service OTP
import PayOS from '@payos/node';
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
  paymentMethod?: 'MOMO' | 'VIETQR' | 'VNPAY';
};

@Injectable()
export class PaymentService {
  private payos: any = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly otpService: OtpService, // Inject vào đây
  ) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID');
    const apiKey = this.configService.get<string>('PAYOS_API_KEY');
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');

    if (clientId && apiKey && checksumKey) {
      this.payos = new (PayOS as any)(clientId, apiKey, checksumKey);
    }
  }

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
    const backendUrl = this.configService.get<string>('BACKEND_URL')
      || this.configService.get<string>('BASE_URL')
      || 'http://localhost:3001';

    const orderCode = Date.now().toString().slice(-12);
    const requestId = `REQ_${orderCode}`;
    const momoOrderId = `TRIP_${orderCode}`;

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // --- 1. KIỂM TRA MÃ KHUYẾN MÃI (LOYALTY) ---
      let userVoucherRecord: any = null;
      if (dto.appliedPromoCode) {
        if (!dto.userId) {
          throw new BadRequestException('Bạn cần đăng nhập để sử dụng mã ưu đãi!');
        }

        userVoucherRecord = await tx.userVoucher.findFirst({
          where: {
            userId: dto.userId,
            isUsed: false,
            voucher: { code: dto.appliedPromoCode },
          },
          include: { voucher: true },
        });

        if (!userVoucherRecord) {
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

      // --- TÍNH TOÁN VÀ XÁC THỰC GIÁ VÉ BẢO MẬT (Pricing Security) ---
      const outboundPrice = trip.price || 0;
      const outboundBasePrice = outboundPrice * dto.outboundSeats.length;

      let returnPrice = 0;
      let returnBasePrice = 0;
      if (dto.tripType === 'round' && returnTrip) {
        returnPrice = returnTrip.price || 0;
        returnBasePrice = returnPrice * (dto.returnSeats?.length || 0);
      }

      const totalBasePrice = outboundBasePrice + returnBasePrice;

      let discount = 0;
      if (userVoucherRecord && userVoucherRecord.voucher) {
        const voucher = userVoucherRecord.voucher;
        if (voucher.type === 'percent') {
          discount = Math.floor(totalBasePrice * (voucher.value / 100));
          if (voucher.maxAmount) {
            discount = Math.min(discount, voucher.maxAmount);
          }
        } else {
          discount = voucher.value || 0;
        }
      }

      const calculatedAmount = Math.max(totalBasePrice - discount, 0);

      // Cho phép sai lệch tối đa 1000đ do làm tròn tiền
      if (Math.abs(amount - calculatedAmount) > 1000) {
        throw new BadRequestException(
          `Phát hiện sai lệch giá vé bảo mật! Số tiền thanh toán đúng phải là: ${calculatedAmount.toLocaleString()}đ`
        );
      }

      // --- TẠO ORDER CHÍNH THỨC ---
      // 🟢 BẢO VỆ CHUẨN XÁC: Lấy max ID hiện tại để tránh lỗi desync auto-increment sequence khi có dữ liệu seed
      const maxOrder = await tx.order.aggregate({ _max: { id: true } });
      const nextOrderId = (maxOrder._max.id || 0) + 1;

      const order = await tx.order.create({
        data: {
          id: nextOrderId,
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

          paymentMethod: dto.paymentMethod === 'VIETQR' 
            ? PaymentMethod.VIETQR 
            : dto.paymentMethod === 'VNPAY' 
              ? ('VNPAY' as any) 
              : PaymentMethod.MOMO,
          paymentStatus: PaymentStatus.PENDING,
          bookingStatus: BookingStatus.HOLD,
          // VNPAY cần 20 phút (user có thể mất thời gian điền thẻ trên trang VNPAY)
          // MoMo/VietQR giữ 5 phút là đủ
          qrExpiredAt: new Date(Date.now() + (dto.paymentMethod === 'VNPAY' ? 20 : 5) * 60 * 1000),
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
      const maxOrderSeat = await tx.orderSeat.aggregate({ _max: { id: true } });
      let nextOrderSeatId = (maxOrderSeat._max.id || 0) + 1;

      const seatsToCreate: Prisma.OrderSeatCreateManyInput[] = [
        ...uniqueOutboundSeats.map((seatNumber) => ({
          id: nextOrderSeatId++,
          orderId: order.id,
          tripId: dto.outboundTripId,
          tripDirection: TripDirection.outbound,
          seatNumber,
          price: pricePerSeat,
        })),
        ...(dto.tripType === 'round' && dto.returnTripId && uniqueReturnSeats.length > 0
          ? uniqueReturnSeats.map((seatNumber) => ({
              id: nextOrderSeatId++,
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



    // NẾU LÀ VNPAY
    if (dto.paymentMethod === 'VNPAY') {
      const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE')?.trim() || 'Q1KR1AMG';
      const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET')?.trim() || 'WRN691BQUBKYT8LZGCSJFB4VBZKGPAKS';
      let vnpUrl = this.configService.get<string>('VNPAY_URL')?.trim() || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
      const returnUrl = `${backendUrl}/api/payment/vnpay-return`;
      console.log('[VNPAY DEBUG] backendUrl:', backendUrl, '| returnUrl:', returnUrl);

      const date = new Date();
      const createDateStr = this.formatVnpDate(date);
      date.setMinutes(date.getMinutes() + 15);
      const expireDateStr = this.formatVnpDate(date);

      let vnp_Params: any = {};
      vnp_Params['vnp_Version'] = '2.1.0';
      vnp_Params['vnp_Command'] = 'pay';
      vnp_Params['vnp_TmnCode'] = tmnCode;
      vnp_Params['vnp_Locale'] = 'vn';
      vnp_Params['vnp_CurrCode'] = 'VND';
      vnp_Params['vnp_TxnRef'] = orderCode;
      vnp_Params['vnp_OrderInfo'] = `ThanhToanDonHang${orderCode}`;
      vnp_Params['vnp_OrderType'] = 'other';
      vnp_Params['vnp_Amount'] = amount * 100;
      vnp_Params['vnp_ReturnUrl'] = returnUrl;
      vnp_Params['vnp_IpAddr'] = '127.0.0.1';
      vnp_Params['vnp_CreateDate'] = createDateStr;

      vnp_Params = this.sortObject(vnp_Params);

      const signData = qs.stringify(vnp_Params, { encode: false });
      const hmac = crypto.createHmac('sha512', secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      vnp_Params['vnp_SecureHash'] = signed;
      vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

      console.log('[VNPAY DEBUG] signData:', signData);
      console.log('[VNPAY DEBUG] signed:', signed);
      console.log('[VNPAY DEBUG] vnpUrl:', vnpUrl);

      await this.prisma.order.update({
        where: { id: createdOrder.id },
        data: { checkoutUrl: vnpUrl },
      });

      return { checkoutUrl: vnpUrl, amount, orderCode, isVietQR: false, isVnpay: true };
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

    await this.prisma.orderSeat.deleteMany({ where: { orderId: order.id } });
    await this.prisma.order.delete({ where: { id: order.id } });

    return { ok: true };
  }
  async sendTicketEmail(order: any) {
    if (!order.customerEmail) return;
    const emailRecipient = order.customerEmail;
    try {
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

          const isRoundTrip = order.tripType === 'round';
          const ticketHeight = isRoundTrip ? 640 : 510;

          const ticketImageBuffer = (await nodeHtmlToImage({
            puppeteerArgs: {
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
              defaultViewport: {
                width: 840,
                height: ticketHeight,
              }
            },
            html: `
              <html>
                <head>
                  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                  <style>
                    * { box-sizing: border-box; }
                    body { 
                      font-family: 'Inter', system-ui, -apple-system, sans-serif; 
                      background: #f1f5f9;
                      margin: 0; 
                      padding: 20px;
                      width: 840px;
                    }
                    .ticket {
                      background: #ffffff;
                      border-radius: 20px;
                      border: 1px solid #e2e8f0;
                      box-shadow: 0 15px 35px rgba(15, 23, 42, 0.05);
                      overflow: hidden;
                      width: 800px;
                      position: relative;
                    }
                    .ticket-header {
                      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                      padding: 24px 32px;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      color: #ffffff;
                    }
                    .brand {
                      display: flex;
                      align-items: center;
                      gap: 10px;
                    }
                    .brand-logo {
                      font-size: 24px;
                    }
                    .brand-text {
                      font-size: 20px;
                      font-weight: 800;
                      letter-spacing: 1px;
                    }
                    .ticket-type {
                      font-size: 11px;
                      font-weight: 700;
                      letter-spacing: 1.5px;
                      opacity: 0.9;
                      text-transform: uppercase;
                    }
                    .ticket-body {
                      padding: 32px;
                      background: #ffffff;
                    }
                    .route-container {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      margin-bottom: 24px;
                    }
                    .station {
                      flex: 1;
                    }
                    .station.align-right {
                      text-align: right;
                    }
                    .station .label {
                      font-size: 10px;
                      font-weight: 700;
                      color: #94a3b8;
                      letter-spacing: 1px;
                      margin-bottom: 6px;
                      text-transform: uppercase;
                    }
                    .station .city {
                      font-size: 26px;
                      font-weight: 800;
                      color: #0f172a;
                    }
                    .arrow-container {
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      gap: 12px;
                      flex: 0 0 160px;
                    }
                    .arrow-line {
                      height: 2px;
                      background: #e2e8f0;
                      flex: 1;
                    }
                    .arrow-icon {
                      font-size: 18px;
                      color: #ea580c;
                      background: #fff7ed;
                      width: 36px;
                      height: 36px;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border: 1px solid #ffedd5;
                    }
                    .divider-container {
                      position: relative;
                      display: flex;
                      align-items: center;
                      margin: 16px -32px;
                      overflow: hidden;
                    }
                    .notch {
                      width: 20px;
                      height: 20px;
                      background: #f1f5f9;
                      border-radius: 50%;
                      position: absolute;
                      z-index: 2;
                      border: 1px solid #e2e8f0;
                    }
                    .notch.left {
                      left: -10px;
                    }
                    .notch.right {
                      right: -10px;
                    }
                    .dashed-line {
                      width: 100%;
                      height: 2px;
                      border-top: 2px dashed #e2e8f0;
                    }
                    .info-grid {
                      display: grid;
                      grid-template-columns: repeat(4, 1fr);
                      gap: 20px 16px;
                      margin-top: 24px;
                    }
                    .info-item {
                      display: flex;
                      flex-direction: column;
                    }
                    .info-label {
                      font-size: 10px;
                      font-weight: 700;
                      color: #94a3b8;
                      letter-spacing: 0.8px;
                      text-transform: uppercase;
                      margin-bottom: 6px;
                    }
                    .info-value {
                      font-size: 14px;
                      font-weight: 600;
                      color: #334155;
                    }
                    .info-value.highlight {
                      color: #ea580c;
                      font-weight: 700;
                    }
                    .info-value.price {
                      font-size: 16px;
                      font-weight: 800;
                      color: #0f172a;
                    }
                    .info-value.status-paid {
                      color: #10b981;
                      font-weight: 700;
                      font-size: 13px;
                    }
                    .seat-badge {
                      display: inline-block;
                      padding: 3px 10px;
                      background: #fff7ed;
                      border: 1px solid #ffedd5;
                      color: #ea580c;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 700;
                    }
                    .ticket-footer {
                      background: #f8fafc;
                      border-top: 1px solid #e2e8f0;
                      padding: 20px 32px;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    }
                    .barcode-wrapper {
                      display: flex;
                      flex-direction: column;
                      align-items: flex-start;
                      gap: 4px;
                    }
                    .barcode {
                      height: 40px;
                      width: 160px;
                      background: repeating-linear-gradient(
                        90deg,
                        #1e293b,
                        #1e293b 2px,
                        transparent 2px,
                        transparent 4px,
                        #1e293b 4px,
                        #1e293b 8px,
                        transparent 8px,
                        transparent 10px
                      );
                      opacity: 0.85;
                    }
                    .barcode-text {
                      font-size: 9px;
                      font-weight: 700;
                      color: #64748b;
                      letter-spacing: 4px;
                      text-indent: 4px;
                      margin-top: 2px;
                    }
                    .footer-note {
                      font-size: 11px;
                      font-weight: 500;
                      color: #94a3b8;
                      font-style: italic;
                    }
                  </style>
                </head>
                <body>
                  <div class="ticket">
                    <div class="ticket-header">
                      <div class="brand">
                        <span class="brand-logo">🚍</span>
                        <span class="brand-text">NHÀ XE ABC</span>
                      </div>
                      <div class="ticket-type">VÉ ĐIỆN TỬ / ELECTRONIC TICKET</div>
                    </div>
                    
                    <div class="ticket-body">
                      <!-- Route section -->
                      <div class="route-container">
                        <div class="station">
                          <div class="label">ĐIỂM ĐI</div>
                          <div class="city">${order.from}</div>
                        </div>
                        <div class="arrow-container">
                          <div class="arrow-line"></div>
                          <div class="arrow-icon">➔</div>
                          <div class="arrow-line"></div>
                        </div>
                        <div class="station align-right">
                          <div class="label">ĐIỂM ĐẾN</div>
                          <div class="city">${order.to}</div>
                        </div>
                      </div>
                      
                      <!-- Divider with notches -->
                      <div class="divider-container">
                        <div class="notch left"></div>
                        <div class="dashed-line"></div>
                        <div class="notch right"></div>
                      </div>
                      
                      <!-- Info Grid -->
                      <div class="info-grid">
                        <div class="info-item">
                          <div class="info-label">MÃ ĐẶT CHỖ</div>
                          <div class="info-value highlight">#${order.orderCode}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">HÀNH KHÁCH</div>
                          <div class="info-value">${order.customerName}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">SỐ GHẾ</div>
                          <div class="info-value"><span class="seat-badge">${seatDisplay}</span></div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">LOẠI XE</div>
                          <div class="info-value" style="color: #ea580c; font-weight: 700; text-transform: uppercase;">${busType}</div>
                        </div>
                        
                        <div class="info-item">
                          <div class="info-label">XUẤT BẾN ${isRoundTrip ? '(CHIỀU ĐI)' : ''}</div>
                          <div class="info-value">${departureFormatted}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">ĐẾN NƠI (DỰ KIẾN)</div>
                          <div class="info-value">${arrivalFormatted}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">TỔNG TIỀN</div>
                          <div class="info-value price">${totalPrice}đ</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">TRẠNG THÁI</div>
                          <div class="info-value status-paid">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 3px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ĐÃ THANH TOÁN
                          </div>
                        </div>
                      </div>

                      ${isRoundTrip ? `
                      <div class="divider-container" style="margin-top: 15px;">
                        <div class="dashed-line"></div>
                      </div>
                      <div class="info-grid" style="margin-top: 15px; padding-top: 0; border-top: none;">
                        <div class="info-item">
                          <div class="info-label">XUẤT BẾN (CHIỀU VỀ)</div>
                          <div class="info-value">${returnDepartureFormatted}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">ĐẾN NƠI (CHIỀU VỀ)</div>
                          <div class="info-value">${returnArrivalFormatted}</div>
                        </div>
                        <div class="info-item"></div>
                        <div class="info-item"></div>
                      </div>
                      ` : ''}
                    </div>
                    
                    <div class="ticket-footer">
                      <div class="barcode-wrapper">
                        <div class="barcode"></div>
                        <div class="barcode-text">${order.orderCode}</div>
                      </div>
                      <div class="footer-note">Cảm ơn quý khách đã đồng hành cùng Nhà xe ABC!</div>
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

          await this.emailService.sendMail({
            to: emailRecipient,
            subject: `[VÉ ĐIỆN TỬ] XÁC NHẬN THÀNH CÔNG #${order.orderCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f8fafc; padding: 40px 20px;">
                <h2 style="color: #EF5222; margin-bottom: 20px;">XÁC NHẬN ĐẶT VÉ THÀNH CÔNG</h2>
                <p style="color: #475569; margin-bottom: 30px;">Cảm ơn bạn đã tin tưởng dịch vụ của Nhà xe ABC.</p>
                
                <div style="margin: 20px auto; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 500px; text-align: left; border: 1px solid #e2e8f0;">
                  <h3 style="color: #ea580c; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-transform: uppercase; font-size: 16px;">Thông tin vé của quý khách</h3>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>Mã đơn hàng:</strong> #${order.orderCode}</p>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>Hành khách:</strong> ${order.customerName}</p>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>Tuyến xe:</strong> ${order.from} ➔ ${order.to}</p>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>Số ghế:</strong> ${seatDisplay}</p>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>Tổng tiền:</strong> ${totalPrice}đ</p>
                </div>

                <div style="margin-top: 30px; padding: 18px; background: #fff7ed; color: #ea580c; border-radius: 8px; display: inline-block; font-size: 14px; border: 1px solid #ffedd5; max-width: 500px; text-align: left; line-height: 1.5;">
                  <strong style="text-transform: uppercase;">Lưu ý quan trọng:</strong> <br/>
                  1. Vui lòng có mặt tại bến trước 30 phút so với giờ khởi hành để làm thủ tục. <br/>
                  2. <strong>Chi tiết vé điện tử và Mã QR check-in</strong> đã được đính kèm trực tiếp trong Email này dưới dạng file hình ảnh (<strong>ve-xe-${order.orderCode}.png</strong> và <strong>qr.png</strong>). Quý khách vui lòng mở/tải file đính kèm này để xuất trình cho nhân viên khi soát vé tại bến xe.
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
          console.log(`[Email Success] Đã gửi vé điện tử thành công cho đơn ${order.orderCode} ở chế độ nền.`);
        } catch (err) {
          console.error('Lỗi sinh ảnh vé hoặc gửi mail ở chế độ nền:', err);
          throw err;
        }
    } catch (err) {
      console.error('Lỗi sinh ảnh vé hoặc gửi mail:', err);
      throw err;
    }
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

  // --- XỬ LÝ WEBHOOK PAYOS ---
  verifyPayosWebhook(body: any) {
    if (!this.payos) {
      console.warn('[PayOS] Chưa cấu hình PayOS SDK, bỏ qua xác thực chữ ký webhook');
      return body.data; // Dự phòng trả về raw data nếu chưa gắn key
    }
    try {
      return this.payos.verifyPaymentWebhookData(body);
    } catch (error) {
      console.error('[PayOS] Lỗi xác thực chữ ký webhook:', error.message);
      return null;
    }
  }

  async handlePayosWebhook(data: any) {
    if (!data) return;
    const { orderCode, amount, reference } = data;

    const order = await this.prisma.order.findUnique({
      where: { orderCode: String(orderCode) },
    });

    if (!order) {
      console.log(`[PayOS] Không tìm thấy đơn hàng phù hợp với mã: ${orderCode}`);
      return;
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      console.log(`[PayOS] Đơn hàng ${orderCode} đã thanh toán trước đó.`);
      return;
    }

    if (amount >= order.amount) {
      console.log(`[PayOS] Xác nhận đơn hàng ${orderCode} thành công. Tiến hành xuất vé!`);
      await this.processOrderSuccess(order.id, { transId: reference || 'PAYOS' });
    } else {
      console.log(`[PayOS] Chuyển khoản thiếu tiền cho đơn ${orderCode}: Yêu cầu ${order.amount}, nhận ${amount}`);
    }
  }

  // --- XỬ LÝ REDIRECT TỪ VNPAY VỀ BACKEND (Return URL) ---
  // Đây là nơi user được redirect sau khi thanh toán/huỷ trên trang VNPAY
  async handleVnpayReturn(query: any): Promise<{ redirect: string }> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET')?.trim() || 'WRN691BQUBKYT8LZGCSJFB4VBZKGPAKS';
    const secureHash = query['vnp_SecureHash'];
    const responseCode = query['vnp_ResponseCode'];
    const orderCode = query['vnp_TxnRef'];

    // Nếu không có chữ ký hoặc mã đơn → redirect về trang lỗi
    if (!secureHash || !orderCode) {
      console.warn('[VNPAY Return] Thiếu secureHash hoặc orderCode');
      return { redirect: `${frontendUrl}/payment-cancel?reason=invalid` };
    }

    // Xác thực chữ ký
    const vnp_Params = { ...query };
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];
    const sortedParams = this.sortObject(vnp_Params);
    const signData = qs.stringify(sortedParams, { encode: false });
    const calculatedHash = crypto
      .createHmac('sha512', hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    if (calculatedHash !== secureHash) {
      console.error('[VNPAY Return] Chữ ký không hợp lệ');
      return { redirect: `${frontendUrl}/payment-cancel?reason=invalid_signature` };
    }

    // Thanh toán THÀNH CÔNG (responseCode === '00')
    if (responseCode === '00') {
      console.log(`[VNPAY Return] Thanh toán thành công: ${orderCode}`);
      try {
        const order = await this.prisma.order.findUnique({ where: { orderCode } });
        if (!order) {
          // Đơn đã bị auto-expire xoá trước khi VNPAY trả về — CRITICAL!
          // Tiền đã trừ nhưng đơn không còn → cần xử lý thủ công
          console.error(`[VNPAY Return] ⚠️ CRITICAL: Đơn ${orderCode} đã bị auto-expire xoá trước khi VNPAY confirm! Cần hoàn tiền thủ công!`);
          return { redirect: `${frontendUrl}/payment-success?orderCode=${orderCode}&vnp_ResponseCode=00&warn=expired` };
        }
        if (order.paymentStatus !== PaymentStatus.PAID) {
          await this.processOrderSuccess(order.id, { transId: query['vnp_TransactionNo'] || 'VNPAY' });
        }
      } catch (err) {
        console.error('[VNPAY Return] Lỗi khi processOrderSuccess:', err);
      }
      return { redirect: `${frontendUrl}/payment-success?orderCode=${orderCode}&vnp_ResponseCode=00` };
    }

    // Thanh toán THẤT BẠI / BỊ HUỶ → XOÁ ĐƠN HÀNG NGAY
    console.log(`[VNPAY Return] Giao dịch thất bại/huỷ (code: ${responseCode}) - Xoá đơn ${orderCode}`);
    try {
      const order = await this.prisma.order.findUnique({ where: { orderCode } });
      if (order && order.paymentStatus !== PaymentStatus.PAID) {
        await this.prisma.orderSeat.deleteMany({ where: { orderId: order.id } });
        await this.prisma.order.delete({ where: { id: order.id } });
        console.log(`[VNPAY Return] Đã xoá đơn ${orderCode} và nhả ghế`);
      }
      // Nếu order === null → auto-expire đã xoá trước rồi, không cần làm gì thêm
    } catch (err: any) {
      if (err?.code !== 'P2025') {
        console.error('[VNPAY Return] Lỗi khi xoá đơn:', err);
      }
    }

    return { redirect: `${frontendUrl}/payment-cancel?orderCode=${orderCode}&vnp_ResponseCode=${responseCode}` };
  }

  async handleVnpayIpn(query: any) {
    const hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET')?.trim() || 'WRN691BQUBKYT8LZGCSJFB4VBZKGPAKS';
    const secureHash = query['vnp_SecureHash'];

    // Clone and remove hash parameters
    const vnp_Params = { ...query };
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    // Sort parameters alphabetically and encode values (must match URL creation flow)
    const sortedParams = this.sortObject(vnp_Params);

    // Build signData using qs.stringify with encode:false (values already encoded by sortObject)
    const signData = qs.stringify(sortedParams, { encode: false });

    const calculatedHash = crypto
      .createHmac('sha512', hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    if (calculatedHash !== secureHash) {
      console.error('[VNPAY] Chu ky khong hop le');
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const orderCode = vnp_Params['vnp_TxnRef'];
    const amount = Number(vnp_Params['vnp_Amount']);
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const transactionNo = vnp_Params['vnp_TransactionNo'];

    const order = await this.prisma.order.findUnique({
      where: { orderCode },
    });

    if (!order) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    if (order.amount * 100 !== amount) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (responseCode === '00') {
      console.log(`[VNPAY] Giao dich thanh cong cho ma don ${orderCode}`);
      await this.processOrderSuccess(order.id, { transId: transactionNo || 'VNPAY' });
      return { RspCode: '00', Message: 'Confirm success' };
    } else {
      console.log(`[VNPAY] Giao dich that bai voi ma code ${responseCode}`);
      await this.prisma.orderSeat.deleteMany({ where: { orderId: order.id } });
      await this.prisma.order.delete({ where: { id: order.id } });
      return { RspCode: '00', Message: 'Confirm success' };
    }
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
    // 2. LOGIC TẠO ẢNH VÀ GỬI MAIL (ĐÃ ĐƯỢC TÁCH BIỆT)
    // ==========================================
    if (order.customerEmail) {
      this.sendTicketEmail(order).catch(err => {
        console.error('Lỗi khi gửi email vé trong background:', err);
      });
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

    await this.prisma.orderSeat.deleteMany({ where: { orderId: order.id } });
    await this.prisma.order.delete({ where: { id: order.id } });

    return { success: true, message: 'Đã hủy giao dịch và giải phóng ghế!' };
  }
  async verifyAndSendMailLocal(orderCode: string) {
    const order = await this.prisma.order.findUnique({ 
      where: { orderCode },
      include: {
        seats: true,
        outboundTrip: true,
        returnTrip: true
      }
    });

    if (!order) return { success: false, message: 'Đơn hàng không tồn tại' };

    if (order.paymentStatus === PaymentStatus.PAID) {
      if (order.customerEmail) {
        try {
          await this.sendTicketEmail(order);
          return { success: true, message: 'Đơn đã thanh toán trước đó. Đã gửi lại email vé thành công!' };
        } catch (err: any) {
          return { success: false, message: 'Gửi email vé thất bại!', error: err.message || err.toString() };
        }
      }
      return { success: true, message: 'Đơn đã thanh toán trước đó nhưng không có email!' };
    }

    try {
      await this.processOrderSuccess(order.id, { transId: 'LOCAL_TEST' });
      return { success: true, message: 'Đã xác nhận và gửi mail!' };
    } catch (err: any) {
      return { success: false, message: 'Xác nhận thất bại hoặc lỗi gửi mail!', error: err.message || err.toString() };
    }
  }

  async resendRecentEmails(days: number = 3) {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        createdAt: {
          gte: fromDate,
        },
        customerEmail: {
          not: null,
        },
      },
      include: {
        seats: true,
        outboundTrip: true,
        returnTrip: true,
      },
    });

    const processedOrders: any[] = [];
    for (const order of orders) {
      if (!order.customerEmail || order.customerEmail.trim() === '') continue;
      
      // Chạy gửi mail ở chế độ nền (fire-and-forget) để tránh nghẽn/timeout request HTTP
      this.sendTicketEmail(order)
        .then(() => {
          console.log(`[Resend Success] Đã gửi lại email thành công cho đơn ${order.orderCode}`);
        })
        .catch(err => {
          console.error(`[Resend Failed] Lỗi khi gửi lại email cho đơn ${order.orderCode}:`, err);
        });

      processedOrders.push({
        orderCode: order.orderCode,
        email: order.customerEmail,
      });
    }

    return {
      success: true,
      message: `Đang xử lý gửi lại email cho ${orders.length} đơn hàng ở chế độ nền.`,
      processedCount: orders.length,
      timeframeDays: days,
      orders: processedOrders,
    };
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
        OR: [
          { paymentStatus: PaymentStatus.PAID },
          { paymentStatus: PaymentStatus.REFUNDED },
          { bookingStatus: BookingStatus.CANCELLED },
        ],
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

  // --- VNPAY HELPERS ---
  private formatVnpDate(date: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const utcMs = date.getTime() + (date.getTimezoneOffset() * 60000);
    const gmt7Date = new Date(utcMs + (7 * 3600000));
    return (
      gmt7Date.getFullYear().toString() +
      pad(gmt7Date.getMonth() + 1) +
      pad(gmt7Date.getDate()) +
      pad(gmt7Date.getHours()) +
      pad(gmt7Date.getMinutes()) +
      pad(gmt7Date.getSeconds())
    );
  }

  private sortObject(obj: any): any {
    const sorted: any = {};
    // Sort raw keys (alphabet A→Z), NOT encoded keys
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      // Only encode VALUES, keep keys as-is
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
    }
    return sorted;
  }
}