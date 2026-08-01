"use client";

import styles from "./MobileNavbar.module.css";
import { EIS_LINKS, JW_LINKS } from "../config";
import { useNavbarContext } from "../state";

/**
 * Mobile navbar layout.
 * Rendered by Navbar when the global responsive mode is mobile.
 * It reuses shared navbar state while owning mobile-specific structure.
 */
export default function MobileNavbar() {
  /*
   * Mobile reads the same shared navbar state as desktop. The mobile component
   * owns layout only; route changes and active-link state stay centralized.
   */
  const { activePage, eisSliderPos, eisNavTo, goHome, knobNavTo } =
    useNavbarContext();
  const eisIsActive = activePage?.section === "eis";

  return (
    <nav className={styles.mobileNavbar} aria-label="Mobile site navigation">
      <div className={styles.topRow}>
        <section className={styles.eisPanel} aria-label="Earth In Sound links">
          <button
            type="button"
            className={styles.eisLogoButton}
            onClick={goHome}
            aria-label="Earth In Sound, go to home"
          >
            Earth In Sound
          </button>

          <div className={styles.eisLinks}>
            {/* EIS has dedicated slider state on desktop, so mobile mirrors it. */}
            {EIS_LINKS.map((linkLabel, linkIndex) => {
              const linkIsActive = eisIsActive && eisSliderPos === linkIndex;

              return (
                <button
                  key={linkLabel}
                  type="button"
                  className={`${styles.navLink} ${
                    linkIsActive ? styles.navLinkActive : ""
                  }`}
                  onClick={() => eisNavTo(linkIndex)}
                  aria-current={linkIsActive ? "page" : undefined}
                >
                  {linkLabel}
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.jwwPanel} aria-label="Jason Walton links">
          <div className={styles.panelTitle}>Jason Walton</div>

          <div className={styles.sectionLinks}>
            {/* Jason Walton uses the shared knob navigation path from desktop. */}
            {JW_LINKS.map((linkLabel, linkIndex) => {
              const linkIsActive =
                activePage?.section === "jw" &&
                activePage.linkIndex === linkIndex;

              return (
                <button
                  key={linkLabel}
                  type="button"
                  className={`${styles.navLink} ${
                    linkIsActive ? styles.navLinkActive : ""
                  }`}
                  onClick={() => knobNavTo("jw", linkIndex)}
                  aria-current={linkIsActive ? "page" : undefined}
                >
                  {linkLabel}
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.ihmPanel} aria-label="I Hate Music links">
          I Hate Music Links
        </section>
      </div>

      <div className={styles.bottomRow}>
        <section className={styles.accountPanel} aria-label="Account controls">
          Account
        </section>

        <section className={styles.storePanel} aria-label="Store">
          Store
        </section>

        <section className={styles.cartPanel} aria-label="Cart">
          Cart
        </section>
      </div>
    </nav>
  );
}
