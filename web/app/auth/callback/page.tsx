'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 1. Chờ load xong
    if (status === 'loading') return;

    // 2. Chưa đăng nhập thì đuổi ra login
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    // 3. Đã đăng nhập -> Đọc Role và phân luồng
    if (status === 'authenticated') {
      const role = (session?.user as any)?.role;

      if (role === 'ADMIN') {
        router.replace('/admin'); // Admin vào Dashboard
      } else if (role === 'STAFF') {
        router.replace('/admin/orders'); // Staff vào trang Xử lý vé
      } else {
        router.replace('/'); // Khách thường về trang chủ mua vé
      }
    }
  }, [status, session, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#ea580c] border-t-transparent" />
        <p className="text-slate-600 font-medium">Đang chuẩn bị không gian làm việc...</p>
      </div>
    </div>
  );
}