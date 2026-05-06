"use client";

import type { CSSProperties } from "react";
import localFont from "next/font/local";

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
import baseLogoEISPlaque from "./NavbarAssets/SVG/EarthInSoundPlaqueNavbar.svg";

/**
 * Local navbar font.
 *
 * next/font/local creates a real font-family and exposes it through a CSS
 * variable. The path is relative to this Navbar.tsx file.
 */
const futuraHeavy = localFont({
  src: "./NavbarAssets/Fonts/FuturaHeavyFont.ttf",
  variable: "--font-futura-heavy",
});

/**
 * Navbar shell and provider.
 *
 * Layering model:
 * - navbar-root owns the full-width base banner artwork.
 * - navbar-root::after owns the bottom baseline artwork.
 * - grouped/cell containers can place plaque artwork above the banner.
 * - each cell renders its controls above its own plaque layer.
 */
export default function Navbar() {
  const navbarState = useNavbar();
  const { shellRef, scale, ready } = navbarState;

  /*
   * The navbar faceplate spans the full shell width.
   *
   * Because CSS transform scale changes visual size after layout, the unscaled
   * root is widened by 1 / scale before scale() is applied.
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

  const baseLogoEISPlaqueUrl =
    typeof baseLogoEISPlaque === "string"
      ? baseLogoEISPlaque
      : baseLogoEISPlaque.src;

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
              "--logo-eis-bg": `url(${baseLogoEISPlaqueUrl})`,
            } as CSSProperties
          }
          role="navigation"
          aria-label="Earth In Sound site navigation"
        >
          <div className="navbar-inner">
            <div className="row-primary">
              <div className="logo-eis-group">
                <div className="logo-eis-content">
                  <LogoCell />
                  <EISCell />
                </div>
              </div>

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
          background-image: var(--navbar-bg);
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;
          overflow: visible;
          isolation: isolate;
          font-family: var(--font-futura-heavy), sans-serif;
        }

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

        /*
         * Logo + EIS shared artwork group.
         *
         * The ::before layer is the plaque artwork. The content wrapper sits
         * above it, so LogoCell and EISCell remain interactive and readable.
         */
        .logo-eis-group {
          position: relative;
          display: flex;
          align-items: stretch;
          min-width: 0;
          overflow: visible;
          isolation: isolate;
        }

        .logo-eis-group::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: var(--logo-eis-bg);
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;
          pointer-events: none;
          z-index: 0;
        }

        .logo-eis-content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: stretch;
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
