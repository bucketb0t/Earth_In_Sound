import type { ReactNode } from "react";

import ResponsiveSiteView from "./ResponsiveSiteView";

interface SiteShellProps {
  children: ReactNode;
}

/** Persistent site frame; responsive CSS adapts the layout without replacing the page subtree. */
export default function SiteShell({ children }: SiteShellProps) {
  return <ResponsiveSiteView>{children}</ResponsiveSiteView>;
}
