"use client";

import type { CSSProperties } from "react";
import localFont from "next/font/local";

import {
  DESIGN_HEIGHT,
  BASE_LINE_HEIGHT,
  NAVBAR_VISUAL_WIDTH_PERCENT,
} from "./config";
import { NavbarContext, useNavbar } from "./state";

import AccountCell from "./cells/AccountCell";
import CartCell from "./cells/CartCell";
import EISLogoCell from "./cells/EISLogoCell";
import IHateMusicCell from "./cells/IHateMusicCell";
import JasonWaltonCell from "./cells/JasonWaltonCell";
import StoreCell from "./cells/StoreCell";

import baseBannerNavbar from "./NavbarAssets/SVG/BaseBannerNavbar.svg";
import baseLineNavbar from "./NavbarAssets/SVG/BaseLineNavbar.svg";

const futuraHeavy = localFont({
  src: "./NavbarAssets/Fonts/FuturaHeavy_GeneralCaps.ttf",
  variable: "--font-futura-heavy",
});

/**
 * Navbar shell.
 * Paints the shared banner/baseline and positions the independent cells.
 */
export default function Navbar() {
  const navbarState = useNavbar();
  const { shellRef, scale, ready } = navbarState;

  // Compensates for transform scale so the final visual width stays exact.
  const rootWidth =
    scale > 0
      ? `${(NAVBAR_VISUAL_WIDTH_PERCENT / scale).toFixed(4)}%`
      : `${NAVBAR_VISUAL_WIDTH_PERCENT}%`;

  // Normalize imported SVGs into URLs usable by CSS background-image.
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
        style={
          {
            height: `${DESIGN_HEIGHT * scale}px`,
            visibility: ready ? "visible" : "hidden",
            "--navbar-bg": `url(${baseBannerUrl})`,
            "--navbar-line": `url(${baseLineUrl})`,
            "--navbar-line-height": `${BASE_LINE_HEIGHT * scale}px`,
          } as CSSProperties
        }
      >
        {/* Interactive faceplate: excludes the reserved baseline height. */}
        <div
          className={`${futuraHeavy.variable} navbar-root`}
          style={
            {
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: "top center",
              width: rootWidth,
              height: `${DESIGN_HEIGHT - BASE_LINE_HEIGHT}px`,
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
        </div>
      </div>

      <style jsx>{`
        .navbar-shell {
          position: relative;
          width: 100%;
          padding: 0;
          background-image: var(--navbar-bg);
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;
          overflow: visible;
        }

        .navbar-shell::after {
          /*
           * The baseline is tied to the viewport, not the scaled root, so it
           * remains edge-to-edge at every browser zoom level.
           */
          content: "";
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 100vw;
          height: var(--navbar-line-height);
          transform: translateX(-50%);
          background-image: var(--navbar-line);
          background-repeat: no-repeat;
          background-position: left top;
          background-size: 100% 100%;
          pointer-events: none;
          z-index: 10;
        }

        .navbar-root {
          position: absolute;
          top: 0;
          left: 50%;
          background: transparent;
          overflow: visible;
          isolation: isolate;
          font-family: var(--font-futura-heavy), sans-serif;
        }

        .navbar-inner {
          /* Cells stretch to the faceplate height while keeping horizontal air. */
          position: relative;
          z-index: 2;
          display: flex;
          align-items: stretch;
          height: 100%;
          min-height: 0;
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
