/**
 * app/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Home page for the App Router.
 *
 * The Navbar uses React hooks (useState, useCallback, useRef) so it
 * must be a Client Component. We mark THIS page as a Client
 * Component with "use client" so the Navbar renders correctly.
 *
 * In a larger app you would move <Navbar /> into a shared layout
 * file — see the README for instructions.
 * ─────────────────────────────────────────────────────────────────
 */

'use client';

import Navbar from '../components/navbar/Navbar';

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Page body placeholder */}
      <main style={{ padding: '40px 24px', color: '#444' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Page content goes here.
        </p>
      </main>
    </>
  );
}
