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

/** Preserve fractional pixels to avoid cumulative layout drift. */
function toNonNegativePixelValue(rawPixelValue: number): string {
  const safePixelValue = Number.isFinite(rawPixelValue)
    ? Math.max(0, rawPixelValue)
    : 0;

  return `${Math.round(safePixelValue * 1000) / 1000}px`;
}

/** Skip unchanged CSS values to avoid redundant observer-driven writes. */
function setCssVariable(
  element: HTMLElement,
  variableName: string,
  cssVariableValue: string,
): void {
  if (element.style.getPropertyValue(variableName) === cssVariableValue) return;
  element.style.setProperty(variableName, cssVariableValue);
}

/**
 * Keep controls mounted while CSS switches row arrangements and owns centering.
 * Measurements synchronize artwork scale and shell geometry.
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

  /* Sync measured geometry through CSS variables. */
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

      /* Measure control geometry only; decorative paint must not affect sizing. */
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

      /* Use scrollbar-free layout width for paint; CSS handles row centering. */
      const visibleViewportWidth = getNavbarLayoutViewportWidth();
      const renderedNavbarRowWidth =
        measureRenderedNavbarContentWidth(contentElement);
      const navbarLayoutWidth = Math.max(
        visibleViewportWidth,
        renderedNavbarRowWidth,
      );

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

    /* Sync geometry after viewport and font layout settle. */
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
