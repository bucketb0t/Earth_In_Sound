import type { ReactNode } from "react";

import Navbar from "@/front-end/navbar/Navbar";

import styles from "./ResponsiveSiteView.module.css";

interface ResponsiveSiteViewProps {
  children: ReactNode;
}

/**
 * Stable site frame shared by every viewport.
 *
 * Navbar and route content stay mounted while their CSS adapts to available
 * space. This prevents responsive changes from resetting focus, forms, cart
 * controls, or stateful podcast media.
 */
export default function ResponsiveSiteView({
  children,
}: ResponsiveSiteViewProps) {
  return (
    <div className={styles.siteView}>
      <Navbar />
      <div className={styles.siteContent}>{children}</div>
    </div>
  );
}
