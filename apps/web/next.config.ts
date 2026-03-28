import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@chetana/shared",
    "@chetana/models",
    "@chetana/probes",
    "@chetana/scorer",
  ],
  // Static export for Capacitor iOS wrapper
  output: "export",
};

export default nextConfig;
