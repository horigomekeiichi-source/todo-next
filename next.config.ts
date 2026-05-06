import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/todo-next",
  images: { unoptimized: true },
};

export default nextConfig;
