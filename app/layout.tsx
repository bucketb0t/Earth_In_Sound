import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteShell from "@/front-end/site/SiteShell";
import "./globals.css";

/**
 * Global metadata used by the browser tab and search previews.
 */
export const metadata: Metadata = {
  title: "Earth In Sound",
  description: "Earth In Sound official site",
};

interface RootLayoutProps {
  children: ReactNode;
}

/**
 * Root document shell.
 * Keeps the navbar mounted once so every page shares the same navigation.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      {/* Browser extension attributes can appear before React hydrates. */}
      <body suppressHydrationWarning>
        {/* Global responsive shell: navbar plus current route content. */}
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
