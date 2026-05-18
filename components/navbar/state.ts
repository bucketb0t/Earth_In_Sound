"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ARTWORK_CELL_SCALE_BASE_HEIGHT,
  BASE_LINE_HEIGHT,
  DESIGN_HEIGHT,
  SECTION_LINKS,
  type KnobSectionId,
  type SectionId,
} from "./config";

// Seeded until the real cart data source exists; keeps the counter testable now.
const INITIAL_CART_COUNT = 1;
const HOME_ROUTE = "/";
const ACCOUNT_ROUTE = "/account";
const CART_ROUTE = "/cart";
const I_HATE_MUSIC_PODCAST_ROUTE = "/i-hate-music/podcast";
const STORE_ROUTE = "/store";

export interface ActivePage {
  section: SectionId;
  linkIndex: number;
}

interface NavbarVisualState {
  activePage: ActivePage | null;
  eisSliderPos: number;
  isCartPressed: boolean;
  isStorePressed: boolean;
  sourcePathname: string;
}

const NAVBAR_LINK_ROUTES: Partial<
  Record<SectionId, Partial<Record<number, string>>>
> = {
  eis: {
    0: HOME_ROUTE,
    1: "/about",
    2: "/contact",
  },
  jw: {
    0: "/jason-walton/biography",
    1: "/jason-walton/discography",
    2: "/jason-walton/production",
  },
  ihm: {
    0: I_HATE_MUSIC_PODCAST_ROUTE,
    1: "/i-hate-music/community",
    2: "/i-hate-music/patreon",
  },
};

const ACTIVE_PAGE_BY_ROUTE: Partial<Record<string, ActivePage>> = {
  [HOME_ROUTE]: { section: "eis", linkIndex: 0 },
  "/about": { section: "eis", linkIndex: 1 },
  "/contact": { section: "eis", linkIndex: 2 },
  "/jason-walton/biography": { section: "jw", linkIndex: 0 },
  "/jason-walton/discography": { section: "jw", linkIndex: 1 },
  "/jason-walton/production": { section: "jw", linkIndex: 2 },
  [I_HATE_MUSIC_PODCAST_ROUTE]: { section: "ihm", linkIndex: 0 },
  "/i-hate-music/community": { section: "ihm", linkIndex: 1 },
  "/i-hate-music/patreon": { section: "ihm", linkIndex: 2 },
};

export interface NavbarState {
  activePage: ActivePage | null;
  eisSliderPos: number;
  isLoggedIn: boolean;
  cartCount: number;
  isStorePressed: boolean;
  shellRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  scale: number;
  isScaleReady: boolean;
  isCartPressed: boolean;
  eisNavTo: (linkIndex: number) => void;
  knobNavTo: (sectionId: KnobSectionId, linkIndex: number) => void;
  knobFacePress: (sectionId: KnobSectionId) => void;
  goHome: () => void;
  toggleLogin: () => void;
  openAccountPage: () => void;
  resetActiveNavbarControls: () => void;
  storePress: () => void;
  cartPress: () => void;
}

export const NavbarContext = createContext<NavbarState | null>(null);

/**
 * Safe context accessor for navbar cells.
 * Fails loudly if a cell is rendered outside Navbar's provider.
 */
export function useNavbarContext(): NavbarState {
  const navbarState = useContext(NavbarContext);
  if (!navbarState) {
    throw new Error("useNavbarContext must be used inside <Navbar />.");
  }
  return navbarState;
}

/**
 * Keyboard helper for custom artwork controls.
 * Gives non-button SVG/div controls native-like Enter and Space activation.
 */
export function activateOnEnterOrSpace<T extends Element>(
  event: KeyboardEvent<T>,
  action: () => void,
): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

// Guards every position-based navigation call before it reaches render state.
function clampSectionLinkIndex(
  section: SectionId,
  requestedLinkIndex: number,
): number {
  const maxLinkIndex = SECTION_LINKS[section].length - 1;
  if (!Number.isFinite(requestedLinkIndex)) return 0;
  return Math.max(0, Math.min(maxLinkIndex, Math.round(requestedLinkIndex)));
}

