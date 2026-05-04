"use client";

import { CELL_GEOMETRY } from "../config";
import { activateOnEnterOrSpace, useNavbarContext } from "../state";

/**
 * Cart cell.
 *
 * The badge always shows a two-digit count. The circular cart button stays out
 * of the tab order until the store animation has revealed it.
 */
export default function CartCell() {
  const { cartCount, cartVisible, cartPress } = useNavbarContext();
  const { btnSize, wrapGap } = CELL_GEOMETRY.cart;

  const displayCount = String(cartCount).padStart(2, "0");
  const badgeActive = cartCount > 0;

  return (
    <div className="navbar-cell navbar-cell--center navbar-cell--bordered cart-cell">
      <div className="cell-label">Cart</div>

      <div className="cart-btn-wrap" style={{ gap: wrapGap }}>
        <div
          className={`cart-badge ${badgeActive ? "active" : "zero"}`}
          aria-label={`${cartCount} items in cart`}
        >
          <span>{displayCount}</span>
        </div>

        <div
          className={`cart-btn ${cartVisible ? "enabled" : ""}`}
          style={{ width: btnSize, height: btnSize }}
          onClick={cartPress}
          role="button"
          tabIndex={cartVisible ? 0 : -1}
          aria-label="Shopping cart"
          aria-disabled={!cartVisible}
          onKeyDown={(event) => activateOnEnterOrSpace(event, cartPress)}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <line
              x1="4"
              y1="6"
              x2="8"
              y2="6"
              stroke="#888"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M8 6 L10 18 L24 18 L26 10 L10 10"
              stroke="#888"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="10"
              y1="14"
              x2="25"
              y2="14"
              stroke="#888"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <circle cx="13" cy="22" r="2" stroke="#888" strokeWidth="1.6" />
            <circle cx="21" cy="22" r="2" stroke="#888" strokeWidth="1.6" />
            <line
              x1="10"
              y1="18"
              x2="13"
              y2="20"
              stroke="#888"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <line
              x1="24"
              y1="18"
              x2="21"
              y2="20"
              stroke="#888"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <style jsx>{`
        .cart-cell {
          flex: 1 1 0;
          min-width: 70px;
        }

        .cart-btn-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .cart-badge {
          background: #030f03;
          border: 1px solid #1a2e1a;
          border-radius: 4px;
          padding: 1px 5px;
          box-shadow: inset 0 1px 4px #000;
          transition:
            opacity 0.3s,
            box-shadow 0.3s;
          pointer-events: none;
        }

        .cart-badge.zero {
          opacity: 0.35;
        }

        .cart-badge.active {
          opacity: 1;
          box-shadow:
            inset 0 1px 4px #000,
            0 0 6px #22c55e33;
        }

        .cart-badge span {
          font-size: 13px;
          font-weight: bold;
          color: #22c55e;
          text-shadow: 0 0 8px #22c55e88;
          line-height: 1;
          font-family: "Courier New", monospace;
          display: block;
        }

        .cart-badge.zero span {
          color: #1a4a1a;
          text-shadow: none;
        }

        .cart-btn {
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
