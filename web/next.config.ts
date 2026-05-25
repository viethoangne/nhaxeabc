import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

// Trigger Vercel rebuild with new Root Directory setting
// Khởi tạo plugin next-intl
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */

  images: {
    qualities: [60, 75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  // Rewrite API sang backend
  async rewrites() {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    backendUrl = backendUrl.replace(/\/$/, '');
    
    // Nếu biến môi trường cấu hình thiếu /api ở cuối, tự động điền để khớp với NestJS prefix
    if (!backendUrl.endsWith('/api')) {
      backendUrl = `${backendUrl}/api`;
    }

    return [
      {
        source: '/api/:path((?!auth).*)', 
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

// Bọc nextConfig bằng withNextIntl trước khi export
export default withNextIntl(nextConfig);