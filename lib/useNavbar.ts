'use client';

/**
 * useNavbar.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom React hook that owns ALL shared navbar state and exposes
 * the action functions used by every sub-component.
 *
 * Keeping state here (rather than in the top-level component)
 * means the Navbar component stays a thin shell while this hook
 * can be unit-tested in isolation.
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  EIS_LINKS,
  IHM_LINKS,
  JW_LINKS,
  SECTION_GLOWS,
  SECTION_LABELS,
  type SectionId,
} from './navbarConfig';

// ── Types ─────────────────────────────────────────────────────────

/** Represents the currently active page/link. null = no-signal state. */
export interface ActivePage {
  section: SectionId;
  idx: number;
}

/** Colour + text pair for the StatusBar. */
export interface StatusInfo {
  color: string | null;
  text: string;
}

/** Full shape of the value exposed by useNavbar (and the Context). */
export interface NavbarState {
  // State
  activePage: ActivePage | null;
  eisSliderPos: number;
  loggedIn: boolean;
  cartCount: number;
  cartVisible: boolean;
  merchText: string;
  merchAnimating: boolean;
  statusInfo: StatusInfo;

  // Actions
  eisNavTo: (idx: number) => void;
  knobNavTo: (sectionId: SectionId, idx: number) => void;
  knobFaceClick: (sectionId: SectionId) => void;
  goHome: () => void;
  toggleLogin: () => void;
  merchPress: () => void;
  cartPress: () => void;
  addToCart: (qty?: number) => void;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useNavbar(): NavbarState {
  // ── Navigation state ───────────────────────────────────────────

  /**
   * activePage — which section + link index is currently selected.
   * null means nothing is active (no-signal state).
   */
  const [activePage, setActivePage] = useState<ActivePage | null>(null);

  /**
   * eisSliderPos — EIS slider remembers its position even when the
   * user switches to another section.  Range: 0 (Home) / 1 (About)
   * / 2 (Contact).
   */
  const [eisSliderPos, setEisSliderPos] = useState<number>(0);

  // ── Account state ──────────────────────────────────────────────

  /** Whether the user is currently "logged in". */
  const [loggedIn, setLoggedIn] = useState<boolean>(false);

  // ── Cart state ─────────────────────────────────────────────────

  /** Number of items in the cart. Starts at 0; badge shows 0 dimmed. */
  const [cartCount, setCartCount] = useState<number>(0);

  /**
   * cartVisible — whether the cart badge has been revealed.
   * Becomes true after the first merch press (or when items are added).
   */
  const [cartVisible, setCartVisible] = useState<boolean>(false);

  // ── Merch animation state ──────────────────────────────────────

  /** Current text shown on the Merch display panel. */
  const [merchText, setMerchText] = useState<string>('MERCH');

  /** Whether the merch scramble animation is currently running. */
  const [merchAnimating, setMerchAnimating] = useState<boolean>(false);

  /** Ref holding the active merch animation timeout so it can be cancelled on unmount. */
  const merchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any in-flight merch animation when the hook unmounts.
  useEffect(() => {
    return () => {
      if (merchTimeoutRef.current !== null) {
        clearTimeout(merchTimeoutRef.current);
      }
    };
  }, []);

  // ── Derived status bar values ──────────────────────────────────

  /**
   * Compute the status bar dot colour and text from activePage.
   * Returns { color, text } so StatusBar can render without logic.
   */
  const statusInfo: StatusInfo = activePage
    ? {
        color: SECTION_GLOWS[activePage.section],
        text:
          SECTION_LABELS[activePage.section] +
          ' → ' +
          (activePage.section === 'eis'
            ? EIS_LINKS[activePage.idx]
            : activePage.section === 'ihm'
            ? IHM_LINKS[activePage.idx]
            : JW_LINKS[activePage.idx]),
      }
    : { color: null, text: 'NO SIGNAL — SELECT A SECTION' };

  // ── Navigation actions ─────────────────────────────────────────

  /**
   * eisNavTo(idx)
   *
   * Activate the EIS section at the given slider position.
   * Any previously active section is deactivated first (handled
   * automatically because we set a new activePage object).
   *
   * @param idx  0=Home, 1=About, 2=Contact
   */
  const eisNavTo = useCallback((idx: number): void => {
    setEisSliderPos(idx);
    setActivePage({ section: 'eis', idx });
  }, []);

  /**
   * knobNavTo(sectionId, idx)
   *
   * Activate a knob section at the given LED index.
   * The knob indicator dot rotation is handled inside the KnobCell
   * component itself (it reads activePage from context).
   */
  const knobNavTo = useCallback((sectionId: SectionId, idx: number): void => {
    setActivePage({ section: sectionId, idx });
  }, []);

  /**
   * knobFaceClick(sectionId)
   *
   * Clicking the knob face while the section is active deactivates it
   * and returns to the no-signal state.
   * Clicking an already-inactive section's knob has no effect.
   */
  const knobFaceClick = useCallback(
    (sectionId: SectionId): void => {
      if (activePage?.section === sectionId) {
        setActivePage(null);
      }
    },
    [activePage]
  );

  /**
   * goHome()
   *
   * Logo click → navigate to EIS Home (slider position 0).
   */
  const goHome = useCallback((): void => {
    eisNavTo(0);
  }, [eisNavTo]);

  /**
   * toggleLogin()
   *
   * Flip the loggedIn boolean; the Account cell re-renders
   * automatically.
   */
  const toggleLogin = useCallback((): void => {
    setLoggedIn((prev) => !prev);
  }, []);

  /**
   * merchPress()
   *
   * Run the scramble animation on the Merch display, then make the
   * cart badge permanently visible.
   *
   * Uses a recursive setTimeout chain so each frame is independent.
   */
  const merchPress = useCallback((): void => {
    if (merchAnimating) return; // ignore rapid re-clicks mid-animation

    const FRAMES: string[] = ['██', '▓▓', '▒▒', '░░', 'ME', 'RC', 'HH', '  ', 'MERCH'];
    setMerchAnimating(true);

    let f = 0;

    function runFrame(): void {
      if (f >= FRAMES.length) {
        setMerchText('MERCH');
        setMerchAnimating(false);
        setCartVisible(true);
        merchTimeoutRef.current = null;
        return;
      }
      setMerchText(FRAMES[f++]!);
      merchTimeoutRef.current = setTimeout(runFrame, 110);
    }
    runFrame();
  }, [merchAnimating]);

  /**
   * cartPress()
   *
   * Placeholder — wire up to your routing / cart page logic.
   * Does nothing when the badge is not yet visible.
   */
  const cartPress = useCallback((): void => {
    if (!cartVisible) return;
    // TODO: navigate to cart page, e.g. router.push('/cart')
  }, [cartVisible]);

  /**
   * addToCart(qty)
   *
   * Increment the cart counter and ensure the badge is visible.
   * Call this from any "Add to cart" action across the site.
   *
   * @param qty  How many items to add (default 1).
   */
  const addToCart = useCallback((qty = 1): void => {
    setCartCount((prev) => prev + qty);
    setCartVisible(true);
  }, []);

  // ── Exposed API ────────────────────────────────────────────────

  return {
    // State
    activePage,
    eisSliderPos,
    loggedIn,
    cartCount,
    cartVisible,
    merchText,
    merchAnimating,
    statusInfo,

    // Actions
    eisNavTo,
    knobNavTo,
    knobFaceClick,
    goHome,
    toggleLogin,
    merchPress,
    cartPress,
    addToCart,
  };
}
