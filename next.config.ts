import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Allow 25 MB document uploads plus a little overhead for form fields.
      bodySizeLimit: "27mb",
    },
  },
};

export default nextConfig;
