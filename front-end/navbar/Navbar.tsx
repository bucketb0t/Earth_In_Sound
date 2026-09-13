"use client";

import ResponsiveNavbar from "./ResponsiveNavbar";
import { NavbarContext, useNavbar } from "./state";

/** Provide shared navbar state to one persistent set of responsive controls. */
export default function Navbar() {
  const navbarState = useNavbar();

  return (
    <NavbarContext.Provider value={navbarState}>
      <ResponsiveNavbar />
    </NavbarContext.Provider>
  );
}
