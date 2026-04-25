'use client';

/**
 * Navbar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Top-level navbar shell.
 *
 * Layout:
 *   WIDE  (≥ breakpoint): all cells in a single horizontal row.
 *   NARROW (< breakpoint): cells split into two rows —
 *     Row 1: Logo · EarthInSound · IHateMusic · JasonWalton
 *     Row 2: Account · Merch · Cart
 *   The breakpoint is controlled by a CSS container query so the
 *   navbar responds to its own width, not the viewport.
 *
 * This component is the Context.Provider — it calls useNavbar() and
 * passes the result down to every child via NavbarContext.
 * ─────────────────────────────────────────────────────────────────
 */

import { NavbarContext } from '../../lib/NavbarContext';
import { useNavbar } from '../../lib/useNavbar';
import { IHM_LINKS, JW_LINKS, SECTION_GLOWS } from '../../lib/navbarConfig';

import LogoCell from './LogoCell';
import EisCell from './EisCell';
import KnobCell from './KnobCell';
import AccountCell from './AccountCell';
import MerchCell from './MerchCell';
import CartCell from './CartCell';
import StatusBar from './StatusBar';

export default function Navbar() {
  const navbarState = useNavbar();

  return (
    <NavbarContext.Provider value={navbarState}>
      <div className="navbar-root" role="navigation" aria-label="Earth In Sound site navigation">

        {/* Decorative corner screws */}
        <div className="screw screw-tl" aria-hidden="true" />
        <div className="screw screw-tr" aria-hidden="true" />
        <div className="screw screw-bl" aria-hidden="true" />
        <div className="screw screw-br" aria-hidden="true" />

        <div className="navbar-inner">

          {/* Row 1: Logo, EIS, IHM, JW */}
          <div className="row-primary">
            <LogoCell />
            <EisCell />
            <KnobCell
              sectionId="ihm"
              label="I Hate Music"
              links={IHM_LINKS}
              glow={SECTION_GLOWS.ihm}
            />
            <KnobCell
              sectionId="jw"
              label="Jason Walton"
              links={JW_LINKS}
              glow={SECTION_GLOWS.jw}
            />
          </div>

          {/* Row 2: Account, Merch, Cart */}
          <div className="row-secondary">
            <AccountCell />
            <MerchCell />
            <CartCell />
          </div>

        </div>

        <StatusBar />
      </div>

      <style jsx>{`
        .navbar-root {
          width: 100%;
          container-type: inline-size;
          container-name: navbar;
          background: linear-gradient(180deg, #232323 0%, #181818 100%);
          border-bottom: 2px solid #111;
          box-shadow:
            0 4px 32px rgba(0, 0, 0, 0.8),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          position: relative;
          font-family: 'Courier New', monospace;
          color: #ccc;
        }

        .screw {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #444, #111);
          border: 0.5px solid #2a2a2a;
          position: absolute;
          pointer-events: none;
          z-index: 10;
        }
        .screw-tl { top: 5px;    left: 5px;  }
        .screw-tr { top: 5px;    right: 5px; }
        .screw-bl { bottom: 5px; left: 5px;  }
        .screw-br { bottom: 5px; right: 5px; }

        .navbar-inner {
          display: flex;
          align-items: stretch;
          width: 100%;
          min-height: 110px;
        }

        .row-primary {
          display: flex;
          align-items: stretch;
          flex: 3 1 0;
          min-width: 0;
        }

        .row-secondary {
          display: flex;
          align-items: stretch;
          flex: 1 1 0;
          min-width: 0;
          border-left: 1px solid #2a2a2a;
        }

        @container navbar (max-width: 640px) {
          .navbar-inner {
            flex-direction: column;
            min-height: auto;
          }

          .row-primary,
          .row-secondary {
            flex: none;
            width: 100%;
            min-height: 110px;
            border-left: none;
          }

          .row-secondary {
            border-top: 1px solid #2a2a2a;
            border-left: none;
          }
        }
      `}</style>
    </NavbarContext.Provider>
  );
}
