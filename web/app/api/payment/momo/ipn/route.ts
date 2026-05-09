import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

function signHmacSha256(rawSignature: string, secretKey: string) {
  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;

    if (!accessKey || !secretKey) {
      return NextResponse.json(
        { message: 'Thiếu MOMO_ACCESS_KEY hoặc MOMO_SECRET_KEY' },
        { status: 500 }
      );
    }

    const partnerCode = body?.partnerCode ?? '';
    const orderId = body?.orderId ?? '';
    const requestId = body?.requestId ?? '';
    const amount = body?.amount ?? '';
    const orderInfo = body?.orderInfo ?? '';
    const orderType = body?.orderType ?? '';
    const transId = body?.transId ?? '';
    const resultCode = Number(body?.resultCode ?? -1);
    const message = body?.message ?? '';
    const payType = body?.payType ?? '';
    const responseTime = body?.responseTime ?? '';
    const extraData = body?.extraData ?? '';
    const signature = body?.signature ?? '';

    if (!partnerCode || !orderId || !requestId || !signature) {
      return NextResponse.json(
        { message: 'Thiếu dữ liệu IPN từ MoMo' },
        { status: 400 }
      );
    }

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expectedSignature = signHmacSha256(rawSignature, secretKey);

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { message: 'Sai chữ ký MoMo' },
        { status: 400 }
      );
    }

    let decodedExtraData: any = null;

    try {
      if (extraData) {
        decodedExtraData = JSON.parse(
          Buffer.from(extraData, 'base64').toString('utf8')
        );
      }
    } catch {
      decodedExtraData = null;
    }

    const paid = resultCode === 0;

    if (paid) {
      console.log('MoMo PAID:', {
        orderId,
        requestId,
        transId,
        amount,
        payType,
        responseTime,
        decodedExtraData,
      });

      // TODO: cập nhật DB status = PAID
      // Ví dụ:
      // - tìm đơn theo orderId
      // - lưu transId, amount, payType, responseTime
      // - set status = 'PAID'
    } else {
      console.log('MoMo FAILED:', {
        orderId,
        requestId,
        resultCode,
        message,
        decodedExtraData,
      });

      // TODO: cập nhật DB status = FAILED
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error: any) {
    console.error('MOMO IPN ERROR:', error);

    return NextResponse.json(
      { message: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}