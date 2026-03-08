'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const called = useRef(false);

  useEffect(() => {
    if (status === 'loading' || called.current) return;

    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated' && session?.user?.email) {
      called.current = true;

      fetch(`${API_URL}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Quan trọng: gửi/nhận cookie cross-origin
        body: JSON.stringify({
          email: session.user.email,
          name: session.user.name ?? '',
          picture: session.user.image ?? '',
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Backend auth failed');
          return res.json();
        })
        .catch((err) => console.error('Lỗi đồng bộ backend:', err))
        .finally(() => router.replace('/'));
    }
  }, [status, session, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        <p className="text-slate-600">Đang xử lý đăng nhập...</p>
      </div>
    </div>
  );
}
