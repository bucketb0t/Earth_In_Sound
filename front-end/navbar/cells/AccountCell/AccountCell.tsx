"use client";

import { useNavbarContext } from "../../state";
import styles from "./AccountCell.module.css";

/**
 * Account cell.
 *
 * This is the small navbar hardware control, not the full account form. It
 * follows the Better Auth session and opens the /account page when the screen
 * button is pressed.
 */
export default function AccountCell() {
  /*
   * The full auth UI lives on the /account route; session state comes from the
   * shared navbar hook.
   */
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
        {/* Login switch artwork button. */}
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

        {/* Login status panel button. */}
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
