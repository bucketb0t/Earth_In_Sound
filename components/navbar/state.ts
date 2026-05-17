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

  return element.offsetWidth + marginLeft + marginRight;
}

function getNavbarContentWidth(contentElement: HTMLDivElement): number {
  const childWidth = Array.from(contentElement.children).reduce(
    (totalWidth, childElement) =>
      totalWidth + getElementOuterWidth(childElement),
    0,
  );

  return Math.max(contentElement.scrollWidth, childWidth);
}

/**
 * Shared navbar state and actions.
 * Coordinates active links, scaling, account/store/cart state, and cell actions.
 */
export function useNavbar(): NavbarState {
  const router = useRouter();
  const pathname = usePathname();
  const initialActivePage = ACTIVE_PAGE_BY_ROUTE[pathname] ?? null;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = useState(1);
  const [isScaleReady, setIsScaleReady] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage | null>(
    () => initialActivePage,
  );
  const [eisSliderPos, setEisSliderPos] = useState(
    () =>
      initialActivePage?.section === "eis" ? initialActivePage.linkIndex : 0,
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount] = useState(INITIAL_CART_COUNT);
  const [isCartPressed, setIsCartPressed] = useState(
    () => pathname === CART_ROUTE && INITIAL_CART_COUNT > 0,
  );
  const [isStorePressed, setIsStorePressed] = useState(
    () => pathname === STORE_ROUTE,
  );

  /*
   * Measure before paint, then keep scale synced to real window resizing.
   *
   * Browser zoom also reduces getBoundingClientRect().width. If we used that
   * raw CSS-pixel width directly, the navbar scale would shrink exactly when
   * the browser zoom grows, visually cancelling zoom from about 125% upward.
   *
   * The initial devicePixelRatio is used as this session's zoom baseline, so
   * resizing the browser window still fits the navbar, while browser zoom keeps
   * behaving like real zoom.
   */
  useLayoutEffect(() => {
    const shellElement = shellRef.current;
    const contentElement = contentRef.current;
    if (!shellElement || !contentElement) return;

    const initialPixelRatio = window.devicePixelRatio || 1;

    const getResizeOnlyShellWidth = (): number => {
      const currentPixelRatio = window.devicePixelRatio || initialPixelRatio;
      const zoomRatio = currentPixelRatio / initialPixelRatio;

      return shellElement.getBoundingClientRect().width * zoomRatio;
    };

    const syncScaleFromCellEdges = () => {
      const shellWidth = getResizeOnlyShellWidth();
      const contentWidth = getNavbarContentWidth(contentElement);
      const nextScale =
        contentWidth > 0 ? Math.min(1, shellWidth / contentWidth) : 1;

      setScale(nextScale);
      setIsScaleReady(true);
    };

    syncScaleFromCellEdges();

    const observer = new ResizeObserver(syncScaleFromCellEdges);

    observer.observe(shellElement);
    observer.observe(contentElement);
    window.addEventListener("resize", syncScaleFromCellEdges);
    window.visualViewport?.addEventListener("resize", syncScaleFromCellEdges);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncScaleFromCellEdges);
      window.visualViewport?.removeEventListener(
        "resize",
        syncScaleFromCellEdges,
      );
    };
  }, []);

  /*
   * Store and Cart are latched visual buttons. Any normal navigation action
   * releases them so only the currently accessed navbar area stays pressed.
   */
  const releaseLatchedButtons = useCallback((): void => {
    setIsCartPressed(false);
    setIsStorePressed(false);
  }, []);

  /*
   * Utility cells are outside the EIS/JWW/IHM section selector.
   * Accessing one clears the active section, returning knobs to idle and
   * hiding section cables, then releases any latched utility button.
   */
  const resetActiveNavbarControls = useCallback((): void => {
    setActivePage(null);
    releaseLatchedButtons();
  }, [releaseLatchedButtons]);

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
    setEisSliderPos(clampedEisLinkIndex);
    setActivePage({ section: "eis", linkIndex: clampedEisLinkIndex });
    releaseLatchedButtons();
    navigateToLinkedRoute("eis", clampedEisLinkIndex);
  }, [navigateToLinkedRoute, releaseLatchedButtons]);

  const knobNavTo = useCallback(
    (sectionId: KnobSectionId, linkIndex: number): void => {
      const clampedLinkIndex = clampSectionLinkIndex(sectionId, linkIndex);
      setActivePage({
        section: sectionId,
        linkIndex: clampedLinkIndex,
      });
      releaseLatchedButtons();
      navigateToLinkedRoute(sectionId, clampedLinkIndex);
    },
    [navigateToLinkedRoute, releaseLatchedButtons],
  );

  const knobFacePress = useCallback((sectionId: KnobSectionId): void => {
    const linkCount = SECTION_LINKS[sectionId].length;
    const selectedLinkIndex =
      activePage?.section === sectionId
        ? (activePage.linkIndex + 1) % linkCount
        : 0;

    setActivePage({ section: sectionId, linkIndex: selectedLinkIndex });
    releaseLatchedButtons();
    navigateToLinkedRoute(sectionId, selectedLinkIndex);
  }, [activePage, navigateToLinkedRoute, releaseLatchedButtons]);

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
    setActivePage(null);
    setIsCartPressed(false);
    setIsStorePressed(true);
    router.push(STORE_ROUTE);
  }, [router]);

  const cartPress = useCallback((): void => {
    setActivePage(null);
    setIsStorePressed(false);
    if (cartCount <= 0) return;
    setIsCartPressed(true);
    router.push(CART_ROUTE);
  }, [cartCount, router]);

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
