import type { ReactNode } from "react";

import Navbar from "@/front-end/navbar/Navbar";

import styles from "./ResponsiveSiteView.module.css";

interface ResponsiveSiteViewProps {
  children: ReactNode;
}

/** Keep navbar and content mounted across viewport changes to preserve focus and media state. */
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
