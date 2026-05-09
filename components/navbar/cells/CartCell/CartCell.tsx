"use client";

import { useNavbarContext } from "../../state";
import styles from "./CartCell.module.css";

/**
 * Cart cell.
 * Uses navbar artwork for the counter and the button's off/hover/pressed states.
 */
export default function CartCell() {
  const { cartCount, isCartPressed, cartPress } = useNavbarContext();
  const cartCounterText = String(cartCount).padStart(2, "0").slice(-2);

  return (
    <div className={`navbar-cell navbar-cell--center ${styles.cartCell}`}>
      <div
        className={`${styles.cartCounter} ${
          cartCount > 0 ? styles.cartCounterVisible : ""
        }`}
        aria-label={`${cartCount} items in cart`}
      >
        {cartCount > 0 ? cartCounterText : null}
      </div>

      <button
        type="button"
        className={`${styles.cartButton} ${
          isCartPressed ? styles.cartButtonPressed : ""
        }`}
        onClick={cartPress}
        aria-label="Shopping cart"
        aria-pressed={isCartPressed}
      />
    </div>
  );
}
