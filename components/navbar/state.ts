"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  DESIGN_WIDTH,
  SECTION_LINKS,
  STORE_FRAME_INTERVAL,
  STORE_FRAMES,
  type KnobSectionId,
  type SectionId,
} from "./config";

export interface ActivePage {
  section: SectionId;
  linkIndex: number;
}

export interface NavbarState {
  activePage: ActivePage | null;
  eisSliderPos: number;
  isLoggedIn: boolean;
  cartCount: number;
  cartVisible: boolean;
  storeText: string;
  storeAnimating: boolean;
  shellRef: RefObject<HTMLDivElement | null>;
  scale: number;
  isScaleReady: boolean;
  eisNavTo: (linkIndex: number) => void;
  knobNavTo: (sectionId: KnobSectionId, linkIndex: number) => void;
  knobFaceClick: (sectionId: KnobSectionId) => void;
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
  const storeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scale, setScale] = useState(1);
  const [isScaleReady, setIsScaleReady] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage | null>(null);
  const [eisSliderPos, setEisSliderPos] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const cartCount = 0;
  const [cartVisible, setCartVisible] = useState(false);
  const [storeText, setStoreText] = useState("STORE");
  const [storeAnimating, setStoreAnimating] = useState(false);

  /* Measure before paint, then keep scale synced to the shell border-box. */
  useLayoutEffect(() => {
    const shellElement = shellRef.current;
    if (!shellElement) return;

    const syncScaleFromShellWidth = (shellWidth: number) => {
      setScale(Math.min(1, shellWidth / DESIGN_WIDTH));
      setIsScaleReady(true);
    };

    syncScaleFromShellWidth(shellElement.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        syncScaleFromShellWidth(entry.target.getBoundingClientRect().width);
      }
    });

    observer.observe(shellElement);
    return () => observer.disconnect();
  }, []);

  /* Clear any pending store animation timer when the navbar unmounts. */
  useEffect(() => {
    return () => {
      if (storeTimerRef.current !== null) {
        clearTimeout(storeTimerRef.current);
      }
    };
  }, []);

  const eisNavTo = useCallback((linkIndex: number): void => {
    const clampedEisLinkIndex = clampSectionLinkIndex("eis", linkIndex);
    setEisSliderPos(clampedEisLinkIndex);
    setActivePage({ section: "eis", linkIndex: clampedEisLinkIndex });
  }, []);

  const knobNavTo = useCallback(
    (sectionId: KnobSectionId, linkIndex: number): void => {
      setActivePage({
        section: sectionId,
        linkIndex: clampSectionLinkIndex(sectionId, linkIndex),
      });
    },
    [],
  );

  const knobFaceClick = useCallback((sectionId: KnobSectionId): void => {
    setActivePage((prev) => (prev?.section === sectionId ? null : prev));
  }, []);

  const goHome = useCallback((): void => {
    eisNavTo(0);
  }, [eisNavTo]);

  const toggleLogin = useCallback((): void => {
    setIsLoggedIn((wasLoggedIn) => !wasLoggedIn);
  }, []);

  /* Store animation is non-reentrant; finishing it reveals the cart control. */
  const storePress = useCallback((): void => {
    if (storeAnimating) return;
    setStoreAnimating(true);

    let storeFrameIndex = 0;
    function advanceStoreFrame(): void {
      if (storeFrameIndex >= STORE_FRAMES.length) {
        setStoreText("STORE");
        setStoreAnimating(false);
        setCartVisible(true);
        storeTimerRef.current = null;
        return;
      }

      setStoreText(STORE_FRAMES[storeFrameIndex++]!);
      storeTimerRef.current = setTimeout(
        advanceStoreFrame,
        STORE_FRAME_INTERVAL,
      );
    }

    advanceStoreFrame();
  }, [storeAnimating]);

  const cartPress = useCallback((): void => {
    if (!cartVisible) return;
  }, [cartVisible]);

  return {
    activePage,
    eisSliderPos,
    isLoggedIn,
    cartCount,
    cartVisible,
    storeText,
    storeAnimating,
    shellRef,
    scale,
    isScaleReady,
    eisNavTo,
    knobNavTo,
    knobFaceClick,
    goHome,
    toggleLogin,
    storePress,
    cartPress,
  };
}
