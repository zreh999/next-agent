import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Optional development-host compatibility; never disables type validation.
  experimental: process.env.NEXT_AGENT_WORKER_THREADS === "true" ? { workerThreads: true, cpus: 2 } : undefined,
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" }
    ] }];
  }
};
export default nextConfig;
