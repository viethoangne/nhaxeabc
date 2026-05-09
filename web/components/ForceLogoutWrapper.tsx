'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function ForceLogoutWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 🟢 QUAN TRỌNG NHẤT LÀ DÒNG NÀY: Phải chờ NextAuth kiểm tra xong Cookie
    if (status === 'loading') return;

    const hasVisitedThisTab = sessionStorage.getItem('app_session_started');

    if (!hasVisitedThisTab) {
      if (status === 'authenticated') {
        // Tab mới tinh + Thấy có dấu hiệu đăng nhập từ Cookie cũ -> Ép đăng xuất ngay
        signOut({ redirect: false }).then(() => {
          sessionStorage.setItem('app_session_started', 'true');
          setIsReady(true);
        });
      } else {
        // Tab mới + Chưa đăng nhập -> Đóng mộc an toàn cho qua
        sessionStorage.setItem('app_session_started', 'true');
        setIsReady(true);
      }
    } else {
      // Tab cũ đang chuyển trang nội bộ -> Cho qua
      setIsReady(true);
    }
  }, [status]);

  if (!isReady) return null;

  return <>{children}</>;
}