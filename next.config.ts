import type { NextConfig } from "next";

/**
 * Project-level Next settings.
 *
 * The package uses Next 16, so TypeScript config is supported. Remote image
 * patterns stay empty while the logo is served from /public.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },

  // Keeps Turbopack rooted in this project on machines with parent lockfiles.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
