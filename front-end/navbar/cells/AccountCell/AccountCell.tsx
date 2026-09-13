"use client";

import { useNavbarContext } from "../../state";
import styles from "./AccountCell.module.css";

/** Navbar account controls reflect the auth session and open /account. */
export default function AccountCell() {
  const {
    accountDisplayName,
    isAuthPending,
    isLoggedIn,
    openAccountPage,
    toggleLogin,
  } = useNavbarContext();
  const toggleLabel = isLoggedIn ? "Log Out" : "LogIn";
  const screenLabel = isLoggedIn ? accountDisplayName : "Sign up";

  return (
    <div className={`navbar-cell navbar-cell--center ${styles.accountCell}`}>
      <div className={styles.loginRow}>
        <button
          type="button"
          className={`${styles.accountToggleButton} ${
            isLoggedIn
              ? styles.accountToggleButtonOn
              : styles.accountToggleButtonOff
          }`}
          onClick={() => void toggleLogin()}
          disabled={isAuthPending}
          role="switch"
          aria-checked={isLoggedIn}
          aria-label={toggleLabel}
        />

        <button
          type="button"
          className={styles.loginStatusPanel}
          onClick={() => void toggleLogin()}
          disabled={isAuthPending}
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
