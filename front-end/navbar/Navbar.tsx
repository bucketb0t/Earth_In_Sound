"use client";

import DesktopNavbar from "./desktop/DesktopNavbar";
import MobileNavbar from "./mobile/MobileNavbar";
import { NavbarContext, useNavbar } from "./state";

export type NavbarVariant = "desktop" | "mobile";

interface NavbarProps {
  variant: NavbarVariant;
}

/**
 * Site navbar entry point.
 * Owns shared navbar state and renders the layout requested by the active site
 * view.
 */
export default function Navbar({ variant }: NavbarProps) {
  const navbarState = useNavbar();

  return (
    <NavbarContext.Provider value={navbarState}>
      {/* Both layouts reuse the same navbar state; only the presentation swaps. */}
      {variant === "mobile" ? <MobileNavbar /> : <DesktopNavbar />}
    </NavbarContext.Provider>
  );
}
