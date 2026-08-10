"use client";

import { useLayoutEffect, useRef } from "react";

import {
  ARTWORK_CELL_SCALE_BASE_HEIGHT,
  DESIGN_HEIGHT,
  BASE_LINE_HEIGHT,
} from "./config";
import {
  getNavbarCellElements,
  getNavbarLayoutViewportWidth,
  measureRenderedNavbarContentWidth,
  readNavbarLayoutHeightFactor,
} from "./layoutGeometry";
import { useNavbarContext } from "./state";

import AccountCell from "./cells/AccountCell/AccountCell";
import CartCell from "./cells/CartCell/CartCell";
import EISLogoCell from "./cells/EISLogoCell/EISLogoCell";
import IHateMusicCell from "./cells/IHateMusicCell/IHateMusicCell";
import JasonWaltonCell from "./cells/JasonWaltonCell/JasonWaltonCell";
import StoreCell from "./cells/StoreCell/StoreCell";

import styles from "./ResponsiveNavbar.module.css";
import compactStyles from "./ResponsiveNavbar.compact.module.css";

interface PointerZoomAnchor {
  pointerX: number;
  viewportWidth: number;
}

/**
 * Converts measured numbers into safe CSS pixel strings.
 *
 * Fractional values are retained so viewport-width CSS variables match the
 * browser's live layout dimensions without introducing cumulative drift.
 */
function toNonNegativePixelValue(rawPixelValue: number): string {
  const safePixelValue = Number.isFinite(rawPixelValue)
    ? Math.max(0, rawPixelValue)
    : 0;

  return `${Math.round(safePixelValue * 1000) / 1000}px`;
}

/**
 * Writes CSS variables only when their value actually changes.
 *
 * This avoids unnecessary style writes during ResizeObserver cycles.
 */
function setCssVariable(
  element: HTMLElement,
  variableName: string,
  cssVariableValue: string,
): void {
  if (element.style.getPropertyValue(variableName) === cssVariableValue) return;
  element.style.setProperty(variableName, cssVariableValue);
}

/**
 * Responsive navbar shell.
 * Paints the shared banner/baseline and positions the independent cells.
 *
 * The same cells are always mounted. Wide CSS flattens the two semantic groups
 * into one row; compact CSS stacks them. Runtime measurement only synchronizes
 * artwork scale and shell geometry with the active CSS layout. Flexbox owns
 * centering so a breakpoint transition cannot latch a stale JavaScript offset.
 */
