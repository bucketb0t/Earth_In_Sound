'use client';

/**
 * MerchCell.tsx
 * ─────────────────────────────────────────────────────────────────
 * Merch section cell — a clickable display button with a boot
 * scramble animation.
 *
 * Behaviour:
 *   · Clicking runs a frame-by-frame scramble animation on the
 *     green display text, cycling through block characters before
 *     resolving back to "MERCH".
 *   · During animation frames the text colour is red; on the final
 *     frame it returns to green.
 *   · After the first press the cart badge is revealed forever
 *     (handled by merchPress() in useNavbar).
 *   · Rapid re-clicks during animation are ignored.
 * ─────────────────────────────────────────────────────────────────
 */

import type { KeyboardEvent } from 'react';
import { useNavbarContext } from '../../lib/NavbarContext';

export default function MerchCell() {
  const { merchText, merchAnimating, merchPress } = useNavbarContext();

  const isScrambling = merchAnimating && merchText !== 'MERCH';
  const textColor = isScrambling ? '#ef4444' : '#22c55e';
  const textShadow = `0 0 6px ${textColor}88`;

  return (
    <div
      className="cell"
      onClick={merchPress}
      role="button"
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => e.key === 'Enter' && merchPress()}
      aria-label="Merch"
      style={{ cursor: 'pointer' }}
    >
      <div className="cell-label">Merch</div>

      <div className="merch-display">
        <span
          style={{
            color: textColor,
            textShadow,
            transition: 'color 0.1s, text-shadow 0.1s',
          }}
        >
          {merchText}
        </span>
      </div>

      <style jsx>{`
        .cell {
          flex: 1 1 0;
          min-width: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 8px;
          position: relative;
          border-left: 1px solid #2a2a2a;
          user-select: none;
        }
        .cell:focus-visible {
          outline: 2px solid #22c55e;
          outline-offset: -2px;
        }

        .cell-label {
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #555;
          margin-bottom: 6px;
          text-align: center;
          white-space: nowrap;
        }

        .merch-display {
          background: #030f03;
          border: 1px solid #1a2e1a;
          border-radius: 4px;
          padding: 5px 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 4px #000;
          min-width: 60px;
        }

        .merch-display span {
          font-size: 11px;
          letter-spacing: 0.05em;
          font-family: 'Courier New', monospace;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
