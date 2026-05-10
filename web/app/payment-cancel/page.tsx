'use client';
import { API_BASE } from '@/lib/api';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Đang xử lý...');

  const orderCode = searchParams.get('orderCode');
  const resultCode = searchParams.get('resultCode');

  useEffect(() => {
    if (!orderCode) return;

    // 1. NẾU THÀNH CÔNG (resultCode = 0)
    if (resultCode === '0') {
      setStatus('Đang xác nhận thanh toán...');
      fetch(`${API_BASE}/payment/confirm-local/${orderCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStatus('🎉 Thanh toán thành công! Vé đã được gửi vào Email của bạn.');
          } else {
            setStatus('Đơn hàng đã được xác nhận trước đó.');
          }
        })
        .catch((err) => {
          console.error('Lỗi xác nhận:', err);
          setStatus('Có lỗi xảy ra khi gửi mail, nhưng thanh toán của bạn đã ghi nhận.');
        });
    } 
    // 2. NẾU KHÁCH ẤN HỦY HOẶC GIAO DỊCH LỖI (resultCode != 0)
    else {
      setStatus('Giao dịch đã bị hủy. Đang tiến hành hoàn trả ghế...');
      
      // Gọi API báo Backend hủy đơn và nhả ghế ngay lập tức
      fetch(`${API_BASE}/payment/failed-local/${orderCode}`)
        .then(() => {
          setStatus('Giao dịch không thành công hoặc đã bị hủy. Ghế đã được nhả!');
        })
        .catch(() => {
          setStatus('Giao dịch đã bị hủy.');
        });
    }
  }, [orderCode, resultCode]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-lg text-center max-w-md w-full">
        <div className="text-6xl mb-4">{resultCode === '0' ? '🎉' : '❌'}</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Thông báo</h1>
        <p className="text-slate-600 mb-6">{status}</p>
        <Link href="/" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors">
          Quay về trang chủ
        </Link>
      </div>
    </div>
  );
}