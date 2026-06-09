import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/EOR",
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