function getElementOuterWidth(element: Element): number {
  if (!(element instanceof HTMLElement)) {
    return element.getBoundingClientRect().width;
  }

  const computedStyle = window.getComputedStyle(element);
  const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
  const marginRight = parseFloat(computedStyle.marginRight) || 0;

  return element.getBoundingClientRect().width + marginLeft + marginRight;
}

function getNavbarContentWidth(contentElement: HTMLDivElement): number {
  const childWidth = Array.from(contentElement.children).reduce(
    (totalWidth, childElement) =>
      totalWidth + getElementOuterWidth(childElement),
    0,
  );

  /*
   * Child cells are the source of truth. The row wrapper width is also written
   * by Navbar.tsx for overflow layout, so using it first can create feedback.
   */
  if (childWidth > 0) return childWidth;

  return Math.max(
    contentElement.getBoundingClientRect().width,
    contentElement.scrollWidth,
  );
}

function getLayoutViewportWidth(fallbackElement: HTMLElement): number {
  /*
   * Use the layout viewport as the single source of truth for navbar fitting.
   * `visualViewport` differs between desktop browsers under zoom; the layout
   * viewport is the stable width used by normal page layout and scrollbars.
   */
  return (
    document.documentElement.clientWidth ||
    window.innerWidth ||
    fallbackElement.getBoundingClientRect().width
  );
}

function getRouteVisualState(
  pathname: string,
  cartCount: number,
): NavbarVisualState {
  const routeActivePage = ACTIVE_PAGE_BY_ROUTE[pathname] ?? null;

  return {
    activePage: routeActivePage,
    eisSliderPos:
      routeActivePage?.section === "eis" ? routeActivePage.linkIndex : 0,
    isCartPressed: pathname === CART_ROUTE && cartCount > 0,
    isStorePressed: pathname === STORE_ROUTE,
    sourcePathname: pathname,
  };
}

/**
 * Shared navbar state and actions.
 * Coordinates active links, scaling, account/store/cart state, and cell actions.
 */
