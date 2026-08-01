"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";

export type ResponsiveMode = "desktop" | "mobile";

interface ResponsiveModeContextValue {
  mode: ResponsiveMode;
  isDesktop: boolean;
  isMobile: boolean;
}

const ResponsiveModeContext =
  createContext<ResponsiveModeContextValue | null>(null);

function getResponsiveModeFromViewport(): ResponsiveMode {
  return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
    ? "mobile"
    : "desktop";
}

interface ResponsiveModeProviderProps {
  children: ReactNode;
}

/**
 * Site-wide viewport mode provider.
 * Centralizes the desktop/mobile decision so page-level variants can reuse the
 * same breakpoint instead of each component inventing its own switch.
 */
export function ResponsiveModeProvider({
  children,
}: ResponsiveModeProviderProps) {
  /*
   * The first render uses desktop because the server cannot know viewport
   * width. The effect below immediately syncs to the real browser media query.
   */
  const [mode, setMode] = useState<ResponsiveMode>("desktop");

  useEffect(() => {
    const viewportQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);

    const syncMode = () => {
      /*
       * One global media query decides desktop/mobile for navbar and future
       * page variants.
       */
      setMode(getResponsiveModeFromViewport());
    };

    syncMode();
    viewportQuery.addEventListener("change", syncMode);

    return () => {
      viewportQuery.removeEventListener("change", syncMode);
    };
  }, []);

  const contextValue = useMemo<ResponsiveModeContextValue>(
    () => ({
      mode,
      isDesktop: mode === "desktop",
      isMobile: mode === "mobile",
    }),
    [mode],
  );

  return (
    <ResponsiveModeContext.Provider value={contextValue}>
      {children}
    </ResponsiveModeContext.Provider>
  );
}

export function useResponsiveMode(): ResponsiveModeContextValue {
  const responsiveMode = useContext(ResponsiveModeContext);
  if (!responsiveMode) {
    throw new Error(
      "useResponsiveMode must be used inside <ResponsiveModeProvider />.",
    );
  }

  return responsiveMode;
}
