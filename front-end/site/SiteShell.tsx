import type { ReactNode } from "react";

import Navbar from "@/front-end/navbar/Navbar";

import styles from "./SiteShell.module.css";

interface SiteShellProps {
  children: ReactNode;
}

/** Persistent site frame containing the navbar and current page. */
export default function SiteShell({ children }: SiteShellProps) {
  return (
    <div className={styles.siteView}>
      <Navbar />
      <div className={styles.siteContent}>{children}</div>
    </div>
  );
}
