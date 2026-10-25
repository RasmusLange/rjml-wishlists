import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF route reads its fonts from disk, so make sure they ship with it.
  outputFileTracingIncludes: {
    "/lists/[id]/pdf": ["./src/pdf/fonts/**/*"],
  },
  serverExternalPackages: ["@react-pdf/renderer"],
  // Pictures are sent with the wish form, so allow a bit more than the 1 MB default.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
