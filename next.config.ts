import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF route reads its fonts from disk, so make sure they ship with it.
  outputFileTracingIncludes: {
    "/lists/[id]/pdf": ["./src/pdf/fonts/**/*"],
  },
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
