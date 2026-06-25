"use client";

import styles from "./MobileNavbar.module.css";

/**
 * Mobile navbar layout.
 * Not rendered yet. This file exists so mobile work can grow separately from
 * the desktop hardware navbar.
 */

export default function MobileNavbar() {
  return (
    <nav className={styles.mobileNavbar} aria-label="Mobile site navigation ">
      <div className={styles.toRow}>
        <section className={styles.eisPanel} aria-label="Earth In Sound Links">
          Earth In Sound
        </section>

        <section
          className={styles.jwwPanel}
          aria-label="Jason William Walton Links"
        >
          Jason William Walton
        </section>

        <section className={styles.ihmPanel} aria-label="I Hate Music Links">
          I Hate Music Links
        </section>
      </div>
    </nav>
  );
}
