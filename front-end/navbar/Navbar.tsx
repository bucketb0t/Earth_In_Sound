"use client";

import ResponsiveNavbar from "./ResponsiveNavbar";
import { NavbarContext, useNavbar } from "./state";

/**
 * Site navbar entry point.
 * Owns one shared state instance and one persistent set of controls. The
 * layout adapts through CSS without replacing the interactive components.
 */
export default function Navbar() {
  const navbarState = useNavbar();

  return (
    <NavbarContext.Provider value={navbarState}>
      <ResponsiveNavbar />
    </NavbarContext.Provider>
  );
}
