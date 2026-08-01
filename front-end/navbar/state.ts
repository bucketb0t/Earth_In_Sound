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
import { authClient } from "@/front-end/authentication/auth-client";
import {
  ARTWORK_CELL_SCALE_BASE_HEIGHT,
  BASE_LINE_HEIGHT,
  DESIGN_HEIGHT,
  SECTION_LINKS,
  type KnobSectionId,
  type SectionId,
} from "./config";

// Initial cart counter value used by the navbar state.
const INITIAL_CART_COUNT = 1;

/*
 * Route constants keep navigation targets centralized.
 */
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
  /*
   * Local visual state combines the highlighted route section with latched
   * utility buttons such as Store and Cart. sourcePathname tells the navbar
   * whether this state still belongs to the current route.
   */
  activePage: ActivePage | null;
  eisSliderPos: number;
  isCartPressed: boolean;
  isStorePressed: boolean;
  sourcePathname: string;
}

const NAVBAR_LINK_ROUTES: Partial<
  Record<SectionId, Partial<Record<number, string>>>
> = {
  /*
   * Physical control positions map to routes. Example: EIS slider index 1 is
   * About, so eisNavTo(1) pushes /about.
   */
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
  /*
   * Reverse route lookup. When the page changes by browser history, refresh, or
   * direct URL entry, this tells the navbar which control should look active.
   */
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

/*
 * Public state and actions consumed by every navbar cell.
 */
export interface NavbarState {
  activePage: ActivePage | null;
  eisSliderPos: number;
  isLoggedIn: boolean;
  accountDisplayName: string;
  isAuthPending: boolean;
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
  toggleLogin: () => Promise<void>;
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

// Navigation index guard.
function clampSectionLinkIndex(
  section: SectionId,
  requestedLinkIndex: number,
): number {
  const maxLinkIndex = SECTION_LINKS[section].length - 1;
  if (!Number.isFinite(requestedLinkIndex)) return 0;
  return Math.max(0, Math.min(maxLinkIndex, Math.round(requestedLinkIndex)));
}

function getElementOuterWidth(element: Element): number {
  /*
   * Row measurement needs margins because cell spacing is visual width too.
   */
  if (!(element instanceof HTMLElement)) {
    return element.getBoundingClientRect().width;
  }

  const computedStyle = window.getComputedStyle(element);
  const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
  const marginRight = parseFloat(computedStyle.marginRight) || 0;

  return element.getBoundingClientRect().width + marginLeft + marginRight;
}

function getNavbarContentWidth(contentElement: HTMLDivElement): number {
  /*
   * Prefer children sum because scrollWidth differs across browsers with zoom.
   */
  const childWidth = Array.from(contentElement.children).reduce(
    (totalWidth, childElement) =>
      totalWidth + getElementOuterWidth(childElement),
    0,
  );

  /*
   * Cell-based row width measurement.
   */
  if (childWidth > 0) return childWidth;

  return Math.max(
    contentElement.getBoundingClientRect().width,
    contentElement.scrollWidth,
  );
}

function getLayoutViewportWidth(fallbackElement: HTMLElement): number {
  /*
   * Layout viewport width used for navbar fitting.
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
  /*
   * Route-derived state keeps highlighted controls synced after navigation.
   */
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
  const session = authClient.useSession();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const designContentWidthRef = useRef(0);

  const [scale, setScale] = useState(1);
  const [isScaleReady, setIsScaleReady] = useState(false);
  const [cartCount] = useState(INITIAL_CART_COUNT);
  const [visualState, setVisualState] = useState<NavbarVisualState>(() =>
    getRouteVisualState(pathname, INITIAL_CART_COUNT),
  );

  /*
   * Route changes win over stale local visual state.
   * If navigation has already changed pathname, routeVisualState becomes the
   * source of truth so Store/Cart/knob highlights do not stay stuck.
   */
  const routeVisualState = getRouteVisualState(pathname, cartCount);
  const currentVisualState =
    visualState.sourcePathname === pathname ? visualState : routeVisualState;
  const { activePage, eisSliderPos, isCartPressed, isStorePressed } =
    currentVisualState;
  const isLoggedIn = Boolean(session.data?.user);
  const accountDisplayName = session.data?.user.name ?? "Sign up";

  /*
   * Navbar scale measurement for real window resizing.
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
     * Full-size artwork variables used for baseline measurement.
     * These values establish the unshrunk navbar first. The real scale is then
     * computed from how much room the cell row actually needs.
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
     * Normalized full-scale row width measurement.
     */
    const syncFullScaleNavbarRowWidth = (): number => {
      const renderedNavbarRowWidth = getNavbarContentWidth(contentElement);
      const currentArtworkScale = getCurrentArtworkScale();
      const normalizedNavbarRowWidth =
        renderedNavbarRowWidth * (fullArtworkScale / currentArtworkScale);

      /*
       * Store the last known full-scale width. This avoids losing the original
       * design width after the row has already been scaled down.
       */
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
       * Resize-only viewport width used by the scale calculation.
       * Browser zoom changes CSS pixels and devicePixelRatio together. This
       * normalization lets real window resize shrink the navbar, while browser
       * zoom is allowed to overflow naturally.
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

      /*
       * Avoid tiny floating point updates. Without this guard, ResizeObserver
       * can cause visual jitter by setting almost-identical scale values.
       */
      setScale((currentScale) =>
        Math.abs(currentScale - nextScale) > 0.001 ? nextScale : currentScale,
      );
      setIsScaleReady(true);
    };

    syncScaleFromCellEdges();

    /*
     * Deferred scale sync after viewport and layout changes.
     */
    let firstFrameId: number | null = null;
    let secondFrameId: number | null = null;

    const cancelScheduledScaleSync = () => {
      if (firstFrameId !== null) cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) cancelAnimationFrame(secondFrameId);
      firstFrameId = null;
      secondFrameId = null;
    };

    const scheduleScaleSync = () => {
      cancelScheduledScaleSync();
      firstFrameId = requestAnimationFrame(() => {
        secondFrameId = requestAnimationFrame(() => {
          firstFrameId = null;
          secondFrameId = null;
          syncScaleFromCellEdges();
        });
      });
    };

    const syncAfterVisibilityRestore = () => {
      if (!document.hidden) scheduleScaleSync();
    };

    const shellResizeObserver = new ResizeObserver(scheduleScaleSync);
    const contentResizeObserver = new ResizeObserver(scheduleScaleSync);

    shellResizeObserver.observe(shellElement);
    contentResizeObserver.observe(contentElement);
    Array.from(contentElement.children).forEach((cellElement) => {
      contentResizeObserver.observe(cellElement);
    });

    window.addEventListener("resize", scheduleScaleSync);
    window.addEventListener("focus", scheduleScaleSync);
    window.addEventListener("pageshow", scheduleScaleSync);
    document.addEventListener("visibilitychange", syncAfterVisibilityRestore);

    let fontReadyCancelled = false;
    document.fonts?.ready.then(() => {
      if (!fontReadyCancelled) scheduleScaleSync();
    });

    return () => {
      fontReadyCancelled = true;
      cancelScheduledScaleSync();
      shellResizeObserver.disconnect();
      contentResizeObserver.disconnect();
      window.removeEventListener("resize", scheduleScaleSync);
      window.removeEventListener("focus", scheduleScaleSync);
      window.removeEventListener("pageshow", scheduleScaleSync);
      document.removeEventListener(
        "visibilitychange",
        syncAfterVisibilityRestore,
      );
    };
  }, []);

  /*
   * Utility-cell action reset.
   */
  const resetActiveNavbarControls = useCallback((): void => {
    /*
     * Utility controls like login/account should clear section highlights
     * without changing the current route by themselves.
     */
    setVisualState({
      ...currentVisualState,
      activePage: null,
      isCartPressed: false,
      isStorePressed: false,
      sourcePathname: pathname,
    });
  }, [currentVisualState, pathname]);

  /*
   * Shared route navigation for navbar controls.
   */
  const navigateToLinkedRoute = useCallback(
    (sectionId: SectionId, linkIndex: number): void => {
      /*
       * All navigation goes through this helper so cells do not need to know
       * route strings directly.
       */
      const targetRoute = NAVBAR_LINK_ROUTES[sectionId]?.[linkIndex];
      if (targetRoute) router.push(targetRoute);
    },
    [router],
  );

  const eisNavTo = useCallback((linkIndex: number): void => {
    /*
     * EIS slider/link navigation updates visual state first, then moves the
     * browser route. Clamping protects against invalid slider indexes.
     */
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
      /*
       * Direct knob link clicks choose an exact menu stop.
       */
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
    /*
     * Pressing the knob face cycles through that section's menu stops. If the
     * section was inactive, it starts at the first stop.
     */
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

  const toggleLogin = useCallback(async (): Promise<void> => {
    resetActiveNavbarControls();

    if (!isLoggedIn) {
      router.push(ACCOUNT_ROUTE);
      return;
    }

    const result = await authClient.signOut();
    if (result.error) {
      throw new Error(result.error.message ?? "Sign out failed.");
    }

    await session.refetch();
  }, [isLoggedIn, resetActiveNavbarControls, router, session]);

  const openAccountPage = useCallback((): void => {
    resetActiveNavbarControls();
    router.push(ACCOUNT_ROUTE);
  }, [resetActiveNavbarControls, router]);

  /*
   * Latched Store page action.
   */
  const storePress = useCallback((): void => {
    /*
     * Store is a latched utility action: it clears section highlights and keeps
     * Store visually pressed while the route is /store.
     */
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
    /*
     * Cart can only latch when there is at least one item. The count is still a
     * temporary seed until real cart data exists.
     */
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
    accountDisplayName,
    isAuthPending: session.isPending,
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
