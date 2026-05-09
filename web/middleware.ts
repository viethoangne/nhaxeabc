import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const url = req.nextUrl.pathname;

    // 1. NẾU LÀ KHÁCH HÀNG THƯỜNG MÀ CỐ VÀO TRANG ADMIN -> Đuổi về trang chủ
    if (url.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') { // Thay 'ADMIN' bằng role thực tế trong DB của bác
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // 2. NẾU LÀ ADMIN MÀ VÀO TRANG CHỦ KHÁCH HÀNG -> Ép chuyển hướng thẳng vào Dashboard Admin
    // (Tùy logic nhà xe, nếu bác cho phép Admin xem trang khách thì xóa khối lệnh IF này đi)
    if (url === '/' && token?.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  },
  {
    callbacks: {
      // Hàm này bắt buộc phải có để middleware chạy
      authorized: ({ token }) => !!token, 
    },
  }
);

// Khai báo những đường dẫn nào cần Middleware chạy qua để kiểm tra
export const config = {
  matcher: [
    '/admin/:path*', // Áp dụng cho mọi trang bắt đầu bằng /admin
    '/'              // Áp dụng cho trang chủ
  ]
};