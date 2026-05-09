'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCalledApi = useRef(false);

 // SỬA LẠI: Bắt buộc lấy 'orderCode' vì DB backend tìm theo cột orderCode (ví dụ: 775555178425)
  // Nếu lấy orderId của MoMo nó sẽ bị dính chữ TRIP_ (ví dụ: TRIP_775555178425) làm Backend tìm không ra.
  let finalOrderCode = searchParams.get('orderCode') || '';

  // Đề phòng trường hợp hãn hữu chỉ có orderId, ta cắt bỏ chữ "TRIP_" đi để lấy đúng mã số
  if (!finalOrderCode) {
    const momoOrderId = searchParams.get('orderId') || '';
    finalOrderCode = momoOrderId.replace('TRIP_', ''); 
  }

  const resultCode = searchParams.get('resultCode') || '';
  const amount = searchParams.get('amount') || '';

  useEffect(() => {
    // 1. Kiểm tra nếu thất bại
    const isFailed = resultCode && resultCode !== '0' && resultCode !== '9000';
    
    if (isFailed) {
      const params = new URLSearchParams(searchParams.toString());
      router.replace(`/payment-cancel?${params.toString()}`);
      return;
    }

    // 2. Kích hoạt gửi mail khi thanh toán thành công
    const isSuccess = resultCode === '0' || !resultCode;

    // Dùng finalOrderCode thay vì orderCode
    if (isSuccess && finalOrderCode && !hasCalledApi.current) {
      hasCalledApi.current = true; 
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      console.log("🚀 Đang xác nhận đơn hàng và gửi email với mã:", finalOrderCode);
      
      fetch(`${apiUrl}/payment/confirm-local/${finalOrderCode}`, {
        method: 'GET', // Hoặc POST tùy theo Backend của bạn
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
        .then(res => res.json())
        .then(data => console.log("✅ Kết quả xử lý đơn:", data))
        .catch(err => console.error("❌ Lỗi gọi API xác nhận:", err));
    }
  }, [resultCode, finalOrderCode, router, searchParams]);

  const paid = !resultCode || resultCode === '0' || resultCode === '9000';

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-600">
            ✓
          </div>

          <h1 className="mt-5 text-3xl font-extrabold text-green-600">
            {paid ? 'Thanh toán thành công' : 'Đã nhận phản hồi thanh toán'}
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600 font-medium">
            Giao dịch của bạn đã được hệ thống ghi nhận thành công.
          </p>
          
          {paid && (
            <div className="mt-6 w-full rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 p-6">
               <div className="flex flex-col items-center gap-2">
                  <span className="text-3xl">📧</span>
                  <h3 className="text-lg font-bold text-orange-800">Kiểm tra hòm thư của bạn!</h3>
                  <p className="text-orange-700">
                    Một email chứa <b>Mã QR vé xe</b> đã được gửi tới địa chỉ Gmail của bạn. 
                    Vui lòng kiểm tra hộp thư đến để lấy mã Check-in khi lên xe.
                  </p>
               </div>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Mã đơn hàng</div>
            <div className="mt-2 text-lg font-bold text-slate-900">
              {finalOrderCode || '---'}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</div>
            <div className="mt-2 text-lg font-bold text-green-600">
              Đã thanh toán
            </div>
          </div>
        </div>

        {amount && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Tổng số tiền</div>
            <div className="mt-2 text-xl font-bold text-orange-600">
              {Number(amount).toLocaleString('vi-VN')}đ
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-green-100 bg-green-50/50 p-5">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>💡</span> Lưu ý quan trọng
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 italic">
            <li>• Mã QR là vé điện tử dùng để lên xe, vui lòng không chia sẻ cho người lạ.</li>
            <li>• Bạn có thể chụp màn hình trang này để làm bằng chứng thanh toán.</li>
            <li>• Nếu sau 10 phút chưa nhận được mail, vui lòng liên hệ hotline nhà xe.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-2xl bg-orange-500 px-8 py-4 font-bold text-white transition-all hover:bg-orange-600 hover:shadow-lg active:scale-95"
          >
            Về trang chủ
          </Link>

          <Link
            href="/search-trip"
            className="rounded-2xl border border-slate-300 px-8 py-4 font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
          >
            Đặt vé mới
          </Link>
        </div>
      </div>
    </main>
  );
}