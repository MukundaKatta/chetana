import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@chetana/shared",
    "@chetana/models",
    "@chetana/probes",
    "@chetana/scorer",
  ],
};

export default nextConfig;
