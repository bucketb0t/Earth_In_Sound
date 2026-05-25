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

interface PointerZoomAnchor {
  pointerX: number;
  viewportWidth: number;
}

function toNonNegativePixelValue(rawPixelValue: number): string {
  return `${Math.max(0, Math.ceil(rawPixelValue))}px`;
}

function getLayoutViewportWidth(): number {
  /*
   * Match state.ts: use the layout viewport, not visualViewport. Firefox,
   * Chrome, and Safari disagree less here, and this is the width that creates
   * the browser's native horizontal scrollbar.
   */
  return document.documentElement.clientWidth || window.innerWidth;
}

function getPaintViewportWidth(layoutViewportWidth: number): number {
  /*
   * Layout width and paint width are intentionally separate.
   * clientWidth excludes the vertical scrollbar gutter, which is correct for
   * fitting cells. innerWidth includes that gutter, which prevents a thin body
   * colored strip from appearing beside the navbar after restore/refresh.
   */
  return Math.max(layoutViewportWidth, window.innerWidth || 0);
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
  const pointerZoomAnchorRef = useRef<PointerZoomAnchor | null>(null);

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

    /*
     * Window minimize/restore can leave a stale horizontal scroll value behind.
     * If the measured row fits again, reset the document to the normal left
     * edge. When the row is wider, native browser scrolling remains in charge.
     */
    const clearStaleHorizontalScrollWhenRowFits = (
      visibleViewportWidth: number,
      renderedNavbarRowWidth: number,
    ) => {
      const overflowWidth = renderedNavbarRowWidth - visibleViewportWidth;
      if (overflowWidth > 1) return;

      const scrollElement =
        document.scrollingElement ?? document.documentElement;

      if (scrollElement.scrollLeft !== 0) {
        scrollElement.scrollLeft = 0;
      }
    };

    const rememberPointerZoomAnchor = (event: MouseEvent | PointerEvent) => {
      /*
       * Browser zoom changes viewport width after this event. Storing the last
       * pointer position lets us restore a mouse-centered horizontal view once
       * the navbar becomes wider than the viewport.
       */
      pointerZoomAnchorRef.current = {
        pointerX: event.clientX,
        viewportWidth: getLayoutViewportWidth(),
      };
    };

    const scrollOverflowTowardPointer = (
      visibleViewportWidth: number,
      renderedNavbarRowWidth: number,
    ) => {
      const overflowWidth = renderedNavbarRowWidth - visibleViewportWidth;
      const pointerZoomAnchor = pointerZoomAnchorRef.current;
      if (overflowWidth <= 1 || !pointerZoomAnchor) return;

      const scrollElement =
        document.scrollingElement ?? document.documentElement;
      const pointerRatio = Math.max(
        0,
        Math.min(1, pointerZoomAnchor.pointerX / pointerZoomAnchor.viewportWidth),
      );
      const nextScrollLeft = Math.round(overflowWidth * pointerRatio);

      if (Math.abs(scrollElement.scrollLeft - nextScrollLeft) > 1) {
        scrollElement.scrollLeft = nextScrollLeft;
      }
    };

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
       * The layout viewport is the browser-stable sizing contract. Using the
       * same width here and in state.ts keeps Firefox from entering overflow
       * mode earlier than Chrome/Edge.
       */
      const visibleViewportWidth = Math.round(getLayoutViewportWidth());
      const paintViewportWidth = Math.round(
        getPaintViewportWidth(visibleViewportWidth),
      );
      const renderedNavbarRowWidth = Math.round(
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
       * - scrollable layout width for the banner/shell and interactive layer
       * - real child-cell row width for the interactive layer
       * - left offset for centering while the row fits
       */
      setCssVariable(
        rootElement,
        "--navbar-layout-width",
        toNonNegativePixelValue(navbarOverflowLayoutWidth),
      );
      setCssVariable(
        shellElement,
        "--navbar-layout-width",
        toNonNegativePixelValue(navbarOverflowLayoutWidth),
      );
      setCssVariable(
        shellElement,
        "--navbar-paint-width",
        toNonNegativePixelValue(Math.max(paintViewportWidth, renderedNavbarRowWidth)),
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

      scrollOverflowTowardPointer(visibleViewportWidth, renderedNavbarRowWidth);
      clearStaleHorizontalScrollWhenRowFits(
        visibleViewportWidth,
        renderedNavbarRowWidth,
      );
    };

    syncNavbarGeometry();

    /*
     * Browser restore/focus events can fire before layout has fully settled.
     * Two animation frames let Chrome, Firefox, and Safari finish viewport and
     * font/layout updates before we write the final CSS variables.
     */
    let firstFrameId: number | null = null;
    let secondFrameId: number | null = null;

    const cancelScheduledNavbarGeometrySync = () => {
      if (firstFrameId !== null) cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) cancelAnimationFrame(secondFrameId);
      firstFrameId = null;
      secondFrameId = null;
    };

    const scheduleNavbarGeometrySync = () => {
      cancelScheduledNavbarGeometrySync();
      firstFrameId = requestAnimationFrame(() => {
        secondFrameId = requestAnimationFrame(() => {
          firstFrameId = null;
          secondFrameId = null;
          syncNavbarGeometry();
        });
      });
    };

    const syncAfterVisibilityRestore = () => {
      if (!document.hidden) scheduleNavbarGeometrySync();
    };

    const observer = new ResizeObserver(scheduleNavbarGeometrySync);
    const observedCells = Array.from(contentElement.children).filter(
      (childElement): childElement is HTMLElement =>
        childElement instanceof HTMLElement,
    );

    observedCells.forEach((cellElement) => observer.observe(cellElement));
    window.addEventListener("pointermove", rememberPointerZoomAnchor);
    window.addEventListener("mousemove", rememberPointerZoomAnchor);
    window.addEventListener("resize", scheduleNavbarGeometrySync);
    window.addEventListener("focus", scheduleNavbarGeometrySync);
    window.addEventListener("pageshow", scheduleNavbarGeometrySync);
    document.addEventListener("visibilitychange", syncAfterVisibilityRestore);

    return () => {
      cancelScheduledNavbarGeometrySync();
      observer.disconnect();
      window.removeEventListener("pointermove", rememberPointerZoomAnchor);
      window.removeEventListener("mousemove", rememberPointerZoomAnchor);
      window.removeEventListener("resize", scheduleNavbarGeometrySync);
      window.removeEventListener("focus", scheduleNavbarGeometrySync);
      window.removeEventListener("pageshow", scheduleNavbarGeometrySync);
      document.removeEventListener(
        "visibilitychange",
        syncAfterVisibilityRestore,
      );
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
