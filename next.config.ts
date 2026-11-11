import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/next-agent",
  trailingSlash: true,
  poweredByHeader: false,
  // Optional development-host compatibility; never disables type validation.
  experimental: process.env.NEXT_AGENT_WORKER_THREADS === "true" ? { workerThreads: true, cpus: 2 } : undefined,
  images: { unoptimized: true }
};
export default nextConfig;
