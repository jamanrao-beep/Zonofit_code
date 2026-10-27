import type { NextConfig } from "next";

// API origin the /api/* calls are proxied to. Set API_URL when building (see DEPLOY.md).
const API_URL = process.env.API_URL ?? "https://api.zonofit.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
