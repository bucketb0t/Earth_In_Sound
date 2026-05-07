"use client";

import { useNavbarContext } from "../../state";
import styles from "./CartCell.module.css";

/**
 * Cart cell.
 * Two-digit badge plus circular cart button revealed by the store animation.
 */
export default function CartCell() {
  const { cartCount, cartVisible, cartPress } = useNavbarContext();

  const displayCount = String(cartCount).padStart(2, "0");
  const isCartBadgeActive = cartCount > 0;

  return (
    <div
      className={`navbar-cell navbar-cell--center navbar-cell--bordered ${styles.cartCell}`}
    >
      <div className="cell-label">Cart</div>

      {/* Cart stack: count display above the circular button. */}
      <div className={styles.cartButtonWrap}>
        {/* Badge stays visible but dim when the count is zero. */}
        <div
          className={`${styles.cartBadge} ${
            isCartBadgeActive ? styles.cartBadgeActive : styles.cartBadgeZero
          }`}
          aria-label={`${cartCount} items in cart`}
        >
          <span>{displayCount}</span>
        </div>

        {/* Disabled until storePress() reveals cart availability. */}
        <button
          type="button"
          className={`${styles.cartButton} ${cartVisible ? styles.cartButtonEnabled : ""}`}
          onClick={cartPress}
          aria-label="Shopping cart"
          disabled={!cartVisible}
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
        </button>
      </div>
    </div>
  );
}
