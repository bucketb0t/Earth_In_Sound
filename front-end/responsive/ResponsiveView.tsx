"use client";

import type { ReactNode } from "react";

import { useResponsiveMode } from "./ResponsiveModeProvider";

interface ResponsiveViewProps {
  desktop: ReactNode;
  mobile: ReactNode;
}

/**
 * Page-boundary desktop/mobile switch.
 * Use this for future pages whose structure is genuinely different between
 * desktop and mobile. Smaller components should stay shared when CSS is enough.
 */
export default function ResponsiveView({
  desktop,
  mobile,
}: ResponsiveViewProps) {
  const { isMobile } = useResponsiveMode();

  return <>{isMobile ? mobile : desktop}</>;
}
