import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We removed rewrites because we are using a custom proxy route in src/app/api/v1/[...path]/route.ts
  // This allows us to perfectly forge the CORS headers that the browser expects!
};

export default nextConfig;
