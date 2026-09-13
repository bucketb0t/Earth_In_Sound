/** Measure the CSS-selected arrangement: stacked compact rows or one flattened wide row. */

const DEFAULT_LAYOUT_HEIGHT_FACTOR = 1;
/* Ignore subpixel rendering jitter. */
const DIMENSION_EPSILON_PX = 0.1;
const DEVICE_PIXEL_RATIO_EPSILON = 0.001;
const NORMAL_BROWSER_FRAME_MAX_PX = 64;
const SCREEN_VIEWPORT_TOLERANCE_RATIO = 0.02;

export interface NavbarWindowMetrics {
  /** Reported viewport width, including the scrollbar gutter. */
  viewportWidth: number;
  /** Content width, excluding the scrollbar gutter. */
  layoutViewportWidth: number;
  outerWidth: number;
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;
}

export function getNavbarLayoutViewportWidth(
  fallbackElement?: HTMLElement,
): number {
  return (
    document.documentElement.clientWidth ||
    window.innerWidth ||
    fallbackElement?.getBoundingClientRect().width ||
    0
  );
}

/** Capture metrics that distinguish page zoom from window or device resizing. */
export function readNavbarWindowMetrics(
  fallbackElement?: HTMLElement,
): NavbarWindowMetrics {
  const layoutViewportWidth =
    getNavbarLayoutViewportWidth(fallbackElement);

  return {
    viewportWidth:
      Number.isFinite(window.innerWidth) && window.innerWidth > 0
        ? window.innerWidth
        : layoutViewportWidth,
    layoutViewportWidth,
    outerWidth:
      Number.isFinite(window.outerWidth) && window.outerWidth > 0
        ? window.outerWidth
        : 0,
    devicePixelRatio:
      Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0
        ? window.devicePixelRatio
        : 1,
    screenWidth:
      Number.isFinite(window.screen?.width) && window.screen.width > 0
        ? window.screen.width
        : 0,
    screenHeight:
      Number.isFinite(window.screen?.height) && window.screen.height > 0
        ? window.screen.height
        : 0,
  };
}

function dimensionsDiffer(first: number, second: number): boolean {
  return Math.abs(first - second) > DIMENSION_EPSILON_PX;
}

function viewportMatchesReportedScreen(
  metrics: NavbarWindowMetrics,
): boolean {
  if (metrics.screenWidth <= 0) return false;

  const tolerance = Math.max(
    2,
    metrics.screenWidth * SCREEN_VIEWPORT_TOLERANCE_RATIO,
  );

  return Math.abs(metrics.viewportWidth - metrics.screenWidth) <= tolerance;
}

/**
 * Use the initial viewport at normal zoom or in device emulation.
 * Otherwise use outerWidth to establish a zoom-independent reference.
 */
export function getInitialNavbarReferenceWidth(
  metrics: NavbarWindowMetrics,
  viewportMetric: "viewportWidth" | "layoutViewportWidth" = "viewportWidth",
): number {
  const viewportWidth = metrics[viewportMetric];
  if (metrics.outerWidth <= 0) return viewportWidth;

  const outerViewportDifference = Math.abs(
    metrics.outerWidth - viewportWidth,
  );
  const viewportLooksEmulated =
    viewportMatchesReportedScreen({
      ...metrics,
      viewportWidth,
    }) &&
    outerViewportDifference > NORMAL_BROWSER_FRAME_MAX_PX;

  if (viewportLooksEmulated) return viewportWidth;
  if (
    metrics.outerWidth >= viewportWidth &&
    outerViewportDifference <= NORMAL_BROWSER_FRAME_MAX_PX
  ) {
    return viewportWidth;
  }

  return metrics.outerWidth;
}

