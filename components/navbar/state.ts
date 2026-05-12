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
import {
  SECTION_LINKS,
  type KnobSectionId,
  type SectionId,
} from "./config";

// Seeded until the real cart data source exists; keeps the counter testable now.
const INITIAL_CART_COUNT = 1;

export interface ActivePage {
  section: SectionId;
  linkIndex: number;
}

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

/**
 * Shared navbar state and actions.
 * Coordinates active links, scaling, account/store/cart state, and cell actions.
 */
export function useNavbar(): NavbarState {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = useState(1);
  const [isScaleReady, setIsScaleReady] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage | null>(null);
  const [eisSliderPos, setEisSliderPos] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount] = useState(INITIAL_CART_COUNT);
  const [isCartPressed, setIsCartPressed] = useState(false);
  const [isStorePressed, setIsStorePressed] = useState(false);

  /*
   * Measure before paint, then keep scale synced to the real cell edges.
   * Browser zoom changes CSS pixel width, so the shell width is normalized
   * by devicePixelRatio before deciding whether the navbar should shrink.
   * This keeps zoom under browser control while preserving real resize fitting.
   */
  useLayoutEffect(() => {
    const shellElement = shellRef.current;
    const contentElement = contentRef.current;
    if (!shellElement || !contentElement) return;

    const initialPixelRatio = window.devicePixelRatio || 1;

    const getZoomNeutralShellWidth = (): number => {
      const currentPixelRatio = window.devicePixelRatio || initialPixelRatio;
      const zoomRatio = currentPixelRatio / initialPixelRatio;

      return shellElement.getBoundingClientRect().width * zoomRatio;
    };

    const syncScaleFromCellEdges = () => {
      const shellWidth = getZoomNeutralShellWidth();
      const contentWidth = contentElement.scrollWidth;
      const nextScale =
        contentWidth > 0 ? Math.min(1, shellWidth / contentWidth) : 1;

      setScale(nextScale);
      setIsScaleReady(true);
    };

    syncScaleFromCellEdges();

    const observer = new ResizeObserver(syncScaleFromCellEdges);

    observer.observe(shellElement);
    observer.observe(contentElement);
    return () => observer.disconnect();
  }, []);

  const eisNavTo = useCallback((linkIndex: number): void => {
    const clampedEisLinkIndex = clampSectionLinkIndex("eis", linkIndex);
    setEisSliderPos(clampedEisLinkIndex);
    setActivePage({ section: "eis", linkIndex: clampedEisLinkIndex });
    setIsCartPressed(false);
    setIsStorePressed(false);
  }, []);

  const knobNavTo = useCallback(
    (sectionId: KnobSectionId, linkIndex: number): void => {
      setActivePage({
        section: sectionId,
        linkIndex: clampSectionLinkIndex(sectionId, linkIndex),
      });
      setIsCartPressed(false);
      setIsStorePressed(false);
    },
    [],
  );

  const knobFacePress = useCallback((sectionId: KnobSectionId): void => {
    setActivePage((prev) => {
      const linkCount = SECTION_LINKS[sectionId].length;
      const nextLinkIndex =
        prev?.section === sectionId ? (prev.linkIndex + 1) % linkCount : 0;

      return { section: sectionId, linkIndex: nextLinkIndex };
    });
    setIsCartPressed(false);
    setIsStorePressed(false);
  }, []);

  const goHome = useCallback((): void => {
    eisNavTo(0);
  }, [eisNavTo]);

  const toggleLogin = useCallback((): void => {
    setIsLoggedIn((wasLoggedIn) => !wasLoggedIn);
    setIsCartPressed(false);
    setIsStorePressed(false);
  }, []);

  /*
   * Store behaves like a latched page button.
   * Once activated it stays visually pressed until another section is opened.
   */
  const storePress = useCallback((): void => {
    setIsCartPressed(false);
    setIsStorePressed(true);
  }, []);

  const cartPress = useCallback((): void => {
    setIsStorePressed(false);
    if (cartCount <= 0) return;
    setIsCartPressed(true);
  }, [cartCount]);

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
    storePress,
    cartPress,
    isCartPressed,
  };
}
