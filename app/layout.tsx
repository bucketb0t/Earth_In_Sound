import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earth In Sound",
  description: "Earth In Sound official site",
};

interface RootLayoutProps {
  children: ReactNode;
}

/**
 * Root App Router layout.
 *
 * Global CSS is imported here because Next's App Router allows global styles
 * only at the root layout boundary. Page and component files stay focused on
 * markup, state, and local artwork.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
