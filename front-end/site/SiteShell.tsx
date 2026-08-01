import type { ReactNode } from "react";

import { ResponsiveModeProvider } from "@/front-end/responsive/ResponsiveModeProvider";
import ResponsiveSiteView from "./ResponsiveSiteView";

interface SiteShellProps {
  children: ReactNode;
}

/**
 * Global site shell.
 * Owns the responsive mode provider and delegates the visible project frame to
 * the desktop or mobile site view.
 */
export default function SiteShell({ children }: SiteShellProps) {
  return (
    <ResponsiveModeProvider>
      <ResponsiveSiteView>{children}</ResponsiveSiteView>
    </ResponsiveModeProvider>
  );
}
