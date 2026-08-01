"use client";

import type { ReactNode } from "react";

import { useResponsiveMode } from "@/front-end/responsive/ResponsiveModeProvider";
import DesktopView from "./pages/desktop/DesktopView";
import MobileView from "./pages/mobile/MobileView";

interface ResponsiveSiteViewProps {
  children: ReactNode;
}

/**
 * Global desktop/mobile project view switch.
 * This is the main visual boundary: each view owns its navbar and page frame.
 */
export default function ResponsiveSiteView({
  children,
}: ResponsiveSiteViewProps) {
  const { isMobile } = useResponsiveMode();

  return isMobile ? (
    <MobileView>{children}</MobileView>
  ) : (
    <DesktopView>{children}</DesktopView>
  );
}
