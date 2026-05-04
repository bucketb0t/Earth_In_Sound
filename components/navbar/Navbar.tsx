"use client";

import {
  DESIGN_HEIGHT,
  NAVBAR_VISUAL_WIDTH_PERCENT,
} from "./config";
import { NavbarContext, useNavbar } from "./state";

import AccountCell from "./cells/AccountCell";
import CartCell from "./cells/CartCell";
import EISCell from "./cells/EISCell";
import IHateMusicCell from "./cells/IHateMusicCell";
import JasonWaltonCell from "./cells/JasonWaltonCell";
import LogoCell from "./cells/LogoCell";
import StoreCell from "./cells/StoreCell";

/**
 * Navbar shell and provider.
 *
 * This component owns the physical hardware faceplate: responsive scale,
 * centered width, reserved height, and cell order. The cells own their artwork
 * and read shared state through NavbarContext.
 */
export default function Navbar() {
  const navbarState = useNavbar();
  const { shellRef, scale, ready } = navbarState;

  /*
   * The final rendered faceplate is intentionally 80% of the shell. Because
   * CSS transform scale changes visual size after layout, the unscaled root is
   * widened by 1 / scale before the transform is applied.
   */
  const rootWidth =
    scale > 0
      ? `${(NAVBAR_VISUAL_WIDTH_PERCENT / scale).toFixed(4)}%`
      : `${NAVBAR_VISUAL_WIDTH_PERCENT}%`;

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
          style={{
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: "top center",
            width: rootWidth,
          }}
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
          padding: 0 clamp(16px, 4vw, 64px);
        }

        .navbar-root {
          position: absolute;
          top: 0;
          left: 50%;
          background: linear-gradient(180deg, #232323 0%, #181818 100%);
          border-bottom: 2px solid #111;
          box-shadow:
            0 4px 32px rgba(0, 0, 0, 0.8),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          font-family: "Courier New", monospace;
          color: #ccc;
        }

        .navbar-inner {
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
