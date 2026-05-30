import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@chetana/shared",
    "@chetana/models",
    "@chetana/probes",
    "@chetana/scorer",
  ],
  // Static export is only for the Capacitor iOS wrapper (set CAPACITOR_BUILD=true).
  // The default server build keeps the dynamic API route handlers working for
  // web/Vercel deployment, which static export does not support.
  output: process.env.CAPACITOR_BUILD === "true" ? "export" : undefined,
};

export default nextConfig;
