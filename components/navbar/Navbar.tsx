"use client";

import type { CSSProperties } from "react";
import localFont from "next/font/local";

import { DESIGN_HEIGHT, NAVBAR_VISUAL_WIDTH_PERCENT } from "./config";
import { NavbarContext, useNavbar } from "./state";

import AccountCell from "./cells/AccountCell";
import CartCell from "./cells/CartCell";
import EISLogoCell from "./cells/EISLogoCell";
import IHateMusicCell from "./cells/IHateMusicCell";
import JasonWaltonCell from "./cells/JasonWaltonCell";
import StoreCell from "./cells/StoreCell";

import baseBannerNavbar from "./NavbarAssets/SVG/BaseBannerNavbar.svg";
import baseLineNavbar from "./NavbarAssets/SVG/BaseLineNavbar.svg";

/**
 * Local navbar font.
 *
 * next/font/local creates a real font-family and exposes it through a CSS
 * variable. The path is relative to this Navbar.tsx file.
 */
const futuraHeavy = localFont({
  src: "./NavbarAssets/Fonts/FuturaHeavy_GeneralCaps.ttf",
  variable: "--font-futura-heavy",
});

/**
 * Navbar shell and provider.
 *
 * This component should stay structural:
 * - provide shared navbar state
 * - measure and scale the whole navbar
 * - render the base banner and baseline
 * - define the order of the cells
 *
 * Individual cell artwork belongs inside each cell component.
 */
export default function Navbar() {
  const navbarState = useNavbar();
  const { shellRef, scale, ready } = navbarState;

  /*
   * The navbar faceplate spans the full shell width.
   *
   * CSS transform scale changes visual size after layout, so the unscaled root
   * is widened by 1 / scale before scale() is applied.
   */
  const rootWidth =
    scale > 0
      ? `${(NAVBAR_VISUAL_WIDTH_PERCENT / scale).toFixed(4)}%`
      : `${NAVBAR_VISUAL_WIDTH_PERCENT}%`;

  /*
   * Imported SVGs are converted by Next into usable asset URLs.
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
          className={`${futuraHeavy.variable} navbar-root`}
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
              <EISLogoCell />
              <JasonWaltonCell />
              <IHateMusicCell />

              <div className="row-secondary">
                <AccountCell />
                <StoreCell />
                <CartCell />
              </div>
            </div>
          </div>
          <div className="navbar-baseline" aria-hidden="true" />
        </div>
      </div>

      <style jsx>{`
        .navbar-shell {
          position: relative;
          width: 100%;
          padding: 0;
        }

        .navbar-root {
          --navbar-line-height: 8px;

          position: absolute;
          top: 0;
          left: 50%;
          padding-bottom: var(--navbar-line-height);
          background-image: var(--navbar-bg);
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;
          overflow: visible;
          isolation: isolate;
          font-family: var(--font-futura-heavy), sans-serif;
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

        .navbar-baseline {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 3;
          height: var(--navbar-line-height);
          background-image: var(--navbar-line);
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;
          pointer-events: none;
        }

        /*
         * The baseline is a visual layer, not a CSS border. Keeping it in
         * ::after lets plugs and other cell artwork layer above it correctly.
         */

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
