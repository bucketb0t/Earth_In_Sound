"use client";

import type { ReactNode } from "react";

import Navbar from "@/front-end/navbar/Navbar";

import styles from "./DesktopView.module.css";

interface DesktopViewProps {
  children: ReactNode;
}

/**
 * Desktop project view.
 * Owns the desktop navbar and the desktop page frame.
 */
export default function DesktopView({ children }: DesktopViewProps) {
  return (
    <div className={styles.desktopView}>
      <Navbar variant="desktop" />
      <div className={styles.desktopContent}>{children}</div>
    </div>
  );
}
