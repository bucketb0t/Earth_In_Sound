"use client";

import { useNavbarContext } from "../../state";
import styles from "./AccountCell.module.css";

/**
 * Account cell.
 */
export default function AccountCell() {
  const { isLoggedIn, openAccountPage, toggleLogin } = useNavbarContext();
  const toggleLabel = isLoggedIn ? "Log Out" : "Log In";
  const screenLabel = isLoggedIn ? "JasonW" : "Sign up";

  return (
    <div className={`navbar-cell navbar-cell--center ${styles.accountCell}`}>
      <div className={styles.loginRow}>
        {/* Login switch artwork button. */}
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

        {/* Login status panel button. */}
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

      {/* Account screen route button. */}
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
