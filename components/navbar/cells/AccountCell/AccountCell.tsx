"use client";

import { useNavbarContext } from "../../state";
import styles from "./AccountCell.module.css";

/**
 * Account cell.
 * Hardware-style login switch plus username display.
 */
export default function AccountCell() {
  const { isLoggedIn, toggleLogin } = useNavbarContext();

  return (
    <div
      className={`navbar-cell navbar-cell--center navbar-cell--bordered ${styles.accountCell}`}
    >
      <div className="cell-label">Account</div>

      {/* Toggle row: Off/On labels reflect the same login state as the nub. */}
      <div className={styles.toggleWrap}>
        <span
          className={`${styles.toggleLabel} ${
            isLoggedIn ? styles.toggleLabelDim : styles.toggleLabelOff
          }`}
        >
          Off
        </span>

        <button
          type="button"
          className={`${styles.toggleTrack} ${
            isLoggedIn ? styles.toggleTrackOn : ""
          }`}
          onClick={toggleLogin}
          role="switch"
          aria-checked={isLoggedIn}
          aria-label="Login toggle"
        >
          <div className={styles.toggleNub} />
        </button>

        <span
          className={`${styles.toggleLabel} ${
            isLoggedIn ? styles.toggleLabelOn : styles.toggleLabelDim
          }`}
        >
          On
        </span>
      </div>

      {/* Username display: dim placeholder when logged out, bright name when on. */}
      <div
        className={`${styles.accountDisplay} ${
          isLoggedIn ? styles.accountDisplayOn : ""
        }`}
      >
        <span>{isLoggedIn ? "JasonW" : "------"}</span>
      </div>
    </div>
  );
}