export function useNavbar(): NavbarState {
  const router = useRouter();
  const pathname = usePathname();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const designContentWidthRef = useRef(0);

  const [scale, setScale] = useState(1);
  const [isScaleReady, setIsScaleReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount] = useState(INITIAL_CART_COUNT);
  const [visualState, setVisualState] = useState<NavbarVisualState>(() =>
    getRouteVisualState(pathname, INITIAL_CART_COUNT),
  );
  const routeVisualState = getRouteVisualState(pathname, cartCount);
  const currentVisualState =
    visualState.sourcePathname === pathname ? visualState : routeVisualState;
  const { activePage, eisSliderPos, isCartPressed, isStorePressed } =
    currentVisualState;

  /*
   * Measure before paint, then keep scale synced to real window resizing.
   *
   * Browser zoom reduces the CSS viewport width, but it should not be treated
   * as a small window. The scale calculation keeps the viewport zoom-neutral:
   * real window resizing can shrink the navbar, while browser zoom creates
   * natural horizontal page overflow.
   */
  useLayoutEffect(() => {
    const shellElement = shellRef.current;
    const contentElement = contentRef.current;
    const rootElement = contentElement?.parentElement?.parentElement;
    if (!shellElement || !contentElement || !(rootElement instanceof HTMLElement)) {
      return;
    }

    const faceplateHeight = DESIGN_HEIGHT - BASE_LINE_HEIGHT;
    const fullArtworkScale = faceplateHeight / ARTWORK_CELL_SCALE_BASE_HEIGHT;

    /*
     * The first measurement must represent the unscaled artwork design.
     * These defaults are written before measuring so the stored width does not
     * depend on CSS fallback values or on a previously shrunken render.
     */
    shellElement.style.setProperty("--navbar-shell-height", `${DESIGN_HEIGHT}px`);
    shellElement.style.setProperty(
      "--navbar-line-height",
      `${BASE_LINE_HEIGHT}px`,
    );

    rootElement.style.setProperty("--navbar-root-height", `${faceplateHeight}px`);
    rootElement.style.setProperty(
      "--artwork-cell-scale",
      String(fullArtworkScale),
    );

    const baselineDevicePixelRatio = window.devicePixelRatio || 1;

    const getCurrentArtworkScale = (): number => {
      const currentArtworkScale = parseFloat(
        rootElement.style.getPropertyValue("--artwork-cell-scale") ||
          window
            .getComputedStyle(rootElement)
            .getPropertyValue("--artwork-cell-scale"),
      );

      return Number.isFinite(currentArtworkScale) && currentArtworkScale > 0
        ? currentArtworkScale
        : fullArtworkScale;
    };

    /*
     * Fonts and SVG artwork can settle after the first layout pass,
     * especially in Firefox. The measured row is normalized back to the
     * full artwork scale so the stored design width stays browser-stable.
     */
    const syncFullScaleNavbarRowWidth = (): number => {
      const renderedNavbarRowWidth = getNavbarContentWidth(contentElement);
      const currentArtworkScale = getCurrentArtworkScale();
      const normalizedNavbarRowWidth =
        renderedNavbarRowWidth * (fullArtworkScale / currentArtworkScale);

      if (normalizedNavbarRowWidth > 0) {
        designContentWidthRef.current = normalizedNavbarRowWidth;
      }

      return designContentWidthRef.current;
    };

    const getResizeOnlyViewportWidth = (): number => {
      const currentDevicePixelRatio =
        window.devicePixelRatio || baselineDevicePixelRatio;
      const cssViewportWidth = getLayoutViewportWidth(shellElement);

      /*
       * At the same browser zoom, this is the real content viewport width.
       * When the user zooms in, CSS viewport width shrinks while DPR grows;
       * multiplying by the DPR ratio prevents that zoom from shrinking navbar
       * scale and lets normal horizontal scrolling handle the larger page.
       */
      return (
        cssViewportWidth *
        (currentDevicePixelRatio / baselineDevicePixelRatio)
      );
    };

    const syncScaleFromCellEdges = () => {
      const resizeOnlyViewportWidth = getResizeOnlyViewportWidth();
      const fullScaleNavbarRowWidth = syncFullScaleNavbarRowWidth();
      const nextScale =
        fullScaleNavbarRowWidth > 0
          ? Math.min(1, resizeOnlyViewportWidth / fullScaleNavbarRowWidth)
          : 1;

      setScale((currentScale) =>
        Math.abs(currentScale - nextScale) > 0.001 ? nextScale : currentScale,
      );
      setIsScaleReady(true);
    };

    syncScaleFromCellEdges();

    const shellResizeObserver = new ResizeObserver(syncScaleFromCellEdges);
    const contentResizeObserver = new ResizeObserver(syncScaleFromCellEdges);

    shellResizeObserver.observe(shellElement);
    contentResizeObserver.observe(contentElement);
    Array.from(contentElement.children).forEach((cellElement) => {
      contentResizeObserver.observe(cellElement);
    });

    window.addEventListener("resize", syncScaleFromCellEdges);

    let fontReadyCancelled = false;
    document.fonts?.ready.then(() => {
      if (!fontReadyCancelled) syncScaleFromCellEdges();
    });

    return () => {
      fontReadyCancelled = true;
      shellResizeObserver.disconnect();
      contentResizeObserver.disconnect();
      window.removeEventListener("resize", syncScaleFromCellEdges);
    };
  }, []);

  /*
   * Utility cells are outside the EIS/JWW/IHM section selector.
   * Accessing one clears the active section on the current route, returning
   * knobs to idle and hiding section cables.
   */
  const resetActiveNavbarControls = useCallback((): void => {
    setVisualState({
      ...currentVisualState,
      activePage: null,
      isCartPressed: false,
      isStorePressed: false,
      sourcePathname: pathname,
    });
  }, [currentVisualState, pathname]);

  /*
   * Routes are attached to the shared navbar actions, not to individual cells.
   * That keeps logos, labels, sliders, and knob selections in sync.
   */
  const navigateToLinkedRoute = useCallback(
    (sectionId: SectionId, linkIndex: number): void => {
      const targetRoute = NAVBAR_LINK_ROUTES[sectionId]?.[linkIndex];
      if (targetRoute) router.push(targetRoute);
    },
    [router],
  );

  const eisNavTo = useCallback((linkIndex: number): void => {
    const clampedEisLinkIndex = clampSectionLinkIndex("eis", linkIndex);
    setVisualState({
      activePage: { section: "eis", linkIndex: clampedEisLinkIndex },
      eisSliderPos: clampedEisLinkIndex,
      isCartPressed: false,
      isStorePressed: false,
      sourcePathname: pathname,
    });
    navigateToLinkedRoute("eis", clampedEisLinkIndex);
  }, [navigateToLinkedRoute, pathname]);

  const knobNavTo = useCallback(
    (sectionId: KnobSectionId, linkIndex: number): void => {
      const clampedLinkIndex = clampSectionLinkIndex(sectionId, linkIndex);
      setVisualState({
        activePage: { section: sectionId, linkIndex: clampedLinkIndex },
        eisSliderPos: 0,
        isCartPressed: false,
        isStorePressed: false,
        sourcePathname: pathname,
      });
      navigateToLinkedRoute(sectionId, clampedLinkIndex);
    },
    [navigateToLinkedRoute, pathname],
  );

  const knobFacePress = useCallback((sectionId: KnobSectionId): void => {
    const linkCount = SECTION_LINKS[sectionId].length;
    const selectedLinkIndex =
      activePage?.section === sectionId
        ? (activePage.linkIndex + 1) % linkCount
        : 0;

    setVisualState({
      activePage: { section: sectionId, linkIndex: selectedLinkIndex },
      eisSliderPos: 0,
      isCartPressed: false,
      isStorePressed: false,
      sourcePathname: pathname,
    });
    navigateToLinkedRoute(sectionId, selectedLinkIndex);
  }, [activePage, navigateToLinkedRoute, pathname]);

  const goHome = useCallback((): void => {
    eisNavTo(0);
  }, [eisNavTo]);

  const toggleLogin = useCallback((): void => {
    setIsLoggedIn((wasLoggedIn) => !wasLoggedIn);
    resetActiveNavbarControls();
  }, [resetActiveNavbarControls]);

  const openAccountPage = useCallback((): void => {
    resetActiveNavbarControls();
    router.push(ACCOUNT_ROUTE);
  }, [resetActiveNavbarControls, router]);

  /*
   * Store behaves like a latched page button.
   * Once activated it stays visually pressed until another section is opened.
   */
  const storePress = useCallback((): void => {
    setVisualState({
      activePage: null,
      eisSliderPos: 0,
      isCartPressed: false,
      isStorePressed: true,
      sourcePathname: pathname,
    });
    router.push(STORE_ROUTE);
  }, [pathname, router]);

  const cartPress = useCallback((): void => {
    if (cartCount <= 0) return;
    setVisualState({
      activePage: null,
      eisSliderPos: 0,
      isCartPressed: true,
      isStorePressed: false,
      sourcePathname: pathname,
    });
    router.push(CART_ROUTE);
  }, [cartCount, pathname, router]);

  return {
    activePage,
    eisSliderPos,
    isLoggedIn,
    cartCount,
    shellRef,
    contentRef,
    scale,
    isScaleReady,
    isStorePressed,
    eisNavTo,
    knobNavTo,
    knobFacePress,
    goHome,
    toggleLogin,
    openAccountPage,
    resetActiveNavbarControls,
    storePress,
    cartPress,
    isCartPressed,
  };
}
