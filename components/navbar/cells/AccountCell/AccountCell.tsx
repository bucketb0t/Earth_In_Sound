"use client";

import { useNavbarContext } from "../../state";
import styles from "./AccountCell.module.css";

/**
 * Account cell.
 * Hardware-style auth control plus future account/signup screen button.
 */
export default function AccountCell() {
  const { isLoggedIn, openAccountPage, toggleLogin } = useNavbarContext();
  const toggleLabel = isLoggedIn ? "Log Out" : "Log In";
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

        {/* The status plate is also a button, synced with the side switch. */}
        <button
          type="button"
          className={styles.loginStatusPanel}
          onClick={toggleLogin}
          aria-label={toggleLabel}
          aria-pressed={isLoggedIn}
        >
          <span
            className={`${styles.accountLed} ${
              isLoggedIn ? styles.accountLedOn : styles.accountLedOff
            }`}
            aria-hidden="true"
          />
          <span className={styles.loginText}>{toggleLabel}</span>
        </button>
      </div>

      {/* Future account/signup route trigger; visual state follows login state. */}
      <button
        type="button"
        className={`${styles.accountScreenButton} ${
          isLoggedIn ? styles.accountScreenButtonOn : ""
        }`}
        onClick={openAccountPage}
        aria-label={isLoggedIn ? "Open account page" : "Sign up"}
      >
        <span
          className={`${styles.accountScreenText} ${
            isLoggedIn ? "" : styles.accountScreenTextGlitch
          }`}
          data-text={screenLabel}
        >
          {screenLabel}
        </span>
      </button>
    </div>
  );
}
