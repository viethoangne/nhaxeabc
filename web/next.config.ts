import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

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
    return [
      {
        source: '/api/:path((?!auth).*)', 
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

// Bọc nextConfig bằng withNextIntl trước khi export
export default withNextIntl(nextConfig);