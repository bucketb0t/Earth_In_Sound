import type { ReactNode } from "react";

import ResponsiveSiteView from "./ResponsiveSiteView";

interface SiteShellProps {
  children: ReactNode;
}

/**
 * Global site shell.
 * Keeps one stable application frame mounted across routes, resizing, and
 * orientation changes. Responsive presentation belongs to the components'
 * CSS, so changing available width never replaces the page subtree.
 */
export default function SiteShell({ children }: SiteShellProps) {
  return <ResponsiveSiteView>{children}</ResponsiveSiteView>;
}
