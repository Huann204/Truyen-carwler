import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["mongoose", "node-cron"],
};

export default nextConfig;
