import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  ...(process.env.PAGES_BASE_PATH
    ? { basePath: process.env.PAGES_BASE_PATH }
    : {}),
};

export default nextConfig;
