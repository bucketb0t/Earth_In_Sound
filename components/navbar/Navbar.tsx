"use client";

import DesktopNavbar from "./desktop/DesktopNavbar";
import { NavbarContext, useNavbar } from "./state";

/**
 * Site navbar entry point.
 * Owns shared navbar state and chooses which layout renders.
 *
 * Mobile support will branch here so the desktop hardware navbar can keep its
 * current measured scaling while the mobile layout gets its own fitting rules.
 */
export default function Navbar() {
  const navbarState = useNavbar();

  return (
    <NavbarContext.Provider value={navbarState}>
      <DesktopNavbar />
    </NavbarContext.Provider>
  );
}
