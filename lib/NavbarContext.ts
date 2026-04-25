'use client';

/**
 * NavbarContext.ts
 * ─────────────────────────────────────────────────────────────────
 * React Context that makes the navbar state and actions available
 * to every sub-component without prop-drilling.
 *
 * Usage:
 *   // In Navbar.tsx (provider):
 *   <NavbarContext.Provider value={useNavbar()}>
 *     <LogoCell />
 *     <EisCell />
 *     ...
 *   </NavbarContext.Provider>
 *
 *   // In any child:
 *   const { activePage, eisNavTo } = useNavbarContext();
 * ─────────────────────────────────────────────────────────────────
 */

import { createContext, useContext } from 'react';
import type { NavbarState } from './useNavbar';

/** The context object — value is the full return of useNavbar(). */
export const NavbarContext = createContext<NavbarState | null>(null);

/**
 * useNavbarContext()
 *
 * Convenience hook that reads NavbarContext and throws a helpful
 * error if called outside a NavbarContext.Provider.
 */
export function useNavbarContext(): NavbarState {
  const ctx = useContext(NavbarContext);
  if (!ctx) {
    throw new Error('useNavbarContext must be used inside <Navbar> (NavbarContext.Provider).');
  }
  return ctx;
}
