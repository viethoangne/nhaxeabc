'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCheckPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 1. Nếu đang chờ dữ liệu từ Google thì chưa làm gì cả
    if (status === 'loading') return; 

    // 2. Nếu lọt vào đây mà chưa đăng nhập -> Đuổi về trang login
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // 3. Quét thông tin thẻ (Role)
    const role = (session?.user as any)?.role;

    // 🟢 4. BẮT ĐẦU ĐIỀU HƯỚNG TỰ ĐỘNG
    if (role === 'ADMIN') {
      router.push('/admin'); // Admin: Mời vào Dashboard Tổng quan
    } else if (role === 'STAFF') {
      router.push('/admin/orders'); // Nhân viên: Mời vào thẳng trang xử lý Đơn hàng
    } else {
      router.push('/'); // Khách hàng: Mời ra trang chủ mua vé
    }
  }, [session, status, router]);

  // Giao diện Loading tinh tế trong 0.5s chờ quét thẻ
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 text-[#ea580c] animate-spin mb-4" />
      <h2 className="text-xl font-bold text-slate-700">Đang đồng bộ dữ liệu...</h2>
      <p className="text-sm text-slate-500 mt-2">Hệ thống đang chuẩn bị không gian làm việc cho bạn.</p>
    </div>
  );
}