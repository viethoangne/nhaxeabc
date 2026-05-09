import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

function signHmacSha256(rawSignature: string, secretKey: string) {
  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      tripType,
      tickets,
      outboundTripId,
      returnTripId,
      from,
      to,
      date,
      returnDate,
      outboundSeats,
      returnSeats = [],
      price, // NHẬN GIÁ TỪ FRONTEND
      customerEmail,
      customerName
    } = body;

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
    const redirectBase = process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment-success';
    const ipnUrl = process.env.MOMO_IPN_URL;

    if (!partnerCode || !accessKey || !secretKey || !ipnUrl) {
      return NextResponse.json({ message: 'Thiếu cấu hình MoMo' }, { status: 500 });
    }

    // FIX 1: TÍNH TOÁN GIÁ DỰA TRÊN THAM SỐ GỬI LÊN (ÉP KIỂU SỐ NGUYÊN CHUẨN)
    const pricePerTicketPerLeg = parseInt(price || '200000', 10);
    const legs = tripType === 'round' ? 2 : 1;
    const amount = tickets * legs * pricePerTicketPerLeg;

    const requestId = `REQ_${Date.now()}`;
    const orderCode = Date.now().toString().slice(-12);
    const orderId = `TRIP_${orderCode}`;
    
    // FIX 2: BẢO VỆ CHUỖI KHÔNG BỊ "UNDEFINED" (Nguyên nhân chính gây lỗi 99)
    const safeFrom = from || 'Diem_Di';
    const safeTo = to || 'Diem_Den';
    const orderInfo = `Ve xe ${safeFrom}-${safeTo}`.substring(0, 50);

    const extraDataObject = {
      tripType: tripType || 'oneway', 
      tickets: tickets || 1, 
      outboundTripId: outboundTripId || 0, 
      returnTripId: returnTripId || null,
      from: safeFrom, 
      to: safeTo, 
      date: date || '', 
      returnDate: returnDate || null,
      outboundSeats: outboundSeats || [], 
      returnSeats: returnSeats || [], 
      customerEmail: customerEmail || '', 
      customerName: customerName || ''
    };

    const extraData = Buffer.from(JSON.stringify(extraDataObject)).toString('base64');
    const redirectUrl = `${redirectBase}?orderCode=${orderCode}`;

    // FIX 3: Đảm bảo nối chuỗi chữ ký MoMo chuẩn xác
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;
    const signature = signHmacSha256(rawSignature, secretKey);

    const payload = {
      partnerCode, requestId, amount, orderId, orderInfo,
      redirectUrl, ipnUrl, extraData, requestType: 'captureWallet',
      signature, lang: 'vi', autoCapture: true,
    };

    const momoRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const momoData = await momoRes.json();

    if (momoData.resultCode !== 0) {
      return NextResponse.json({ message: momoData.message }, { status: 400 });
    }

    return NextResponse.json({
      checkoutUrl: momoData.payUrl,
      orderCode,
      amount
    });

  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Lỗi server' }, { status: 500 });
  }
}