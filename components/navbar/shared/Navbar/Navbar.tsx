"use client";

import localFont from "next/font/local";
import { useLayoutEffect, useRef } from "react";

import {
  DESIGN_HEIGHT,
  BASE_LINE_HEIGHT,
  NAVBAR_VISUAL_WIDTH_PERCENT,
} from "../../config";
import { NavbarContext, useNavbar } from "../../state";

import AccountCell from "../../cells/AccountCell/AccountCell";
import CartCell from "../../cells/CartCell/CartCell";
import EISLogoCell from "../../cells/EISLogoCell/EISLogoCell";
import IHateMusicCell from "../../cells/IHateMusicCell/IHateMusicCell";
import JasonWaltonCell from "../../cells/JasonWaltonCell/JasonWaltonCell";
import StoreCell from "../../cells/StoreCell/StoreCell";

import styles from "./NavbarStyle.module.css";

const futuraHeavy = localFont({
  src: "../../NavbarAssets/Fonts/FuturaHeavy_GeneralCaps.ttf",
  variable: "--font-futura-heavy",
});

/**
 * Navbar shell.
 * Paints the shared banner/baseline and positions the independent cells.
 */
export default function Navbar() {
  const navbarState = useNavbar();
  const { shellRef, contentRef, scale, isScaleReady } = navbarState;
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Compensates for transform scale so the final visual width stays exact.
  const compensatedRootWidth =
    scale > 0
      ? `${(NAVBAR_VISUAL_WIDTH_PERCENT / scale).toFixed(4)}%`
      : `${NAVBAR_VISUAL_WIDTH_PERCENT}%`;

  /*
   * Runtime CSS variable sync.
   * This keeps JSX free of inline style attributes while preserving the
   * measured scaling behavior that depends on the live shell width.
   */
  useLayoutEffect(() => {
    const shellElement = shellRef.current;
    const rootElement = rootRef.current;
    if (!shellElement || !rootElement) return;

    shellElement.style.setProperty(
      "--navbar-shell-height",
      `${DESIGN_HEIGHT * scale}px`,
    );
    shellElement.style.setProperty(
      "--navbar-line-height",
      `${BASE_LINE_HEIGHT * scale}px`,
    );
    rootElement.style.setProperty("--navbar-scale", String(scale));
    rootElement.style.setProperty("--navbar-root-width", compensatedRootWidth);
    rootElement.style.setProperty(
      "--navbar-root-height",
      `${DESIGN_HEIGHT - BASE_LINE_HEIGHT}px`,
    );
  }, [compensatedRootWidth, scale, shellRef]);

  return (
    <NavbarContext.Provider value={navbarState}>
      <div
        ref={shellRef}
        className={`${styles.navbarShell} ${
          isScaleReady ? styles.navbarShellReady : ""
        }`}
      >
        {/* Interactive faceplate: excludes the reserved baseline height. */}
        <div
          ref={rootRef}
          className={`${futuraHeavy.variable} ${styles.navbarRoot}`}
          role="navigation"
          aria-label="Earth In Sound site navigation"
        >
          <div className={styles.navbarInner}>
            <div ref={contentRef} className={styles.rowPrimary}>
              <EISLogoCell />
              <JasonWaltonCell />
              <IHateMusicCell />
              <AccountCell />
              <StoreCell />
              <CartCell />
            </div>
          </div>
        </div>
      </div>
    </NavbarContext.Provider>
  );
}
