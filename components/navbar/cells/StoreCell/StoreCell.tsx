"use client";

import { useNavbarContext } from "../../state";
import styles from "./StoreCell.module.css";

/**
 * Store cell.
 * Store display button that runs the shared scramble animation.
 */
export default function StoreCell() {
  const { storeText, storeAnimating, storePress } = useNavbarContext();
  const isScrambling = storeAnimating && storeText !== "STORE";

  return (
    <button
      type="button"
      className={`navbar-cell navbar-cell--center ${styles.storeCell}`}
      onClick={storePress}
      aria-label="Store"
      aria-busy={storeAnimating}
    >
      <div className="cell-label">Store</div>

      {/* Display chip: text comes from useNavbar's timed animation frames. */}
      <div className={styles.storeDisplay}>
        <span className={isScrambling ? styles.storeTextScrambling : styles.storeTextReady}>
          {storeText}
        </span>
      </div>
    </button>
  );
}
