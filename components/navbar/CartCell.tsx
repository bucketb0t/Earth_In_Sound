'use client';

/**
 * CartCell.tsx
 * ─────────────────────────────────────────────────────────────────
 * Cart section cell — circular trolley button with an item-count
 * badge in the top-right corner (never overlapping the button).
 *
 * Behaviour:
 *   · Badge is always rendered; when cartCount is 0 it shows "00"
 *     in a dimmed state (opacity 0.35, no glow).
 *   · When cartCount > 0 the badge glows green.
 *   · cartPress() is a no-op until cartVisible is true.
 * ─────────────────────────────────────────────────────────────────
 */

import type { KeyboardEvent } from 'react';
import { useNavbarContext } from '../../lib/NavbarContext';

export default function CartCell() {
  const { cartCount, cartVisible, cartPress } = useNavbarContext();

  const displayCount = String(cartCount).padStart(2, '0');
  const badgeActive = cartCount > 0;

  return (
    <div className="cell">
      <div className="cell-label">Cart</div>

      <div className="cart-btn-wrap">
        <div
          className={`cart-badge ${badgeActive ? 'active' : 'zero'}`}
          aria-label={`${cartCount} items in cart`}
        >
          <span>{displayCount}</span>
        </div>

        <div
          className={`cart-btn ${cartVisible ? 'enabled' : ''}`}
          onClick={cartPress}
          role="button"
          tabIndex={cartVisible ? 0 : -1}
          aria-label="Shopping cart"
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => e.key === 'Enter' && cartPress()}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <line x1="4" y1="6" x2="8" y2="6" stroke="#888" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8 6 L10 18 L24 18 L26 10 L10 10" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="10" y1="14" x2="25" y2="14" stroke="#888" strokeWidth="1" strokeLinecap="round" />
            <circle cx="13" cy="22" r="2" stroke="#888" strokeWidth="1.6" />
            <circle cx="21" cy="22" r="2" stroke="#888" strokeWidth="1.6" />
            <line x1="10" y1="18" x2="13" y2="20" stroke="#888" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="24" y1="18" x2="21" y2="20" stroke="#888" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <style jsx>{`
        .cell {
          flex: 1 1 0;
          min-width: 70px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 8px;
          position: relative;
          border-left: 1px solid #2a2a2a;
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

        .cart-btn-wrap {
          position: relative;
          display: inline-flex;
          padding-top: 10px;
          padding-right: 10px;
        }

        .cart-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #030f03;
          border: 1px solid #1a2e1a;
          border-radius: 4px;
          padding: 1px 5px;
          box-shadow: inset 0 1px 4px #000;
          transition: opacity 0.3s, box-shadow 0.3s;
          pointer-events: none;
        }

        .cart-badge.zero {
          opacity: 0.35;
        }

        .cart-badge.active {
          opacity: 1;
          box-shadow: inset 0 1px 4px #000, 0 0 6px #22c55e33;
        }

        .cart-badge span {
          font-size: 13px;
          font-weight: bold;
          color: #22c55e;
          text-shadow: 0 0 8px #22c55e88;
          line-height: 1;
          font-family: 'Courier New', monospace;
          display: block;
        }

        .cart-badge.zero span {
          color: #1a4a1a;
          text-shadow: none;
        }

        .cart-btn {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: linear-gradient(145deg, #2a2a2a, #111);
          border: 1px solid #333;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.2s;
          flex-shrink: 0;
        }
        .cart-btn:hover {
          border-color: #444;
        }
        .cart-btn:focus-visible {
          outline: 2px solid #22c55e;
          outline-offset: 3px;
        }
        .cart-btn.enabled:hover {
          border-color: #22c55e55;
        }
      `}</style>
    </div>
  );
}