/** Update width references on real resizing while preserving them across page zoom. */
export function resolveNavbarReferenceWidth(
  previousMetrics: NavbarWindowMetrics,
  currentMetrics: NavbarWindowMetrics,
  previousReferenceWidth: number,
  viewportMetric: "viewportWidth" | "layoutViewportWidth" = "viewportWidth",
): number {
  const previousViewportWidth = previousMetrics[viewportMetric];
  const currentViewportWidth = currentMetrics[viewportMetric];
  const viewportChanged = dimensionsDiffer(
    previousViewportWidth,
    currentViewportWidth,
  );
  const outerWidthChanged = dimensionsDiffer(
    previousMetrics.outerWidth,
    currentMetrics.outerWidth,
  );
  const devicePixelRatioChanged =
    Math.abs(
      previousMetrics.devicePixelRatio - currentMetrics.devicePixelRatio,
    ) > DEVICE_PIXEL_RATIO_EPSILON;
  const screenContextChanged =
    dimensionsDiffer(
      previousMetrics.screenWidth,
      currentMetrics.screenWidth,
    ) ||
    dimensionsDiffer(
      previousMetrics.screenHeight,
      currentMetrics.screenHeight,
    );

  if (!viewportChanged && !outerWidthChanged) return previousReferenceWidth;

  const pageZoomChanged =
    viewportChanged &&
    !outerWidthChanged &&
    devicePixelRatioChanged &&
    !screenContextChanged;

  if (pageZoomChanged) return previousReferenceWidth;

  if (!outerWidthChanged) {
    // Emulation and orientation can resize content without resizing the host window.
    return currentViewportWidth;
  }

  if (viewportMatchesReportedScreen(currentMetrics)) {
    return getInitialNavbarReferenceWidth(currentMetrics, viewportMetric);
  }

  const previousOuterWidth = previousMetrics.outerWidth;
  const referenceToOuterRatio =
    previousOuterWidth > 0
      ? previousReferenceWidth / previousOuterWidth
      : 1;

  // Preserve the browser-frame correction during window resizing.
  return Math.max(0, currentMetrics.outerWidth * referenceToOuterRatio);
}

export function getNavbarRowElements(
  contentElement: HTMLElement,
): HTMLElement[] {
  return Array.from(contentElement.children).filter(
    (childElement): childElement is HTMLElement =>
      childElement instanceof HTMLElement &&
      childElement.hasAttribute("data-navbar-row"),
  );
}

export function getNavbarCellElements(
  contentElement: HTMLElement,
): HTMLElement[] {
  const rowElements = getNavbarRowElements(contentElement);

  if (rowElements.length === 0) {
    return Array.from(contentElement.children).filter(
      (childElement): childElement is HTMLElement =>
        childElement instanceof HTMLElement,
    );
  }

  return rowElements.flatMap((rowElement) =>
    Array.from(rowElement.children).filter(
      (childElement): childElement is HTMLElement =>
        childElement instanceof HTMLElement,
    ),
  );
}

function getElementOuterWidth(element: HTMLElement): number {
  const computedStyle = window.getComputedStyle(element);
  const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
  const marginRight = parseFloat(computedStyle.marginRight) || 0;

  return element.getBoundingClientRect().width + marginLeft + marginRight;
}

function getNavbarRowWidth(rowElement: HTMLElement): number {
  const childElements = Array.from(rowElement.children);
  const childrenWidth = childElements.reduce((rowWidth, childElement) => {
    return (
      rowWidth +
      (childElement instanceof HTMLElement
        ? getElementOuterWidth(childElement)
        : childElement.getBoundingClientRect().width)
    );
  }, 0);
  const parsedColumnGap = parseFloat(
    window.getComputedStyle(rowElement).columnGap,
  );
  const columnGap = Number.isFinite(parsedColumnGap) ? parsedColumnGap : 0;

  return childrenWidth + columnGap * Math.max(0, childElements.length - 1);
}

export function measureRenderedNavbarContentWidth(
  contentElement: HTMLElement,
): number {
  const rowElements = getNavbarRowElements(contentElement);

  if (rowElements.length === 0) {
    return getNavbarCellElements(contentElement).reduce(
      (totalWidth, cellElement) => totalWidth + getElementOuterWidth(cellElement),
      0,
    );
  }

  const renderedRowWidths = rowElements.map(getNavbarRowWidth);
  const rowsAreStacked = navbarRowsAreStacked(contentElement);

  return rowsAreStacked
    ? Math.max(0, ...renderedRowWidths)
    : renderedRowWidths.reduce((totalWidth, rowWidth) => totalWidth + rowWidth, 0);
}

export function navbarRowsAreStacked(contentElement: HTMLElement): boolean {
  return window.getComputedStyle(contentElement).flexDirection === "column";
}

export function readNavbarLayoutHeightFactor(
  contentElement: HTMLElement,
): number {
  const rawFactor = window
    .getComputedStyle(contentElement)
    .getPropertyValue("--navbar-layout-height-factor");
  const parsedFactor = parseFloat(rawFactor);

  return Number.isFinite(parsedFactor) && parsedFactor > 0
    ? parsedFactor
    : DEFAULT_LAYOUT_HEIGHT_FACTOR;
}
