"use client";

import type { CSSProperties } from "react";
import { DESIGN_HEIGHT, NAVBAR_VISUAL_WIDTH_PERCENT } from "./config";
import { NavbarContext, useNavbar } from "./state";

import AccountCell from "./cells/AccountCell";
import CartCell from "./cells/CartCell";
import EISCell from "./cells/EISCell";
import IHateMusicCell from "./cells/IHateMusicCell";
import JasonWaltonCell from "./cells/JasonWaltonCell";
import LogoCell from "./cells/LogoCell";
import StoreCell from "./cells/StoreCell";

import baseBannerNavbar from "./NavbarAssets/SVG/BaseBannerNavbar.svg";
import baseLineNavbar from "./NavbarAssets/SVG/BaseLineNavbar.svg";

/**
 * Navbar shell and provider.
 *
 * This component owns the physical navbar surface:
 * - full-width faceplate sizing
 * - responsive scale
 * - background artwork
 * - bottom line artwork
 * - cell order
 *
 * Individual cells own their own artwork and behavior.
 */
export default function Navbar() {
  const navbarState = useNavbar();
  const { shellRef, scale, ready } = navbarState;

  /*
   * The navbar faceplate spans the full shell width.
   *
   * Because CSS transform scale changes visual size after layout,
   * the unscaled root is widened by 1 / scale before scale() is applied.
   * This keeps the final visual width at 100%.
   */
  const rootWidth =
    scale > 0
      ? `${(NAVBAR_VISUAL_WIDTH_PERCENT / scale).toFixed(4)}%`
      : `${NAVBAR_VISUAL_WIDTH_PERCENT}%`;

  /*
   * Next turns imported SVG files into usable asset URLs.
   * The string/object check keeps this safe across bundler output shapes.
   */
  const baseBannerUrl =
    typeof baseBannerNavbar === "string"
      ? baseBannerNavbar
      : baseBannerNavbar.src;

  const baseLineUrl =
    typeof baseLineNavbar === "string" ? baseLineNavbar : baseLineNavbar.src;

  return (
    <NavbarContext.Provider value={navbarState}>
      <div
        ref={shellRef}
        className="navbar-shell"
        style={{
          height: `${DESIGN_HEIGHT * scale}px`,
          visibility: ready ? "visible" : "hidden",
        }}
      >
        <div
          className="navbar-root"
          style={
            {
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: "top center",
              width: rootWidth,
              "--navbar-bg": `url(${baseBannerUrl})`,
              "--navbar-line": `url(${baseLineUrl})`,
            } as CSSProperties
          }
          role="navigation"
          aria-label="Earth In Sound site navigation"
        >
          <div className="navbar-inner">
            <div className="row-primary">
              <LogoCell />
              <EISCell />
              <JasonWaltonCell />
              <IHateMusicCell />

              <div className="row-secondary">
                <AccountCell />
                <StoreCell />
                <CartCell />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .navbar-shell {
          position: relative;
          width: 100%;
          padding: 0;
        }

        .navbar-root {
          position: absolute;
          top: 0;
          left: 50%;
          background-color: #181818;
          background-image: var(--navbar-bg);
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;
          border-bottom: 2px solid #111;
          box-shadow:
            0 4px 32px rgba(0, 0, 0, 0.8),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          font-family: "Courier New", monospace;
          color: #ccc;
          overflow: visible;
          isolation: isolate;
        }

        /*
         * BaseLineNavbar.svg is artwork, not a CSS border value.
         * The pseudo-element creates a dedicated image layer pinned to
         * the bottom of the faceplate.
         */
        .navbar-root::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 8px;
          background-image: var(--navbar-line);
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;
          pointer-events: none;
          z-index: 1;
        }

        .navbar-inner {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: stretch;
          width: 100%;
          min-height: 110px;
          padding: 0 clamp(16px, 10%, 120px);
        }

        .row-primary {
          display: flex;
          align-items: stretch;
          justify-content: flex-start;
          flex: 1 1 0;
          min-width: 0;
        }

        .row-secondary {
          display: flex;
          align-items: stretch;
          flex: 0.5 1 0;
          min-width: 0;
          border-left: 1px solid #2a2a2a;
        }
      `}</style>
    </NavbarContext.Provider>
  );
}
