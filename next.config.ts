import type { NextConfig } from 'next';

/**
 * next.config.ts
 * ─────────────────────────────────────────────────────────────────
 * Next.js project configuration.
 *
 * · styled-jsx is included with Next.js — no extra config needed.
 * · The .webp logo in /public is served by Next.js automatically.
 * ─────────────────────────────────────────────────────────────────
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
   * If you ever serve images from an external domain (e.g. a CDN),
   * add it here. The logo is local (/public/EarthInSound.webp)
   * so no remote patterns are needed right now.
   */
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
