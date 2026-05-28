import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navbar from "@/components/navbar/shared/Navbar/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earth In Sound",
  description: "Earth In Sound official site",
};

interface RootLayoutProps {
  children: ReactNode;
}

/**
 * Root document shell.
 * Keeps the navbar mounted above every route so site navigation is universal.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      {/* Root body for the persistent navbar and route content. */}
      <body suppressHydrationWarning>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
