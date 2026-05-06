import type { NextConfig } from "next";

/**
 * Project-level Next settings.
 *
 * The package uses Next 16, so TypeScript config is supported. Navbar artwork
 * is imported from the component tree; remote image patterns stay empty until
 * the site intentionally pulls media from an outside domain.
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
