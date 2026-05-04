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

export function useNavbarContext(): NavbarState {
  const ctx = useContext(NavbarContext);
  if (!ctx) throw new Error("useNavbarContext must be used inside <Navbar />.");
  return ctx;
}

/**
 * Keyboard helper for custom artwork controls.
 *
 * The navbar uses SVG groups and styled divs where native buttons would fight
 * the artwork. This gives those controls the expected Enter and Space behavior.
 */
export function activateOnEnterOrSpace<T extends Element>(
  event: KeyboardEvent<T>,
  action: () => void,
): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

function clampSectionIndex(section: SectionId, idx: number): number {
  const max = SECTION_LINKS[section].length - 1;
  if (!Number.isFinite(idx)) return 0;
  return Math.max(0, Math.min(max, Math.round(idx)));
}

/**
 * Shared navbar state and actions.
 *
 * This hook is the only place that mutates cross-cell behavior: active link,
 * EIS slider position, account state, store animation, cart visibility, and
 * responsive shell scale.
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

  /*
   * The ResizeObserver and initial pass use the same border-box model so the
   * transform scale does not jump after the first observer callback.
   */
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

  /*
   * Store keeps the original no-reentry timer behavior: pressing while the
   * scramble is running does nothing, and the cart becomes active at the end.
   */
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
