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
    <div className={`navbar-cell navbar-cell--center ${styles.accountCell}`}>
      {/* Login control: one accessible button styled like two hardware panels. */}
      <button
        type="button"
        className={styles.loginControl}
        onClick={toggleLogin}
        role="switch"
        aria-checked={isLoggedIn}
        aria-label={isLoggedIn ? "Logout" : "Login"}
      >
        <span className={styles.loginSwitchPlate} aria-hidden="true" />

        <span className={styles.loginStatusPanel}>
          <span
            className={`${styles.loginLed} ${
              isLoggedIn ? styles.loginLedOn : styles.loginLedOff
            }`}
            aria-hidden="true"
          />
          <span className={styles.loginText}>
            {isLoggedIn ? "Logout" : "Login"}
          </span>
        </span>
      </button>

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