export default function ResponsiveNavbar() {
  const {
    shellRef,
    contentRef,
    scale,
    isScaleReady,
    isCompactLayout,
  } = useNavbarContext();
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

    const rememberPointerZoomAnchor = (event: PointerEvent) => {
      pointerZoomAnchorRef.current = {
        pointerX: event.clientX,
        viewportWidth: getNavbarLayoutViewportWidth(shellElement),
      };
    };

    const synchronizeHorizontalZoomPosition = (
      visibleViewportWidth: number,
      renderedNavbarRowWidth: number,
    ) => {
      const overflowWidth = renderedNavbarRowWidth - visibleViewportWidth;
      const scrollElement =
        document.scrollingElement ?? document.documentElement;

      if (overflowWidth <= 1) {
        if (scrollElement.scrollLeft !== 0) scrollElement.scrollLeft = 0;
        return;
      }

      const pointerZoomAnchor = pointerZoomAnchorRef.current;
      if (!pointerZoomAnchor || pointerZoomAnchor.viewportWidth <= 0) return;

      const pointerRatio = Math.max(
        0,
        Math.min(
          1,
          pointerZoomAnchor.pointerX / pointerZoomAnchor.viewportWidth,
        ),
      );
      const nextScrollLeft = Math.round(overflowWidth * pointerRatio);

      if (Math.abs(scrollElement.scrollLeft - nextScrollLeft) > 1) {
        scrollElement.scrollLeft = nextScrollLeft;
      }
    };

    const syncNavbarGeometry = () => {
      const layoutHeightFactor = readNavbarLayoutHeightFactor(contentElement);
      const scaledFaceplateHeight =
        (DESIGN_HEIGHT - BASE_LINE_HEIGHT) * scale;

      /*
       * Only control geometry is written here. The banner/baseline are pure
       * viewport paint in CSS, so they cannot feed back into measurements.
       */
      setCssVariable(
        shellElement,
        "--navbar-shell-height",
        `${scaledFaceplateHeight * layoutHeightFactor + BASE_LINE_HEIGHT * scale}px`,
      );
      setCssVariable(
        shellElement,
        "--navbar-line-height",
        `${BASE_LINE_HEIGHT * scale}px`,
      );

      setCssVariable(
        rootElement,
        "--navbar-root-height",
        `${scaledFaceplateHeight * layoutHeightFactor}px`,
      );
      setCssVariable(
        rootElement,
        "--navbar-base-artwork-scale",
        String(
          scaledFaceplateHeight / ARTWORK_CELL_SCALE_BASE_HEIGHT,
        ),
      );

      /*
       * Measure the live layout viewport for the shell and paint layers.
       * The cell row centers itself in CSS and therefore needs no measured left
       * offset or width assignment here. Paint uses the same width so a vertical
       * scrollbar cannot introduce horizontal overflow.
       */
      const visibleViewportWidth = getNavbarLayoutViewportWidth();
      const renderedNavbarRowWidth =
        measureRenderedNavbarContentWidth(contentElement);
      const navbarLayoutWidth = Math.max(
        visibleViewportWidth,
        renderedNavbarRowWidth,
      );

      /*
       * Write layout variables for the shell, banner, and interactive row.
       * CSS consumes these values in ResponsiveNavbar.module.css so browser-specific
       * layout differences are handled by measured numbers, not guessed CSS.
       */
      setCssVariable(
        rootElement,
        "--navbar-layout-width",
        toNonNegativePixelValue(navbarLayoutWidth),
      );
      setCssVariable(
        shellElement,
        "--navbar-layout-width",
        toNonNegativePixelValue(navbarLayoutWidth),
      );
      setCssVariable(
        shellElement,
        "--navbar-paint-width",
        toNonNegativePixelValue(navbarLayoutWidth),
      );

      synchronizeHorizontalZoomPosition(
        visibleViewportWidth,
        renderedNavbarRowWidth,
      );
    };

    syncNavbarGeometry();

    /*
     * Defer geometry sync until viewport and font layout have settled.
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
    const observedCells = getNavbarCellElements(contentElement);

    observedCells.forEach((cellElement) => observer.observe(cellElement));
    window.addEventListener("pointermove", rememberPointerZoomAnchor);
    window.addEventListener("resize", scheduleNavbarGeometrySync);
    window.addEventListener("focus", scheduleNavbarGeometrySync);
    window.addEventListener("pageshow", scheduleNavbarGeometrySync);
    document.addEventListener("visibilitychange", syncAfterVisibilityRestore);

    return () => {
      cancelScheduledNavbarGeometrySync();
      observer.disconnect();
      window.removeEventListener("pointermove", rememberPointerZoomAnchor);
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
    <div
      ref={shellRef}
      data-navbar-layout={isCompactLayout ? "compact" : "wide"}
      className={`${styles.navbarShell} ${
        isScaleReady ? styles.navbarShellReady : ""
      }`}
    >
      {/* Interactive faceplate layer. */}
      <div
        ref={rootRef}
        className={styles.navbarRoot}
        role="navigation"
        aria-label="Earth In Sound site navigation"
      >
        <div className={styles.navbarInner}>
          <div
            ref={contentRef}
            className={`${styles.rowPrimary} ${compactStyles.responsiveRows}`}
          >
            <div
              className={`${styles.layoutRow} ${compactStyles.topRow}`}
              data-navbar-row="primary"
            >
              <EISLogoCell />
              <JasonWaltonCell />
              <IHateMusicCell />
            </div>

            <div
              className={`${styles.layoutRow} ${compactStyles.bottomRow}`}
              data-navbar-row="utility"
            >
              <AccountCell />
              <StoreCell />
              <CartCell />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
