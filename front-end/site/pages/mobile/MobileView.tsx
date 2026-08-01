"use client";

import type { ReactNode } from "react";

import Navbar from "@/front-end/navbar/Navbar";

import styles from "./MobileView.module.css";

interface MobileViewProps {
  children: ReactNode;
}

/**
 * Mobile project view.
 * Owns the mobile navbar and the mobile page frame.
 */
export default function MobileView({ children }: MobileViewProps) {
  return (
    <div className={styles.mobileView}>
      <Navbar variant="mobile" />
      <div className={styles.mobileContent}>{children}</div>
    </div>
  );
}
