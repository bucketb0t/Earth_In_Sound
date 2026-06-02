import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navbar from "@/components/navbar/shared/Navbar/Navbar";
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
        {/* Persistent site navigation. */}
        <Navbar />

        {/* Current route content supplied by the App Router. */}
        {children}
      </body>
    </html>
  );
}
