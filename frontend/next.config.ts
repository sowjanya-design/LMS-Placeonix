import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://backend-pearl-seven-77.vercel.app/api/:path*'
      },
      {
        source: '/uploads/:path*',
        destination: 'https://backend-pearl-seven-77.vercel.app/uploads/:path*'
      }
    ]
  }
};

export default nextConfig;
