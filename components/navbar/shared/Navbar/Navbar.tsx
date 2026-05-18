"use client";

import { useLayoutEffect, useRef } from "react";

import {
  ARTWORK_CELL_SCALE_BASE_HEIGHT,
  DESIGN_HEIGHT,
  BASE_LINE_HEIGHT,
} from "../../config";
import { NavbarContext, useNavbar } from "../../state";

import AccountCell from "../../cells/AccountCell/AccountCell";
import CartCell from "../../cells/CartCell/CartCell";
import EISLogoCell from "../../cells/EISLogoCell/EISLogoCell";
import IHateMusicCell from "../../cells/IHateMusicCell/IHateMusicCell";
import JasonWaltonCell from "../../cells/JasonWaltonCell/JasonWaltonCell";
import StoreCell from "../../cells/StoreCell/StoreCell";

import styles from "./NavbarStyle.module.css";

function toNonNegativePixelValue(rawPixelValue: number): string {
  return `${Math.max(0, Math.ceil(rawPixelValue))}px`;
}

function readHorizontalMarginWidth(element: HTMLElement): number {
  const elementStyles = window.getComputedStyle(element);
  const leftMarginWidth = parseFloat(elementStyles.marginLeft) || 0;
  const rightMarginWidth = parseFloat(elementStyles.marginRight) || 0;

  return leftMarginWidth + rightMarginWidth;
}

function measureRenderedNavbarCellsWidth(contentElement: HTMLDivElement): number {
  const navbarCellElements = Array.from(contentElement.children);

  /*
   * Measure the individual cell boxes instead of the row wrapper. Firefox can
   * report a smaller wrapper width when children visually overflow it, while
   * each child rect remains reliable.
   */
  return navbarCellElements.reduce((totalRenderedWidth, navbarCellElement) => {
    const cellRenderedWidth = navbarCellElement.getBoundingClientRect().width;
    const cellHorizontalMarginWidth =
      navbarCellElement instanceof HTMLElement
        ? readHorizontalMarginWidth(navbarCellElement)
        : 0;

    return totalRenderedWidth + cellRenderedWidth + cellHorizontalMarginWidth;
  }, 0);
}

function setCssVariable(
  element: HTMLElement,
  variableName: string,
  cssVariableValue: string,
): void {
  if (element.style.getPropertyValue(variableName) === cssVariableValue) return;
  element.style.setProperty(variableName, cssVariableValue);
}

/**
 * Navbar shell.
 * Paints the shared banner/baseline and positions the independent cells.
 */
export default function Navbar() {
  const navbarState = useNavbar();
  const { shellRef, contentRef, scale, isScaleReady } = navbarState;
  const rootRef = useRef<HTMLDivElement | null>(null);

  /*
   * Runtime CSS variable sync.
   * This keeps JSX free of inline style attributes while preserving the
   * measured scaling behavior that depends on the live shell width.
   */
  useLayoutEffect(() => {
    const shellElement = shellRef.current;
    const rootElement = rootRef.current;
    const contentElement = contentRef.current;
    if (!shellElement || !rootElement || !contentElement) return;

    const syncNavbarGeometry = () => {
      /*
       * Only control geometry is written here. The banner/baseline are pure
       * viewport paint in CSS, so they cannot feed back into measurements.
       */
      setCssVariable(
        shellElement,
        "--navbar-shell-height",
        `${DESIGN_HEIGHT * scale}px`,
      );
      setCssVariable(
        shellElement,
        "--navbar-line-height",
        `${BASE_LINE_HEIGHT * scale}px`,
      );

      setCssVariable(
        rootElement,
        "--navbar-root-height",
        `${(DESIGN_HEIGHT - BASE_LINE_HEIGHT) * scale}px`,
      );
      setCssVariable(
        rootElement,
        "--artwork-cell-scale",
        String(
          (scale * (DESIGN_HEIGHT - BASE_LINE_HEIGHT)) /
            ARTWORK_CELL_SCALE_BASE_HEIGHT,
        ),
      );

      /*
       * visualViewport is the closest cross-browser answer to "what the user
       * can actually see right now." It avoids mixing layout viewport,
       * scrollbar width, and page overflow rules between Firefox/Safari/Chrome.
       */
      const visibleViewportWidth = Math.round(
        window.visualViewport?.width ??
          document.documentElement.clientWidth ??
          window.innerWidth,
      );
      const renderedNavbarRowWidth = Math.ceil(
        measureRenderedNavbarCellsWidth(contentElement),
      );
      const navbarOverflowLayoutWidth = Math.max(
        visibleViewportWidth,
        renderedNavbarRowWidth,
      );
      const centeredNavbarRowOffset = Math.max(
        0,
        (visibleViewportWidth - renderedNavbarRowWidth) / 2,
      );

      /*
       * Browser-safe row alignment. React writes the same concrete numbers to
       * every browser:
       * - viewport width for the banner/shell
       * - real child-cell row width for the interactive layer
       * - left offset for centering while the row fits
       */
      setCssVariable(
        shellElement,
        "--navbar-viewport-width",
        toNonNegativePixelValue(visibleViewportWidth),
      );
      setCssVariable(
        rootElement,
        "--navbar-layout-width",
        toNonNegativePixelValue(navbarOverflowLayoutWidth),
      );
      setCssVariable(
        rootElement,
        "--navbar-row-width",
        toNonNegativePixelValue(renderedNavbarRowWidth),
      );
      setCssVariable(
        rootElement,
        "--navbar-row-offset",
        toNonNegativePixelValue(centeredNavbarRowOffset),
      );
    };

    syncNavbarGeometry();

    const observer = new ResizeObserver(syncNavbarGeometry);
    const observedCells = Array.from(contentElement.children).filter(
      (childElement): childElement is HTMLElement =>
        childElement instanceof HTMLElement,
    );

    observedCells.forEach((cellElement) => observer.observe(cellElement));
    window.addEventListener("resize", syncNavbarGeometry);
    window.visualViewport?.addEventListener("resize", syncNavbarGeometry);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncNavbarGeometry);
      window.visualViewport?.removeEventListener("resize", syncNavbarGeometry);
    };
  }, [contentRef, scale, shellRef]);

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
          className={styles.navbarRoot}
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
