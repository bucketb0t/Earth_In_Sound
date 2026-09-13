import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteShell from "@/front-end/site/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earth In Sound",
  description: "Earth In Sound official site",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      {/* Browser extension attributes can appear before React hydrates. */}
      <body suppressHydrationWarning>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
