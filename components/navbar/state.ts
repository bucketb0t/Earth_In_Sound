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
  idx: number;
}

export interface NavbarState {
  activePage: ActivePage | null;
  eisSliderPos: number;
  loggedIn: boolean;
  cartCount: number;
  cartVisible: boolean;
  storeText: string;
  storeAnimating: boolean;
  shellRef: RefObject<HTMLDivElement | null>;
  scale: number;
  ready: boolean;
  eisNavTo: (idx: number) => void;
  knobNavTo: (sectionId: KnobSectionId, idx: number) => void;
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
  const ctx = useContext(NavbarContext);
  if (!ctx) throw new Error("useNavbarContext must be used inside <Navbar />.");
  return ctx;
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
function clampSectionIndex(section: SectionId, idx: number): number {
  const max = SECTION_LINKS[section].length - 1;
  if (!Number.isFinite(idx)) return 0;
  return Math.max(0, Math.min(max, Math.round(idx)));
}

/**
 * Shared navbar state and actions.
 * Coordinates active links, scaling, account/store/cart state, and cell actions.
 */
export function useNavbar(): NavbarState {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const storeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage | null>(null);
  const [eisSliderPos, setEisSliderPos] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);
  const cartCount = 0;
  const [cartVisible, setCartVisible] = useState(false);
  const [storeText, setStoreText] = useState("STORE");
  const [storeAnimating, setStoreAnimating] = useState(false);

  /* Measure before paint, then keep scale synced to the shell border-box. */
  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    const measure = (width: number) => {
      setScale(Math.min(1, width / DESIGN_WIDTH));
      setReady(true);
    };

    measure(el.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.target.getBoundingClientRect().width);
    });

    observer.observe(el);
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

  const eisNavTo = useCallback((idx: number): void => {
    const safeIdx = clampSectionIndex("eis", idx);
    setEisSliderPos(safeIdx);
    setActivePage({ section: "eis", idx: safeIdx });
  }, []);

  const knobNavTo = useCallback(
    (sectionId: KnobSectionId, idx: number): void => {
      setActivePage({
        section: sectionId,
        idx: clampSectionIndex(sectionId, idx),
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
    setLoggedIn((previous) => !previous);
  }, []);

  /* Store animation is non-reentrant; finishing it reveals the cart control. */
  const storePress = useCallback((): void => {
    if (storeAnimating) return;
    setStoreAnimating(true);

    let frameIdx = 0;
    function runFrame(): void {
      if (frameIdx >= STORE_FRAMES.length) {
        setStoreText("STORE");
        setStoreAnimating(false);
        setCartVisible(true);
        storeTimerRef.current = null;
        return;
      }

      setStoreText(STORE_FRAMES[frameIdx++]!);
      storeTimerRef.current = setTimeout(runFrame, STORE_FRAME_INTERVAL);
    }

    runFrame();
  }, [storeAnimating]);

  const cartPress = useCallback((): void => {
    if (!cartVisible) return;
  }, [cartVisible]);

  return {
    activePage,
    eisSliderPos,
    loggedIn,
    cartCount,
    cartVisible,
    storeText,
    storeAnimating,
    shellRef,
    scale,
    ready,
    eisNavTo,
    knobNavTo,
    knobFaceClick,
    goHome,
    toggleLogin,
    storePress,
    cartPress,
  };
}
