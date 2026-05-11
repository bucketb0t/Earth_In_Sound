"use client";

import { useNavbarContext } from "../../state";
import styles from "./AccountCell.module.css";

/**
 * Account cell.
 * Hardware-style auth control plus future account/signup screen button.
 */
export default function AccountCell() {
  const { isLoggedIn, toggleLogin } = useNavbarContext();
  const toggleLabel = isLoggedIn ? "Log Out" : "Login";
  const screenLabel = isLoggedIn ? "JasonW" : "Sign up";

  return (
    <div className={`navbar-cell navbar-cell--center ${styles.accountCell}`}>
      <div className={styles.loginRow}>
        {/* The artwork button is the real login/logout toggle. */}
        <button
          type="button"
          className={`${styles.accountToggleButton} ${
            isLoggedIn
              ? styles.accountToggleButtonOn
              : styles.accountToggleButtonOff
          }`}
          onClick={toggleLogin}
          role="switch"
          aria-checked={isLoggedIn}
          aria-label={toggleLabel}
        />

        {/* The LED and label mirror the toggle state without adding behavior. */}
        <span className={styles.loginStatusPanel}>
          <span
            className={`${styles.accountLed} ${
              isLoggedIn ? styles.accountLedOn : styles.accountLedOff
            }`}
            aria-hidden="true"
          />
          <span className={styles.loginText}>{toggleLabel}</span>
        </span>
      </div>

      {/* Future account/signup route trigger; visual state follows login state. */}
      <button
        type="button"
        className={`${styles.accountScreenButton} ${
          isLoggedIn ? styles.accountScreenButtonOn : ""
        }`}
        aria-label={isLoggedIn ? "Open account page" : "Sign up"}
      >
        <span>{screenLabel}</span>
      </button>
    </div>
  );
}
