import type { NextConfig } from "next";

/**
 * Project-level Next settings.
 * Keeps framework behavior explicit while the navbar design evolves.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allows opening the dev server through http://127.0.0.1:3000.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // Add domains here only when the site intentionally uses remote media.
    remotePatterns: [],
  },

  // Prevents Turbopack from walking up into parent folders with other lockfiles.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
