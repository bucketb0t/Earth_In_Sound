/**
 * app/layout.tsx
 * ─────────────────────────────────────────────────────────────────
 * Root layout for the App Router (replaces pages/_app.tsx).
 *
 * · Imports global CSS (only allowed here in App Router).
 * · Sets the <html> and <body> attributes for the whole site.
 * · Every page is automatically wrapped by this component.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Earth In Sound',
  description: 'Earth In Sound — official site',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
