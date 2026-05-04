"use client";

import type { CSSProperties } from "react";
import { CELL_GEOMETRY } from "../config";
import { activateOnEnterOrSpace, useNavbarContext } from "../state";

/**
 * Store cell.
 *
 * Pressing the display runs the shared store scramble animation in useNavbar().
 * When the animation finishes, the cart control becomes visible.
 */
export default function StoreCell() {
  const { storeText, storeAnimating, storePress } = useNavbarContext();
  const { paddingX, paddingY } = CELL_GEOMETRY.store;

  const isScrambling = storeAnimating && storeText !== "STORE";
  const textColor = isScrambling ? "#ef4444" : "#22c55e";
  const styleVars = {
    "--store-color": textColor,
    "--store-glow": `${textColor}88`,
  } as CSSProperties;

  return (
    <div
      className="navbar-cell navbar-cell--center navbar-cell--bordered store-cell"
      style={styleVars}
      onClick={storePress}
      role="button"
      tabIndex={0}
      aria-label="Store"
      aria-busy={storeAnimating}
      onKeyDown={(event) => activateOnEnterOrSpace(event, storePress)}
    >
      <div className="cell-label">Store</div>

      <div
        className="store-display"
        style={{ padding: `${paddingY}px ${paddingX}px` }}
      >
        <span
          style={{ transition: "color 0.1s, text-shadow 0.1s" }}
        >
          {storeText}
        </span>
      </div>

      <style jsx>{`
        .store-cell {
          flex: 1 1 0;
          min-width: 80px;
          cursor: pointer;
          user-select: none;
        }

        .store-cell:focus-visible {
          outline: 2px solid #22c55e;
          outline-offset: -2px;
        }

        .store-display {
          background: #030f03;
          border: 1px solid #1a2e1a;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 4px #000;
          min-width: 60px;
        }

        .store-display span {
          font-size: 11px;
          letter-spacing: 0.05em;
          font-family: "Courier New", monospace;
          line-height: 1;
          color: var(--store-color);
          text-shadow: 0 0 6px var(--store-glow);
        }
      `}</style>
    </div>
  );
}
